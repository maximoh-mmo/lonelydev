---
id: photoboss1
title: "📸 The Problem Nobody Talks About: Photo Libraries at Scale"
seoTitle: "Managing Multi-Year Photo Libraries at Scale"
date: "2025-11-12"
category: "Software Engineering"
summary: "Exploring the hidden chaos of multi-year photo libraries — exact duplicates, resized copies, messaging exports — and why typical deduplication tools fail."
project: "PhotoBoss"
tags: ["Problem Solving", "Requirements Analysis"]
status: "published"
isAutoTranslated: false
---

It started innocent enough. A few folders of photos from a 2010 compact camera, dragged onto a laptop. Then came the smartphones. Then the backups of the smartphones. Then the backups of the laptops that held the backups of the smartphones.

Fast forward 14 years, and my home server is groaning under the weight of a digital history that has become impossible to manage. We’re talking about terabytes of memories, but they’re buried under a sediment of redundancy.

I recently opened a folder named `/backup_2018_final_sorted`, only to find it contained another folder called `/old_laptop_backup`, which contained a nearly identical copy of the first folder, but with slightly different file names.

It wasn't just a storage problem anymore. It was an archaeology problem.

## Why "Just Deleting Duplicates" Didn't Work

My first thought, like any engineer, was: *"I'll just write a script."*

I grabbed a standard deduplication tool, ran it for 12 hours, and... it found maybe 10% of the junk. Why? Because **binary equality** is a fragile concept in the real world.

-   **The Resized Copy:** An image exported from Lightroom for Instagram is "different" to the computer, but identical to me.
-   **The Metadata Shift:** A file copied from Android to Windows often gets its EXIF data tumbled, changing its hash.
-   **The Messenger Compression:** That photo sent via WhatsApp? It’s a completely new file now, stripped of its soul (and pixels).

I realised that standard tools view files as *data*, but I needed a tool that viewed them as *images*. I didn't need to know if `img_123.jpg` equalled `img_123_copy.jpg`. I needed to know if they *looked the same*.

---

## A Project is Born

This frustration birthed **PhotoBoss** (a working title that stuck). I decided to treat this not as a quick script, but as a serious engineering challenge. I wanted to build a system that could ingest hundreds of thousands of images, fingerprint them perceptually, and help me make sense of the chaos.

It was also the perfect excuse to finally sharpen my modern C++ skills and dive deep into the Qt framework — not just reading the docs, but fighting the battles of thread affinity, ownership, and custom models.

## The Road Ahead

Over the next few posts, I’m going to document the architecture of this thing. It’s been a journey of "naive" implementations that crashed my PC, discovery of perceptual hashing algorithms, and the eventual realization that I needed a persistent database to keep sanity.

This isn't a tutorial on "How to write a deduplicator." It's a dev log of "How I over-engineered a solution to a problem I created for myself."
