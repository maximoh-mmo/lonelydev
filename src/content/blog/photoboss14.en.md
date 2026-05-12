---
id: photoboss14
title: "📸 Engineering Diary: Two-Pass Scanning + Storage-Aware I/O Optimization"
seoTitle: "Engineering Diary: Two-Pass Scanning Plus Storage-Aware I/O Optimization"
date: "2026-05-15"
category: "Software Engineering"
summary: "This post introduces a dual-phase file scanning approach that first quickly counts files to enable accurate progress tracking, then optimizes EXIF metadata extraction based on whether the storage is an SSD (using parallel processing) or HDD (using sequential reads). By combining hardware-aware strategy selection with platform-specific storage type detection, the scanner achieves both responsive UI feedback and maximized I/O efficiency."
project: "photoboss"
tags: ["two-pass scanning","SSD vs HDD optimization","progress tracking","I/O performance","file scanning","parallel processing","storage detection","systems optimization"]
status: "scheduled"
isAutoTranslated: false
---

# Storage-Aware File Scanning with Improved Progress Tracking

## Introduction

When scanning directories containing thousands of photos in Photoboss, users faced two frustrating issues: the progress bar was useless because the total file count was unknown until scanning completed, and the scanner treated SSD and HDD storage identically—ignoring fundamental I/O performance differences that directly impacted scan speed.

I implemented a two-pass scanning approach that first quickly counts files to reveal the total, then adapts the EXIF reading strategy based on whether the storage is an SSD or HDD. This post documents the implementation, the platform-specific storage detection techniques, and the progress tracking improvements.

## Technical Exposition

### Why Two-Pass Scanning?

The original `DirectoryScanner` iterated through each file while simultaneously reading EXIF metadata—an expensive I/O operation that opens each image and parses EXIF tags. This meant:

- The total file count was unknown until the final file was processed
- Progress showed as "500 of 500 files"—useless for user feedback
- Users had no indication of how long the scan would take

The solution separates concerns into two distinct phases.

### Why Storage-Aware Strategy?

SSDs and HDDs have fundamentally different I/O characteristics:

- **SSDs**: Excel at random access; parallel reads work well due to fast access times
- **HDDs**: Suffer seek penalties when the read head must move between sectors; excessive parallel seeks worsen performance

Detecting storage type allows the scanner to choose the optimal strategy automatically.

## Implementation

### Phase 1: Quick File Count

The first pass uses `QDirIterator` with file filters only—no EXIF reading. This runs quickly since it only lists files:

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

The total count becomes known immediately after this phase.

### Phase 2: Storage-Adaptive EXIF Reading

After counting, the scanner checks storage type and chooses the optimal strategy:

```cpp
m_isFastStorage_ = util::StorageInfo::isFastStorage(m_request_.directory);

if (m_isFastStorage_) {
    results = processFilesParallel(m_filePaths_);
} else {
    results = processFilesSequential(m_filePaths_);
}
```

### Platform-Specific Storage Detection

#### Linux: Checking rotational flag

The Linux kernel exposes storage type via the `/sys/block/.../queue/rotational` sysfs file—`0` means SSD, `1` means HDD:

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

#### Windows: Using DEVICE_SEEK_PENALTY_DESCRIPTOR

Microsoft provides seek penalty information via `IOCTL_STORAGE_QUERY_PROPERTY` (supported since Windows 7):

1. Map drive letter to physical disk number using `IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS`
2. Open `\\.\PhysicalDrive{N}`
3. Query `DEVICE_SEEK_PENALTY_DESCRIPTOR`

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

The `IncursSeekPenalty` field directly indicates whether the device has HDD-like seek behavior.

### Parallel Processing on SSD

For SSD storage, the scanner uses multiple worker threads with `QThread::create()`:

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

### Progress Throttling

To prevent overwhelming the UI with progress updates, a throttling mechanism limits emissions:

```cpp
bool StageBase::shouldEmitProgress(QElapsedTimer& timer, int intervalMs) {
    if (timer.elapsed() >= intervalMs) {
        timer.restart();
        return true;
    }
    return false;
}
```

New settings in `AppSettings.h`:

```cpp
static inline constexpr int ScannerProgressEmitIntervalMs = 200;   // 5/sec - Find phase
static inline constexpr int HashingProgressEmitIntervalMs = 100;    // 10/sec - Analyze phase
static inline constexpr int ResultProgressEmitIntervalMs = 100;    // 10/sec - Group phase
```

## Challenges & Solutions

### Volume GUIDs vs Network Shares

Initial Windows detection treated volume GUID paths (`\\?\Volume{...}`) as network shares due to the leading `\\`. Fixed by explicitly checking for `\\?\` prefix:

```cpp
if (device.startsWith("\\\\?\\")) {
    // Local volume - proceed
} else if (device.startsWith("\\\\")) {
    // Network share - use HDD strategy
    return StorageType::HDD;
}
```

### Opening Volume Instead of Physical Disk

Early implementation tried to query seek penalty on `\\.\D:` (volume handle). This doesn't work reliably—need to query the actual physical disk. Used `IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS` to map drive letter to physical disk number first.

### Missing Header Definitions

The `DEVICE_SEEK_PENALTY_DESCRIPTOR` structure and `DeviceSeekPenaltyProperty` constant weren't available in standard headers. Added manual definition:

```cpp
#define PHOTOBOSS_DEVICE_SEEK_PENALTY_PROPERTY 7
```

## Results

The two-pass scanner now provides:

1. **Immediate file count**: Users see "Found 500 files..." shortly after starting
2. **Determinate progress bar**: "Reading metadata... 250 of 500" shows actual progress
3. **Adaptive strategy**: SSD directories use parallel EXIF reading; HDD uses sequential
4. **UI responsiveness**: Progress updates throttled to 5-10/sec prevents UI flooding

## Forward-Looking

- Cache persistence for scanned file lists (skip re-scan on restart)
- Incremental scanning for new files only
- Background scanning with pause/resume

---

*This implementation directly improves UX by providing accurate progress feedback and optimizing scan speed based on hardware capabilities.*