---
id: "photoboss14"
title: "📸 Entwickler-Tagebuch: Zwei-Durchlauf-Scannen + speicheroptimierte E/A-Optimierung"
seoTitle: "Entwicklertagebuch: Zwei-Durchlauf-Scannen plus speicherorientierte E/A-Optimierung"
date: "2026-05-15"
category: "Softwareentwicklung"
summary: "Dieser Beitrag stellt einen zweistufigen Ansatz für das Scannen von Dateien vor, bei dem zunächst die Dateien schnell gezählt werden, um eine genaue Fortschrittsanzeige zu ermöglichen, und anschließend die Extraktion von EXIF-Metadaten optimiert wird, je nachdem, ob es sich bei dem Speichermedium um eine SSD (unter Verwendung paralleler Verarbeitung) oder eine HDD (unter Verwendung sequenzieller Lesevorgänge) handelt. Durch die Kombination einer hardwareorientierten Strategieauswahl mit einer plattformspezifischen Erkennung des Speichertyps erzielt der Scanner sowohl eine reaktionsschnelle Rückmeldung in der Benutzeroberfläche als auch eine maximierte E/A-Effizienz."
project: "photoboss"
tags: ["two-pass scanning", "SSD vs HDD optimization", "progress tracking", "I/O performance", "file scanning", "parallel processing", "storage detection", "systems optimization"]
status: "scheduled"
isAutoTranslated: true
---

# Speicheroptimiertes Scannen von Dateien mit verbesserter Fortschrittsanzeige

## Einleitung

Beim Scannen von Verzeichnissen mit Tausenden von Fotos in Photoboss sahen sich die Nutzer mit zwei frustrierenden Problemen konfrontiert: Der Fortschrittsbalken war nutzlos, da die Gesamtzahl der Dateien erst nach Abschluss des Scanvorgangs bekannt war, und der Scanner behandelte SSD- und HDD-Speicher identisch – wobei grundlegende Unterschiede in der E/A-Leistung ignoriert wurden, die sich direkt auf die Scan-Geschwindigkeit auswirkten.

Ich habe einen zweistufigen Scan-Ansatz implementiert, bei dem zunächst schnell die Dateien gezählt werden, um die Gesamtzahl zu ermitteln, und anschließend die Strategie zum Auslesen der EXIF-Daten daran angepasst wird, ob es sich bei dem Speichermedium um eine SSD oder eine HDD handelt. Dieser Beitrag dokumentiert die Implementierung, die plattformspezifischen Techniken zur Speichererkennung sowie die Verbesserungen bei der Fortschrittsverfolgung.

## Technische Darstellung

### Warum ein Zwei-Durchlauf-Scan?

Der ursprüngliche `DirectoryScanner` durchlief jede Datei und las dabei gleichzeitig die EXIF-Metadaten aus – ein ressourcenintensiver E/A-Vorgang, bei dem jedes Bild geöffnet und die EXIF-Tags analysiert werden. Das bedeutete:

- Die Gesamtzahl der Dateien war bis zur Verarbeitung der letzten Datei unbekannt
- Der Fortschritt wurde mit „500 von 500 Dateien“ angezeigt – für das Benutzer-Feedback nutzlos
- Die Benutzer hatten keinen Hinweis darauf, wie lange der Scan dauern würde

Die Lösung unterteilt die Aufgabenbereiche in zwei separate Phasen.

### Warum eine speicherorientierte Strategie?

SSDs und HDDs weisen grundlegend unterschiedliche E/A-Eigenschaften auf:

- **SSDs**: Hervorragend bei wahlfreiem Zugriff; parallele Lesevorgänge funktionieren aufgrund der schnellen Zugriffszeiten gut
- **HDDs**: Es kommt zu Suchverzögerungen, wenn sich der Lesekopf zwischen den Sektoren bewegen muss; übermäßige parallele Suchvorgänge verschlechtern die Leistung

Durch die Erkennung des Speichertyps kann der Scanner automatisch die optimale Strategie auswählen.

## Umsetzung

### Phase 1: Schnelle Dateizählung

Beim ersten Durchlauf wird `QDirIterator` ausschließlich mit Dateifiltern verwendet – ohne EXIF-Daten auszulesen. Dies läuft schnell, da lediglich Dateien aufgelistet werden:

```cpp
int DirectoryScanner::quickCountPhase()
{
    QDirIterator it(m_request_.directory, filters, QDir::Files | QDir::NoSymLinks, flags);
    m_filePaths_.clear();
    int count = 0;
    
    while (it.hasNext()) {
        if (m_cancelled_.load()) return count;
        QString path = it.next();
        m_filePaths_.push_back(path);
        ++count;
        
        if (shouldEmitProgress(throttleTimer, 200)) {
            emit status(QString("Counting files... %1").arg(count));
        }
    }
    return count;
}
```

Die Gesamtzahl wird unmittelbar nach dieser Phase bekannt gegeben.

### Phase 2: Speicheradaptives Auslesen von EXIF-Daten

Nach dem Zählen prüft der Scanner den Speichertyp und wählt die optimale Strategie aus:

```cpp
m_isFastStorage_ = util::StorageInfo::isFastStorage(m_request_.directory);

if (m_isFastStorage_) {
    results = processFilesParallel(m_filePaths_);
} else {
    results = processFilesSequential(m_filePaths_);
}
```

### Plattformspezifische Speichererkennung

#### Linux: Überprüfen des Rotationsflags

Der Linux-Kernel gibt den Speichertyp über die Sysfs-Datei `/sys/block/.../queue/rotational` bekannt – `0` steht für SSD, `1` für HDD:

```cpp
bool StorageInfo::isFastStorage(const QString& path)
{
    QStorageInfo storageInfo(path);
    if (!storageInfo.isValid()) return false;
    
    QString device = storageInfo.device();
    
    // Skip LVM mapper
    if (device.startsWith("/dev/mapper/") || device.startsWith("/dev/dm-")) return false;
    
    // SATA: check rotational flag
    if (device.contains("/dev/sd")) {
        QString baseDevice = device.mid(0, device.indexOf("/"));
        QString rotationalPath = "/sys/block/" + baseDevice.mid(5) + "/queue/rotational";
        QFile f(rotationalPath);
        if (f.open(QIODevice::ReadOnly) && f.readAll().trimmed() == "0") {
            return true;  // SSD
        }
        return false;  // HDD
    }
    
    // NVMe devices are SSDs
    if (device.contains("/dev/nvme")) return true;
    
    return false;
}
```

#### Windows: Verwendung von DEVICE_SEEK_PENALTY_DESCRIPTOR

Microsoft stellt Informationen zur Suchverzögerung über `IOCTL_STORAGE_QUERY_PROPERTY` bereit (unterstützt seit Windows 7):

1. Ordnen Sie den Laufwerksbuchstaben mithilfe von `IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS` der Nummer der physischen Festplatte zu.
2. Öffnen Sie `\\.\PhysicalDrive{N}`.
3. Rufen Sie `DEVICE_SEEK_PENALTY_DESCRIPTOR` ab.

```cpp
static bool getPhysicalDiskNumber(const QString& driveLetter, DWORD& diskNumber)
{
    QString volumePath = "\\\\.\\" + driveLetter;
    HANDLE hVolume = CreateFileA(volumePath.toLocal8Bit().constData(), ...);
    
    VOLUME_DISK_EXTENTS extents;
    DeviceIoControl(hVolume, IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS, ...);
    
    diskNumber = extents.Extents[0].DiskNumber;
    return true;
}

bool StorageInfo::isFastStorage(const QString& path)
{
    QStorageInfo storageInfo(path);
    QString rootPath = storageInfo.rootPath();
    
    // Get physical disk number
    DWORD diskNumber = 0;
    if (!getPhysicalDiskNumber(driveLetter, diskNumber)) return false;
    
    // Query seek penalty
    QString physDrivePath = "\\\\.\\PhysicalDrive" + QString::number(diskNumber);
    HANDLE hFile = CreateFileA(physDrivePath.toLocal8Bit().constData(), ...);
    
    STORAGE_PROPERTY_QUERY query;
    query.PropertyId = static_cast<STORAGE_PROPERTY_ID>(7);  // DeviceSeekPenaltyProperty
    query.QueryType = PropertyStandardQuery;
    
    DEVICE_SEEK_PENALTY_DESCRIPTOR output;
    DeviceIoControl(hFile, IOCTL_STORAGE_QUERY_PROPERTY, &query, ...);
    
    // IncursSeekPenalty == FALSE means SSD
    return output.IncursSeekPenalty == FALSE;
}
```

Das Feld „IncursSeekPenalty“ gibt direkt an, ob das Gerät ein Suchverhalten wie eine Festplatte aufweist.

### Parallele Verarbeitung auf SSD

Für die Speicherung auf SSD nutzt der Scanner mehrere Worker-Threads mit `QThread::create()`:

```cpp
std::vector<FileIdentity> DirectoryScanner::processFilesParallel(
    const std::vector<QString>& filePaths)
{
    const int threadCount = qMax(1, QThread::idealThreadCount() - 1);
    QAtomicInt currentIndex(0);
    
    auto worker = [&](int threadId) {
        while (true) {
            int index = currentIndex.fetchAndAddOrdered(1);
            if (index >= static_cast<int>(filePaths.size())) break;
            
            // Read EXIF
            auto exif = exif::ExifReader::read(filePaths[index]);
            // ... create FileIdentity
            threadResults[threadId].push_back(std::move(fileIdentity));
        }
    };
    
    // Spawn threads
    std::vector<QThread*> threads;
    for (int i = 0; i < threadCount; ++i) {
        QThread* thread = QThread::create([=]() { worker(i); });
        thread->start();
        threads.push_back(thread);
    }
    
    // Wait and collect results
    for (QThread* thread : threads) {
        thread->wait();
        thread->deleteLater();
    }
    
    return results;
}
```

### Drosselung des Fortschritts

Um zu verhindern, dass die Benutzeroberfläche mit Fortschrittsmeldungen überflutet wird, begrenzt ein Drosselungsmechanismus die Anzahl der Meldungen:

```cpp
bool StageBase::shouldEmitProgress(QElapsedTimer& timer, int intervalMs) {
    if (timer.elapsed() >= intervalMs) {
        timer.restart();
        return true;
    }
    return false;
}
```

Neue Einstellungen in `AppSettings.h`:

```cpp
static inline constexpr int ScannerProgressEmitIntervalMs = 200;   // 5/sec - Find phase
static inline constexpr int HashingProgressEmitIntervalMs = 100;    // 10/sec - Analyze phase
static inline constexpr int ResultProgressEmitIntervalMs = 100;    // 10/sec - Group phase
```

## Herausforderungen & Lösungen

### Volume-GUIDs vs. Netzwerkfreigaben

Bei der anfänglichen Windows-Erkennung wurden Pfade mit Volume-GUIDs (`\\?\Volume{...}`) aufgrund des vorangestellten `\\` als Netzwerkfreigaben behandelt. Dies wurde behoben, indem explizit auf das Präfix `\\?\` geprüft wird:

```cpp
if (device.startsWith("\\\\?\\")) {
    // Local volume - proceed
} else if (device.startsWith("\\\\")) {
    // Network share - use HDD strategy
    return StorageType::HDD;
}
```

### Datenträger anstelle einer physischen Festplatte öffnen

Die frühe Implementierung versuchte, die Sequel-Strafe auf '\\.\D:' (Volumen-Handle) abzufragen. Das funktioniert nicht zuverlässig – man muss die physische Festplatte abfragen. Ich habe zuerst 'IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS' verwendet, um den Laufwerksbuchstaben auf die physische Festplattennummer zu legen.

### Fehlende Header-Definitionen

Die 'DEVICE_SEEK_PENALTY_DESCRIPTOR'-Struktur und die 'DeviceSeekPenaltyProperty'-Konstante waren in Standard-Headern nicht verfügbar. Manuelle Definition hinzugefügt:

```cpp
#define PHOTOBOSS_DEVICE_SEEK_PENALTY_PROPERTY 7
```

## Ergebnisse

Der Zwei-Durchgänge-Scanner bietet nun:

1. **Sofortige Dateianzahl**: Nutzer sehen "500 Dateien gefunden..." Kurz nach Beginn
2. **Determinate Fortschrittsleiste**: "Metadaten werden gelesen... 250 von 500" zeigt tatsächlichen Fortschritt
3. **Adaptive Strategie**: SSD-Verzeichnisse verwenden paralleles EXIF-Lesen; Die HDD verwendet sequentielle Geräte
4. **UI-Reaktionsfähigkeit**: Fortschrittsupdates, die auf 5-10 pro Sekunde gedrosselt sind, verhindern UI-Flooding

## Zukunftsgerichtete Aussagen

- Cache-Persistenz für gescannten Dateilisten (Neuscan beim Neustart überspringen)
- Inkrementelles Scannen nur für neue Dateien
- Hintergrundabtastung mit Pause/Fortsetzung

---

*Diese Implementierung verbessert direkt die Benutzeroberfläche, indem sie genaues Fortschrittsfeedback liefert und die Scangeschwindigkeit basierend auf den Hardwarefähigkeiten optimiert.*
