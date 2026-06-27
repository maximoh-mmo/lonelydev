---
id: "photoboss24"
title: "📊 Scan-Profile: Nutzern Kontrolle über den Ressourcenverbrauch der Pipeline geben"
seoTitle: "Scan-Profile: Benutzern die Kontrolle über die Nutzung von Pipeline-Ressourcen geben"
date: "2026-07-24"
category: "Softwareentwicklung"
summary: "Der Artikel stellt ein Hardware-Testsystem sowie konfigurierbare Scan-Profile vor, die die Anzahl der Threads und die Speicherauslastung entsprechend der Anzahl der physischen und logischen Kerne sowie des Arbeitsspeichers eines Rechners anpassen. Er erläutert die Umsetzung, die Integration in die Benutzeroberfläche sowie Leistungsverbesserungen bei verschiedenen Hardwarekonfigurationen."
project: "photoboss"
tags: ["HardwareProber", "ScanProfile", "Qt", "Multithreading", "Performance Optimization"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

In den letzten Beiträgen habe ich die Pipeline von PhotoBoss so lange optimiert, bis der Engpass eindeutig bei der Hardware lag – Festplatten-E/A, CPU-Kerne und Speicherbandbreite. Die Pipeline hat sich automatisch selbst ausbalanciert, und auf meinem Entwicklungsrechner (16 logische Kerne, 32 GB RAM, SSD) flog sie förmlich durch die Scans.

Aber PhotoBoss läuft nicht nur auf meinem Rechner. Es wird auch auf Laptops mit 4 Kernen und 8 GB RAM laufen, auf denen ein aufwendiger Scan das System unbrauchbar machen würde. Es wird auch auf Workstations mit 32 Kernen und 64 GB laufen, wo es genauso schlecht ist, Ressourcen ungenutzt zu lassen, wie sie zu überbelegen.

Der alte Ansatz verwendete für alles `QThread::idealThreadCount()` – Festplattenleser, Hash-Verarbeiter, Miniaturbildgeneratoren – alle erhielten dieselbe Formel. Ein Laptop mit 4 Kernen und eine Workstation mit 32 Kernen versuchten es mit derselben Thread-Anzahl. Das Ergebnis war entweder zu langsam (verschwendete Kerne) oder zu aggressiv (das System kam zum Stillstand).

Dieser Beitrag behandelt den 'HardwareProber', der erkennt, was die Maschine hat, das 'ScanProfile'-System, das Hardwaredaten in vernünftige Thread-Zahlen übersetzt, und den Einstellungsdialog, mit dem Nutzer einen Kompromiss zwischen Hintergrund-Leerlauf und Vollgas wählen lassen.

## Schritt 1: Machen Sie sich mit Ihrer Hardware vertraut

Bevor du etwas abstimmen kannst, musst du wissen, womit du es zu tun hast. 'QThread::idealThreadCount()' gibt logische Kerne an, was ein Anfang ist, aber es sagt dir nicht:

- **Physische vs. logische Kerne** — Bei einer CPU mit Hyper-Threading werden 8 physische Kerne als 16 logische Kerne dargestellt. Der Betrieb von 16 CPU-gebundenen Workern auf 8 physischen Kernen führt zu Konflikten, ohne den Durchsatz zu steigern. Für rechenintensive Aufgaben wie Hashing sind physische Kerne vorzuziehen. Bei I/O-gebundenen Aufgaben wie dem Lesen von Dateien ist eine Überbelegung in Ordnung, da die Worker die meiste Zeit damit verbringen, auf die Festplatte zu warten.
- **Gesamter Arbeitsspeicher** — Die CacheStore-Batchgröße sollte sich nach dem verfügbaren Speicher richten. Auf einem Rechner mit 64 GB können Sie problemlos 400 Elemente pro Transaktion bündeln. Auf einem Rechner mit 8 GB sind 100 sicherer, um eine Überlastung des Seiten-Caches zu vermeiden.

### HardwareProber

Das Schwierige ist, physische Kerne portabel zu erkennen. Windows' 'GetLogicalProcessorInformationEx(RelationProcessorCore, ...)' gibt direkt die physische Kernanzahl an; Linux benötigt '/proc/cpuinfo'-Parsing, bei dem physische/Core-IDs abgestimmt werden, um Hyperthreads zu deduplizieren:

```cpp
// Windows
static int detectPhysicalCoreCount()
{
    DWORD len = 0;
    GetLogicalProcessorInformationEx(RelationProcessorCore, nullptr, &len);
    std::vector<char> buf(len);
    auto info = reinterpret_cast<SYSTEM_LOGICAL_PROCESSOR_INFORMATION_EX*>(buf.data());
    GetLogicalProcessorInformationEx(RelationProcessorCore, info, &len);

    int cores = 0;
    DWORD offset = 0;
    while (offset < len) {
        auto p = reinterpret_cast<SYSTEM_LOGICAL_PROCESSOR_INFORMATION_EX*>(buf.data() + offset);
        if (p->Relationship == RelationProcessorCore)
            ++cores;
        offset += p->Size;
    }
    return cores;
}
```

```cpp
// Linux
static int detectPhysicalCoreCount()
{
    std::unordered_set<std::string> seen;
    std::ifstream cpuinfo("/proc/cpuinfo");
    std::string line;
    while (std::getline(cpuinfo, line)) {
        if (line.rfind("physical id", 0) == 0 ||
            line.rfind("core id", 0) == 0) {
            auto pos = line.find(':');
            if (pos != std::string::npos)
                seen.insert(line.substr(pos + 1));
        }
    }
    return seen.empty() ? QThread::idealThreadCount() : seen.size();
}
```

Die PROBING-Logik für RAM ist einfacher – 'GlobalMemoryStatusEx' unter Windows, 'sysconf(_SC_PHYS_PAGES) * sysconf(_SC_PAGE_SIZE)' unter Linux:

```cpp
HardwareProfile HardwareProber::probe()
{
    return {
        .logicalCoreCount  = QThread::idealThreadCount(),
        .physicalCoreCount = detectPhysicalCoreCount(),
        .hasHyperthreading = logicalCoreCount > physicalCoreCount,
        .totalRamBytes     = detectTotalRam()
    };
}
```

Das `HardwareProfile` wird beim Start einmalig in `main()` abgefragt und in den `PipelineController` eingefügt, der es an die `PipelineFactory` weiterleitet.

## Schritt 2: Scan-Profile definieren

Da die Hardware-Daten vorlagen, stellte sich die Frage: Wie sollte die Anzahl der Threads skaliert werden? Die feste Programmierung von Formeln, die physische/logische Kerne mit festen Verhältnissen multiplizieren, war anfällig – für jemanden würde das Ergebnis immer falsch sein.

Stattdessen habe ich drei `ScanProfile`-Werte definiert, die unterschiedliche Kompromisse bei den Ressourcen widerspiegeln:

| Profil | Festplattenleser | Hash-Arbeiter | Thumbnail-Arbeiter | Wann verwendet werden sollte |
|---------|-------------|-------------|-------------------|-------------|
| 'Hintergrund' | max(1, physCores/4) | max(1, physCores/4) | max(1, physCores/4) | Du benutzt die Maschine aktiv |
| 'Ausgeglichen' | max(1, physCores/2) | max(1, physCores-1) | max(2, physCores/2) | Standard – guter Durchsatz ohne Sättigung |
| 'Schnell' | max(1, logCores/2) | logCores | max(2, logCores) | Maximale Durchsatzleistung, volle Ressourcennutzung |

Das Muster in 'PipelineFactory' ist eine einzelne Switch-Anweisung pro Ressourcendimension:

```cpp
switch (config.request.profile) {
case ScanProfile::Background:
    diskReaderCount = parallel ? std::max(1, physCores / 4) : 1;
    hashWorkerCount = parallel ? std::max(1, physCores / 4) : 1;
    break;
case ScanProfile::Fast: {
    int n = std::max(1, logCores);
    diskReaderCount = parallel ? std::max(1, n / 2) : std::max(1, n / 4);
    hashWorkerCount = parallel ? n : 2;
    break;
}
case ScanProfile::Balanced:
default:
    diskReaderCount = parallel ? std::max(1, physCores / 2) : 1;
    hashWorkerCount = parallel ? std::max(1, physCores - 1) : 1;
    break;
}
```

Ein paar Dinge, die man beachten sollte:

- **`parallel`-Prüfung**: Bei Festplatten (die zwar erkannt, aber zur Laufzeit noch nicht geprüft wurden – dazu mehr in einem späteren Beitrag) sinkt die Anzahl der Festplatten-Leser unabhängig vom Profil auf 1. Mehrere gleichzeitige Lesevorgänge auf einer rotierenden Festplatte beeinträchtigen den Durchsatz; die Suchzeit ist dabei ausschlaggebend.
- **Hintergrundbegrenzung auf physCores/4**: Auf einem Laptop mit 4 Kernen sind das 1 Festplattenleser, 1 Hash-Worker und 1 Thumbnail-Worker. Das System bleibt reaktionsfähig.
- **„Fast“ nutzt logische Kerne**: Für Hash-Worker, die CPU-gebunden sind, aber genügend Speicherverzögerungen aufweisen (JPEG-Decodierung → Hashing), sodass Hyperthreading zu einem nützlichen Durchsatz beiträgt. `logCores` ist hier angemessen.
- **Balanced verwendet physCores-1**: Lässt einen Kern für das Betriebssystem, den UI-Thread und andere Prozesse frei. Dies war der alte fest codierte Wert aus `QThread::idealThreadCount() - 1`.

### RAM-bewusste Cache-Batchgröße

Der CacheStore gruppiert die Elemente zu SQLite-Transaktionen. 'START IMMEDIATE' + 'COMMIT' kostet ~10 ms Fsync pro Transaktion, sodass das Batchen von 100 statt 1 ~99 % des Transaktionsaufwands spart.

Die Stapelgröße sollte sich jedoch nach der RAM-Kapazität richten. Auf einem Rechner mit 64 GB bedeutet ein Stapel von 400 Elementen, dass der Batch-Puffer im Arbeitsspeicher (dekodierte Miniaturansichten mit jeweils ca. 8 KB) etwa 3,2 MB groß ist – was vernachlässigbar ist. Auf einem Rechner mit 8 GB entlastet ein Stapel von 100 Elementen den Seitencache:

```cpp
quint64 ramGB = config.hwProfile.totalRamBytes / (1024ULL * 1024ULL * 1024ULL);
int cacheBatchMultiplier = ramGB >= 32 ? 4 : ramGB >= 16 ? 2 : 1;
int effectiveCacheBatchSize = settings::CacheStoreBatchSize * cacheBatchMultiplier;
```

Die effektive Batch-Größe wird nun als Parameter an den Konstruktor von `CacheStore` übergeben, anstelle der bisherigen fest codierten Konstante `settings::CacheStoreBatchSize`.

## Schritt 3: Der Einstellungsdialog

Mit dem Backend brauchte ich eine Möglichkeit, wie Nutzer das Profil ändern können. Das bestehende Hauptfenster hatte eine deaktivierte Aktion "Einstellungen" – einen Platzhalter aus dem UI-Formular. Es war Zeit, es zu verkabeln.

### Der Dialog

'SettingsDialog' ist ein minimales QDialog mit einer Kombibox und einem Beschreibungslabel. Die entscheidende Designentscheidung war, die Beschreibung dynamisch zu gestalten – sie zeigt nur die Erklärung des aktuell ausgewählten Profils, nicht alle drei gleichzeitig:

```cpp
auto updateDesc = [this, descLabel]() {
    switch (static_cast<ScanProfile>(m_profileCombo_->currentData().toInt())) {
        case ScanProfile::Background:
            descLabel->setText(tr("Minimal resource use \u2014 scan while you work."));
            break;
        case ScanProfile::Balanced:
            descLabel->setText(tr("Good throughput without saturating the system."));
            break;
        case ScanProfile::Fast:
            descLabel->setText(tr("Maximum parallelism \u2014 uses all available cores."));
            break;
    }
};
updateDesc();
connect(m_profileCombo_, QOverload<int>::of(&QComboBox::currentIndexChanged),
        this, updateDesc);
```

Dies wurde durch eine Code-Review-Beobachtung inspiriert: Die ursprüngliche Implementierung hatte eine QLabel, in der alle drei Beschreibungen als eine einzige '\n'-getrennte Zeichenkette fest kodiert waren. Es funktionierte, aber es war visuell verrauscht – man musste alle drei Beschreibungen analysieren, um zu verstehen, welche zutrifft. Das dynamische Label aktualisiert sich sofort, während du durch die Kombo wechselst, und gibt sofortiges Feedback.

Das Dialogfeld wird vom MainWindow über einen neuen `openSettings()`-Slot geöffnet, der das aktuelle Profil übergibt und die Auswahl des Benutzers zurückliest:

```cpp
void MainWindow::openSettings()
{
    SettingsDialog dialog(m_profile_, this);
    if (dialog.exec() == QDialog::Accepted) {
        m_profile_ = dialog.selectedProfile();
    }
}
```

'm_profile_' wird als Mitglied von 'MainWindow' gespeichert (standardmäßig auf 'Balanced') und in jedem 'ScanRequest' enthalten, wenn der Scan beginnt. Noch keine Persistenz – das Profil setzt sich beim Neustart der Anwendung auf 'Ausgeglichen' zurück – aber die Rohrleitung ist bereit für eine Einstellungs-Persistenzschicht.

## Die Ergebnisse

### Before (alle Profile identisch, nur QThread::idealThreadCount)

Auf einer 12-Kern-/24-Thread-Maschine verwendete jeder Scan:
- 12 Hash-Worker ('idealThreadCount')
- 6 Festplattenleser ("idealThreadCount / 2")
- 6 Miniatur-Generatoren ('idealThreadCount / 2')

Bei einem 4-Kern-/8-Thread-Laptop ergaben dieselben Formeln:
- 8 Hash-Worker (überzeichnen 4 physikalische Kerne um 2×)
- 4 Festplattenleser
- 4 Vorschaubildgeneratoren

Der Laptop war während der Scans unbrauchbar. Die High-End-Workstation konnte nur etwa 50 % ihrer Durchsatzkapazität ausschöpfen, da die Festplattenleser und die Miniaturbildgeneratoren um dieselben Prozessorkerne konkurrierten.

### Danach

| Maschine | Profil | Hash-Arbeiter | Festplattenleser | Thumbnail-Arbeiter | Verhalten |
|---------|---------|-------------|-------------|-------------------|----------|
| 4C/8T Laptop | Hintergrund | 1 | 1 | 1 | Reaktionsschnell während des Scans |
| 4C/8T Laptop | Balanced | 3 | 2 | 2 | Nutzbar, angemessene Geschwindigkeit |
| 4C/8T Laptop | Schnell | 8 | 4 | 8 | Volle Gas, UI kann ruckeln |
| 12C/24T WS | Hintergrund | 3 | 3 | 3 | Gemächlich, kaum wahrnehmbar |
| 12C/24T WS | Balanced | 11 | 6 | 6 | Guter Durchsatz, systemreaktionsfähig |
| 12C/24T WS | Schnell | 24 | 12 | 24 | Maximale Parallelität, alle Kerne gekoppelt |

Die Profile bedeuten jetzt etwas Konkretes: Sie werden auf wiederholbare Ressourcenverpflichtungen abgebildet, die sich an die Maschine anpassen, auf der sie laufen.

### HardwareProber-Portabilität

Die physische Kernerkennung wurde getestet an:
- **Windows x64**: 'GetLogicalProcessorInformationEx' funktioniert korrekt für AMD- und Intel-CPUs mit und ohne SMT/Hyper-Threading
- **Linux x64**: Das Parsing '/proc/cpuinfo' verarbeitet sowohl die Formate 'physical id' als auch 'core id' über verschiedene Kernel-Versionen hinweg
- **Fallback**: Wenn einer der OS-spezifischen Pfade fehlschlägt, wird 'QThread::idealThreadCount()' verwendet und 'hasHyperthreading' bleibt auf 'false' belassen. Die Unterscheidung zwischen physikalischem und logischem System ist nur für CPU-gebundenes Tuning erforderlich; "Hintergrund"- und "Schnell"-Profile liefern weiterhin vernünftige Ergebnisse mit logischen Core-Zahlen.

## Reflexion

**Die Überladung von `QComboBox` ist genau die Art von Qt-Macke, die man mit der Zeit zu schätzen lernt.** `QComboBox::currentIndexChanged` hat in Qt5 zwei Überladungen (eine gibt `int` aus, eine gibt `QString` aus), daher erfordert das Anbinden eines Lambda-Ausdrucks `QOverload<int>::of(...)`. In Qt6 wurde die `QString`-Überladung als veraltet markiert, aber das Projekt zielt vorerst auf Qt5 ab. Jedes Mal, wenn ich `QOverload<int>::of(&QComboBox::currentIndexChanged)` tippe, denke ich: „Es muss doch einen eleganteren Weg geben“, aber den gibt es nicht – nicht ohne einen Wrapper oder einen Cast im C-Stil, was noch schlimmer ist.

**Der SettingsDialog war fast ein One-Liner, aber das Beschreibungsdesign erforderte große Überlegung.** Die Benutzeroberfläche besteht aus drei Widgets (Label, Combo, Label) plus OK/Abbrechen-Buttons. Die gesamte Klasse umfasst ~68 Zeilen. Aber die Entscheidung, die Beschreibung dynamisch statt statisch zu machen, entstand dadurch, dass jemand den alten Dialog benutzt hat – sie mussten jedes Mal alle drei Beschreibungen erneut lesen, um die passende zu finden. Die dynamische Version eliminiert diese Reibung. Es ist eine winzige UX-Änderung mit einem großen wahrgenommenen Qualitätsunterschied.

**Hardware-Probing ließ mich Qts plattformübergreifende Abstraktionen mehr schätzen als sonst.** 'QThread::idealThreadCount()' ist eine Zeile und funktioniert überall. Die physische Kernerkennung besteht aus zwei plattformspezifischen Implementierungen, die jeweils ~30 Zeilen umfassen. Das Verhältnis von Plattformcode zu plattformübergreifendem Code sagt dir etwas darüber, welche Betriebssystemfunktionen Qt abstrahieren wollte. Die physische Kernerkennung ist so selten, dass sie es nicht geschafft hat, was fair ist – aber das bedeutet, dass jedes Projekt, das es braucht, seine eigene schreibt.

**Das 'ScanProfile'-Enum ist absichtlich grob.** Drei Werte werden auf drei Ressourcenhüllen abgebildet. Ich habe überlegt, mehr hinzuzufügen (wie "Eco", "Turbo", "Custom"), aber jedes zusätzliche Profil multipliziert die Testmatrix der Hardware-Konfigurationen ohne klaren Nutzen für den Nutzer. Nutzer, die feine Steuerung benötigen, sollten es wahrscheinlich nicht in einer Kombibox einordnen – sie sollten eine Konfigurationsdatei haben. Drei Profile decken die häufigsten Fälle ab: "Lass mich in Ruhe", "Standard" und "Geh schnell".

## Nächste Schritte

Das Scan-Profilsystem ist funktional, aber nicht persistent – das Profil setzt sich beim Neustart auf 'Ausgeglichen' zurück. Der unmittelbare nächste Schritt ist die Einstellungspersistenz:

| Priorität | Was | Warum |
|----------|------|-----|
| 1 | Profil zu QSettings erhalten | Die Wahl des Nutzers bei Neustarts speichern |
| 2 | Profilanzeige in der Statusleiste | Das aktuelle Profil auf einen Blick anzeigen, ohne die Einstellungen zu öffnen |
| 3 | Speichertyperkennung (SSD vs. HDD) | Auto-tuning des 'parallel'-Flags – Festplatten sollten niemals parallel lesen |
| 4 | Zeitmessungen pro Stufe | Überprüfen Sie, dass jedes Profil tatsächlich den erwarteten Ressourcenverbrauch erzeugt |

Die Speichertyp-Erkennung ist technisch am interessantesten. Unter Windows können Sie 'IOCTL_STORAGE_QUERY_PROPERTY' mit 'StorageDeviceSeekPenaltyProperty' aufrufen, um zu prüfen, ob das Gerät Seek Penalties (HDD) hat oder nicht (SSD). Unter Linux gibt '/sys/block/<dev>/queue/rotational' dieselbe Antwort. Dadurch konnte die Pipeline auf Festplatten automatisch in den Einzel-Festplattenleser-Modus wechseln, unabhängig vom gewählten Profil.

Aber das ist ein zukünftiger Beitrag. Für den Moment weiß die Pipeline, auf welcher Hardware sie läuft, und die Nutzer können ihren bevorzugten Kompromiss wählen. Das ist schon ein großer Fortschritt gegenüber fest programmierten Konstanten.

---

*PhotoBoss ist Open Source. Das vollständige Repository ist verfügbar unter [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
