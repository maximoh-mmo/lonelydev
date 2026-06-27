---
id: "photoboss22"
title: "📸 Engineering Diary: Break-20-minütiger Fotoscan"
seoTitle: "Break-20-minütiger Fotoscan"
date: "2026-07-10"
category: "Softwareentwicklung"
summary: "Wir untersuchten eine Leistungskrise bei einem Scan mit 33.000 Bildern und stellten fest, dass der Reader für die Dateiformatgruppe die Pipeline ausbremste. Durch die Begrenzung der Warteschlange, das Hinzufügen von Messinstrumenten und die Neuprogrammierung des Hash-Pfads konnten wir die Dauer der wichtigsten Schritte um die Hälfte verkürzen. Diese Änderung verbesserte nicht nur die Geschwindigkeit – sie definierte auch neu, was mit der Engine möglich ist."
project: "photoboss"
tags: ["PhotoBoss", "PerformanceTuning", "PipelineOptimization"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Im letzten Beitrag habe ich mich mit der Bereinigung der Architektur befasst – der Ausgliederung von Diensten, der Einführung einer Kompositionswurzel und der Beseitigung von SOLID-Verstößen. Nachdem die Struktur nun in Ordnung war, war es an der Zeit, das größte noch offene Problem anzugehen: **PhotoBoss war bei großen Datensätzen unbrauchbar langsam.**

Das Scannen von 33.000 Fotos dauerte über 20 Minuten. Schlimmer noch: Es wurden mehr als 64 GB RAM beansprucht, bevor der Speicher vollständig erschöpft war. Die Gruppierungsphase verlief so langsam, dass die Benutzeroberfläche zeitweise für mehrere Sekunden einfror.

Dieser Beitrag dokumentiert die gesamte Untersuchung und die Änderungen, durch die der 20-minütige Scan auf eine weitaus vernünftigere Dauer verkürzt werden konnte. Dabei habe ich viel darüber gelernt, womit Desktop-Fotoanwendungen tatsächlich ihre Zeit verbringen und wie schon kleine Änderungen an der Messtechnik Engpässe aufdecken können, auf die man niemals gekommen wäre.

## Schritt 1: Keine Speicherengpässe mehr

Das erste und schwerwiegendste Problem war der OOM-Fehler bei >64 GB. Die `readQueue` (die zwischen dem Lesen von der Festplatte und der Hash-Berechnung Rohdatenbytes im Speicher hält) war unbegrenzt. Wenn die Hash-Worker langsamer waren als der Festplattenleser – was bei 33.000 hochauflösenden Fotos meistens der Fall war –, wuchs die Warteschlange unbegrenzt an, bis der Prozess den Systemspeicher erschöpfte.

Die Lösung war einfach: Die Funktion `readQueue` wurde mit einer `ReadQueueCapacity` von 15 begrenzt:

```cpp
// PipelineFactory.cpp
auto readQueue = std::make_unique<Queue<std::unique_ptr<DiskReadResult>>>(settings::ReadQueueCapacity);
```

Bei einer Kapazität von 15 kann der Festplattenleser nur 15 Slots füllen, bevor er blockiert und darauf wartet, dass ein Hash-Worker einen davon aufnimmt. Der von der Lesewarteschlange belegte Gesamtspeicher ist auf 15 × maxFileSize begrenzt, was in jedem modernen System problemlos Platz findet. Alle anderen Warteschlangen bleiben unbegrenzt – sie enthalten kleine Metadatenelemente (Dateipfade, Hash-Ergebnisse, Miniaturansichtsanfragen), die eher in Byte als in Megabyte gemessen werden, und eine Begrenzung würde zu künstlichen Verzögerungen führen, ohne einen Speichergewinn zu bringen.

## Schritt 2: Alles instrumentieren

Ich habe der Klasse `Queue` die Zähler „producer-wait“ und „consumer-wait“ hinzugefügt – atomare Zähler, die jedes Mal erhöht werden, wenn ein Thread wartet, weil er auf freien Speicherplatz oder auf Daten wartet:

```cpp
// Queue.h
std::atomic<uint64_t> m_producerWaitCount_{ 0 };
std::atomic<uint64_t> m_consumerWaitCount_{ 0 };
```

Jede Warteschlange gibt nun beim Löschen ihre Statistiken an stderr aus:

```
Queue[4] cap=15: prodWaits=8383 consWaits=2
Queue[3] cap=18446744073709551615: prodWaits=0 consWaits=31878
```

Die Situation war eindeutig: **Der HashWorker war der Engpass.** Die `readQueue` wies 8.383 Producer-Wartezeiten auf (DiskReader blockiert) und nur 2 Consumer-Wartezeiten (die Hash-Worker warteten nie auf Daten). Unterdessen wies die nachgelagerte `resultQueue` 31.878 Consumer-Wartezeiten auf – der ResultProcessor fand die Warteschlange in 96 % der Fälle leer vor. Alles, was den Hash-Workern nachgelagert war, litt unter Datenmangel.

Jeder Hash-Worker benötigte ~290 ms pro Bild – davon 270 ms für die Entschlüsselung des vollauflösenden JPEG, bevor ein 64-Bit-Wahrnehmungshash berechnet wurde.

## Schritt 3: Beheben Sie den UI-Throttle

Bevor wir uns dem Hash-Worker zuwandten, gab es ein separates Problem mit der UI-Leistung. Die `UiUpdateQueue` verwendete ein boolesches `m_emitPending`-Flag, um die Ausgabe von Snapshots zusammenzufassen, doch dabei gab es ein subtiles Problem: Jeder ausstehende Aufruf erzeugte einen vollständigen Snapshot, der *alle* 33.000 Gruppen enthielt. Der UI-Thread versank in überflüssiger Arbeit.

### Zeitgesteuerte Drosselung

Ich habe das boolesche Flag durch eine auf `QTimer` basierende Drosselung bei 30 fps (Intervall von 33 ms) ersetzt:

```cpp
// UiUpdateQueue constructor
m_throttleTimer_.setInterval(settings::UiPollIntervalMs);  // 33ms
m_throttleTimer_.setSingleShot(false);
connect(&m_throttleTimer_, &QTimer::timeout,
        this, &UiUpdateQueue::maybeEmitSnapshot);
```

Ein entscheidendes Detail: 'QTimer::start()' kann nur vom besitzenden Thread aufgerufen werden (Qts Thread-Sicherheitsanforderung für Timer). Da 'scheduleSnapshotEmit()' aus Pipeline-Threads aufgerufen wird, musste ich es in 'QMetaObject::invokeMethod' mit 'Qt::QueuedConnection' einpacken:

```cpp
void UiUpdateQueue::scheduleSnapshotEmit() {
    QMetaObject::invokeMethod(this, [this]() {
        if (!m_throttleTimer_.isActive())
            m_throttleTimer_.start();
    }, Qt::QueuedConnection);
}
```

### Nur-Delta-Snapshots

Ich habe ein 'm_modifiedGroupIds_'-Set hinzugefügt, das verfolgt hat, welche Gruppen sich seit dem letzten Snapshot geändert haben. 'snapshot()' kopiert nun nur noch schmutzige Gruppen ins Ergebnis:

```cpp
UiSnapshot UiUpdateQueue::snapshot() {
    UiSnapshot snap;
    for (quint64 id : m_modifiedGroupIds_) {
        auto it = m_updatedGroups.find(id);
        if (it != m_updatedGroups.end())
            snap.updatedGroups.insert(id, it.value());
    }
    m_modifiedGroupIds_.clear();
    // ...
}
```

Eine Gruppe, die sich einmal bildet und sich nie ändert, erscheint genau in einem Snapshot. Mit 33.000 Gruppen reduzierte dies die Pro-Frame-Verarbeitung von 33.000 Iterationen auf 0 auf 10.

### Ersetzung von 'findChildren' durch eine Wegkarte

Im UI-Code verbarg sich ein O(n²)-Muster, das eigentlich leicht zu erkennen war. `processUpdatedGroups()` rief für jeden Eintrag in jeder aktualisierten Gruppe `widget->findChildren<ImageThumbWidget*>()` auf – eine rekursive Durchquerung des Widget-Baums. Ich habe `GroupWidget` eine Zuordnung von Pfaden zu Widgets hinzugefügt:

```cpp
// GroupWidget.h
QMap<QString, ImageThumbWidget*> m_thumbsByPath_;
```

Gefüllt, wenn jeder Daumen erstellt wird, wird für O(1)-Nachschlag statt für Baumläufe verwendet. Keine 'FindChildren'-Anrufe mehr auf dem heißen Weg.

### Erhaltung der Benutzerauswahl

Die Pipeline weist automatisch das Bild mit der besten Qualität als Vertreter jeder Gruppe zu. Wenn der Benutzer jedoch eine Auswahl manuell überschreibt, würde das nächste Pipeline-Update sie überschreiben. Ein 'm_userModified_'-Flag auf 'GroupWidget' verzweigt das Aktualisierungsverhalten:

```cpp
if (m_userModified_) {
    // Only set defaults for newly added thumbs (handles growing groups)
    for (size_t i = oldCount; i < m_thumbs_.size(); ++i)
        m_thumbs_[i]->setState(...);
} else {
    // Pipeline mode: sync all thumb states with bestIndex
    for (size_t i = 0; i < m_thumbs_.size(); ++i)
        m_thumbs_[i]->setState(...);
}
```

Die Flagge wird in dem Moment gesetzt, in dem der Benutzer eine beliebige Auswahl berührt. Danach wirkt sich die Pipeline nur auf Daumen aus, die beim letzten Kontakt des Nutzers mit der Gruppe noch nicht existierten.

## Schritt 4: Den Gruppierungsalgorithmus korrigieren

Mit der UI-Leistung im Griff habe ich mich der Gruppenphase zugewandt. Die Anfangsimplementierung scannte jeden bestehenden Cluster für jedes neue Bild – O(n²)-Vergleiche. Für 33.000 Bilder sind das über eine Milliarde Ähnlichkeitsvergleiche.

### Invertierter Index auf Sub-Hashes

Ich habe jeden 64-Bit-pHash in vier 16-Bit-Sub-Hashes aufgeteilt und einen invertierten Index erstellt:

```cpp
std::array<quint16, 4> SimilarityEngine::extractSubHashes(const QString& phashHex) {
    quint64 h = phashHex.toULongLong(nullptr, 16);
    return {{
        static_cast<quint16>(h & 0xFFFF),
        static_cast<quint16>((h >> 16) & 0xFFFF),
        static_cast<quint16>((h >> 32) & 0xFFFF),
        static_cast<quint16>((h >> 48) & 0xFFFF)
    }};
}
```

Wenn ein neues Bild erscheint, identifizieren Sub-Hash-Abfragen Kandidatencluster (solche mit ≥2 übereinstimmenden Sub-Hashes) und nur diese Kandidaten werden verglichen. Dies reduziert die Vergleichsanzahl von O(n) auf O(1) pro Bild.

### Früher Ausstieg im Confidence Scoring

Die Funktion „confidence()“ hat zuvor alle Hash-Scores berechnet und dann die Gates überprüft. Ich habe die Gate-Prüfungen innerhalb der Schleife verschoben – wenn pHash unter 0,98 liegt, schlägt der Vergleich sofort fehl:

```cpp
if (key == "Perceptual Hash" && sim < m_cfg.pHashGate) return 0.0;
if (key == "Difference Hash" && sim < m_cfg.dHashGate) return 0.0;
```

Da pHash typischerweise der erste ausgewertete Hash ist, führen die meisten unterschiedlichen Vergleiche sofort zu einem Kurzschluss.

### Schmutziges Cluster-Tracking

Jeder 'getGroupDelta()'-Aufruf wurde zuvor über alle 33k-Cluster hinweg iteriert. Ein 'm_dirtyClusterIndices_'-Set zeichnet nun nur noch Cluster auf, die seit der letzten Delta-Anfrage modifiziert wurden – typischerweise 0–2 pro Anruf nach der Anfangsformationsphase.

### Bessere Auswahl der Vertreter

Die Funktion 'better()' vergleicht Bildqualität (Auflösung, Dateigröße) und wird sowohl im Index- als auch im Fallback-Pfad aufgerufen, sodass die Pipeline immer den besten Vertreter auswählt:

```cpp
if (sim >= m_cfg.strongThreshold) {
    cluster.members.push_back(node);
    if (better(*node, *cluster.representative))
        cluster.representative = node;
}
```

Die Kombination dieser Änderungen senkte die Gruppenstufenkosten pro Bild von ~100 μs auf unter 1 μs.

## Schritt 5: Der große Punkt – die Dekodierung des Hash-Workers beheben

Da die Warteschlangenstatistiken bestätigten, dass HashWorker der Engpass war, habe ich mir angesehen, was er tatsächlich macht. 'ImageLoader::load()' hatte zwei Fehler in einer Funktion – er las die Datei von der Festplatte erneut, obwohl 'DiskReadResult' bereits die Rohbytes enthielt, und dekodierte auf volle Auflösung für ein QImage, das sofort auf 32×32 für das Hashing skaliert wurde:

```cpp
// Before
std::optional<QImage> ImageLoader::load(const DiskReadResult &item) const {
    QString fullPath = fi.path() + "/" + fi.name();
    QImageReader reader(fullPath);   ← ignores the bytes we already read
    QImage img = reader.read();      ← full-resolution decode (6000×4000)
    // ...
}

// After
std::optional<QImage> ImageLoader::load(const DiskReadResult &item) const {
    QBuffer buf(const_cast<QByteArray*>(&item.imageBytes));
    buf.open(QIODevice::ReadOnly);
    QImageReader reader(&buf);
    reader.setScaledSize(QSize(settings::HashSampleSize, settings::HashSampleSize));
    // HashSampleSize = 32
    QImage img = reader.read();      ← IDCT-scaled decode to ~32×32
    // ...
}
```

Das sagt libjpeg-turbo, seine schnelle IDCT-Skalierung zu verwenden. Anstatt 6000×4000 Pixel (72 MB Pixeldaten) zu dekodieren und dann auf 32×32 zu skalieren, dekodiert es direkt auf ~32×32, indem hochfrequente DCT-Koeffizienten übersprungen werden.

Das Ergebnis: **~270 ms pro Bild → ~3 ms pro Bild.** Mit 8 Hash-Workern ging die Hashphase von ~20 Minuten auf ~12 Sekunden an.

Die Pixelwerte weichen geringfügig vom alten Voll-Decodierungspfad ab, was bedeutet, dass zwischengespeicherte pHash-Werte sich leicht von neu berechneten unterscheiden würden. Für die lokale Entwicklung bestand die einfachste Lösung darin, den alten Cache zu löschen – bei einem neuen Scan wird alles korrekt neu aufgebaut.

## Die Ergebnisse

Die Warteschlangenstatistiken vom ersten Scan unmittelbar nach der Korrektur zeigten, dass sich der Engpass komplett verschoben hatte – die Diskette war die ganze Zeit auf 100 % Auslastung festgelegt, während die Pipeline ausgeglichen war. Man kann Dateien nicht schneller lesen, als es die Festplatte erlaubt, und die Pipeline blieb nun von Ende zu Ende am Laufen.

| Change | Was es behoben hat | Auswirkungen |
|---|---|---|
| Beschränkte readQueue (cap=15) | >64 GB OOM | Keine Gedächtniserschöpfung mehr bei großen Scans |
| Warteschlangeninstrumentierung | Blinde Optimierung | HashWorker als >90%-Engpass identifiziert |
| Timer-gedrosselte UI-Updates | UI friert während des Scans ein | Stabile 30fps unabhängig vom Scanfortschritt |
| Nur Delta-Schnappschüsse | 33.000 Gruppen werden alle 33 ms neu verarbeitet | Per-Frame-Arbeit proportional zu Änderungen |
| Pfad→Widget-Karte | 33.000 findChildren Baumwanderungen pro Bild | Keine Baumwanderungen; O(1) Pfadsuche |
| Invertierter Index + Dirty Tracking | O(n²)-Gruppierungsvergleiche | <1 μs pro Bild; Gruppierung ist im Wesentlichen kostenlos |
| In-memory skalierte Dekodierung | 270 ms pro Bild → 3 ms | Hash-Phase: 20 Minuten → ~12 Sekunden |

## Reflexion

**Instrument zuerst, dann optimieren.** Die Warteschalter der Warteschlange nahmen sich einen Nachmittag und bezahlten sich sofort. Bevor ich sie hatte, habe ich über Engpässe gedacht. Danach hatte ich genaue Zahlen. Das hätte ich schon vor Monaten hinzufügen sollen.

**Begrenzte Warteschlangen zwingen dich, den Engpass zu finden.** In dem Moment, in dem du eine Produzent-Konsument-Warteschlange bindest, zeigt sich die langsamste Stufe, indem sie ihren Produzenten blockiert. Ohne die begrenzte readQueue wurde die Langsamkeit der Hash-Arbeiter dadurch überdeckt, dass die unbeschränkte Warteschlange lautlos – und teuer – wuchs.

**Wahrnehmungs-Hashing ist unglaublich dateneffizient.** Die Tatsache, dass man ein 24-Megapixel-Foto in 32×32 Graustufen dekodieren und trotzdem zuverlässige Ähnlichkeitsvergleiche erhalten kann, ist bemerkenswert. Der alte Code verarbeitete 72 MB Pixeldaten, um 64 Bit Wahrnehmungshash zu extrahieren. Der neue Code verarbeitet ~1 KB Pixeldaten für dasselbe 64-Bit-Ergebnis.

**Der ImageLoader-Fehler war ein Designgeruch.** Die Schnittstelle sagte "Raw Bytes in QImage umwandeln", aber die Implementierung las die Datei erneut von der Festplatte aus. Der Kommentar war erstrebenswert – jemand wusste, was passieren sollte, aber es wurde nie behoben. Eine Code-Review hätte das in wenigen Minuten erfasst; Solo arbeitete er monatelang weiter.

## Nächste Schritte

Da die Pipeline nun an Hardwaregrenzen läuft, ist der unmittelbare Engpass ThumbnailGenerator – er liest weiterhin von der Festplatte, um jedes Thumbnail zu erzeugen. Die Lösung besteht darin, das bereits decodierte QImage von HashWorker durch die Pipeline zu leiten, sodass Miniaturen aus dem In-Memory-Image generiert werden und nicht aus einer zweiten Festplattenlese.

Danach lautet der Plan:

| Priorität | Was | Warum |
|---|---|---|
| 1 | Geben Sie dekodierte QImage an ThumbnailGenerator | Eliminieren Sie die zweite Lese- und Entschlüsselung der Diskette pro Bild |
| 2 | Hardware-bewusste Auto-Tuning | Auto-Detektierung von Kernen, RAM und Speichertyp, um optimale Thread-Zahlen und Warteschlangengrößen beim Start festzulegen |
| 3 | Pipeline-Metriken (ScopedTimer + Bericht) | Fügen Sie das Zeitplan pro Stufe mit geringem Overhead hinzu, um den nächsten Engpass ohne Raten zu identifizieren |

Der Teil des Auto-Tunings ist besonders interessant – es gibt keinen Grund, warum der Benutzer manuell Thread-Zahlen oder Batch-Größen konfigurieren sollte. Die Anwendung sollte die verfügbare Hardware prüfen und optimale Einstellungen automatisch berechnen. Das wird der Schwerpunkt des nächsten Beitrags sein.

---

*PhotoBoss ist Open Source. Das vollständige Repository ist verfügbar unter [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
