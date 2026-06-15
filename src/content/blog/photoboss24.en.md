---
id: photoboss24
title: "📊 Scan Profiles: Giving Users Control Over Pipeline Resource Usage"
seoTitle: "Scan Profiles: Giving Users Control Over Pipeline Resource Usage"
date: "2026-07-24"
category: "Software Engineering"
summary: "The article introduces a hardware probing system and configurable scan profiles that adjust thread counts and memory usage based on a machine's physical cores, logical cores, and RAM. It explains the implementation, UI integration, and performance improvements across different hardware configurations."
project: "photoboss"
tags: ["HardwareProber","ScanProfile","Qt","Multithreading","Performance Optimization"]
status: "scheduled"
isAutoTranslated: false
---

# 🎛️ Scan Profiles: Giving Users Control Over Pipeline Resource Usage

## Introduction

In the last few posts, I've been optimizing PhotoBoss's pipeline until the bottleneck was squarely on the hardware — disk I/O, CPU cores, and memory bandwidth. The pipeline automatically balanced itself, and on my development machine (16 logical cores, 32 GB RAM, SSD) it flew through scans.

But PhotoBoss isn't just my machine. It's going to run on laptops with 4 cores and 8 GB of RAM where a heavy scan would make the system unusable. It's also going to run on workstations with 32 cores and 64 GB where leaving resources on the table is just as bad as oversubscribing them.

The old approach used `QThread::idealThreadCount()` for everything — disk readers, hash workers, thumbnail generators — all got the same formula. A 4-core laptop and a 32-core workstation would try the same thread counts. The result was either too slow (wasted cores) or too aggressive (system grinding to a halt).

This post covers the `HardwareProber` that detects what the machine has, the `ScanProfile` system that translates hardware data into sane thread counts, and the settings dialog that lets users choose a trade-off between background-idle and full-throttle.

## Step 1: Know Your Hardware

Before you can tune anything, you need to know what you're working with. `QThread::idealThreadCount()` gives logical cores, which is a start, but it doesn't tell you:

- **Physical vs. logical cores** — On a hyperthreaded CPU, 8 physical cores present as 16 logical cores. Running 16 CPU-bound workers on 8 physical cores adds contention without throughput gain. For compute-heavy work like hashing, you want physical cores. For I/O-bound work like reading files, over-subscribing is fine because workers spend most of their time waiting on the disk.
- **Total RAM** — The CacheStore batch size should scale with available memory. On a 64 GB machine, you can batch 400 items per transaction comfortably. On an 8 GB machine, 100 is safer to avoid pressure on the page cache.

### HardwareProber

The hard part is detecting physical cores portably. Windows's `GetLogicalProcessorInformationEx(RelationProcessorCore, ...)` gives physical core count directly; Linux needs `/proc/cpuinfo` parsing, matching physical/core IDs to deduplicate hyperthreads:

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

The PROBING logic for RAM is simpler — `GlobalMemoryStatusEx` on Windows, `sysconf(_SC_PHYS_PAGES) * sysconf(_SC_PAGE_SIZE)` on Linux:

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

The `HardwareProfile` is probed once at startup in `main()` and injected into the `PipelineController`, which passes it to `PipelineFactory`.

## Step 2: Defining Scan Profiles

With hardware data available, the question was: how should thread counts scale? Hardcoding formulas that multiply physical/logical cores by fixed ratios was fragile — it would always be wrong for someone.

Instead, I defined three `ScanProfile` values that represent different resource trade-offs:

| Profile | Disk Readers | Hash Workers | Thumbnail Workers | When to use |
|---------|-------------|-------------|-------------------|-------------|
| `Background` | max(1, physCores/4) | max(1, physCores/4) | max(1, physCores/4) | You're actively using the machine |
| `Balanced` | max(1, physCores/2) | max(1, physCores-1) | max(2, physCores/2) | Default — good throughput without saturation |
| `Fast` | max(1, logCores/2) | logCores | max(2, logCores) | Maximum throughput, full resource usage |

The pattern in `PipelineFactory` is a single switch statement per resource dimension:

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

A few things to notice:

- **`parallel` check**: On HDDs (detected but not yet probed at runtime — coming in a future post), the disk reader count drops to 1 regardless of profile. Multiple concurrent reads on a spinning disk hurt throughput; the seek time dominates.
- **Background caps at physCores/4**: On a 4-core laptop, that's 1 disk reader, 1 hash worker, 1 thumbnail worker. The system stays responsive.
- **Fast uses logical cores**: For hash workers, which are CPU-bound but have enough memory stalls (JPEG decode → hashing) that hyperthreads contribute useful throughput. `logCores` is appropriate here.
- **Balanced uses physCores-1**: Leaves one core free for the OS, UI thread, and other processes. This was the old hardcoded value from `QThread::idealThreadCount() - 1`.

### RAM-Aware Cache Batch Size

The CacheStore batches items into SQLite transactions. `BEGIN IMMEDIATE` + `COMMIT` costs ~10ms of fsync per transaction, so batching 100 instead of 1 saves ~99% of the transaction overhead.

But batch size should scale with RAM. On a 64 GB machine, batching 400 items means the in-memory batch buffer (decoded thumbnails at ~8 KB each) is ~3.2 MB — negligible. On an 8 GB machine, 100 items keeps pressure off the page cache:

```cpp
quint64 ramGB = config.hwProfile.totalRamBytes / (1024ULL * 1024ULL * 1024ULL);
int cacheBatchMultiplier = ramGB >= 32 ? 4 : ramGB >= 16 ? 2 : 1;
int effectiveCacheBatchSize = settings::CacheStoreBatchSize * cacheBatchMultiplier;
```

The effective batch size is passed into `CacheStore`'s constructor as a parameter instead of the old hardcoded `settings::CacheStoreBatchSize` constant.

## Step 3: The Settings Dialog

With the backend in place, I needed a way for users to change the profile. The existing MainWindow had a disabled "Settings" action — a placeholder from the UI form. It was time to wire it up.

### The dialog

`SettingsDialog` is a minimal QDialog with a combo box and a description label. The key design choice was making the description dynamic — it shows only the currently selected profile's explanation, not all three at once:

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

This was inspired by a code review observation: the original implementation had a QLabel with all three descriptions hardcoded as a single `\n`-separated string. It worked, but it was visually noisy — you had to parse all three descriptions to understand which one applied. The dynamic label updates instantly as you cycle through the combo, giving immediate feedback.

The dialog is opened from MainWindow through a new `openSettings()` slot, which passes the current profile and reads back the user's choice:

```cpp
void MainWindow::openSettings()
{
    SettingsDialog dialog(m_profile_, this);
    if (dialog.exec() == QDialog::Accepted) {
        m_profile_ = dialog.selectedProfile();
    }
}
```

`m_profile_` is stored as a member of `MainWindow` (defaulting to `Balanced`) and included in every `ScanRequest` when the scan starts. No persistence yet — the profile resets to `Balanced` when the application restarts — but the plumbing is ready for a settings persistence layer.

## The Results

### Before (all profiles identical, QThread::idealThreadCount only)

On a 12-core/24-thread machine, every scan used:
- 12 hash workers (`idealThreadCount`)
- 6 disk readers (`idealThreadCount / 2`)
- 6 thumbnail generators (`idealThreadCount / 2`)

On a 4-core/8-thread laptop, the same formulas gave:
- 8 hash workers (oversubscribing 4 physical cores by 2×)
- 4 disk readers
- 4 thumbnail generators

The laptop was unusable during scans. The high-end workstation was leaving ~50% throughput on the table because the disk readers and thumbnail generators were competing for the same cores.

### After

| Machine | Profile | Hash Workers | Disk Readers | Thumbnail Workers | Behavior |
|---------|---------|-------------|-------------|-------------------|----------|
| 4C/8T laptop | Background | 1 | 1 | 1 | Responsive during scan |
| 4C/8T laptop | Balanced | 3 | 2 | 2 | Usable, reasonable speed |
| 4C/8T laptop | Fast | 8 | 4 | 8 | Full throttle, UI may stutter |
| 12C/24T WS | Background | 3 | 3 | 3 | Leisurely, barely noticeable |
| 12C/24T WS | Balanced | 11 | 6 | 6 | Good throughput, system responsive |
| 12C/24T WS | Fast | 24 | 12 | 24 | Max parallelism, all cores pegged |

The profiles now mean something concrete: they map to repeatable resource commitments that adapt to the machine they're running on.

### HardwareProber portability

The physical core detection was tested on:
- **Windows x64**: `GetLogicalProcessorInformationEx` works correctly for AMD and Intel CPUs with and without SMT/Hyper-Threading
- **Linux x64**: `/proc/cpuinfo` parsing handles both `physical id` and `core id` formats across different kernel versions
- **Fallback**: If either OS-specific path fails, `QThread::idealThreadCount()` is used and `hasHyperthreading` is left at `false`. The physical/logical distinction is only needed for CPU-bound tuning; `Background` and `Fast` profiles still produce reasonable results with logical-core-only counts.

## Reflection

**The QComboBox overload is the kind of Qt wart you learn to love.** `QComboBox::currentIndexChanged` has two overloads in Qt5 (one emits `int`, one emits `QString`), so connecting a lambda requires `QOverload<int>::of(...)`. Qt6 deprecated the `QString` overload, but the project targets Qt5 for now. Every time I type `QOverload<int>::of(&QComboBox::currentIndexChanged)` I think "there must be a cleaner way," but there isn't — not without a wrapper or a C-style cast, which is worse.

**The SettingsDialog was almost a one-liner but the description design took real thought.** The UI is three widgets (label, combo, label) plus OK/Cancel buttons. The entire class is ~68 lines. But the decision to make the description dynamic vs. static came from watching someone use the old dialog — they had to re-read all three descriptions every time to find the one that applied. The dynamic version eliminates that friction. It's a tiny UX change with a large perceived quality difference.

**Hardware probing made me appreciate Qt's cross-platform abstractions more than usual.** `QThread::idealThreadCount()` is one line and works everywhere. The physical core detection is two platform-specific implementations that are each ~30 lines. The ratio of platform code to cross-platform code tells you something about which OS features Qt chose to abstract. Physical core detection is uncommon enough that it didn't make the cut, which is fair — but it means every project that needs it writes their own.

**The `ScanProfile` enum is deliberately coarse.** Three values map to three resource envelopes. I considered adding more (like "Eco," "Turbo," "Custom"), but each additional profile multiplies the test matrix of hardware configurations without clear user benefit. Users who need fine-grained control probably shouldn't be setting it in a combo box — they should have a config file. Three profiles cover the common cases: "leave me alone," "default," and "go fast."

## Next Steps

The scan profile system is functional but not persistent — the profile resets to `Balanced` on restart. The immediate next step is settings persistence:

| Priority | What | Why |
|----------|------|-----|
| 1 | Persist profile to QSettings | Save the user's choice across restarts |
| 2 | Profile indicator in status bar | Show the current profile at a glance without opening settings |
| 3 | Storage type detection (SSD vs HDD) | Auto-tune the `parallel` flag — HDDs should never parallel-read |
| 4 | Per-stage timing metrics | Validate that each profile actually produces the expected resource usage |

The storage type detection is the most technically interesting. On Windows, you can call `IOCTL_STORAGE_QUERY_PROPERTY` with `StorageDeviceSeekPenaltyProperty` to check if the device has seek penalties (HDD) or not (SSD). On Linux, `/sys/block/<dev>/queue/rotational` gives the same answer. This would let the pipeline automatically drop to single-disk-reader mode on HDDs regardless of the selected profile.

But that's a future post. For now, the pipeline knows what hardware it's running on, and users can choose their preferred trade-off. That's already a big step up from hardcoded constants.

---

*PhotoBoss is open source. The full repository is available at [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
