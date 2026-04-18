---
id: photoboss3
title: "📸 Learning Qt by Building: Threads, Signals, and Ownership"
seoTitle: "Qt Concurrency: Threads, Signals, and Object Ownership"
date: "2025-12-10"
category: "Software Engineering"
summary: "A deep dive into Qt threading, signals/slots, and object ownership while building a responsive photo processing pipeline — including early mistakes and lessons learned."
project: "PhotoBoss"
tags: ["C++", "Qt", "Concurrency", "Signals & Slots"]
status: "published"
isAutoTranslated: false
---

I chose Qt for this project because I wanted to learn it properly. I’ve dabbled before, but "dabbling" in Qt usually means "copy-pasting from StackOverflow until the window shows up."

This time, I wanted to understand the machine. And oh boy, did the machine fight back.

## Thread Affinity: The Silent Killer

Coming from a generic C++ background, I assumed that if I had a pointer to an object, I could call methods on it.

Qt says: **"No."**

I spent three days debugging a race condition where my UI would update *sometimes*, but crash randomly. The culprit? **Thread Affinity**. In Qt, every `QObject` "lives" on a specific thread. If you call a method on it from another thread, you are breaking the law.

---

## The Signal/Slot Enlightenment

The solution—and the moment the framework finally "clicked" for me—was fully embracing **Signals and Slots**.

Instead of `worker->doWork()`, you emit `requestWork()`. Instead of the worker returning data, it emits `workFinished(result)`.

It feels cumbersome at first. You’re writing boilerplate just to call a function. But then you realise what Qt is doing for you: **It’s marshaling the call across thread boundaries automatically.** Use a queued connection, and the data arrives safely on the receiver's thread, with no mutex locking required in your business logic.

---

## MoveToThread() is Not Magic

One specific trap I fell into:

```cpp
// Current Thread: Main
MyWorker* worker = new MyWorker();      // Created on Main Thread
QThread* thread = new QThread();
worker->moveToThread(thread);           // Moved to Worker Thread
thread->start();
```

I learned the hard way that the *constructor* of `MyWorker` still runs on the main thread. If you allocate sub-objects or timers in the constructor, they stay on the main thread, while the worker itself moves. The result is a Frankenstein object straddling two threads.

Fixing this required a strict pattern: Do setup in a `start()` slot, not the constructor.

It was a painful week, but my pipeline is now completely lock-free, relying entirely on message passing. It’s cleaner, safer, and arguably more "Qt" than anything I’ve written before.
