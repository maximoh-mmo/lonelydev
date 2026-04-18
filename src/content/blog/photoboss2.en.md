---
id: photoboss2
title: "📸 From Idea to Architecture: Designing a Scalable Image Processing Pipeline"
seoTitle: "Scalable Image Processing Pipeline Architecture in C++"
date: "2025-11-26"
category: "Software Engineering"
summary: "How I modeled a messy photo library as a parallel pipeline of scanning, decoding, hashing, and aggregation — enabling scalable and responsive image processing."
project: "PhotoBoss"
tags: ["System Architecture", "Pipeline Pattern", "Scalability"]
status: "published"
isAutoTranslated: false
---

In my head, the logic was simple. Iterate through every folder, load every image, hash it, and check for duplicates. Easy, right?

I wrote the first prototype as a single loop. It worked beautifully for a test folder of 100 images. Then I pointed it at my main library of 50,000+ photos.

The UI froze immediately. The disk thrashing was audible from the next room. And when I finally killed the process, I realised I had no way to restart without beginning from zero.

## Identifying the Bottlenecks

I realised that "processing an image" isn't a single atomic action. It’s actually a series of very different operations, each with its own specific bottleneck:

-   **Scanning:** Fast, but disk-bound (seeking).
-   **Loading:** Extremely IO-heavy (sequential reads).
-   **Decoding:** CPU-heavy, variable time (JPEGs are messy).
-   **Hashing:** Pure math, CPU-bound.

By running these in a single sequence, I was forcing my fast CPU to wait for the slow disk, and then forcing the idle disk to wait for the busy CPU. It was the worst of both worlds.

---

## Thinking in Pipelines

I threw out the single loop and redesigned the system as a **Pipeline**. Instead of one worker doing everything, I imagined a factory line.

A **Scanner** thread runs ahead, finding files and tossing paths into a queue. A pool of **Loaders** grab paths, pull the data off the disk, and pass the raw buffers to a pool of **Decoders**. Finally, the **Hashers** do the math and send the results to the UI.

This approach—Producer-Consumer queues connecting discrete stages—solved the responsiveness issue instantly. If the disk is slow, the hashers just pause. If the CPU is slammed, the scanners wait. The system naturally balances itself.

## Why Structuring Matters

It’s tempting to "just use threads" (`std::async` is right there!), but raw threading quickly leads to a tangled mess of mutexes and race conditions.

By enforcing a strict pipeline structure, I didn't just get performance. I got **sanity**. Each stage has a single input and a single output. I can test the "Decoder" stage in isolation without needing a valid disk system. I can swap out the "Scanner" for a test harness.

The architecture was set. Now I just had to implement it in Qt without shooting myself in the foot.
