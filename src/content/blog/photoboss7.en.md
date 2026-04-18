---
id: photoboss7
title: "📸 Short-Circuiting Work: Introducing a Persistent Hash Cache"
seoTitle: "Persistent Hash Caching with SQLite for Pipeline Optimization"
date: "2026-01-27"
category: "Software Engineering"
summary: "Adding a versioned, persistent hash cache to avoid recomputing expensive perceptual hashes. This entry covers file identity, cache-first pipeline design, SQLite persistence, and how treating cached results as first-class pipeline outputs dramatically reduces unnecessary work."
project: "PhotoBoss"
tags: ["C++", "SQLite", "Optimization", "Caching", "Systems Design"]
status: "published"
isAutoTranslated: false
---

In my last post, I designed the schema for my cache. Now it was time to wire it up.

## The Implementation

The "Identity" problem was the first hurdle. I needed a way to fingerprint a file without reading it. I settled on a composite key:

```cpp
// Any change to these fields invalidates cached hashes
struct FileIdentity {
    QString path;
    quint64 sizeBytes;
    quint64 modifiedTime;
};
```

Is it theoretically possible to modify a file while keeping its size and timestamp exactly the same? Yes. Is it likely to happen to my family vacation photos? No.

For the database itself, I needed a schema that could handle multiple hash algorithms per file. I used a normalised approach:

```sql
-- Files table (The Identity)
CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    mtime_unix INTEGER NOT NULL,
    UNIQUE(path, size_bytes, mtime_unix)
);

-- Hashes table (The Expensive Work)
CREATE TABLE hashes (
    file_id INTEGER NOT NULL,
    hash_method_id INTEGER NOT NULL,
    value BLOB NOT NULL,
    PRIMARY KEY (file_id, hash_method_id)
);
```

This is where the pipeline architecture I fought for in Part 2 really paid off. If I had written a spaghetti-code loop, adding caching would have been a nightmare of `if` statements.

Instead, I just inserted a new node in the graph:

`Scanner --> CacheLookup`
`CacheLookup -->|Hit| ResultAggregation`
`CacheLookup -->|Miss| DiskLoader`

The `CacheLookup` worker takes a file path, queries SQLite, and makes a decision. If the hash exists, it creates a "Job Done" signal and sends it straight to the finish line. The disk loader never even knows the file existed.

---

## The First Run

I implemented the SQLite backend, set up the WAL (Write-Ahead Logging) for concurrency, and fired it up.

**Run 1:** 45 minutes. (Expected. It had to hash everything from scratch).

Then, the moment of truth. I closed the app. Re-opened it. And pointed it at the same 50,000 photos.

**Run 2:** 4 seconds.

I actually laughed out loud. The bottleneck had shifted entirely from "Parsing JPEGs" to "How fast can SQLite return rows?" (Answer: very fast).

## Runtime Config

Because I versioned the hash methods in the database, I could now do something cool: I added a "Settings" dialog where I could toggle individual algorithms on and off.

Want to only use MD5 for speed? Uncheck "Perceptual Hash." The pipeline adjusts instantly. Re-enable it? The system checks the cache, sees the missing values for *that specific algorithm*, and schedules jobs to compute only the missing data.

It felt like I had finally tamed the beast. The infrastructure was solid. Now I could finally focus on the actual goal: finding the duplicates.
