---
id: photoboss6
title: "📸 Designing a Persistent Hash Cache with SQLite"
seoTitle: "Designing a SQLite Persistent Hash Cache in C++"
date: "2026-01-21"
category: "Software Engineering"
summary: "Building a first-class cache stage using SQLite: identifying files, storing multiple hash algorithms, and injecting results back into the pipeline to skip redundant work."
project: "PhotoBoss"
tags: ["C++", "SQLite", "Database Design", "Schema Versioning"]
status: "published"
isAutoTranslated: false
---

The machine was getting faster, but it still had a memory like a goldfish. Every time I restarted the app, it had to relearn everything about my photo library. It was time to give PhotoBoss a permanent brain.

## Identity without Reading

The core challenge of a cache is trust. If I ask the database *"Do you know the hash for Photo.jpg?"*, and it says *"Yes,"* I need to be 100% certain that `Photo.jpg` hasn't changed since that hash was calculated.

But I can't read the file to check, because reading the file is the exact thing I'm trying to avoid.

The solution is a proxy identity. I assume a file is unchanged if three values remain constant:

1.  **Absolute Path** (Location)
2.  **Size in Bytes** (Magnitude)
3.  **Last Modified Time** (History)

Is it theoretically possible to modify a file while keeping its size and timestamp exactly the same? Yes. Is it likely to happen to my family vacation photos? No.

---

## The Schema

Designing the database felt like putting together a puzzle. I didn't want a single flat table. I wanted a system that could handle multiple hash algorithms (MD5, pHash, BlockMean) for the same file.

I settled on a normalised 3-table structure:

-   **Files Table:** Stores the Path, Size, and MTime. This is the "Key".
-   **Methods Table:** Stores the name of the algorithm (e.g., "pHash") and its *Version*.
-   **Hashes Table:** The glue. It links a File to a Method and stores the Blob data.

This separation is powerful. If I update my pHash calculation code, I just bump the version number in the Methods table. The app will see the version mismatch and automatically re-compute the new hashes, while leaving the MD5 hashes untouched.

---

## The Cache as a Pipeline Member

The best part of this design? The cache isn't some side-car process. It’s just another stage in the pipeline.

The **CacheLookup** stage sits right after the Scanner. It checks the DB. If it gets a hit, it sends the result directly to the UI, bypassing the heavy "loading" and "hashing" stages entirely. It feels like cheating.
