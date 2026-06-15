---
id: "photoboss23"
title: "🖼️ Von doppelten Lesungen zu null Lesungen: Thumbnail-Cache, Rotation und das Eliminieren einer ganzen Stage"
seoTitle: "Von doppelten Lesungen zu null Lesungen: Thumbnail-Cache, Rotation und das Eliminieren einer ganzen Stage"
date: "2026-07-17"
category: "Softwareentwicklung"
summary: "Der Beitrag beschreibt, wie das Verschieben der Miniaturenerstellung in den Cache redundante Festplattenlesungen eliminierte, einen Double-Rotation-Fehler behob und die ExifRead-Stufe entfernte, was zu einer einfacheren, schnelleren Pipeline führte."
project: "photoboss"
tags: ["Image Processing", "Performance Optimization", "C++"]
status: "scheduled"
isAutoTranslated: true
---

# 🖼️ Von doppelten Lesevorgängen auf null Lesevorgänge: Thumbnail-Cache, Rotation und das Weglassen einer ganzen Stufe

## Einführung

Im letzten Beitrag habe ich einen Scan mit 33.000 Fotos, der ursprünglich über 20 Minuten dauerte und mehr als 64 GB Speicherplatz beanspruchte, auf ein vernünftiges Maß reduziert. Der Engpass verlagerte sich vom Speicherengpass auf die Festplatte – genau dort, wo man ihn haben will. Die Pipeline lief stabil, die Benutzeroberfläche reagierte zügig, und die Gruppierungsphase verlief praktisch ohne Verzögerungen.

Aber es gab immer noch zwei offensichtliche Probleme:

1. **Thumbnails wurden von der Festplatte erneut gelesen.** Jedes Thumbnail erforderte eine zweite Dateilesung und JPEG-Dekodierung, obwohl HashWorker das Bild bereits in Thumbnail-Größe entschlüsselt hatte. Beim ersten Scan sind das 33.000 redundante Lesewerte.
2. **EXIF wurde separat gelesen.** ExifRead öffnete jede Datei, um EXIF-Metadaten zu extrahieren, dann öffnete DiskReader dieselbe Datei erneut, um den vollständigen Inhalt zu lesen. Zwei Suchanfragen pro Akte, wobei eine ausreichen sollte.

Über diese I/O-Probleme hinaus gab es einen Rotationsfehler in der Pipeline – Vorschaubilder wurden zweimal rotiert, wenn die EXIF-Orientierung eines Bildes nicht standardmäßig war – und eine wachsende Sammlung von Batch-Warteschlangen-Abstraktionen, die die Komplexität erhöhten, ohne messbaren Nutzen.

Dieser Beitrag behandelt die Änderungen, die die redundanten Reads eliminierten, den Rotationsfehler behoben und unnötiges Batching aus der Pipeline entfernten.

## Schritt 1: Thumbnail-Cache – Hör auf, Dateien zweimal zu lesen

### Der alte Fluss

Jedes Vorschaubild durchlief diesen Zyklus beim ersten Scan:

```
DiskReader → HashWorker (decode + hash + attaches decodedImage)
                                              ↓
                                        CacheStore (stores hashes, discards image)
                                              ↓
                                       ResultProcessor → ThumbnailGenerator → second disk read
```

HashWorker hat das Bild mit 140×140 (der Vorschaubildgröße) mit schneller IDCT-Skalierung decodiert. Dieses entschlüsselte Bild lag genau dort im Gedächtnis. Aber CacheStore hat sich nie die Mühe gemacht, es zu behalten. Es speicherte die Hashes, leitete das Item weiter und das entschlüsselte QImage wurde auf den Boden gelegt.

Als ThumbnailGenerator die Anfrage erhielt, gab es drei Wege:

| Weg | Auslöser | Was ist passiert |
|------|---------|--------------|
| 1. 'vordekodiert' | Frisches Bild, entschlüsseltes Bild angehängt | Maßstab und Anzeige (schnell) |
| 2. Cache-Treffer | Zuvor zwischengespeichertes Vorschaubild | Zurückkehren wie sie ist (schnell) |
| 3. Festplattenlesen | Cache-Miss | Vollständige Dateilesung + Dekodierung (langsam) |

Pfad 1 war die beabsichtigte Optimierung, funktionierte aber nur für frische Bilder im aktuellen Scan. Nach diesem Scan war der Vorschaubild-Cache leer. Beim nächsten Scan bedeuteten zwischengespeicherte Hashes, dass kein 'decodedImage' weitergeleitet wurde, sodass jedes Vorschaubild durch Pfad 3 – den Laufwerkslesepfad – lief. Es dauerte **drei vollständige Scans**, bis der Thumbnail-Cache nützlich war:

1. Erster Scan: Pfad 1 (schnell, aber kein DB-Eintrag geschrieben)
2. Zweiter Scan: Pfad 3 (langsam, DB-Einträge geschrieben)
3. Dritter Scan: Pfad 2 (schnell, Cache endlich ausgefüllt)

### Die Lösung: die Erstellung von Miniaturen in CacheStore verschieben

Die Lösung war, das Thumbnail-Caching in CacheStore zu verlegen, wo es hingehörte. CacheStore hat bereits jedes 'HashedImageResult' empfangen, einschließlich 'decodedImage' für frische Artikel. Es musste es nur behalten:

```cpp
// CacheStore.cpp — include decodedImage in the batch
HashedImageResult copy(item->fileIdentity, item->source, ...);
copy.decodedImage = item->decodedImage;
m_batch_.emplace_back(std::move(copy), QMap<QString, int>{});
```

Dann serialisiert man innerhalb von 'SqliteHashCache::storeBatch()' nach dem Speichern von Hashes und EXIF für jedes Element 'decodedImage' als JPEG-BLOB und setzt es in die Thumbnail-Tabelle hoch – alles innerhalb derselben Transaktion:

```cpp
// storeBatch() — thumbnail persistence
if (result.decodedImage) {
    QByteArray blob;
    QBuffer buf(&blob);
    buf.open(QIODevice::WriteOnly);
    QImageWriter writer(&buf, "JPEG");
    writer.setQuality(85);
    writer.write(*result.decodedImage);
    // upsert into thumbnails table
    q.prepare(R"(
        INSERT INTO thumbnails(file_id, width, rotation, data)
        VALUES(:file, :width, 0, :data)
        ON CONFLICT DO UPDATE SET data = excluded.data
    )");
}
```

Die Chargengröße beträgt 100 Artikel pro Transaktion, sodass 33.000 Miniaturen ~330 SQLite-Transaktionen statt 33.000 kosten. Die JPEG-Qualität von 85 bei 140×140 erzeugt ~3-8 KB pro Vorschaubild – insgesamt etwa 160 MB für 33.000 Bilder, was bequem in den Seitencache von SQLite passt.

Nach dieser Änderung ist der Thumbnail-Cache nach einem einzigen Scan vollständig gefüllt. Neu-Scans treffen Pfad 2 (Cache) für jedes Vorschaubild.

## Schritt 2: Beheben Sie den Rotationsfehler

### Die Doppelrotation

Als ich die Bild-Pipeline durchgesucht habe, habe ich einen subtilen Fehler bei der Anwendung der Rotation festgestellt:

```
ImageLoader::load()
    ↓ OrientImage(orientation)    ← first rotation (from EXIF)
    ↓ decodedImage = result       ← image is already correctly rotated

ThumbnailGenerator::scaleTo()
    ↓ src.scaled(...)
    ↓ OrientImage(rotation)       ← second rotation (same EXIF value)
```

Die erste Rotation fand in 'ImageLoader::load()' statt, das die EXIF-Orientierung aus der Dateiidentität liest und 'OrientImage(orientation)' aufruft, bevor das dekodierte Bild zurückgegeben wird. Der zurückgekehrte QImage war bereits in der richtigen Ausrichtung.

Die zweite Rotation fand in 'ThumbnailGenerator::scaleTo()' statt, was nur für Pfad 1 ("preDecoded") aufgerufen wurde. Es skalierte das Bild und rief dann 'OrientImage(rotation)' mit demselben EXIF-Orientierungswert auf. Bei Fotos mit nicht standardmäßigen Orientierungen (z. B. 90° CW = Orientierung 6) ergab dies eine 180°-Drehung – das Thumbnail erschien verkehrt herum oder seitlich.

Bei Orientierung 3 (180° Drehung) hat sich die doppelte Rotation tatsächlich *rückgängig* gemacht – das Bild sah korrekt aus, aber nur, weil zwei falsche Fehler zufällig eine richtige Bewegung ergaben.

### Die Lösung

Das 'vordekodierte' Bild ist bereits korrekt von 'ImageLoader' ausgerichtet. Pfad 1 sollte ihn einfach ohne weitere Rotation skalieren:

```cpp
// Before
if (request->preDecoded) {
    img = scaleTo(*request->preDecoded, ...);
    // scaleTo applies OrientImage() — double rotation
}

// After
if (request->preDecoded) {
    QSize targetSize(request->width, request->height);
    QSize scaledSize = request->preDecoded->size();
    scaledSize.scale(targetSize, Qt::KeepAspectRatio);
    img = request->preDecoded->scaled(scaledSize, ...);
    // No OrientImage — already rotated
}
```

### Rotation in den Cache eingebaken

Der Vorschaubild-Cache speichert nun Bilder mit 'rotation=0' im Schlüssel, unabhängig von der ursprünglichen EXIF-Ausrichtung. Die Pixeldaten sind bereits ausgerichtet, wenn sie geschrieben werden – die Rotation wurde einmal zur Dekodierungszeit angewendet und muss nie wieder angewendet werden. Dies bereinigte natürlich die alten Rotationsschlüssel-Einträge durch einen 'DELETE WHERE rotation!=0'-Durchgang während 'storeBatch()'.

## Schritt 3: Eliminieren Sie die ExifRead-Phase

### Die Architekturfrage

ExifRead existierte aus gutem Grund: Lesen Sie die günstigen EXIF-Daten (~5KB pro Datei), überprüfen Sie den SQLite-Cache und machen Sie nur die teuren vollständigen Dateien bei einem Cache-Fehler. Bei erneuten Scans sparen 10 MB × 33k = 330 GB I/O.

Aber beim ersten Scan ist jede Datei ein Cache-Fehler. Und beim ersten Scan liest ExifRead die Datei für EXIF, dann liest DiskReader dieselbe Datei erneut für den Inhalt. Das sind zwei Suchanfragen pro Akte.

### Die Einsicht

Die EXIF-Daten sind nicht Teil des Cache-Lookup-Schlüssels. Die Suche verwendet 'Name + Pfad + Größe + modified_time' – alles verfügbar aus dem Verzeichniseintrag über 'QFileInfo', das keine Datei-I/O benötigt. EXIF sind lediglich zusätzliche Daten, die zusammen mit dem Cache-Eintrag gespeichert und beim Treff zurückgegeben werden.

So können wir die EXIF-Datei vollständig eliminieren, indem wir Folgendes lesen:
1. Erstellen der 'FileIdentity' aus 'QFileInfo' (null I/O)
2. Überprüfung des Caches
3. Bei Fehlgebrauch die vollständige Datei lesen und EXIF aus den bereits im Speicher befindlichen Bytes extrahieren

### Der neue Fluss

```
FileEnumerator ──(FileIdentity, no EXIF)──► CacheLookup
                                               │
                              (hit→resultQueue)│(miss→disk)
                                               ▼
                                          DiskReader
                                   (readAll() + parse EXIF from bytes)
                                               │
                                               ▼
                                          HashWorker → CacheStore → ...
```

Die 'parse(const QByteArray&)'-Überladung verwendet 'Exiv2::ImageFactory::open(const byte*, size_t)' zum Lesen aus dem Speicherpuffer – keine Datei-I/O erforderlich:

```cpp
ExifData ExifParser::parse(const QByteArray& bytes) {
    auto image = Exiv2::ImageFactory::open(
        reinterpret_cast<const Exiv2::byte*>(bytes.constData()), bytes.size());
    image->readMetadata();
    // ... extract orientation, date, make, model ...
}
```

Dadurch konnte ich die ExifRead-Phase komplett entfernen – eine Klasse weniger, eine Warteschlange weniger, eine Verbindung weniger.

## Schritt 4: Alle Chargen-Warteschlangen entfernen

### Die Prüfung

Vor dieser Änderung hatte die Pipeline folgende Batching-Punkte:

| Bühne | Ausgabe | Chargengröße | Warum |
|-------|--------|------------|-----|
| FileEnumerator | 'shared_ptr<QStringList>' | 100 Wege | Verzeichnis-Walk-Akkumulator |
| ExifRead | 'FileIdentityBatchPtr' | 200 Artikel | Akkumuliert vor Push |
| CacheLookup (verfehlt über DiskReader) | 'FileIdentityBatchPtr' | Variable | Neu-Batch aus einkommender Charge |
| CacheStore | SQLite-Transaktion | 100 Artikel | **Echtes Perf Win (vermeidet Fsync)** |

### Die Frage

Jede Batch-Warteschlange erhöhte die Komplexität: Vektorzuweisungen, shared_ptr Overhead und Akkumulationslogik. Was haben sie eigentlich gekauft?

Warteschlange-Push/Pop kostet ~1 μs. Für 33.000 Items beträgt der Unterschied zwischen 330 Operationen (Batched ×100) und 33.000 Operationen (unbatched) insgesamt ~33 ms. Bei einem Scan, der mehrere Minuten dauert, ist das Rauschen.

Das einzige wirkliche Batching war das SQLite-Transaktionsbatching von CacheStore – ein einzelnes 'BEGIN IMMEDIATE'/'COMMIT' kostet ~10 ms Fsync. Bei 1 pro Artikel sind das 330. Bei 100 pro Charge sind es 3,3 Sekunden.

Alles andere war Komplexität ohne Belohnung.

### Was hat sich geändert

```
// Before
FileEnumerator → Queue<shared_ptr<QStringList>> → ExifRead (N workers)
    → Queue<FileIdentityBatchPtr> → CacheLookup
        → Queue<FileIdentityBatchPtr> (misses) → DiskReader (M workers)

// After  
FileEnumerator → Queue<FileIdentity> → CacheLookup
    → Queue<FileIdentity> (misses) → DiskReader (M workers)
```

Jede Warteschlange enthält jetzt einzelne Gegenstände. Keine Vektorallokationen, kein shared_ptr Overhead, keine Akkumulationslogik. Drei Kurse Batch-Buchführung wurden entfernt.

### Eine Anmerkung zu den Mitgliedern der FileIdentity Const

Die ursprüngliche 'FileIdentity'-Klasse hatte alle 'const'-Mitglieder mit gelöschten 'operator='. Dadurch konnte die Klasse nicht direkt in einer Warteschlange verwendet werden, da 'Queue::wait_and_pop(T&)' eine Zugzuweisung verwendet. Die Lösung war, 'const' von den Mitgliedern zu entfernen und die Zugzuweisung explizit standardmäßig zu setzen, während die Kopiezuweisung gelöscht blieb:

```cpp
FileIdentity(const FileIdentity&) = default;
FileIdentity& operator=(const FileIdentity&) = delete;
FileIdentity& operator=(FileIdentity&&) = default;
```

Dies bewahrt die ursprüngliche Designintention (keine partiellen Mutationen, keine versehentlichen Kopien) und ermöglicht gleichzeitig Warteschlangensemantik. Die 'const'-Qualifikationen bei Mitgliedern waren eine Form der Selbstdokumentation, die die Sprache nicht durchsetzen konnte, sobald das Objekt beweglich sein musste.

## Die Ergebnisse

### HDD erster Scan (der schlimmste Fall)

| Change | Secteurs pro Datei | Zeit, die mit der Suche verbracht wurde |
|--------|---------------|-------------------|
| Before (ExifRead + DiskReader) | 2 | ~660s |
| Danach (nur DiskReader) | **1** | **~330s** |

### Thumbnail-Cache-Population

| Scan | Vor | Nach |
|------|--------|-------|
| 1. | Vorschaubilder über Pfad 1 angezeigt, keine Datenbankeinträge | **Miniaturen angezeigt + Datenbank vollständig ausgefüllt** |
| 2. | Alle Vorschaubilder gehen durch Pfad 3 (Festplattenlesen) | **Alle Vorschaubilder gehen durch Pfad 2 (Cache-Treffer)** |
| 3. | Cache endlich befüllt | Cache bereits warm vom Scan 1 |

### Pipeline-Vereinfachung

| Metrik | Vor | Nach |
|--------|--------|-------|
| Pipeline-Stufen | 8 | **7** (ExifRead entfernt) |
| Warteschlangentypen | 5 verschiedene | **4 Unterscheidbar** (keine chargenspezifischen Typen) |
| Batch-Akkumulationslogik | 4 Standorte | **1 Standort** (nur CacheStore) |
| 'FileIdentityBatchPtr'-Allocs pro Scan | ~330 (Batch ×200) | **0** (einzelne Artikel) |

### Die Rotation wird genau einmal angewendet

Der Fix stellt sicher, dass die Rotation so früh wie möglich erfolgt ('ImageLoader::load()') und in die Pixeldaten eingebettet wird, bevor etwas anderes sie berührt. Zwischengespeicherte Thumbnails, weitergeleitete Bilder und Disketten-Read-Fallbacks sehen alle dieselben ausgerichteten Pixel. Kein doppelter Rotation, kein "Kommt darauf an, welchen Weg du nimmst"-Verhalten.

## Reflexion

**Die ExifRead-Phase überlebte, weil sie nie hinterfragt wurde.** Das Cache-before-Read-Design ergab in einem Diagramm Sinn, aber niemand fragte: "Was ist der tatsächliche Preis, EXIF von der Festplatte zu lesen, bevor wir wissen, ob wir von der Festplatte lesen müssen?" Beim ersten Scan war es eine reine Belastung – 330 Sekunden unnötiges Suchen. Die richtige Lösung war nicht, ExifRead zu optimieren; es war, um zu erkennen, dass wir für die Cache-Prüfung überhaupt keine Datei-I/O brauchen.

**Batch-Warteschlangen sind eine verführerische Abstraktion.** Sie sehen aus wie eine Leistungsoptimierung – weniger Pushes, weniger Pops, weniger Warteschlangenkonkurrenz. Aber gemessen an den tatsächlichen Kosten (Festplatten-I/O, JPEG-Dekodierung, SQLite-Transaktionen) tragen sie nichts Messbares bei. Das Batching, das zählte (SQLite-Transaktionen), war für das Warteschlangensystem unsichtbar; es handelte sich um ein internes Implementierungsdetail von CacheStore.

**Der Rotationsfehler war ein Artefakt von "es funktioniert auf meinem Rechner." ** Die meisten Entwicklungsfotos werden mit Handys aufgenommen, die die korrekte EXIF-Ausrichtung eingeben – oder die Kamera des Entwicklers zeigt zufällig Orientierung 1 (normal). Der Bug trat nur bei Fotos mit nicht standardmäßigen Ausrichtungen auf, was leicht zu übersehen ist, wenn dein Testset 30 Selfies umfasst. Ein gezielter Test mit rotierten Bildern hätte das sofort erkannt.

**Code zu entfernen ist angenehm.** Die ExifRead-Klasse, die Batch-Akkumulationslogik, die 'FileIdentityBatchPtr'-Typdefinition, das 'ReadProgress'-Waisensignal – jede Löschung machte den Code etwas kleiner und etwas leichter zu verstehen. Die Unterschiede in diesem Beitrag sind überwiegend negativ, und das fühlt sich gut an.

## Nächste Schritte

Die Pipeline ist jetzt so schlank, wie es sein kann, ohne die Architektur grundlegend neu zu denken. Die übrigen Engpässe sind hardwarebedingt:

| Priorität | Was | Warum |
|----------|------|-----|
| 1 | Hardware-bewusste Auto-Tuning | Probekerne, RAM und Speichertyp beim Start, um optimale Thread-Zahlen und Warteschlangengrößen einzustellen |
| 2 | Pipeline-Metriken (ScopedTimer) | Füge pro Stufe Min/Avg/Max-Timing hinzu, um den nächsten Engpass zu erkennen, wenn sich die Hardware ändert |
| 3 | Polnische Veröffentlichung | Unterdrücken Sie Exiv2-Parserwarnungen bei fehlgeleiteten EXIF, wechseln Sie von der Konsole zum Windows-Subsystem |

Das Auto-Tuning-Element ist interessant, weil die optimale Konfiguration davon abhängt, ob man auf einer SSD (8 parallele Worker, 2 Diskreader) oder einer HDD (1 Worker, 1 Diskreader, sequentielle Lese) arbeitet. Derzeit ist das ein manuelles Konfigurationsflag. Der nächste Beitrag behandelt die Erkennung des Speichertyps und die automatische Berechnung guter Standardwerte.

---

*PhotoBoss ist Open Source. Das vollständige Repository ist verfügbar unter [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
