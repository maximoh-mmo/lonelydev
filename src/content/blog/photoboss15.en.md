---
id: photoboss15
title: "🚀 Engineering Diary: Pipeline Refactor and Parallel‑Performance Foundations"
seoTitle: "Engineering Diary: Pipeline Refactor and Parallel-Performance Foundations"
date: "2026-05-22"
category: "Software Engineering"
summary: "The post details a three‑day sprint that re‑architected a monolithic image‑processing pipeline into single‑responsibility stages with a factory, added deterministic startup and stop guarantees, introduced parallel thread pools, an OpenGL spinner, and a fast thumbnail generator. The new design improves UI responsiveness, enables configurable parallelism for different hardware, and sets the stage for SSD vs HDD performance testing."
project: "photoboss"
tags: ["Pipeline","Parallelism","Refactoring","Performance","UI","Testing"]
status: "scheduled"
isAutoTranslated: false
---


*“Three days, a few thousand lines of code, and a UI that finally feels responsive—that’s the story of PhotoBoss’s latest sprint.”*

---

## Introduction

In the previous post we added **storage‑aware scanning** so the UI could tell users exactly how many bytes would be read. The moment that number appeared on the status bar a new set of questions bubbled up from the UI:

* *How many files have we already processed?*  
* *Which phase of the pipeline is currently running?*  
* *Why does the spinner sometimes disappear on long scans?*

Our existing pipeline was a **monolithic chain** where a handful of classes performed several unrelated duties (enumerating files, reading EXIF data, computing hashes, grouping duplicates). Those classes also managed their own threads and queues, forcing the UI to peek directly into internal state for progress updates. The result was a fragile coupling that broke whenever we changed a stage’s implementation, and the UI could easily become out‑of‑sync, leading to the spinner‑visibility bugs you saw.

The three‑day sprint was therefore about **re‑architecting the pipeline** so it can:

1. **Expose clean, per‑stage progress** without the UI digging into internals.
2. **Run the heavy parts in parallel** where the hardware can actually benefit.
3. **Shut down cleanly** even when a user aborts a scan mid‑flight.
4. **Deliver thumbnails instantly** so the image grid never freezes.

Below I walk through the concrete changes, the reasoning behind each one, and how they set us up for the next milestone – an SSD vs. HDD performance A/B test.

---

## 1. Single‑Responsibility Stages & a Factory‑Built Pipeline

### What changed?
* Introduced a `PipelineFactory` that wires together **pure stage objects**:
  * `FileEnumerator` – walks the directory tree and emits file paths.
  * `ExifRead` – parses EXIF blocks in parallel.
  * `HashWorker` – computes perceptual hashes.
  * `Grouping` – builds duplicate groups from hash results.
  * `ThumbnailGenerator` – creates UI‑sized thumbnails.
* Each stage inherits from a lightweight `StageBase` and implements a single `run()` method.

### Why it matters
* **Clarity** – developers can read a stage and instantly know its purpose.
* **Testability** – a stage can be instantiated, fed a deterministic queue, and verified without launching the full UI.
* **Extensibility** – adding a new stage (e.g., a future AI similarity detector) is as simple as creating a class and registering it with the factory; no UI code needs to change.

---

## 2. Deterministic Startup & Immediate‑Stop Guarantees

### What changed?
* `PipelineController::stop()` now **clears every internal queue** and calls `notifyAll()` on each to wake any waiting threads.
* All stages register themselves as producers **in their constructors**, not lazily during `onStart()`.

### Why it matters
* Users can click **Stop** at any moment without risking stray work items that could later corrupt the SQLite hash cache or crash the UI.
* The shutdown sequence is now fully deterministic, making debugging far easier.

---

## 3. Parallelism Where It Pays Off

### What changed?
* Separate thread pools for I/O‑bound (`FileEnumerator`) and CPU‑bound (`ExifRead`, `HashWorker`) work.
* Queues are sized per‑stage, allowing the faster stage to keep the slower one fed without overwhelming memory.

### Why it matters
* **SSD workloads** – disk reads are fast, so the hash workers can stay busy and the pipeline becomes CPU‑bound.
* **HDD workloads** – the enumerator thread pool is throttled to avoid random‑seek thrashing, while queues become larger to absorb the latency.
* The UI now receives **phase‑specific signals** that remain accurate regardless of the underlying thread schedule.

---

## 4. OpenGL Spinner Widget

### What changed?
* Replaced the heavyweight Qt spinner with a shader‑driven `ShaderSpinnerWidget`.
* The widget respects the dark‑theme palette and updates via a high‑resolution timer.

### Why it matters
* The spinner stays **smooth and visible** even when the pipeline is saturated, eliminating the flicker that plagued the prior implementation.
* Rendering is now a tiny GPU fragment shader, consuming virtually no CPU cycles.

---

## 5. Thumbnail Pipeline Revamp

### What changed?
* `ThumbnailGenerator` now uses `QImageReader::setScaledSize` to **decode directly to the thumbnail size**.
* Orientation is applied **only on the tiny buffer**, not on the full‑resolution image.
* The stage runs in its own thread pool with a bounded queue to keep UI updates fluid.

### Why it matters
* Per‑image processing dropped from **~80 ms to ~12 ms** – a ~95 % speed‑up.
* Memory usage is dramatically lower (no full‑resolution QImage lives in RAM), preventing UI freezes when the user browses folders with many high‑resolution photos.

---

## 6. Consistent Naming & Style

* Adopted the `m_` prefix for all member variables.
* Cleaned up class names (`ShaderSpinnerWidget`, `FileEnumerator`).
* Uniform code‑style makes the codebase approachable for new contributors and gives static analysers a clear target.

---

## 7. Parallel vs. Non‑Parallel Pipelines – When Does It Matter?

| Situation | Recommended Shape | Reason |
|-----------|-------------------|--------|
| Tiny libraries (< 200 MB) | **Serial** – one worker thread for all stages | Thread‑management overhead outweighs any gain; debugging remains straightforward. |
| Typical consumer collections (several GB) | **Parallel** – distinct I/O and CPU thread pools | Disk I/O (especially on SSD) can overlap with CPU‑bound hashing, keeping both cores and storage busy. |
| Thumbnail‑heavy UI (grid of 1000+ images) | **Mixed** – keep main pipeline parallel, run `ThumbnailGenerator` on a dedicated bounded pool | Guarantees UI remains responsive while thumbnails are generated in the background. |
| Low‑end hardware (single core, limited RAM) | **Hybrid** – enumerate on the main thread, hash on a single worker | Avoids context‑switch overhead while still interleaving UI events. |
| Automated testing | **Serial** – disable the factory’s thread pool and run stages sequentially | Provides deterministic ordering, making timing‑related bugs easy to reproduce. |

The refactor does **not** force every user into a fully parallel pipeline; instead it gives us the knobs to *choose* the right shape for the hardware at hand.

---

## 8. Setting Up for the Next Milestone – SSD vs. HDD A/B Testing

Now that the pipeline is modular, observable, and safely stoppable, we can systematically **measure** and **tune** performance on different storage media:

1. **Instrument each stage** (entry/exit timestamps, queue depths, CPU usage).  
2. **Run the same dataset** on an NVMe SSD and on a 7200 RPM HDD, varying thread counts, queue capacities, and read‑ahead buffer sizes.  
3. **Collect metrics** – overall throughput, per‑stage latency, CPU utilization, memory pressure, I/O wait time.  
4. **Identify the optimal configuration** for each storage type and lock those values in `PipelineConfig.h`.  
5. **Tag the repo** (e.g., `v1.2‑pipeline‑locked`) once the thresholds are met.

No AI‑driven similarity detection is on the roadmap right now; the priority is to **finalize a reliable, high‑performance pipeline** that behaves predictably on both SSDs and HDDs before we consider any higher‑level features.

---

## 9. TL;DR

* The storage‑aware scan exposed UI needs that the old monolithic pipeline couldn’t satisfy.
* We introduced **single‑responsibility stages**, a **factory‑built parallel pipeline**, **unified phase reporting**, an **OpenGL spinner**, and a **fast thumbnail generator**.
* The new architecture lets us **run the pipeline in parallel where it helps (SSD, mixed workloads) and fall back to serial for tiny collections or low‑end hardware**.
* With this foundation, the next concrete step is an **SSD vs. HDD performance A/B test**; once tuned, the pipeline settings will be locked in for all future releases.
