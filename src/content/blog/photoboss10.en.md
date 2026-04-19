# Engineering Diary: Slaying the Shutdown Ghost & The Race Condition Race

In my last update, I shared how I built a high-performance image pipeline in PhotoBoss. It was faster, smoother, and lighter on memory. But even when a system feels stable, there's always a danger that high speed is masking subtle synchronization gaps—the kind of "ghosts" that only haunt you when the right hardware or load conditions align.

Today, while performing a proactive audit of the pipeline logic, I identified a potential race condition. Although it hadn't manifested in practice yet, closing these holes before they become bugs is the difference between a "prototype" and "production" code.

Here is what I found, how I hardened the system, and why "onStart" isn't always as early as you think.

## 1. The Phantom Shutdown (The Proactive Catch)

The PhotoBoss pipeline uses a Producers-Consumers model. Each stage (Scanner, Reader, Hasher) registers as a "Producer" for the next queue in the chain. When 0 producers are left, the queue shuts down, and the next stage knows it's time to clock out.

**The Theory**: I noticed that I was calling `register_producer()` inside the stage's `onStart()` method.

While this seemed robust enough for my dev machine, the theory of distributed systems suggests a "Race to the Finish" that I was inevitably going to lose as the app scaled:

1. The **Scanner** starts, finds 2 tiny images, and finishes instantly.
2. It calls `producer_done()` on the **Scan Queue**.
3. Because the **Cache Lookup** stage (the next producer in line) is still waiting for the OS to spawn its thread, its `onStart()` hasn't run yet.
4. The **Scan Queue** sees 0 producers registered, assumes the party is over, and **shuts down prematurely**.
5. When the **Cache Lookup** thread finally wakes up, it finds its input queue already closed or its registration too late to matter.

In a small directory, this meant the pipeline would often "evaporate" before it even started, leading to missed results and inconsistent behavior.

## 2. The Solution: Hardening the Lifecycle

To fix this, I had to move the "Registration of Interest" from the *start of work* to the *moment of birth*.

### Immediate Registration

I moved all `register_producer()` calls into the **constructors** of the stage workers. Because all workers are created on the main UI thread before the pipeline is even triggered, we now have a 100% guarantee that every stage counts toward the producer total before a single bit of data starts moving.

### Synchronized Startup

I also reordered the `createPipeline` logic. Instead of starting each thread immediately after creating the worker, I now:

1. Initialize **all** workers and queues.
2. Ensure every worker has registered its producer interest.
3. **Then**, and only then, fire off the `start()` signal to all threads simultaneously.

```cpp
// The new sequence: Prep first, then Fire.
for (auto* thread : m_hash_worker_threads_) thread->start();
for (auto* thread : m_thumbnail_worker_threads_) thread->start();
m_pipeline_->resultThread.start();
```

## 3. Why This Matters

This isn't just "pedantic plumbing." In a production app, these kinds of race conditions are the number one cause of "non-reproducible" bugs—the ones that only happen on faster CPUs or when the disk is already warm.

By hardening the registration lifecycle, I've ensured that PhotoBoss is robust whether you're scanning 5 photos on an old laptop or 50,000 photos on a 16-core workstation.

## 4. What's Next?

Now that the "Engine Room" is synchronized and stable, I'm heading back to the "Bridge" (the UI).

*   **Refining the "Stop" Button:** Now that the queues are predictable, I can implement a reliable "Panic Button" that clears all backlogs instantly without leaving "ghost" results in the pipes.
*   **The Delete Flow:** Safely disposing of the duplicates found by the engine.

The engine is tuned. Now it's time to let the driver take control.