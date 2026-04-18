---
id: photoboss4
title: "📸 Hashing Images: More Than Just Checksums"
seoTitle: "Multithreaded Perceptual and Cryptographic Image Hashing in C++"
date: "2025-12-24"
category: "Software Engineering"
summary: "Implementing both cryptographic and perceptual image hashing, separating IO, decoding, and computation into pipeline stages with worker pools for performance."
project: "PhotoBoss"
tags: ["C++", "Multithreading", "Hashing", "Cryptography"]
status: "published"
isAutoTranslated: false
---

When you say "file comparison" to a programmer, they instinctively reach for MD5 or SHA-256. It’s reflex.

So, that’s what I did. I built a lightning-fast pipeline that computed SHA-256 hashes for every file in my library. I was proud of it. It chewed through 100GB of photos in minutes.

It was also useless.

## The MD5 Trap

A single bit flip changes a SHA-256 hash completely. Opening a Jpeg and saving it again (even at 100% quality) changes the hash. Resizing an image by 1 pixel changes the hash. My library was full of "duplicates" that were byte-distinct but visually identical.

---

## Enter Perceptual Hashing

I needed a hash that behaved like a human eye. If I squint at a picture of a cat, and then squint at a smaller version of that same picture, they look the same.

This led me to the world of **pHash** (Perceptual Hash) and **aHash** (Average Hash).

-   **aHash** breaks the image into an 8x8 grid of greyscale pixels and compares each pixel to the average brightness. It’s incredibly fast and great for finding resized copies.
-   **pHash** uses a Discrete Cosine Transform (DCT) — the same math behind JPEG compression — to fingerprint the low-frequency structure of the image. It focuses on the "shape" of the image rather than the pixels.

---

## The Cost of Seeing

The catch? Calculating a pHash is expensive. You have to decode the full image, convert to greyscale, and run matrix math.

My pipeline slowed to a crawl. The scanner was feeding file paths instantly, but the "Hasher" stage was choking on the CPU load.

This forced me to rethink my worker pool. I couldn't just have one "Hasher" thread. I needed a swarm of them. I updated the pipeline to dynamically scale the worker pool based on the user's CPU core count (minus one, to keep the UI responsive).

Now, looking at the Task Manager is satisfying: 100% utilisation across all cores, churning through memories at maximum speed.
