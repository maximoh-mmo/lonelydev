---
id: photoboss5
title: "📸 The Realisation: Recomputing Everything Is Wasteful"
seoTitle: "Optimizing Image Hashing Pipelines with Caching"
date: "2026-01-07"
category: "Software Engineering"
summary: "Identifying the inefficiency of recomputing hashes for unchanged files, and defining caching requirements for persistence, invalidation, and multiple hash algorithms."
project: "PhotoBoss"
tags: ["System Analysis", "Performance", "Caching"]
status: "published"
isAutoTranslated: false
---

My parallel pipeline was a thing of beauty. I could drag a folder of 10,000 images onto the window, and watch 32 CPU threads devour it. The fans would spin up, the progress bar would fly across the screen, and 45 seconds later, I had my results.

Then I closed the app. And opened it again. And dragged the same folder in.

And waited another 45 seconds.

## The "Lightbulb" Moment

It seems obvious in hindsight, but in the heat of "getting it working," I had ignored a fundamental truth: **My photos don't change.**

A picture taken in 2012 and stored on my NAS hasn't been modified in a decade. Why was I spending expensive CPU cycles decoding and hashing it every single time I wanted to organise my library?

I realised that for this tool to be actually *usable*—to be something I could open, tweak a filter, and close without feeling dread—it needed **Memory**.

---

## Defining the Cache

I grabbed a notebook (paper is still the best IDE) and sketched out what a caching system would actually look like. It wasn't just "save the results." It had strict requirements:

1.  **Persistence:** It has to survive application restarts. (Goodbye, `std::map`).
2.  **Invalidation:** If I *do* edit a photo, the cache must know instantly. Stale data is worse than no data.
3.  **Versioning:** If I improve my hashing algorithm next week, I need a way to tell the database "throw away the old hashes, they are garbage now."
4.  **Zero Config:** I didn't want to install a PostgreSQL server just to run my desktop app.

---

## The Candidate: SQLite

I briefly considered using a massive JSON file or a custom binary format. Then I remembered I wanted to keep my sanity.

SQLite was the only logical choice. It’s serverless, it’s single-file, and it has transactional integrity. If my app crashes halfway through writing a cache entry, the database won't get corrupted. Plus, Qt has excellent support for it via `QSqlDatabase`.

The decision was made. Now I just had to design a schema that could identify a file uniquely without actually reading it.
