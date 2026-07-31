---
id: photoboss25
title: "🔍 Finding (and Actually Showing) Every Duplicate: A Streaming Grouping Postmortem"
seoTitle: "Finding (and Actually Showing) Every Duplicate: A Streaming Grouping Postmortem"
date: "2026-07-31"
category: "Software Engineering"
summary: "A bug report about identical duplicates reappearing after deletion turned out to be two compounding problems: a similarity engine that gated cluster membership on a quality-chosen representative, and a throttled UI stream that silently dropped results it couldn't render in time. This post covers both root causes, the reconciliation and drain fixes, and the UX polish that shipped alongside them."
project: "photoboss"
tags: ["SimilarityEngine","Streaming UI","Qt","Bug Fix"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction

In the last few posts I've been chasing performance — bounded queues, scaled decodes, hardware-aware scan profiles — until the pipeline was running at the limits of the hardware. The bottleneck moved from memory exhaustion to the disk, which is exactly where it belongs. So when a bug report came in, it wasn't about speed. It was about correctness:

> I search a set of files, delete all the found duplicates, run the same search again — and more duplicates are found. 100% identical files. Why weren't they found and highlighted the first time?

The scariest part of that report is the last sentence. "100% identical files" — not near-duplicates, not resized copies, but byte-identical duplicates. The exact-duplicate path in the grouping engine is bulletproof; it buckets identical SHA-256 hashes into one cluster by construction. If identical files weren't found, either the engine never saw them, or it saw them and the UI never showed them.

It turned out to be both. Two separate, compounding problems were hiding behind one confusing symptom:

1. **An accuracy gap in the similarity engine.** Near-duplicates were being rejected because membership was gated on a single "representative" image that was chosen by quality, not by centrality.
2. **A silent data-drop in the results UI.** The authoritative final group list was emitted into the void, and the throttled incremental stream silently abandoned results it couldn't render in time.

This post is the postmortem — the two root causes, the fixes, and a handful of UX improvements that shipped alongside them.

## Setting the Stage: How Groups Reach the Screen

The pipeline is a chain of stages connected by bounded queues, each on its own thread:

```mermaid
Enumerate → CacheLookup → DiskReader → HashWorker → CacheStore
                                                     ↓
                                           ResultProcessor (grouping)
                                                     ↓
                                          ThumbnailGenerator / UI sink
```

`ResultProcessor` owns a `SimilarityEngine`. For every hashed image it pops off the queue it calls `addImage()`, then asks the engine for a "delta" — which existing groups grew, and which new groups formed. Those deltas are emitted as `groupAdded` / `groupUpdated` signals that flow to the UI through a thread-safe snapshot queue, throttled to ~30fps.

There's also a final, authoritative step: once the input queue closes, the engine's full group list is emitted as `groupingFinished`. The design intent is that the incremental stream gives you live feedback, and the final signal is the source of truth. That intent is the whole reason the story ends the way it does.

## Bug 1: The Representative Was a Gatekeeper, Not a Member

In the `SimilarityEngine`, images are clustered incrementally. When a new image arrives, it does an inverted-index lookup on its perceptual-hash sub-words, gets a short list of candidate clusters, and then has to prove it belongs to one.

Here's what that proof looked like originally:

```cpp
double sim = confidence(*node->result, *m_clusters_[ci].representative->result);
if (sim >= m_cfg_.strongThreshold) {
    // join cluster
}
```

The new image was only ever compared against the cluster's **representative**. That sounds reasonable until you ask *how* the representative is chosen:

```cpp
double SimilarityEngine::score(const ImageNode& img)
{
    const double pixels = width * height;
    double score = pixels;
    score += img.fileSize * 0.001;
    if (ext == "png") score *= 1.05;
    ...
}
```

It's a **quality** heuristic — biggest, sharpest, best-encoded image wins. Quality is not centrality. The anchor of a cluster can easily be visually distinct from the common content of the group: one oversharpened, upscaled export sitting next to a dozen clean copies of the same photo. The result was a classic near-duplicate failure: image B is obviously the same photo as member M, but it scores below the threshold against the *representative*, so it gets rejected, forms its own cluster, and you get two overlapping "duplicate" groups that both think the other doesn't exist.

### The fix: test against everyone, and let everyone advertise

Two changes to `SimilarityEngine`:

1. **`matchesAnyMember()`** — a candidate joins if it clears the strong threshold against *any* member of the cluster, not just the representative.
2. **`addToIndex()`** — every member's pHash sub-words now go into the inverted index, not just the representative's. Otherwise a cluster is only ever *discoverable* via the representative, and the "any member" test never gets a chance to run.

```cpp
bool SimilarityEngine::matchesAnyMember(
    const ImageNode& node,
    const SimilarityGroup& cluster) const
{
    for (const auto* member : cluster.members) {
        if (confidence(*node.result, *member->result) >= m_cfg_.strongThreshold)
            return true;
    }
    return false;
}
```

The cost stays bounded: the inverted index still narrows candidates to clusters sharing ≥2 sub-hashes, so the all-members check only runs against a handful of clusters. The trade-off is a mild increase in chain-grouping risk — A~B and B~C can now pull A~C in even when the pair is weaker — which the existing per-hash gates already blunt.

## Bug 2: The Engine Found Them; the UI Dropped Them

The accuracy fix was necessary but not sufficient. The user's report said *100% identical* files, and identical files always land in one cluster — that grouping is bulletproof. So identical duplicates *were* found on run one. They just never reached the screen.

Here's the anatomy of the drop. `ResultProcessor` emits the authoritative `groupingFinished` at the end of `doRun()`:

```cpp
emit groupingFinished(result);
```

And `PipelineFactory`... never connected it. Scrolling the signal-wiring block, only `groupAdded`, `groupUpdated`, `thumbnailReady`, and the progress/status signals were wired to the UI sink. The final, authoritative list was emitted into the void.

That left the UI entirely dependent on the throttled incremental stream, and that stream had a capacity problem. `MainWindow::applySnapshot` renders at most `MainWindowBatchProcessSize` — **10** — pending groups per snapshot, with snapshots throttled to **33ms**. The pipeline, meanwhile, can emit far faster than 300 groups/sec during the tail of a large scan. When that happens, the overflow sits in `UiUpdateQueue`'s `m_pendingGroups` deque, waiting to be drained.

And then the timer gives up:

```cpp
void UiUpdateQueue::maybeEmitSnapshot()
{
    {
        QMutexLocker lock(&m_mutex);
        if (!m_dirty) {            // nothing changed → stop emitting
            m_throttleTimer_.stop();
            return;
        }
        m_dirty = false;
    }
    emit snapshotReady(this->snapshot());
}
```

If nothing else marks the queue dirty, the timer stops — even when `m_pendingGroups` is still full. The remainder is silently abandoned. Groups were found, processed, and thrown away without ever being displayed. Deleting the visible duplicates and re-running made the problem disappear: fewer files meant fewer groups, the stream fit the budget, and the "new" duplicates appeared. It looked like a search bug; it was a rendering-budget bug.

### The fix: a reconciliation safety net + a drain that finishes

Two complementary changes:

**1. Wire up the source of truth.** Added a `finalizeGroups()` path on the UI sink that carries the `groupingFinished` list through the snapshot. `ThumbnailManager::reconcileGroups()` then walks it: any group ID that never got a widget gets one now, and existing widgets are updated to the authoritative state. This guarantees the final result is always displayed, regardless of how badly the incremental stream overran.

**2. Make the pending queue drain to completion.** Two small changes to `UiUpdateQueue`:

```cpp
// commitProcessed: after the UI consumes a batch, keep the stream alive
if (!m_pendingGroups.empty()) {
    m_dirty = true;
    lock.unlock();
    scheduleSnapshotEmit();
}

// maybeEmitSnapshot: don't stop until both lists are empty
if (!m_dirty && m_pendingGroups.empty() && m_finalGroups.empty()) {
    m_throttleTimer_.stop();
    return;
}
```

Now the timer only stops when there is genuinely nothing left to show. During the scan's tail it keeps ticking, the UI keeps consuming 10-per-frame, and the queue drains to zero.

## The UX Polish That Came Along

Since I was already touching the surface, a few small annoyances got fixed in the same release:

**Browse remembers where you were.** The directory picker used to open at the user's home directory every time. It now prefers the current folder, then the last directory persisted via `QSettings`, falling back to home only on first launch:

```cpp
QString startDir = QDir::homePath();
if (!m_current_folder_.isEmpty()) {
    startDir = m_current_folder_;
} else {
    const QString lastDir = QSettings().value(QStringLiteral("lastDirectory")).toString();
    if (!lastDir.isEmpty())
        startDir = lastDir;
}
```

**Disabled buttons now *look* disabled.** The dark theme had no `QPushButton:disabled` rule, and — worse — the generic button block used `var(#2d2d2d)` syntax, which Qt stylesheets don't support. Every background, hover, and pressed declaration was silently ignored. During a scan the Browse button was disabled but visually identical to an enabled one. Replaced the invalid syntax with real colors and added the missing state:

```css
QPushButton:disabled {
    background-color: #232323;
    color: #6a6a6a;
    border: 1px solid #2b2b2b;
}
```

**The delete dialog stopped being a memory hog.** When you delete a big duplicate set, the confirmation dialog used to decode every full-resolution image just to build previews. It now (a) reuses `ThumbnailManager`'s already-decoded thumbnail cache, (b) falls back to `QImageReader` with a pre-scaled size so it never full-decodes, and (c) caps previews at 100 with a "showing first 100 previews (N more)" label.

**Trash, then nuke.** `QFile::moveToTrash` fails on some filesystems (network shares, unsupported drives). `TrashDeletionStrategy` now normalises path separators, tries the trash first, and permanently removes the file if the trash move fails — so a deletion is never silently skipped:

```cpp
if (QFile::moveToTrash(nativePath)) {
    return true;
}
return QFile::remove(nativePath);
```

## The Results

| Change | What it fixed | Impact |
|---|---|---|
| `matchesAnyMember` + `addToIndex` | Near-duplicates rejected against a non-central representative | Identical and near-identical files reliably land in a single group on the first scan |
| Wired-up `groupingFinished` + `reconcileGroups` | Final group list emitted into the void | The authoritative result is guaranteed to reach the screen |
| Pending-group drain | Timer stopped with the queue still full | No more silently abandoned groups; the stream drains to zero |
| Preview cache reuse + scaled decode + 100-cap | Delete dialog decoding every full-resolution image | Dialog opens dramatically faster on large sets, responsive at 10k+ files |
| Browse recall, disabled states, trash fallback | Small but real UX bugs | Consistent behavior across the Windows target; no deletions silently swallowed on network drives |

The delete-then-rescan repro that started all of this now ends at zero duplicates on both runs.

## Reflection

**The representative wasn't just a suboptimal anchor — it was actively the wrong tool.** The hardest part of the accuracy fix was realising that the representative isn't chosen to be *central*; it's chosen to be *best* (keep the highest-quality image as the group's face). Those are different properties, and gating membership on a quality heuristic means the anchor can sit visually apart from the rest of the group. The solution wasn't to pick a better representative — it was to stop gating on the representative at all. Test against everyone, let everyone advertise.

**Invisible failures are the worst failures.** The dropped-groups bug was invisible by construction: nothing logged, nothing errored, the program completed "successfully". It took re-running the scan on a smaller dataset to reproduce it, because the symptom only appeared once the pipeline *stopped* overrunning the UI budget. The lesson generalises: if you render incrementally, you need an authoritative final state that the UI reconciles to. It converts any incremental bug from "data permanently lost" into "data temporarily late" — a much cheaper failure mode.

**A drain must be self-sustaining.** The throttle bug was a classic supply-and-demand mismatch. A throttle that stops when the *producer* goes quiet is only correct if the consumer is guaranteed to be caught up. Making the consumer's progress re-arm the throttle closed the gap: the timer now stops only when both queues are genuinely empty. Streaming results into a UI is a supply-and-demand problem, not just an algorithm problem — the grouping algorithm was correct; the *delivery* was lossy.

**Chain-grouping risk is a deliberate trade-off.** Testing against all members slightly increases the chance of transitive chain groups (A~B and B~C merging A~C). I accepted this deliberately: the gates in `confidence()` reject pairs below the pHash/dHash floors, and the recall gain outweighs the precision risk. If it becomes a problem, requiring matches against ≥2 members is the natural next lever.

## Next Steps

The clustering now has real behavioural guarantees to test — all-members recall, chain-group bounds, delta correctness — and it deserves more than manual verification:

| Priority | What | Why |
|----------|------|-----|
| 1 | End-to-end test suite for the grouping engine | The engine has behavioural guarantees now; they need a proper harness |
| 2 | Chain-group precision hardening (multi-member acceptance) | Only if transitive chain groups show up in practice |

Until the harness exists, the repro that started all of this is the acceptance test: delete every duplicate, re-scan, and expect zero groups both times.

---

*PhotoBoss is open source. The full repository is available at [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
