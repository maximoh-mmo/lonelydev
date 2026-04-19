# Engineering Diary: The Off Switch — Stop Button Fail & Pruning Gone Wrong

## Part 1: Giving the User the Brakes

A scan that can't be stopped is a scan you can't trust.

Until now, pressing "Start Scan" in PhotoBoss was a one-way trip. The engine would fire up, chew through every image in the folder, and eventually wind down on its own. There was no way out if you'd accidentally pointed it at the wrong directory, or simply changed your mind.

That changes today.

### The Goal: A Button That Knows What It's Doing

I wanted the UI to feel *alive* and aware of the pipeline's state. The "Start Scan" button should not be a static fixture — it should reflect what the app is actually doing at any given moment.

The three states are:

| State | Button Text | Button Enabled |
|---|---|---|
| Idle | `Start Scan` | ✅ |
| Running | `Stop Scan` | ✅ |
| Draining | `Stopping...` | ❌ |

The "Stopping..." state is intentional. When the user clicks "Stop Scan," the pipeline doesn't just freeze — it asks every queue to drain gracefully. This prevents torn writes to the cache or half-processed hash results making it into the result set. The user sees "Stopping..." so they know something is happening, but can't trigger a second stop request while the first is still being honoured.

### How It Works

The `PipelineController` already had a clean `PipelineState` enum (`Stopped`, `Running`, `Stopping`) with a `pipelineStateChanged` signal firing on every transition. All that was needed was a listener in the UI.

The `MainWindow` now connects to `pipelineStateChanged` and drives the button text, enabled state, and even resets the progress bar when the pipeline settles back to `Stopped`:

```cpp
case PipelineController::PipelineState::Stopped:
    m_scan_button_->setText(tr("Start Scan"));
    m_scan_button_->setEnabled(true);
    m_browse_button_->setEnabled(true);
    m_progress_bar_->setValue(0);
    break;
```

The Browse button is also disabled during a scan, preventing the user from changing directory mid-flight — a subtle but important guard against undefined state.

### Why This Matters for UX

A power tool without an off switch is a safety hazard. PhotoBoss is scanning your personal photo library; giving users a clear, visible "Stop" at any moment is a non-negotiable piece of the user contract. It signals that the application is *in control*, not running away with itself.

Small detail, big impact.

---

## Part 2: The Pruning Bug That Ate Your Data

When files disappear from your scanned folders, they should also disappear from your cache. That's the entire point of the prune step — cleaning up stale entries so they don't clutter your results or misreport duplicate status.

After adding the Stop button, I turned my attention to cache maintenance. The SQLite cache was growing with every scan, but nothing was ever cleaned up.

### The Existing Machinery

The `SqliteHashCache` class already had a `prune(const QString& root)` method that:
- Deletes database entries for files NOT seen in the current scan
- Uses `last_seen_scan_id` to identify stale entries
- Relies on SQLite `ON DELETE CASCADE` foreign keys to clean up hashes and EXIF data automatically

The method was dead code — never called anywhere in the pipeline.

### The Fix: Call It at Scan Completion

The prune needed to run after a scan completes. The best place is `PipelineController::onThumbnailWorkerFinished()`, when all thumbnail workers are done and the pipeline is about to transition to `Stopped`:

```cpp
void PipelineController::onThumbnailWorkerFinished()
{
    if (--m_activeThumbnailWorkers_ == 0) {
        qDebug() << "All thumbnail workers finished. Cleaning up pipeline.";

        // Prune stale cache entries for this directory
        if (!m_current_request_.directory.isEmpty()) {
            SqliteHashCache cache(0);
            cache.prune(m_current_request_.directory);
        }

        SetPipelineState(PipelineState::Stopped);
        destroyPipeline();
    }
}
```

### The Symptom

After scanning a folder, all the cached hash data would vanish. Your images were being processed correctly, but on the next scan — even without deleting any files — PhotoBoss would recompute every single hash from scratch. The cache wasn't persisting. It was a write-only store.

### The Investigation

The prune method in `SqliteHashCache` looked correct on the surface. It had the right SQL, the right WHERE clause, the right foreign key handling. The problem was in how it was being called:

```cpp
SqliteHashCache cache(0);
cache.prune(m_current_request_.directory);
```

I was passing `0` as the scan ID. Let me explain why that shattered the cache.

Every file in the database has a `last_seen_scan_id` column — the ID of the scan that last processed it. When pruning runs, it deletes entries where `last_seen_scan_id` doesn't match the *current* scan. Files seen in this scan get updated; files not seen (because they were deleted from disk) get removed.

But with `scanId = 0`, the query became:

```sql
DELETE FROM files WHERE path = ? AND last_seen_scan_id != 0
```

Since every file in the cache has `last_seen_scan_id` set to an actual scan number (not 0), this condition matched **every single row**. The prune wasn't finding stale entries — it was annihilating the entire directory.

### The Fix

Pass the actual scan ID from the request context:

```cpp
SqliteHashCache cache(m_scan_id_);
cache.prune(m_current_request_.directory);
```

Now the prune behaves correctly: it only deletes files that weren't seen in this scan — i.e., files that were actually removed from the folder.

### Bonus Cleanup: Removing Dead Code

While fixing the prune, I also noticed the pipeline had a curious `onStart()` lifecycle method that nobody was using. Every single stage implemented it as an empty stub:

```cpp
void DiskReader::onStart() { }
void HashWorker::onStart() { }
// ... every other stage
```

The base class `StageBase::Run()` used to call it, but I'd already refactored that path in an earlier change. The method was just sitting there, virtual and inherited, doing nothing.

So I removed it. The stage lifecycle is now just:

- `run()` — the work (implemented by each stage)
- `onStop()` — graceful shutdown

I also deleted `CachePrune.h` — a header file I'd created for a separate prune stage that never got used. The prune is handled directly in `PipelineController` now.

### The Lesson

This bug existed silently. The immediate function (scanning and hashing) completed successfully. The damage only showed up later, when users expected to reuse their previously computed hashes. "Seems to work" isn't the same as "correctly implemented."