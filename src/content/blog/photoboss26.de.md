---
id: "photoboss26"
title: "🔧 Weiterentwicklung von PhotoBoss auf Version 1.0.0: Stabilität, Telemetrie und Release-Engineering"
seoTitle: "Weiterentwicklung von PhotoBoss auf Version 1.0.0: Stabilität, Telemetrie und Release-Engineering"
date: "2026-08-07"
category: "Software Engineering"
summary: "Dieser Beitrag beschreibt die entscheidenden Maßnahmen, die zur Absicherung von PhotoBoss für die Version 1.0.0 ergriffen wurden, wobei der Schwerpunkt auf der Korrektheit des Pipeline-Abbaus, der Speicherbegrenzung, der Cache-Integrität, der Sicherheit beim Löschen sowie Korrekturen im Rahmen der Thread-Sicherheitsprüfung liegt. Außerdem werden die technischen Aspekte der Veröffentlichung behandelt: Build-Skripte, CI-Konfiguration, ein Inno-Setup-Installationsprogramm und die Automatisierung von GitHub Releases. Der Autor reflektiert über die gewonnenen Erkenntnisse in Bezug auf konvergenzbasierte Zustandsmaschinen, Speicherprofilierung und die Vorgehensweise beim Remote-CI-Debugging."
project: "photoboss"
tags: ["C++", "Qt", "CI/CD", "Release Engineering", "Memory Management", "SQLite", "Thread Safety"]
status: "scheduled"
isAutoTranslated: true
---

Der letzte Beitrag endete mit einer positiven Nachricht. Der Fehler bei der Duplikaterkennung wurde an der Wurzel behoben – durch einen Abgleich mit *allen* Cluster-Mitgliedern und einen Abgleichpfad, der sicherstellte, dass die endgültige Gruppenliste auf dem Bildschirm angezeigt wurde. Der Reproduktionstest „Löschen und erneutes Scannen“ ergab bei beiden Durchläufen null Duplikate. Die App war funktional einwandfrei.

Aber „korrekt“ und „auslieferungsfähig“ sind zwei verschiedene Dinge. PhotoBoss ließ sich nicht außerhalb der Visual Studio-IDE kompilieren, es gab keine CI, keinen Installer und – wie ich feststellte, als ich die Pipeline mit unvoreingenommenem Blick und nicht mit den Augen dessen las, der die einzelnen Zeilen geschrieben hatte – eine Handvoll latenter Stabilitätsfehler, die nur unter Last oder beim Abbruch eines laufenden Scans auftraten. Dieser Beitrag erzählt die Geschichte der beiden Stränge, die sich zwischen dem letzten Beitrag und der Veröffentlichung von Version 1.0.0 abspielten: ein **Tier-0-Stabilitätsdurchlauf**, bei dem Lebenszyklus- und Speicherfehler behoben wurden, und das **Release-Engineering**, das das Projekt in etwas verwandelte, das andere herunterladen, installieren und ausführen können.

## Einleitung: Was „Hardening“ in diesem Zusammenhang bedeutete

PhotoBoss ist eine stufenweise, multithreaded „Producer-Consumer“-Pipeline: `FileEnumerator → CacheLookup → DiskReader → HashWorker → CacheStore`, mit einer `SimilarityEngine` und einem `ResultProcessor` am Ende, die alle über begrenzte Warteschlangen in eigenen Threads miteinander verbunden sind. Begrenzte Warteschlangen dienen als Gegendruckmechanismus; jede Stufe wird blockiert, sobald die nachfolgende Warteschlange voll ist. Dieses Design ist hervorragend für die Speichersicherheit, macht jedoch die Reihenfolge beim Abbau und Herunterfahren entscheidend – und es ist genau die Art von Code, in der ein Fehler schlummert, bis der richtige, unglückliche Zeitpunkt kommt.

Ich habe die Arbeit in zwei Gruppen unterteilt. Zunächst die Stabilitätskorrekturen, die sich in fünf Bereiche unterteilen:

1. **Pipeline-Abbruch** – einen Scan beenden und anschließend einen neuen starten, ohne dass es zu Race-Conditions kommt.
2. **Speicher** – ein Scan, bei dem jedes dekodierte Bild im Arbeitsspeicher verbleibt.
3. **„Keep-Best“-Auflösung** – die „Qualitäts“-Heuristik, die Müll bewertet.
4. **Cache-Korrektheit** – verdorbene Zeilen, veraltete Algorithmen, veraltetes Pruning.
5. **Sicherheit beim Löschen** – man sollte niemals die letzte Kopie löschen können.

Nun zum Release-Thread: Bereinigung des dunklen Designs, Versionsmetadaten, `build.ps1`, ein GitHub-Actions-Workflow, ein Inno-Setup-Installationsprogramm und GitHub Releases.

## 1. Pipeline-Abbau: genau einmal anhalten

Die alte `stop()`-Funktion war optimistisch:

```cpp
emit stateChanged(PipelineState::Stopping);
clearQueues();
m_state_ = PipelineState::Stopped;
emit stateChanged(PipelineState::Stopped);
```

Es räumte die Warteschlangen auf und erklärte sich sofort als „gestoppt“ – *während Worker-Threads noch liefen*, blockiert in genau den Warteschlangen, die es gerade geräumt hatte, oder mitten in der Bearbeitung eines Elements. Ein nachfolgender `start()`-Aufruf konnte dann parallel zu Threads laufen, die den Abwicklungsvorgang noch nicht abgeschlossen hatten. Der Destruktor hatte das gleiche Problem in umgekehrter Richtung: Er wartete auf Threads, *bevor* er sie aufforderte, sich zu beenden, sodass ein Thread, der an einer vollen Warteschlange blockiert war, dort so lange verharren würde, bis das 5-Sekunden-Timeout von `wait()` abgelaufen war.

Durch die Korrektur wird der *letzte beendete Thread* zur maßgeblichen Instanz für den Status „Stopped“:

```cpp
void Pipeline::stop()
{
    if (m_state_ == PipelineState::Stopped)
        return;

    emit stateChanged(PipelineState::Stopping);
    m_state_ = PipelineState::Stopping;

    // Discard pending work and wake all blocked consumers/producers. Threads
    // drain their current items and exit; the Stopped state is emitted by
    // onThreadFinished() once the last thread has finished.
    requestShutdown();
    clearQueues();
}
```

`requestShutdown()` setzt das Shutdown-Flag für jede Warteschlange und weckt alle darauf blockierten Prozesse; `clearQueues()` verwirft die ausstehenden Aufgaben. Jeder Thread beendet sein aktuelles Element, erkennt das Shutdown und wird beendet. Der zuletzt beendete Thread ruft `onThreadFinished()` auf, das nun bedingungslos `Stopped` ausgibt (zuvor geschah dies nur, wenn der Status `Running` war, was den Zyklus `stop()` → `start()` unterbrach). Und der Destruktor fordert nun das Herunterfahren *vor* dem Join an, sodass Joins sofort zurückkehren, anstatt in eine Zeitüberschreitung zu gehen.

Die entscheidende Erkenntnis war, dass „Stopped“ ein *konvergierter* Zustand ist und kein *angekündigter* – man kann erst dann wissen, dass man angehalten hat, wenn jeder Thread tatsächlich angehalten hat. Das war der Unterschied zwischen einer Statusbezeichnung und einer echten Zustandsmaschine.

## 2. Speicher: Jedes dekodierte Bild wurde im Arbeitsspeicher gehalten

`ResultProcessor` speicherte für jeden Eintrag in `m_items_` während des *gesamten Scanvorgangs* ein `decodedImage`, sodass der Miniaturbildgenerator das bereits dekodierte Bild wiederverwenden konnte, anstatt es erneut von der Festplatte einzulesen. Bei einem Scan mit 10.000 Fotos bedeutet das, dass 10.000 dekodierte Bilder in voller Auflösung gleichzeitig im RAM liegen – genau die Art von Fehler (OOM bei großen Scans), die das Projekt zu Beginn seiner Laufzeit zu schaffen gemacht hat.

Die Lösung besteht im Grunde aus zwei Zeilen: Bei der Anforderung der Miniaturansicht wird eine Kopie erstellt, und die langlebige Referenz wird unmittelbar danach gelöscht. Außerdem habe ich die Miniaturansicht-Warteschlange auf 512 Elemente begrenzt, sodass die Pipeline selbst während der abschließenden Gruppierungsphase keinen unbegrenzten Stapel dekodierter Bilder zwischenspeichern kann:

```cpp
auto requestThumbnail = [&](const ImageEntry &img) {
    if (m_thumbnailRequested_.contains(img.path))
        return true;
    auto thumbReq = std::make_shared<ThumbnailRequest>();
    thumbReq->path = img.path;
    thumbReq->rotation = img.rotation;
    thumbReq->width = settings::ThumbnailWidth;
    thumbReq->height = settings::ThumbnailWidth;
    auto srcIt = m_pathToItem_.find(img.path);
    if (srcIt != m_pathToItem_.end()) {
        thumbReq->preDecoded = srcIt.value()->decodedImage;
        thumbReq->fileIdentity.emplace(srcIt.value()->fileIdentity);
        // The request now holds its own copy; drop the long-lived reference
        // so decoded images don't accumulate for the whole scan.
        srcIt.value()->decodedImage.reset();
    }
    if (!m_thumbnailOutput_.push(std::move(thumbReq))) {
        thumbnailQueueClosed = true;
        return false;
    }
    m_thumbnailRequested_.insert(img.path);
    return true;
};
```

Nun wird der stationäre Speicher der Pipeline durch die Kapazität der Warteschlange begrenzt und nicht durch die Anzahl der Dateien. Das war mir nicht bewusst, bis ich darüber nachdachte, was „10.000 laufende Dekodierungen“ im RAM eigentlich bedeuten.

## 3. „Keep-best“-Auflösung: Die Heuristik bewertete ein Miniaturbild

Die `SimilarityEngine` wählt anhand einer Qualitätsheuristik einen *repräsentativen* Cluster aus – das größte, schärfste und am besten kodierte Bild gewinnt:

```cpp
double score = pixels;
score += img.fileSize * 0.001;
if (ext == "png") score *= 1.05;
```

Aber `pixels` wurde aus `HashedImageResult::resolution` berechnet, bei dem es sich um das *skalierte* Bild handelte. `HashWorker` decodiert für das Hashing mit einer Größe von 32×32 und für Miniaturansichten mit 140×140, und diese Miniaturansichtsgröße wurde als „Auflösung“ gespeichert. Jedes Bild erzielte in etwa die gleiche Punktzahl, sodass die Auswahl des „besten“ repräsentativen Bildes praktisch willkürlich war – und genau dieses repräsentative Bild wird vom Gruppen-Widget als das Bild hervorgehoben, das beibehalten werden soll.

Die Korrektur berücksichtigt die tatsächliche Auflösung wie folgt: `ImageLoader` liest die native Größe aus `QImageReader::size()` *vor* dem Aufruf von `setScaledSize()` aus (es handelt sich also um die Abmessungen vor der IDCT-Decodierung), transponiert sie für die EXIF-Ausrichtungen 5–8 und gibt sie zusammen mit dem decodierten Bild zurück:

```cpp
QSize nativeSize = reader.size();
reader.setScaledSize(QSize(size, size));
QImage img = reader.read();
...
if (orientation >= 5 && orientation <= 8) {
    nativeSize.transpose();
}
if (!nativeSize.isValid() || nativeSize.isEmpty()) {
    nativeSize = img.size();
}
return LoadedImage{ std::move(img), nativeSize };
```

`HashEngine` speichert dies als Auflösung des Ergebnisses, und die Logik zur Ernennung des Vertreters wurde dahingehend verschärft, dass der Kandidat direkt mit dem *Cluster*-Vertreter verglichen wird. Der alte Code beförderte einen Knoten nur dann, wenn er den Vertreter der exakten Gruppe schlug *und* der Cluster-Vertreter immer noch dasselbe Mitglied war – ein besserer Knoten, der eintraf, nachdem sich der Cluster-Vertreter bereits geändert hatte, wurde also stillschweigend ignoriert:

```cpp
if (better(*node, *cluster.representative)) {
    cluster.representative = node;
}
```

Nun weisen das Abzeichen „Best“ und das Symbol tatsächlich auf das Mitglied mit der höchsten Auflösung in jeder Gruppe hin.

## 4. Cache: Schema v2, Entfernung von „Poison“ und „Honest Pruning“

Der SQLite-Cache wies vier Korrektheitsprobleme auf, die alle zu einer unbemerkten Verschlechterung der Ergebnisse führen konnten:

**Fehlerhafte Zeilen.** Fehlgeschlagene Dekodierungen wurden als Marker-Hashes wie `"decode_failed"` gespeichert. Bei einem späteren Durchlauf erkannte `CacheLookup` einen „gültigen“ Hash und übersprang die Datei – eine Datei, die eigentlich nie gehasht worden war. Die Migration `1→2` löscht diese:

```cpp
bool SqliteHashCache::migrate_1_to_2()
{
    QSqlQuery q(m_db_);
    if (!q.exec("BEGIN IMMEDIATE TRANSACTION;")) return false;

    // Error-marker hashes (e.g. "decode_failed") were previously persisted
    // and can poison future lookups into false cache hits — remove them.
    q.prepare(R"(DELETE FROM hashes WHERE hash_value='decode_failed';)");
    if (!execOrLog(q, "delete error hashes")) { q.exec("ROLLBACK;"); return false; }

    q.prepare("UPDATE meta SET value='2' WHERE key='schema_version';");
    if (!execOrLog(q, "bump schema_version")) { q.exec("ROLLBACK;"); return false; }

    q.exec("COMMIT;");
    return true;
}
```

Und `CacheStore` weigert sich nun gänzlich, Ergebnisse vom Typ `HashSource::Error` dauerhaft zu speichern, sodass das Problem nicht erneut auftreten kann.

**Veraltete Algorithmusversionen.** Jede Hash-Methode hat eine Version. Wenn eine zukünftige Änderung den Algorithmus verändert, ist jeder zwischengespeicherte Hash aus der alten Version unzuverlässig. Die Suchabfrage führt nun eine Verknüpfung mit `hash_methods.version` durch und gibt einen Fehltreffer zurück, wenn sie nicht mit den Erwartungen des aktuellen Katalogs übereinstimmt:

```cpp
const int expectedVersion = cacheQuery.methodVersions.value(methodKey, -1);
if (expectedVersion != q.value(9).toInt()) {
    return CacheLookupResult{ Lookup::Miss, cacheQuery.fileIdentity };
}
```

**„prune“ hat Unterverzeichnisse nicht berücksichtigt.** `prune(root)` hat nur Dateien gelöscht, deren Pfad mit dem Stammverzeichnis *übereinstimmte* – daher blieben veraltete Einträge in Unterordnern eines erneut gescannten Verzeichnisses für immer erhalten. Jetzt löscht es das Stammverzeichnis *oder* alles, was sich darunter befindet:

```cpp
DELETE FROM files
WHERE (last_seen_scan_id IS NULL OR last_seen_scan_id != :scanId)
  AND (path = :path OR path LIKE :pathPrefix);
```

**Konflikt.** Der Cache besteht aus einer einzigen SQLite-Verbindung, die vom `CacheStore`-Thread aus in gebündelten Transaktionen schreibt, während Suchvorgänge über eine andere Verbindung ausgeführt werden. Ohne ein Timeout bei hoher Auslastung könnte die Abfrage mit `SQLITE_BUSY` fehlschlagen und jede Datei als Fehltreffer behandeln. `PRAGMA busy_timeout=5000` sorgt dafür, dass SQLite wartet, anstatt einen Fehler zu melden.

## 5. Sicherheit beim Löschen: die beiden Schutzmechanismen

Zwei kleine, aber bedeutende Änderungen:

**Mindestens ein „Behalten“-Eintrag.** `GroupWidget` verhindert nun, dass der Benutzer den letzten „Behalten“-Eintrag in einer Gruppe deaktivieren kann. Ohne diese Funktion könnten bei einer Gruppe aus drei identischen Dateien alle drei als „Löschen“ markiert sein – und der Löschdialog würde einem ohne Weiteres erlauben, jede einzelne Kopie zu löschen:

```cpp
void GroupWidget::onThumbSelectionChanged(ImageThumbWidget* thumb, bool nowKeep)
{
    // Safety: never allow a group to end up with zero Keep entries, which
    // would let the user delete every copy of a group.
    if (!nowKeep && countKept() == 0) {
        thumb->setState(ImageThumbWidget::State::Keep);
        return;
    }
    m_userModified_ = true;
    emit selectionChanged();
}
```

**Löschen nur in den Papierkorb.** Im vorherigen Beitrag habe ich eine Ausweichlösung für das endgültige Löschen hinzugefügt, falls `QFile::moveToTrash` fehlschlägt (Netzlaufwerke, nicht unterstützte Dateisysteme). Bei näherer Betrachtung stellte diese Ausweichlösung jedoch einen Kompromiss hinsichtlich der *Datensicherheit* dar: Der Bestätigungsdialog verspricht einen rückgängig machbaren Vorgang, sodass das stillschweigende Löschen einer Datei, um dem Begriff „Löschen“ gerecht zu werden, gegen die wichtigere Vereinbarung verstößt. `TrashDeletionStrategy` ist nun auf den Papierkorb beschränkt:

```cpp
bool deleteFile(const QString& path) override
{
    // Move to the system trash only. Never fall back to a permanent
    // delete: the confirmation dialog promises an undoable operation,
    // and silently destroying data would violate that contract.
    QString nativePath = QDir::toNativeSeparators(path);
    return QFile::moveToTrash(nativePath);
}
```

Wenn das Verschieben in den Papierkorb fehlschlägt, bleibt die Datei erhalten – der Benutzer sieht, dass sie nicht gelöscht wurde, und kann der Sache nachgehen, anstatt Daten zu verlieren, von denen ihm gesagt wurde, er könne sie wiederherstellen.

## Der Audit-Durchlauf: QPixmap, Beenden der Warteschlange und Ausnahmen

Nach den Stabilitätskorrekturen habe ich eine umfassende Überprüfung durchgeführt und dabei eine Reihe von Punkten gefunden, bei denen es „im Großen und Ganzen funktioniert, aber falsch ist“; diese wurden unter dem Titel *Verbleibende Prüfpunkte beheben* festgeschrieben:

**QPixmap ist ausschließlich für den GUI-Thread vorgesehen, und wir haben gegen diese Vorgabe verstoßen.** `QPixmap::fromImage` wurde in Worker-Threads aufgerufen (im Pfad `UiUpdateQueue::setThumbnail`). Qt dokumentiert dies als nicht unterstützt; `QPixmap` basiert auf nativen Ressourcen, die davon ausgehen, dass sie im GUI-Thread liegen. Die Pipeline verwendet nun durchgehend `QImage`, und die Konvertierung zu `QPixmap` erfolgt an einer einzigen Stelle im GUI-Thread — `ThumbnailManager::distributeThumbnails`, das nun endlich *seinen eigenen Miniaturansicht-Cache füllt* (dieser war bisher stillschweigend leer gewesen, sodass die im vorherigen Beitrag erwähnte Wiederverwendung des Caches im Löschdialog nie tatsächlich zum Tragen kam):

```cpp
void ThumbnailManager::distributeThumbnails(const QMap<QString, QImage>& thumbnails)
{
    for (auto it = thumbnails.constBegin(); it != thumbnails.constEnd(); ++it) {
        const QImage& img = it.value();
        // QPixmap must only be created on the GUI thread; this method is
        // always invoked from the UI thread.
        QPixmap pix = QPixmap::fromImage(img);
        m_thumbnailCache_[path] = pix;
        ...
    }
}
```

**`Queue::producer_done()` könnte dazu führen, dass eine Warteschlange dauerhaft offen bleibt.** Bei der Produzenten-Zählung `fetch_sub` könnte es zu einem Unterlauf kommen, wenn ein Produzent die Funktion öfter aufruft, als er registriert ist – was genau dann passiert, wenn eine Stufe abnormal abgewickelt wird –, wodurch die Zählung beispielsweise bei `-1` stehen bleibt und die Warteschlange für den Rest des Prozesses offen bleibt. Sie ist nun idempotent:

```cpp
void producer_done() {
    const auto remaining =
        m_producers_.fetch_sub(1, std::memory_order_acq_rel) - 1;
    if (remaining <= 0) {
        m_producers_.store(0, std::memory_order_relaxed);
        shutdown();
    }
}
```

**`onStop()` war nicht garantiert.** `StageBase::run()` rief `onStop()` erst auf, nachdem `doRun()` ordnungsgemäß zurückgekehrt war. Wenn `doRun()` eine Ausnahme auslöste (Nicht-Standard-Ausnahmen, auf `QString` basierende Ausnahmen), wurde `onStop()` nie ausgeführt, und alle ihm zugehörigen Queue-Producer wurden nie freigegeben – was zu einem dauerhaften Hängenbleiben der Pipeline führte. Nun garantiert eine RAII-Sicherung dies, und der Catch-All-Block macht den Fehler zudem sichtbar:

```cpp
struct EnsureStop {
    StageBase* stage;
    ~EnsureStop() { stage->onStop(); }
} ensureStop{ this };

try {
    doRun();
}
catch (const std::exception& e) {
    error(QString::fromUtf8(e.what()));
}
catch (...) {
    error(QStringLiteral("Unknown error in pipeline stage"));
}
```

**Fehler in den Stufen blieben bisher unbeachtet.** `StageBase::error` hatte keine Abonnenten. `PipelineFactory` leitet nun den Fehler jeder Stufe an einen Handler weiter, der ihn protokolliert und in der Statusleiste anzeigt – so ist ein Fehlschlag in einer Stufe kein stilles Rätsel mehr.

**Toter Code.** Die nie verwendete Konfigurationsoption `weakThreshold` sowie den „Aspect-Ratio“-Hash-Zweig, der zwar registriert, aber nie tatsächlich eine Methode erstellt hat, wurden entfernt.

**Einstellbare Schwellenwerte.** Die Ähnlichkeitsschwellenwerte wurden von Konstanten zur Kompilierungszeit in `QSettings` verlagert (über eine kleine Hilfsdatei `SimilaritySettings.h`), wobei standardmäßig die fest kompilierten Werte verwendet werden – daher ist für die Anpassung von `strong`/`pHashGate`/`dHashGate` kein Neukompilieren mehr erforderlich:

```cpp
inline double similarityThreshold(const QString& key, double defaultValue)
{
    return QSettings().value(QStringLiteral("similarity/") + key, defaultValue).toDouble();
}
```

## Release-Engineering: Von der IDE bis zum Installationsprogramm

Der Stabilitätsdurchlauf hat die App *einwandfrei* gemacht. Der Release-Thread hat sie *verteilbar* gemacht.

**Dunkles Design:** Das Stylesheet verwendete durchgehend die Syntax `var(#2d2d2d)` – diese ist in Qt-Stylesheets ungültig, sodass ein Großteil der Formatierung stillschweigend außer Kraft gesetzt wurde. Wurde durch Hexadezimal-Literale ersetzt.

**Identität:** eine `app.ico`-Datei, eine `.rc`-Versionsressource mit der Angabe `1.0.0` (damit die EXE-Datei die richtigen Eigenschaften anzeigt) und das in `main.cpp` verknüpfte Fenstersymbol.

**`build.ps1`:** Bislang waren für das Projekt die Qt VS Tools in der IDE installiert sein müssen. Das Skript erkennt MSBuild und Qt automatisch (über `vswhere`/`QT_DIR`/einen Scan von `C:\Qt`), übergibt `-p:QtInstall` und – mit `-Deploy` — `windeployqt` aus, bündelt die VC++-CRT-DLLs (windeployqt entfernt nur den Redistribution-*Installer*, nicht die DLLs), bündelt die vcpkg-Laufzeit-DLLs und komprimiert einen portablen Ordner. `windeployqt --compiler-runtime` zusammen mit einer expliziten Kopie von `msvcp140.dll` usw. bedeutet, dass der Ausgabeordner auf einem Rechner läuft, auf dem nichts installiert ist:

```powershell
& $windeployqt --release --no-translations --no-system-d3d-compiler --no-opengl-sw --compiler-runtime $deployDir
...
$crtDll = Get-ChildItem $redistRoot -Recurse -Filter "msvcp140.dll" |
    Where-Object { $_.FullName -match "x64\\Microsoft\.VC\d+\.CRT\\" } |
    Sort-Object FullName -Descending | Select-Object -First 1
if ($crtDll) {
    Copy-Item (Join-Path $crtDll.DirectoryName "*.dll") $deployDir
}
```

**CI (GitHub Actions).** Der Workflow erstellt die x64-Version, führt die Bereitstellung mit windeployqt durch, bündelt die vcpkg-DLLs, kompiliert das Installationsprogramm und lädt die Artefakte hoch. Das Interessante daran war, Qt auf einem Runner *ohne* die VS-Erweiterung zum Kompilieren zu bringen: Die eigenständige Datei `qt-vsaddin-msbuild-<ver>.zip` enthält `Qt.props`/`qt.targets`, sodass eine heruntergeladene Kopie, auf die über `-p:QtMsBuild` verweist, genau das, was die Erweiterung lokal tut.

Hier habe ich die Regel der „ehrlichen Dokumentation“ auf die harte Tour gelernt – der CI-Pfad erforderte **fünf Commits** zur Fehlerbehebung, und jeder Fehlschlag war eine echte, reproduzierbare Lektion:

1. **Das Modul `qtsvg` existierte nicht.** Im Workflow wurde es als Qt-Modul aufgeführt; der Installationsschritt schlug sofort fehl. (Es ist in der Basisinstallation von Qt 6.9.1 enthalten, wird von der App jedoch nicht verwendet.) Die Zeile wurde gelöscht.
2. **`libexpat.dll` fehlte auf dem Runner.** Das lokale vcpkg-exiv2 verknüpft libexpat dynamisch; das vcpkg-exiv2 des Runners verknüpft es *statisch*. Die fest codierte DLL-Liste hat die Bereitstellung verhindert. Lösung: Kopiere das *gesamte* vcpkg-Verzeichnis `bin` – „der genaue Umfang variiert je nach vcpkg-Version“ ist eine Lektion, kein Vorbehalt.
3. **Zip-in-a-Zip.** Ich habe eine ZIP-Datei gepackt und dann hochgeladen – Nutzer, die das Artefakt herunterluden, erhielten eine ZIP-Datei, die eine weitere ZIP-Datei enthielt. Lösung: Den Ordner `dist\photoboss` direkt hochladen; GitHub komprimiert die Datei beim Herunterladen.
4. **Tag-Pushes haben den Workflow nicht ausgelöst.** Die `on:`-Klausel listete Zweige, aber keine Tags auf, sodass das von mir gepushte Tag „v1.0.0“ keine Wirkung zeigte. Ich habe `tags: ['v*']` hinzugefügt.
5. **`gh release create` schlug mit einem HTTP-Fehler 403 fehl.** Das Standard-`GITHUB_TOKEN` ist schreibgeschützt; zum Erstellen eines Releases sind für den Job die Berechtigungen `permissions: contents: write` erforderlich.

Jeder Fehler wurde durch Auswerten der Aktionsprotokolle entdeckt – da man einen Remote-Runner nicht schrittweise debuggen kann, wurde der Workflow ungewöhnlich selbsterklärend, wobei jeder Schritt seine Ausgabe überprüfte (`if (-not (Test-Path $installer)) { throw "Installer wurde nicht erstellt" }`).

**Installationsprogramm.** `installer.iss` (Inno Setup 6) bündelt den Ordner „deploy“ in eine einzige Datei `PhotoBoss-Setup-<ver>.exe` – Programmdateien oder benutzerspezifische Verknüpfungen im Startmenü und auf dem Desktop, Deinstallationsprogramm, versionierte Setup-Metadaten. Die Version wird zum Zeitpunkt der CI aus dem Git-Tag abgeleitet:

```ini
[Setup]
AppId={{EBD1991B-CE9A-4B45-837E-82F853F8FE78}
AppVersion={#MyAppVersion}
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=lzma2
SolidCompression=yes

[Files]
Source: "{#DeployDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
```

**Veröffentlichungen.** Beim Pushen eines `v*`-Tags werden nun der Build und das Deployment durchgeführt, das Installationsprogramm kompiliert und der Befehl `gh release create` mit dem angehängten Installationsprogramm ausgeführt:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

## Die Realität hinter SmartScreen

Es gibt einen wichtigen Hinweis, der bei jedem Build beachtet werden muss: PhotoBoss ist **nicht codesigniert**. Authenticode-Zertifikate sind kostenpflichtig, dies ist jedoch kostenlose Open-Source-Software, weshalb ich die Signierung bewusst zurückgestellt habe. Die Folge ist, dass Windows SmartScreen bei heruntergeladenen Builds die Meldung *„Windows hat Ihren PC geschützt“* anzeigt – nicht, weil die Datei schädlich ist, sondern weil sie nicht signiert und unbekannt ist. Die README-Datei beschreibt genau, was zu tun ist (Weitere Infos → „Trotzdem ausführen“, ZIP-Datei nach dem Download entsperren) und nennt die verbleibende Option: Signierung in CI mit einem als GitHub-Secret gespeicherten Zertifikat. Ich habe mich mit Azure Artifact Signing (dem verwalteten Signierungsdienst von Microsoft) als wahrscheinlichstem Weg befasst – Public-Trust-Zertifikate, die dafür ausgelegt sind, SmartScreen zu umgehen –, habe das Repo aber vorerst unsigniert gelassen. Es handelt sich um eine Entscheidung hinsichtlich der Verteilungsqualität, nicht um eine Frage der Korrektheit, und sie ist dokumentiert und nicht verborgen.

## Ergebnisse und Validierung

- **v1.0.0 wurde veröffentlicht**: https://github.com/maximoh-mmo/PhotoBoss/releases/tag/v1.0.0, mit der angehängten Datei `PhotoBoss-Setup-1.0.0.exe` (18 MB), die vollständig per CI erstellt wurde.
- **Das Anhalten und Neustarten ist sicher.** Das Anhalten während eines Scans und das sofortige Starten eines neuen Scans führt nicht mehr zu einem Wettlauf; die Pipeline konvergiert zu einem echten `Stopped`-Zustand.
- **Der Speicherverbrauch ist begrenzt.** Die dekodierten Bilder eines umfangreichen Scans durchlaufen nun eine Warteschlange mit 512 Elementen und werden freigegeben, anstatt sich über den gesamten Lauf hinweg anzusammeln.
- **Der Cache ist zuverlässig.** Verfälschte Zeilen werden entfernt und können nicht erneut erscheinen; Änderungen der Algorithmusversion machen veraltete Hashes ungültig, anstatt ihnen zu vertrauen; das Bereinigen von Unterverzeichnissen führt tatsächlich zu einer Bereinigung.
- **Das Löschen kann eine Gruppe nicht vollständig vernichten.** „At-least-one-Keep“ wird in der Benutzeroberfläche durchgesetzt, und jedes Löschen ist entweder eine Verschiebung in den Papierkorb oder gar nichts.
- **Die Audit-Elemente sind abgeschlossen.** Kein `QPixmap` mehr in Worker-Threads, `producer_done` ist idempotent, `onStop()` ist ausnahmensicher, und Stage-Fehler werden in der Statusleiste angezeigt.
- **Die CI-Hürde ist echt.** Sechs Commits zur Fehlerbehebung im Workflow haben eine Pipeline hervorgebracht, die anhand eines einzigen Tag-Pushes den Build, das Deployment, die Installation und die Veröffentlichung durchführt – und ich kann jeden Schritt lokal über `build.ps1` reproduzieren.

Ehrlich gesagt gibt es da noch Einschränkungen: Alles wird nach wie vor *manuell* überprüft. Es gibt keine automatisierte Testsuite – genau die Lücke, die im vorherigen Beitrag als „nächster Schritt“ genannt wurde. Und die Builds bleiben unsigniert, bis ich zu dem Schluss komme, dass der Aufwand im Verhältnis zum Nutzen steht.

## Herausforderungen und Lösungen

- **Teardown ist ein Konvergenzproblem.** Am schwierigsten war es, zu verinnerlichen, dass „Stopped“ nur von dem *letzten* Thread ausgegeben werden kann, der fertig ist – jeder Code, der dies früher meldet, spekuliert lediglich. Sobald ich aufgehört habe, dies zu melden, und mit der Konvergenz begonnen habe, wurde der Stopp-/Start-Zyklus trivial sicher.
- **Speicherfehler sind unsichtbar, bis sie es nicht mehr sind.** 10.000 residente Dekodierungen schlagen bei einem Ordner mit 5.000 Fotos nicht fehl; sie schlagen erst später fehl, bei der Bibliothek des Benutzers mit 200.000 Fotos. Die Behebung (das Zurücksetzen der langlebigen Referenz in dem Moment, in dem sie kopiert wird) ist geringfügig; die Diagnose (das Nachverfolgen, wo sich dekodierte Bilder während eines gesamten Scanvorgangs befanden) ist die eigentliche Arbeit.
- **Der Cache logste still vor sich hin.** `"decode_failed"`-Zeilen führten dazu, dass der Cache *überzeugt falsch* war – der schlimmste Fehlerfall, da nichts protokolliert wird und die Ergebnisse korrekt aussehen. Versionsbewusste Abfragen und das Entfernen von „Gift“ verwandeln eine stille Lüge in eine explizite Neuberechnung.
- **Remote-Debugging ist eine eigene Disziplin.** Man kann einen GitHub-Actions-Runner nicht schrittweise debuggen. Die Workflow-Fehler zwangen mich dazu, jeden Schritt seinen eigenen Erfolg überprüfen zu lassen und lautstark zu scheitern – was sich als besseres CI-Design herausstellte, als das, was ich mit einem verfügbaren Debugger geschrieben hätte.
- **Der Kompromiss bei der Signierung.** Ich habe mich für v1.0.0 ausdrücklich für „nicht signiert + dokumentiert“ anstelle von „signiert, aber mit Aufwand verbunden“ entschieden. Das ist die richtige Entscheidung für die aktuelle Phase dieses Projekts, und die README-Datei bietet den Nutzern einen klaren, sicheren Weg.

## Reflexion und gewonnene Erkenntnisse

**Der Versand zwingt einen dazu, Fragen zu beantworten, denen man bisher aus dem Weg gegangen ist.** Die Pipeline „funktionierte“ monatelang – bis ich fragte, was bei einem zweiten Scan, beim Abbau oder bei weniger als 10.000 Bildern passierte. Jeder Stabilitätsfehler in diesem Beitrag wies das gleiche Muster auf: korrekt im Normalfall, fehlerhaft im Grenzfall. Die Audit-Denkweise (jede Zeile so zu lesen, als wäre sie falsch) hat diese Fehler ans Licht gebracht.

**Bei der Thread-Sicherheit geht es um Vereinbarungen, nicht nur um Race-Bedingungen.** Der `QPixmap`-Fehler wies keine sichtbare Race-Bedingung auf – es handelte sich um einen Verstoß gegen eine dokumentierte API-Vereinbarung, deren Funktionieren Qt zufällig zulässt. Das kritische Lesen der Qt-Dokumentation (Was wird vom Aufrufer *erwartet*?) deckte eine Klasse von Fehlern auf, die ein Sanitizer niemals entdeckt hätte.

**Tooling-Komponenten.** Ein Build-Skript mit einem einzigen Befehl (`build.ps1`) war die Voraussetzung für CI; CI war die Voraussetzung für ein Installationsprogramm; das Installationsprogramm war die Voraussetzung für eine Veröffentlichung. Ohne den Umstieg von der IDE-basierten auf die automatisierte Erstellung wäre die gesamte Release-Entwicklung nicht möglich gewesen, da ich nichts Zuverlässiges gehabt hätte, das ich einem Release beifügen konnte.

**Die besten Korrekturen sind die unsichtbaren.** Nichts in diesem Beitrag hat auch nur ein einziges Pixel der Benutzeroberfläche oder ein einziges Gruppierungsergebnis verändert. Aber die App ist nun deutlich zuverlässiger – und einem Nutzer, der auf einen „Teardown“-Absturz oder einen stillen Cache-Fehler stößt, ist es egal, dass die Gruppierungsberechnungen perfekt waren.

## Zukunftsbezogene Aussagen

| Bereich | Status |
| --- | --- |
| Pipeline-Abbau (genau einmal anhalten) | ✅ v1.0.0 |
| Begrenzter Speicher (Miniaturansichtswarteschlange + Referenzlöschung) | ✅ v1.0.0 |
| Aufbewahrung der besten Auflösung (native Größe) | ✅ v1.0.0 |
| Cache v2: Entfernung von „Poison“, versionsabhängig, Bereinigung von Unterverzeichnissen | ✅ v1.0.0 |
| Löschsicherheit (mindestens ein „Keep“, nur Papierkorb) | ✅ v1.0.0 |
| Überprüfung der Thread-Sicherheit (QPixmap, Warteschlange, Ausnahmen) | ✅ v1.0.0 |
| `build.ps1` + GitHub Actions + Installationsprogramm + Releases | ✅ v1.0.0 |
| Automatisierte Testsuite für `SimilarityEngine` | 🔜 demnächst |
| Codesignierung (Azure Artifact Signing) | 🔜 falls die Verbreitung zunimmt |
| Optimierung des Scan-Profils / weitere Leistungsoptimierungen | 🔜 nach Bedarf |

Im letzten Beitrag wurde „als Nächstes“ ein echtes Test-Harness für `SimilarityEngine` versprochen, und dieser Beitrag hat dies stillschweigend nicht geliefert – das ist die ehrliche Lücke, und sie steht als Nächstes auf der Liste. Die Clustering-Engine verfügt nun über konkrete Verhaltensgarantien, die es zu testen gilt (All-Members-Recall, Kettengruppengrenzen, repräsentative Auswahl), und da die Pipeline selbst nun stabil ist, gibt es eine solide Grundlage, auf der die Tests ausgeführt werden können. In der Zwischenzeit hat sich PhotoBoss von „läuft auf meinem Rechner“ zu einer Version 1.0.0 entwickelt, die jeder installieren kann.
