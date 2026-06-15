---
id: photoboss22
title: "📸 Engineering Diary: Breaking 20‑Minute Photo Scan"
seoTitle: "Breaking 20‑Minute Photo Scan"
date: "2026-07-10"
category: "Software Engineering"
summary: "Investigated a performance crisis during a 33k‑image scan and identified that the file‑format group reader was starving the pipeline. By bounding the queue, adding instrumentation, and rewriting the hashing path, we slashed key steps in half. The change didn't just fix speed—it redefined what was possible behind the engine."
project: "photoboss"
tags: ["PhotoBoss","PerformanceTuning","PipelineOptimization"]
status: "scheduled"
isAutoTranslated: false
---

# ⚡ When a 33k Photo Scan Takes 20 Minutes: A Performance Deep Dive

## Introduction

In the last post I covered the architecture cleanup — extracting services, adopting a composition root, getting SOLID violations under control. With the structure in good shape, it was time to tackle the biggest open problem: **PhotoBoss was unusably slow on large datasets.**

A scan of 33,000 photos was taking over 20 minutes. Worse, it was consuming more than 64 GB of RAM before running out of memory entirely. The grouping phase was so slow that the UI froze for seconds at a time.

This post documents the full investigation and the changes that brought that 20-minute scan down to something far more reasonable. Along the way, I learned a lot about where desktop photo applications actually spend their time, and how small instrumentation changes can reveal bottlenecks you'd never guess at.

## Step 1: Stop Running Out of Memory

The first and most critical issue was the >64 GB OOM. The `readQueue` (which holds raw file bytes in memory between disk-read and hash-compute stages) was unbounded. When the hash workers were slower than the disk reader — which was most of the time with 33k high-resolution photos — the queue grew without limit until the process exhausted system memory.

The fix was simple: make `readQueue` bounded with a `ReadQueueCapacity` of 15:

```cpp
// PipelineFactory.cpp
auto readQueue = std::make_unique<Queue<std::unique_ptr<DiskReadResult>>>(settings::ReadQueueCapacity);
```

With capacity 15, the disk reader can only fill 15 slots before it blocks, waiting for a hash worker to consume one. The total memory used by the read queue is capped at 15 × maxFileSize, which fits comfortably within any modern system. All other queues remain unbounded — they hold small metadata items (file paths, hash results, thumbnail requests) measured in bytes rather than megabytes, and bounding them would create artificial slowdowns for no memory benefit.

## Step 2: Instrument Everything

I added producer-wait and consumer-wait counters to the `Queue` class — atomic counters that increment every time a thread blocks waiting for space or waiting for data:

```cpp
// Queue.h
std::atomic<uint64_t> m_producerWaitCount_{ 0 };
std::atomic<uint64_t> m_consumerWaitCount_{ 0 };
```

Each queue now prints its stats to stderr when destroyed:

```
Queue[4] cap=15: prodWaits=8383 consWaits=2
Queue[3] cap=18446744073709551615: prodWaits=0 consWaits=31878
```

The story was clear: **HashWorker was the bottleneck.** The `readQueue` had 8,383 producer waits (DiskReader blocked) and only 2 consumer waits (hash workers never waiting for data). Meanwhile, the downstream `resultQueue` had 31,878 consumer waits — ResultProcessor found the queue empty 96% of the time. Everything downstream of the hash workers was starved.

Each hash worker was taking ~290ms per image — 270ms of which was just decoding the full-resolution JPEG before computing a 64-bit perceptual hash.

## Step 3: Fix the UI Throttle

Before tackling the hash worker, there was a separate UI performance issue. The `UiUpdateQueue` used a boolean `m_emitPending` flag to coalesce snapshot emissions, but it had a subtle problem: every pending invocation produced a full snapshot containing *all* 33k groups. The UI thread was drowning in redundant work.

### Timer-based throttle

I replaced the boolean flag with a `QTimer`-based throttle at 30 fps (33ms interval):

```cpp
// UiUpdateQueue constructor
m_throttleTimer_.setInterval(settings::UiPollIntervalMs);  // 33ms
m_throttleTimer_.setSingleShot(false);
connect(&m_throttleTimer_, &QTimer::timeout,
        this, &UiUpdateQueue::maybeEmitSnapshot);
```

A critical detail: `QTimer::start()` can only be called from the owning thread (Qt's thread-safety requirement for timers). Since `scheduleSnapshotEmit()` is called from pipeline threads, I had to wrap it in `QMetaObject::invokeMethod` with `Qt::QueuedConnection`:

```cpp
void UiUpdateQueue::scheduleSnapshotEmit() {
    QMetaObject::invokeMethod(this, [this]() {
        if (!m_throttleTimer_.isActive())
            m_throttleTimer_.start();
    }, Qt::QueuedConnection);
}
```

### Delta-only snapshots

I added a `m_modifiedGroupIds_` set tracking which groups changed since the last snapshot. `snapshot()` now copies only dirty groups into the result:

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

A group that forms once and never changes appears in exactly one snapshot. With 33k groups, this reduced per-frame processing from 33k iterations to 0-10.

### Replacing `findChildren` with a path map

The UI code had an O(n²) pattern hiding in plain sight. `processUpdatedGroups()` called `widget->findChildren<ImageThumbWidget*>()` — a recursive widget tree walk — for every entry in every updated group. I added a path-to-widget map to `GroupWidget`:

```cpp
// GroupWidget.h
QMap<QString, ImageThumbWidget*> m_thumbsByPath_;
```

Populated when each thumb is created, used for O(1) lookup instead of tree walks. No more `findChildren` calls in the hot path.

### Preserving user selections

The pipeline auto-assigns the best-quality image as each group's representative. But if the user manually overrides a selection, the next pipeline update would overwrite it. A `m_userModified_` flag on `GroupWidget` branches the update behavior:

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

The flag is set the moment the user touches any selection. After that, the pipeline only affects thumbs that didn't exist when the user last interacted with the group.

## Step 4: Fix the Grouping Algorithm

With the UI performance under control, I turned to the grouping stage. The initial implementation scanned every existing cluster for every new image — O(n²) comparisons. For 33k images, that's over a billion similarity comparisons.

### Inverted index on sub-hashes

I broke each 64-bit pHash into four 16-bit sub-hashes and built an inverted index:

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

When a new image arrives, sub-hash lookups identify candidate clusters (those with ≥2 matching sub-hashes) and only those candidates are compared. This reduces the comparison count from O(n) to O(1) per image.

### Early exit in confidence scoring

The `confidence()` function previously computed all hash scores then checked gates. I moved the gate checks inside the loop — if pHash is below 0.98, the comparison fails immediately:

```cpp
if (key == "Perceptual Hash" && sim < m_cfg.pHashGate) return 0.0;
if (key == "Difference Hash" && sim < m_cfg.dHashGate) return 0.0;
```

Since pHash is typically the first hash evaluated, most dissimilar comparisons short-circuit instantly.

### Dirty cluster tracking

Every `getGroupDelta()` call previously iterated over all 33k clusters. A `m_dirtyClusterIndices_` set now records only clusters modified since the last delta request — typically 0–2 per call after the initial formation phase.

### Better representative selection

The `better()` function compares image quality (resolution, file size) and is called in both the index and fallback paths, ensuring the pipeline always picks the best representative:

```cpp
if (sim >= m_cfg.strongThreshold) {
    cluster.members.push_back(node);
    if (better(*node, *cluster.representative))
        cluster.representative = node;
}
```

The combination of these changes reduced group-stage per-image cost from ~100μs to under 1μs.

## Step 5: The Big One — Fixing the Hash Worker Decode

With the queue stats confirming HashWorker as the bottleneck, I looked at what it was actually doing. `ImageLoader::load()` had two bugs in one function — it re-read the file from disk even though `DiskReadResult` already contained the raw bytes, and it decoded to full resolution for a QImage that would immediately be scaled down to 32×32 for hashing:

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

This tells libjpeg-turbo to use its fast IDCT scaling. Instead of decoding 6000×4000 pixels (72 MB of pixel data) then scaling to 32×32, it decodes directly to ~32×32 by skipping high-frequency DCT coefficients.

The result: **~270ms per image → ~3ms per image.** With 8 hash workers, the hash phase went from ~20 minutes to ~12 seconds.

The pixel values are subtly different from the old full-decode path, meaning cached pHash values would be slightly different from freshly computed ones. For local development the simplest fix was to delete the old cache — on a fresh scan, everything rebuilds correctly.

## The Results

The queue stats from the first scan immediately after the fix showed the bottleneck had shifted entirely — the disk was pegged at 100% utilization the entire time, with the pipeline balanced. You can't read files faster than the disk allows, and the pipeline was now keeping up end-to-end.

| Change | What it fixed | Impact |
|---|---|---|
| Bounded readQueue (cap=15) | >64 GB OOM | No more memory exhaustion on large scans |
| Queue instrumentation | Blind optimization | Identified HashWorker as the >90% bottleneck |
| Timer-throttled UI updates | UI freezes during scan | Stable 30fps regardless of scan progress |
| Delta-only snapshots | 33k groups re-processed every 33ms | Per-frame work proportional to changes |
| Path→widget map | 33k findChildren tree walks per frame | Zero tree walks; O(1) path lookup |
| Inverted index + dirty tracking | O(n²) grouping comparisons | <1μs per image; grouping is essentially free |
| In-memory scaled decode | 270ms per-image → 3ms | Hash phase: 20 minutes → ~12 seconds |

## Reflection

**Instrument first, optimize second.** The queue wait counters took an afternoon and paid for themselves immediately. Before I had them, I was guessing about bottlenecks. After, I had exact numbers. I should have added these months ago.

**Bounded queues force you to find the bottleneck.** The moment you bound a producer-consumer queue, the slowest stage reveals itself by blocking its producer. Without the bounded readQueue, the hash workers' slowness was masked by the unbounded queue growing silently — and expensively.

**Perceptual hashing is incredibly data-efficient.** The fact that you can take a 24-megapixel photo, decode it at 32×32 grayscale, and still get reliable similarity comparisons is remarkable. The old code was processing 72 MB of pixel data to extract 64 bits of perceptual hash. The new code processes ~1 KB of pixel data for the same 64-bit result.

**The ImageLoader bug was a design smell.** The interface said "turn raw bytes into a QImage" but the implementation re-read the file from disk. The comment was aspirational — someone knew what should happen but never fixed it. A code review would have caught this in minutes; working solo, it survived for months.

## Next Steps

With the pipeline now running at hardware limits, the immediate bottleneck is ThumbnailGenerator — it still reads from disk to generate each thumbnail. The fix is to pass the already-decoded QImage from HashWorker through the pipeline so thumbnails are generated from the in-memory image rather than a second disk read.

After that, the plan is:

| Priority | What | Why |
|---|---|---|
| 1 | Pass decoded QImage to ThumbnailGenerator | Eliminate the second disk read and decode per image |
| 2 | Hardware-aware auto-tuning | Auto-detect cores, RAM, and storage type to set optimal thread counts and queue sizes at startup |
| 3 | Pipeline metrics (ScopedTimer + report) | Add low-overhead per-stage timing to identify the next bottleneck without guessing |

The auto-tuning piece is particularly interesting — there's no reason the user should manually configure thread counts or batch sizes. The application should probe available hardware and compute optimal settings automatically. That'll be the focus of the next post.

---

*PhotoBoss is open source. The full repository is available at [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
