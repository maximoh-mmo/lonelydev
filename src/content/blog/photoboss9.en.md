---
id: photoboss9
title: "📸 Engineering Diary: Building a High-Performance Image Pipeline in PhotoBoss"
seoTitle: "High-Performance Image Decoding and UI Batching in Qt"
date: "2026-04-17"
category: "Software Engineering"
summary: "Refactoring the thumbnail system into a formal pipeline stage with Direct-to-Size decoding, smooth lerped progress reporting, and race-condition-safe UI batching."
project: "PhotoBoss"
tags: ["C++", "Qt", "Performance", "Architecture", "UX"]
status: "published"
isAutoTranslated: false
---

Over the past few commits, I’ve taken a deep dive into the engine room of PhotoBoss. My goal was simple but ambitious: transform a sluggish, deadlock-prone thumbnail system into a professional-grade, high-concurrency pipeline.

Here’s a look at the "What," the "Why," and where I’m headed next.

## 1. The Challenges: Why I Refactored

Before I started these changes, PhotoBoss was hitting three significant walls:

- **The Deadlock Wall**: On large datasets, the UI would "hang" or freeze because the thumbnail system and the discovery engine were competing for resources without a unified controller.
- **The Memory Wall**: I was loading full 20MP+ high-resolution images into memory just to generate a 150-pixel thumbnail. On modern cameras, this is a massive waste of CPU and RAM.
- **The Shutdown Wall**: Stopping a scan often left "ghost" threads running, or forced me to shut down prematurely, losing the results already processed by the hashing engine.

---

## 2. The Solution: A Unified Pipeline

I replaced the fragmented `ThumbnailProvider` singleton with a formal **Thumbnail Generator Stage** integrated directly into the `PipelineController`.

### The Unified Progress Bar (The UX Secret)

One of the most visible improvements is the new unified progress reporting system. Previously, the progress bar was jumpy and disconnected, flapping between scanning counts and processing counts.

I’ve consolidated these into a single linear journey. To make it feel truly premium, I didn't just hook up raw signals. Instead, I implemented a **Linear Interpolation (Lerping)** mechanism in the `PipelineController`.

Now, a 30ms timer drives the UI updates. If the processing engine suddenly finishes 500 hashes, the progress bar doesn't "snap" forward; it floats smoothly toward the target value:

```cpp
// How I smooth out the progress bar
double gap = static_cast<double>(m_processedFiles_) - m_displayedFiles_;
double step = qMax(gap * 0.05, 1.0); // Move 5% of the gap every 30ms
m_displayedFiles_ += step;
```

This small change has a massive impact on UX. It makes the application feel stable and responsive, even when the underlying work is performed in jagged, multi-threaded bursts.

### "Direct-to-Size" Decoding (The Performance Secret)

The biggest performance "win" was changing how I talk to the disk. Instead of:

`File -> Load Full (Slow) -> Rotate Full (Very Slow) -> Scale Down`

I now use `QImageReader` with `setScaledSize()`:

`File -> Decode only the 150x150 pixels I need (Instant) -> Rotate tiny buffer -> Ready`

By decoding only the sub-sampled pixels, I’ve reduced the work required per image by over **95%**. Rotating a small thumbnail is virtually free compared to rotating a 24-megapixel original.

### Smarter UI Batching

To keep the UI responsive, I implemented a high-frequency population system in `MainWindow`. Instead of overwhelming the GUI thread with every single result, I now batch groups every 20ms. This keeps the frame rate high while allowing thumbnails to "zip" onto the screen in real-time.

### The Race Condition Fix: m_thumbnailCache

In a multi-threaded system, sometimes the thumbnail would finish before the UI widget was even created! I added a local cache in the `MainWindow` that holds these "orphan" thumbnails until their corresponding UI element is birthed, ensuring zero missing images.

---

## 3. Current Status: Ready for Flight

PhotoBoss can now discover thousands of images, hash them for similarity, and populate the UI with thumbnails in a single fluid motion. The pipeline is stable, memory-efficient, and correctly drains its backlog during shutdown.

## 4. My Roadmap: What’s Next?

I’m now shifting my focus toward user control and data management.

- **✅ Immediate Priority: The "Stop" Button**
  Currently, the "Start Scan" button is a one-way street. I’ll be implementing a **Stop/Interrupt** toggle. When a scan is running, the button will change to "Stop," allowing users to gracefully interrupt the pipeline. This requires careful signaling through all stages to stop work immediately without crashing.

- **✅ Data Management: Delete Functionality**
  Finding duplicates is only useful if you can act on them. I am building the logic to safely move files to the system trash or delete them directly from the UI, with integrated safety checks so you don't accidentally wipe your best shots.

- **✅ User Choice: Configurable Similarity**
  Not every user wants the same thing. Some want exact bit-for-bit duplicates; others want to find photos taken a second apart.
  - **Exact Mode**: Tight thresholds for high-speed duplicate cleanup.
  - **Similar Mode**: Looser thresholds for grouping "near-miss" shots.

I'll be adding a UI for these engine parameters so you can tune the discovery to your library's needs.

PhotoBoss is getting faster and smarter every day. Stay tuned as I move into the "Action" phase of the project!
