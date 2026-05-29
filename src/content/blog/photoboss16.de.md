---
id: "photoboss16"
title: "⚙️ Lösung von Pipeline-Krisen: Von Endlosschleifen zu strukturierten Delta-Updates"
seoTitle: "Lösung für Pipeline-Krisen: Von Endlosschleifen zu strukturierten Delta-Updates"
date: "2026-05-29"
category: "Softwareentwicklung"
summary: "Nach der Umgestaltung zu einer stufenbasierten Pipeline-Architektur traten innerhalb von 48 Stunden vier aufeinanderfolgende Fehler auf, von denen jeder wichtige Erkenntnisse über die parallele Programmierung mit Qt lieferte. Die Fehler reichten von Einfrieren der Benutzeroberfläche und Abstürzen aufgrund von Unklarheiten bei der Eigentumsübertragung bis hin zu Endlosschleifen und ineffizienten Aktualisierungen. Zu den implementierten Lösungen zählen rekursive Mutexe, explizite Eigentumsübertragung, Muster zur Bestätigung durch den Verbraucher sowie Delta-Tracking für inkrementelle Aktualisierungen."
project: "photoboss"
tags: ["Qt", "Concurrency", "Pipeline Architecture"]
status: "scheduled"
isAutoTranslated: true
---

*Vier schwerwiegende Fehler in drei Tagen – jeder einzelne hat mir etwas Grundlegendes über Parallelität, Zustandsverwaltung und die Bedeutung klarer Abgrenzungen zwischen den einzelnen Pipeline-Stufen beigebracht.*

---

## Einleitung

Die vergangene Woche sollte eigentlich dem Feinschliff gewidmet sein. Wir hatten die neue, stufenbasierte Pipeline-Architektur eingerichtet, der OpenGL-Spinner lief reibungslos und die Erzeugung der Miniaturansichten erfolgte nahezu in Echtzeit. Der Code war sauber, die Architektur modular, und ich dachte, wir wären fertig.

Was ich nicht erwartet hatte, war, dass dieselbe architektonische Umgestaltung den Grundstein für vier sich gegenseitig verstärkende Fehler gelegt hatte, die in den nächsten 48 Stunden zutage treten würden. Jeder Fehler lehrte mich etwas Grundlegendes über das Schreiben von parallelem Code in Qt – Lektionen, die ich so schnell nicht vergessen werde.

This post chronicles the investigation, root causes, and solutions for each issue—culminating in a fundamental improvement to how our pipeline emits updates to the UI.

---

## 1. Der Ausgangspunkt

Our master branch contained a monolithic `PipelineController` that did everything: managed threads, queues, progress tracking, and UI updates all in one 500‑line class. When I moved to the stages-based architecture (documented in the Pipeline Refactor post), I introduced three new core components:

- **`Pipeline`** — A class whose sole purpose is to own stages, queues, and threads with proper lifecycle management. It knows how to start everything, how to stop everything, and how to clean up when done.

- **`PipelineFactory`** — The wiring harness. It creates queues first, then stages that use those queues, then threads to run those stages, and finally transfers ownership to the Pipeline. Think of it as the electrician who connects all the circuits before flipping the main switch.

- **`UiUpdateQueue`** — A thread‑safe buffer that sits between the pipeline workers and the UI. Pipeline stages call methods like `addPendingGroup()` or `setThumbnail()` from worker threads, and the UiUpdateQueue coalesces these into periodic `snapshotReady` signals that the MainWindow consumes.

In hindsight, I was so focused on getting the architecture right that I rushed through the implementation details. Four bugs were waiting for me.

---

## 2. The First Bug: The Freeze

I noticed it first on a Tuesday afternoon. I'd start a scan, let it run for a few seconds, then click the Stop button. The UI would freeze—not crash, just freeze—completely unresponsive. The spinner stopped spinning. The window wouldn't even redraw when I dragged it off‑screen and back.

Zuerst dachte ich, es handele sich um einen Deadlock in der Pipeline selbst. Ich habe überall Logging-Anweisungen eingefügt: vor jeder Mutex-Sperre, nach jedem Wait, innerhalb jeder Signalausgabe. Was ich herausfand, war kontraintuitiv: Die Pipeline funktionierte einwandfrei. Es war die UI-Aktualisierungsschicht, die sich selbst in einen Deadlock manövrierte.

The problem was in how `UiUpdateQueue::snapshot()` worked. It acquired a mutex, built a copy of its current state, and returned it. But the snapshot method also needed to call `scheduleSnapshotEmit()` internally—and that method tried to acquire the *same* mutex. With a regular `QMutex`, when the same thread tries to lock a mutex it already holds, Qt treats this as a deadlock and hangs.

I sat there for a moment, staring at the code, realizing I'd made a classic mistake: I'd assumed that because the UI called `snapshot()` from one place, it would never re-enter itself. But Qt's queued connections meant `scheduleSnapshotEmit()` could be invoked from within the snapshot call chain, creating exactly the situation I'd tried to avoid.

The fix was straightforward—replace `QMutex` with `QRecursiveMutex`—but the lesson stuck: in any system where methods call other methods that also need locking, recursive mutexes model the call graph correctly. It's not about being lazy with lock design; it's about accurately representing reality.

---

## 3. The Second Bug: The Crashes

The freeze fix went in, and I thought we were good. Then I started testing stop/start cycles. Click Stop, wait two seconds, click Start again. The app would crash. Not always, but enough to be alarming. Sometimes it was a segfault. Sometimes it was "QObject: Cannot destroy while thread is running."

This one took longer to diagnose. I added destructors with logging everywhere: Pipeline destructor, stage destructors, queue destructors. What emerged was a picture of ownership confusion.

The PipelineFactory was creating queues as local stack variables, then passing references to those queues to worker stages that ran in separate threads. When the PipelineFactory went out of scope at the end of `create()`, those queues were destroyed—but the worker threads were still running, still trying to push data into queues that no longer existed.

It was like pulling the ethernet cable out of a server while it's still writing to disk. The server doesn't crash immediately, but the next time it tries to access storage, chaos ensues.

The fix was conceptual more than technical. I redesigned ownership so that the Pipeline object is the sole owner of everything it creates. Queues are created as `std::unique_ptr` and moved into the Pipeline's collection. Threads are stored in a collection, and the Pipeline destructor calls `quit()` and `wait()` on each one before destroying any queues. The order is critical: threads first, then queues.

This pattern—explicit ownership transfer, explicit shutdown sequencing—became a rule I now apply everywhere: if you create it, you own it. If you own it, you're responsible for destroying it, in the right order.

---

## 4. The Third Bug: The Infinite Loop

This one manifested as pure chaos in the logs. Every few milliseconds, I'd see:

```
Processing group id: 27 images: 2
Processing group id: 27 images: 2
Processing group id: 27 images: 2
```

The same group, over and over, thousands of times per second. The UI wasn't frozen—it was trapped in a loop, processing the same data forever. The pending groups count stayed at 59, never decreasing.

The root cause was elegantly simple. The UiUpdateQueue held a `std::deque<ImageGroup>` representing pending groups. When the MainWindow processed a snapshot, it received a *copy* of that deque. The while loop processed items from the front, created widgets for them, then... did nothing with the original queue. The next snapshot was identical to the last one. Group 27 was still at the front, waiting to be processed again.

It was like having a conveyor belt where items fall off the end into a bin, but nobody ever empties the bin. The belt keeps delivering the same items because the bin is never cleared.

I added a `commitProcessed(int count)` method to UiUpdateQueue that pops items from the front of the actual queue. After batch processing completes, MainWindow calls this method to tell UiUpdateQueue: "I handled N items, please remove them from the source of truth." This is a common pattern in queue-based systems—consumer acknowledgment—and it's now built into our architecture.

---

## 5. The Fourth Bug: The Delta Revolution

After fixing the infinite loop, everything worked—but I noticed something inefficient. Every snapshot contained *all* pending groups, even though most hadn't changed since the last update. For a scan with hundreds of groups, that's a lot of data being copied and sent across the thread boundary every few milliseconds.

More importantly, without knowing *what* changed, the UI couldn't react intelligently. When a new duplicate group is discovered, that's exciting—the user should see an animation, maybe a highlight. When an existing group grows because another duplicate was found, that's a minor update. But my code was treating both the same: emit everything, let the UI figure it out.

I went back to the SimilarityEngine—the component that takes hashed images and groups them by similarity—and added delta tracking. The engine now remembers the size of each cluster from the previous call. When `getGroupDelta()` is invoked, it compares current sizes to previous sizes and returns two lists: clusters that just crossed from single-image to multi-image (newly formed), and clusters that were already multi-image and grew.

```cpp
GroupDelta delta = engine.getGroupDelta();

for (const auto& g : delta.newlyFormed) {
    emit groupAdded(g);    // A brand new duplicate group!
}

for (const auto& g : delta.grown) {
    emit groupUpdated(g);  // Existing group got new members
}
```

The ResultProcessor stage now uses these precise events. Thumbnail requests are only emitted for new images in new or growing groups, not for every image in every group on every update. The data transfer dropped dramatically, and the UI can provide targeted feedback.

This wasn't just a bug fix—it was an architectural improvement that emerged from fixing the previous bugs. You can't optimize what you don't measure, and you can't measure precisely without knowing what changed.

---

## 6. Reflection

Four bugs, each teaching me something different:

The recursive mutex taught me that lock design must match call graph reality, not some idealized model of "simple" locking.

The ownership混乱 taught me that explicit ownership and lifetime management aren't academic concerns—they're what separates code that works from code that crashes mysteriously at 3 AM.

The infinite loop taught me that queue consumers must explicitly acknowledge processed items. The producer doesn't know what the consumer did; the consumer must tell the producer.

The delta tracking taught me that coarse‑grained updates hide information. When you track what changes, you enable smarter responses downstream.

Allen vier Fehlern war eines gemeinsam: Sie entstanden im Zuge des Wechsels zwischen den Architekturen. Der alte Code hatte sich trotz seiner Unübersichtlichkeit so weiterentwickelt, dass er diese Randfälle bewältigen konnte. Der neue Code, sauber und modular, musste diese Lösungen erst wiederfinden. Refactoring bedeutet nicht nur, Code umzuschreiben – es bedeutet, die Lektionen neu zu lernen, die der Code bereits gelernt hatte.

---

## 7. Where We Are Now

The pipeline is stable. It starts cleanly, runs without freezing, stops without crashing, processes each group exactly once, and emits precise incremental updates. The foundation we've built is solid.

Next, I want to run the performance tests we discussed in the Pipeline Refactor post—measuring SSD vs. HDD behavior, tuning worker counts, verifying the parallel architecture actually provides benefit. Then I want to add an automated test suite that exercises these concurrent scenarios deterministically, so we catch the next batch of bugs before they become production issues.

The lessons from this week are already shaping how I write code. Explicit ownership everywhere. Recursive mutexes when call graphs are re‑entrant. Consumer acknowledgment for queue processing. Delta tracking for incremental updates.

Onward.


