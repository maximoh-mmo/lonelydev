---
id: photoboss23
title: "🖼️ From Double Reads to Zero Reads: Thumbnail Cache, Rotation, and Eliminating an Entire Stage"
seoTitle: "From Double Reads to Zero Reads: Thumbnail Cache, Rotation, and Eliminating an Entire Stage"
date: "2026-07-17"
category: "Software Engineering"
summary: "The post details how moving thumbnail creation into the cache eliminated redundant disk reads, fixing a double-rotation bug and removing the ExifRead stage, resulting in a simpler, faster pipeline."
project: "photoboss"
tags: ["Image Processing","Performance Optimization","C++"]
status: "scheduled"
isAutoTranslated: false
---

# 🖼️ From Double Reads to Zero Reads: Thumbnail Cache, Rotation, and Eliminating an Entire Stage

## Introduction

In the last post, I brought a 33k-photo scan from >20 minutes and >64 GB OOM down to something reasonable. The bottleneck moved from memory exhaustion to the disk — which is exactly where you want it. The pipeline was balanced, the UI was responsive, and the grouping stage was essentially free.

But there were still two obvious problems:

1. **Thumbnails were re-read from disk.** Every thumbnail required a second file read and JPEG decode, even though HashWorker had already decoded the image at thumbnail size. On first scan, that's 33k redundant reads.
2. **EXIF was read separately.** ExifRead opened each file to extract EXIF metadata, then DiskReader opened the same file again to read full contents. Two seeks per file where one should be enough.

Beyond these I/O issues, there was a rotation bug lurking in the pipeline — thumbnails were being rotated twice when an image's EXIF orientation was non-standard — and a growing collection of batch queue abstractions that added complexity without measurable benefit.

This post covers the changes that eliminated the redundant reads, fixed the rotation bug, and stripped out unnecessary batching from the pipeline.

## Step 1: Thumbnail Cache — Stop Reading Files Twice

### The old flow

Every thumbnail went through this cycle on first scan:

```
DiskReader → HashWorker (decode + hash + attaches decodedImage)
                                              ↓
                                        CacheStore (stores hashes, discards image)
                                              ↓
                                       ResultProcessor → ThumbnailGenerator → second disk read
```

HashWorker decoded the image at 140×140 (the thumbnail size) using fast IDCT scaling. That decoded image was sitting right there in memory. But CacheStore never bothered to keep it. It stored the hashes, forwarded the item, and the decoded QImage was dropped on the floor.

When ThumbnailGenerator got the request, it had three paths:

| Path | Trigger | What happened |
|------|---------|--------------|
| 1. `preDecoded` | Fresh image, decodedImage attached | Scale and show (fast) |
| 2. Cache hit | Previously cached thumbnail | Return as-is (fast) |
| 3. Disk read | Cache miss | Full file read + decode (slow) |

Path 1 was the intended optimization, but it only worked for fresh images in the current scan. After that scan, the thumbnail cache was empty. On the next scan, cached hashes meant no `decodedImage` was forwarded, so every thumbnail went through Path 3 — the disk read path. It took **three full scans** before the thumbnail cache was useful:

1. First scan: Path 1 (fast, but no DB entry written)
2. Second scan: Path 3 (slow, DB entries written)
3. Third scan: Path 2 (fast, cache finally populated)

### The fix: move thumbnail creation into CacheStore

The solution was to move thumbnail caching into CacheStore, where it belonged. CacheStore already received every `HashedImageResult`, including `decodedImage` for fresh items. It just needed to keep it:

```cpp
// CacheStore.cpp — include decodedImage in the batch
HashedImageResult copy(item->fileIdentity, item->source, ...);
copy.decodedImage = item->decodedImage;
m_batch_.emplace_back(std::move(copy), QMap<QString, int>{});
```

Then inside `SqliteHashCache::storeBatch()`, after storing hashes and EXIF for each item, serialize `decodedImage` as a JPEG BLOB and upsert it into the thumbnails table — all within the same transaction:

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

The batch size is 100 items per transaction, so 33k thumbnails cost ~330 SQLite transactions instead of 33,000. The JPEG quality of 85 at 140×140 produces ~3-8 KB per thumbnail — about 160 MB total for 33k images, which fits comfortably in SQLite's page cache.

After this change, the thumbnail cache is fully populated after a single scan. Re-scans hit Path 2 (cache) for every thumbnail.

## Step 2: Fix the Rotation Bug

### The double-rotation

When I traced through the image pipeline, I found a subtle bug in how rotation was applied:

```
ImageLoader::load()
    ↓ OrientImage(orientation)    ← first rotation (from EXIF)
    ↓ decodedImage = result       ← image is already correctly rotated

ThumbnailGenerator::scaleTo()
    ↓ src.scaled(...)
    ↓ OrientImage(rotation)       ← second rotation (same EXIF value)
```

The first rotation happened in `ImageLoader::load()`, which reads the EXIF orientation from the file identity and calls `OrientImage(orientation)` before returning the decoded image. The returned QImage was already in the correct orientation.

The second rotation happened in `ThumbnailGenerator::scaleTo()`, which was called only for Path 1 (`preDecoded`). It scaled the image, then called `OrientImage(rotation)` using the same EXIF orientation value. For photos with non-standard orientations (like 90° CW = orientation 6), this produced a 180° rotation — the thumbnail appeared upside-down or sideways.

For orientation 3 (180° rotation), the double-rotation actually *undid* itself — the image looked correct, but only because two wrongs happened to make a right.

### The fix

The `preDecoded` image is already correctly oriented by `ImageLoader`. Path 1 should just scale it without any further rotation:

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

### Rotation baked into the cache

The thumbnail cache now stores images with `rotation=0` in the key, regardless of the original EXIF orientation. The pixel data is already oriented when it's written — the rotation was applied once at decode time and never needs to be applied again. This naturally cleaned up the old rotation-keyed entries via a `DELETE WHERE rotation!=0` pass during `storeBatch()`.

## Step 3: Eliminate the ExifRead Stage

### The architecture question

ExifRead existed for a good reason: read the cheap EXIF data (~5KB per file), check the SQLite cache, and only do the expensive full file read on a cache miss. On re-scans, this saves 10MB × 33k = 330GB of I/O.

But on first scan, every file is a cache miss. And on first scan, ExifRead reads the file for EXIF, then DiskReader reads the same file again for content. That's two seeks per file.

### The insight

The EXIF data is not part of the cache lookup key. The lookup uses `name + path + size + modified_time` — all available from the directory entry via `QFileInfo`, which requires no file I/O. EXIF is just additional data stored alongside the cache entry, returned on hit.

So we can eliminate the EXIF file read entirely by:
1. Building the `FileIdentity` from `QFileInfo` (zero I/O)
2. Checking the cache
3. On miss, reading the full file and extracting EXIF from the bytes already in memory

### The new flow

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

The `parse(const QByteArray&)` overload uses `Exiv2::ImageFactory::open(const byte*, size_t)` to read from the memory buffer — no file I/O needed:

```cpp
ExifData ExifParser::parse(const QByteArray& bytes) {
    auto image = Exiv2::ImageFactory::open(
        reinterpret_cast<const Exiv2::byte*>(bytes.constData()), bytes.size());
    image->readMetadata();
    // ... extract orientation, date, make, model ...
}
```

This freed me to remove the ExifRead stage entirely — one less class, one less queue, one less signal connection.

## Step 4: Remove All Batch Queues

### The audit

Before this change, the pipeline had these batching points:

| Stage | Output | Batch size | Why |
|-------|--------|------------|-----|
| FileEnumerator | `shared_ptr<QStringList>` | 100 paths | Directory walk accumulator |
| ExifRead | `FileIdentityBatchPtr` | 200 items | Accumulated before push |
| CacheLookup (misses via DiskReader) | `FileIdentityBatchPtr` | Variable | Re-batched from incoming batch |
| CacheStore | SQLite transaction | 100 items | **Real perf win (avoids fsync)** |

### The question

Each batch queue added complexity: vector allocations, shared_ptr overhead, and accumulation logic. What were they actually buying?

Queue push/pop costs ~1μs. For 33k items, the difference between 330 operations (batched ×100) and 33,000 operations (unbatched) is ~33ms total. On a scan that takes several minutes, that's noise.

The only batching with real impact was CacheStore's SQLite transaction batching — a single `BEGIN IMMEDIATE`/`COMMIT` costs ~10ms of fsync. At 1-per-item, that's 330s. At 100-per-batch, it's 3.3s.

Everything else was complexity without payoff.

### What changed

```
// Before
FileEnumerator → Queue<shared_ptr<QStringList>> → ExifRead (N workers)
    → Queue<FileIdentityBatchPtr> → CacheLookup
        → Queue<FileIdentityBatchPtr> (misses) → DiskReader (M workers)

// After  
FileEnumerator → Queue<FileIdentity> → CacheLookup
    → Queue<FileIdentity> (misses) → DiskReader (M workers)
```

Every queue now carries individual items. No vector allocations, no shared_ptr overhead, no accumulation logic. Three classes worth of batch bookkeeping removed.

### A note on FileIdentity's const members

The original `FileIdentity` class had all-`const` members with deleted `operator=`. This prevented the class from being used directly in a queue, since `Queue::wait_and_pop(T&)` uses move assignment. The fix was to remove `const` from the members and explicitly default the move assignment while keeping copy assignment deleted:

```cpp
FileIdentity(const FileIdentity&) = default;
FileIdentity& operator=(const FileIdentity&) = delete;
FileIdentity& operator=(FileIdentity&&) = default;
```

This preserves the original design intent (no partial mutations, no accidental copies) while enabling queue semantics. The `const` qualifiers on members were a form of self-documentation that the language couldn't enforce once the object needed to be movable.

## The Results

### HDD first scan (the worst case)

| Change | Seeks per file | Time spent seeking |
|--------|---------------|-------------------|
| Before (ExifRead + DiskReader) | 2 | ~660s |
| After (DiskReader only) | **1** | **~330s** |

### Thumbnail cache population

| Scan | Before | After |
|------|--------|-------|
| 1st | Thumbnails displayed via Path 1, no DB entries | **Thumbnails displayed + DB fully populated** |
| 2nd | All thumbnails go through Path 3 (disk read) | **All thumbnails go through Path 2 (cache hit)** |
| 3rd | Cache finally populated | Cache already warm from scan 1 |

### Pipeline simplification

| Metric | Before | After |
|--------|--------|-------|
| Pipeline stages | 8 | **7** (ExifRead removed) |
| Queue types | 5 distinct | **4 distinct** (no batch-specific types) |
| Batch accumulation logic | 4 locations | **1 location** (CacheStore only) |
| `FileIdentityBatchPtr` allocs per scan | ~330 (batched ×200) | **0** (individual items) |

### Rotation is applied exactly once

The fix ensures rotation happens at the earliest possible point (`ImageLoader::load()`) and is baked into the pixel data before anything else touches it. Cached thumbnails, forwarded images, and disk-read fallbacks all see the same oriented pixels. No double-rotation, no "depends on which path you take" behavior.

## Reflection

**The ExifRead stage survived because it was never questioned.** The cache-before-read design made sense in a diagram, but nobody asked: "what's the actual cost of reading EXIF from disk before we know if we need to read from disk?" On first scan, it was a pure tax — 330 seconds of unnecessary seeking. The right fix wasn't to optimize ExifRead; it was to realize we didn't need file I/O at all for the cache check.

**Batch queues are a seductive abstraction.** They look like a performance optimization — fewer pushes, fewer pops, less queue contention. But measured against the real costs (disk I/O, JPEG decode, SQLite transactions), they contribute nothing measurable. The batching that mattered (SQLite transactions) was invisible to the queue system; it was an internal implementation detail of CacheStore.

**The rotation bug was an artifact of "it works on my machine."** Most development photos are taken with phones that write correct EXIF orientation — or the developer's camera happens to produce orientation 1 (normal). The bug only manifested for photos with non-standard orientations, which is easy to miss when your test set is 30 selfies. A deliberate test with rotated images would have caught this immediately.

**Removing code is pleasant.** The ExifRead class, the batch accumulation logic, the `FileIdentityBatchPtr` typedef, the `ReadProgress` orphan signal — each deletion made the codebase slightly smaller and slightly easier to reason about. The diffs in this post are overwhelmingly negative, and that feels good.

## Next Steps

The pipeline is now about as lean as it can get without fundamentally rethinking the architecture. The remaining bottlenecks are hardware-limited:

| Priority | What | Why |
|----------|------|-----|
| 1 | Hardware-aware auto-tuning | Probe cores, RAM, and storage type at startup to set optimal thread counts and queue sizes |
| 2 | Pipeline metrics (ScopedTimer) | Add per-stage min/avg/max timing to catch the next bottleneck when hardware changes |
| 3 | Polish release | Suppress Exiv2 parser warnings on malformed EXIF, switch from console to windows subsystem |

The auto-tuning piece is interesting because the optimal configuration depends on whether you're on an SSD (8 parallel workers, 2 disk readers) or an HDD (1 worker, 1 disk reader, sequential reads). Currently this is a manual config flag. The next post will cover detecting the storage type and computing good defaults automatically.

---

*PhotoBoss is open source. The full repository is available at [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
