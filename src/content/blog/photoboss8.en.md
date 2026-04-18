---
id: photoboss8
title: "📸 Finding the Needle in the Haystack: Similarity Search & Grouping"
seoTitle: "Similarity Search & Grouping for Exact Image Deduplication"
date: "2026-02-17"
category: "Software Engineering"
summary: "Implementing a similarity engine with weighted scoring (pHash, dHash, aHash) to group near-duplicate images, and refactoring the pipeline for pragmatism."
project: "PhotoBoss"
tags: ["C++", "Qt", "Similarity Search", "Algorithms", "Refactoring"]
status: "published"
isAutoTranslated: false
---

We have a pipeline. We have a threaded worker pool. We have a robust, versioned database cache. The machine is built. Now it’s time to turn it on and do what we came here to do: **Find the duplicates.**

## The Grouping Strategy

I realised early on that a "One Pass Fits All" approach was wrong. Grouping exact byte-matches is easy (and objective). Grouping "similar" images is fuzzy (and subjective).

I adopted a sieve-like approach:

### Layer 1: The Exact Match

First, I run a blazing fast pass using SHA-256. If two files have the same hash, they are the same file. Period. This cleared out about 4,000 files from my library instantly. These are the safe kills.

### Layer 2: The Visual Match

This is where the math gets fun. I compare every image against every other image (using an indexing tree to avoid O(n^2) madness, of course).

I defined a "Similarity Score" based on a weighted average of:

```cpp
struct Config {
    double strongThreshold = 0.90;
    
    // Components
    double pHashWeight = 0.45;  // Shape/Structure
    double dHashWeight = 0.25;  // Gradients
    double aHashWeight = 0.20;  // Average Color
    double ratioWeight = 0.10;  // Aspect Ratio
};
```

Why mix them? Because `pHash` is great at surviving compression artifacts, but sometimes thinks a building looks like a book. `aHash` is great at color, but fails if you crop the image. Together, they form a jury. If the jury votes 90% "Yes", it's a match.

---

## The Result (and the False Positives)

I pressed "Scan". The pipeline roared to life. The cache hits flew by. And then, the "Groups Found" counter started ticking up.

I opened the result viewer (which I finally styled in a sleek Dark Mode, because we aren't savages), and there they were.

A photo of my dog from 2018. Next to it, a slightly smaller version labeled "Instagram Export". Next to that, a version with a sepia filter. **PhotoBoss knew they were the same.**

But it wasn't perfect. It also decided that a picture of a grey wall was identical to a picture of a grey sky. And it grouped two completely different sunsets because the color palettes were mathematically identical.

The similarity engine is like an over-eager puppy right now. It finds the ball, but sometimes it brings you a rock instead. I need to tighten the scoring thresholds and maybe introduce a "safety" check for edge cases.

---

## What’s Next?

So, I can *see* the duplicates. But I can't easily kill them yet.

I have a thumbnail view, but the actual "Delete" button is terrifyingly effective. I need to build a "Review & Confirm" workflow that feels safe to use on 15 years of memories. UX is hard, especially when the cost of a misclick is deleting your child's first steps.

The engine is running. Now I just need to learn how to steer it.
