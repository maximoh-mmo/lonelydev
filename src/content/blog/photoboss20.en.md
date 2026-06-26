---
id: photoboss20
title: "🧹 The Great Cleanup: 64 Files, 393 Deletions, Zero Regrets"
seoTitle: "The Great Cleanup: 64 Files, 393 Deletions, Zero Regrets"
date: "2026-06-26"
category: "Software Engineering"
summary: "A developer cleaned up technical debt in their C++/Qt photo deduplication app by standardizing naming conventions, fixing Qt includes, and removing dead code. The 8-hour cleanup effort touched 64 files and removed 393 lines of code."
project: "photoboss"
tags: ["C++","Qt","Code Refactoring"]
uuustatus: "scheduled"
isAutoTranslated: false
---


## Introduction

You know how a codebase starts — one-off scripts become core features, `Run()` sits next to `run()` and you tell yourself you'll normalize it later, and every Qt include is a different style because you copy-pasted from five different Stack Overflow answers. I've been building **PhotoBoss**, a C++/Qt desktop app for deduplicating photo collections, and the entropy had reached critical mass.

I sat down to delete one dead stage (`ExifRead` — already merged into `DiskReader` months ago, but never cleaned up). Eight hours later, I'd touched 64 files, removed 393 lines, and established conventions that should make the next six months of development noticeably less painful.

This post is a log of what I found, what I changed, and what I learned about letting technical debt compound.

## How It Started

The project structure was a snapshot of indecision. When I got stuck on something hard (pipeline threading, cache invalidation, thumbnail scaling), I'd happily refactor local details but never look up. The result was a codebase where every subsystem had its own dialect — some consistent internally, but all inconsistent with each other.

### Naming convention hell

The public API was a mix of PascalCase and camelCase:

```cpp
// MainWindow
void Init();
void SetCurrentFolder(const QString& path);
void OnBrowse();
void WireConnections();

// Pipeline
State GetPhase();
void AddStage(std::unique_ptr<StageBase> stage);

// StageBase
void Run();       // public
virtual void run(); // protected — collision!
```

Member variables were even worse. Some used `m_`, some didn't, some used `b_` for booleans, and the `_` suffix was inconsistent:

```cpp
// HashWorker.h
bool m_abortRequested;       // m_ prefix, no suffix
HashMethod* hashMethod;      // nothing
std::atomic<bool> b_shutdown_; // b_ prefix, has suffix

// ScopedTimer.h
std::chrono::high_resolution_clock::time_point start_; // suffix, no m_
```

When `m_abortRequested` sits next to `hashMethod` in the same class, something has gone wrong.

### Qt includes in triplicate

Qt includes had three competing styles:

```cpp
#include <qstring.h>      // Qt3/Qt4 convention — still works but deprecated
#include <QWidget>        // Qt5 convention — no .h, UpperCamelCase
#include <QImageIO.h>     // Qt5 convention but with .h — wrong
```

Qt 6.9.1 is unambiguous: `<QUpperCamelCase>` with no `.h` suffix. I had 18 violations across the codebase.

### Dead code furniture

Dead code accumulates silently. The `ExifRead` stage was the biggest piece — a full stage class with header, implementation, vcxproj entries, and MOC output — all doing exactly nothing. But there were other ghosts too:

- `HashScorer` was forward-declared in `SimilarityEngine.h` but never defined anywhere
- `ProgressCounterWidget` had `m_totalLabel_` and `m_active_` members that were set but never read
- `Pipeline.h` had seven forward declarations for classes that were never referenced in the header
- `GroupWidget.cpp` had a `#pragma once` — a header guard in a `.cpp` file (which does nothing)

### A stale workaround

The most interesting find was in `PipelineFactory.cpp`:

```cpp
#ifdef Q_PRIVATE_SLOTS
#undef Q_PRIVATE_SLOTS
#endif
```

`Q_PRIVATE_SLOTS` is a Qt macro used by the Meta-Object Compiler. Somewhere around Qt 5.12, the Visual Studio Qt Tools plugin had a bug where it would mangle `Q_PRIVATE_SLOTS` declarations in non-MOC-compiled translation units. The workaround was to undefine the macro before any code that included `<QObject>` indirectly.

That bug hasn't existed for years. Qt 6.9.1 with MSVC 2022 compiles cleanly without the hack. I removed it.

## The Convention Decisions

Before the cleanup, I had to decide what the code should look like. These were the rules I settled on:

1. **camelCase for all methods**, regardless of access level. No PascalCase anywhere.
2. **`m_` prefix + `_` suffix** for all member variables. The prefix identifies "this is a member" and the suffix avoids collisions with local variables.
3. **`doRun()` for the protected virtual** that subclasses override, `run()` for the public exception-wrapping entry point. This fixes the `StageBase` collision.
4. **`<QUpperCamelCase>`** for all Qt includes, no `.h` suffix.

These aren't Qt conventions (Qt uses PascalCase for public methods and `m_` prefix without suffix). But the project already had partial camelCase, and consistency matters more than which convention you pick.

## The Changes

### Method renames

The biggest rename batch touched the essential classes:

| File | Before | After |
|------|--------|-------|
| `MainWindow` | `GetCurrentFolder`, `Init`, `SetCurrentFolder`, `OnBrowse` | `getCurrentFolder`, `init`, `setCurrentFolder`, `onBrowse` |
| `Pipeline` | `GetPhase`, `AddStage`, `AddQueue`, `AddThread` | `getPhase`, `addStage`, `addQueue`, `addThread` |
| `StageBase` | `Run()` (public), `run()` (virtual) | `run()` (public), `doRun()` (virtual) |
| `HashMethod` | `InputType()` | `inputType()` |
| `DiskReader` | `Finished()` | `finished()` |

All call sites (15 files) were updated in the same pass.

### Member variable renames

About 30 members were renamed across the affected classes:

```
// ShaderSpinnerWidget
m_spinTimer → m_spinTimer_
m_spinAngle → m_spinAngle_
m_isSpinning → m_isSpinning_
m_lastUpdate → m_lastUpdate_

// Queue.h
b_shutdown_ → m_shutdown_

// Pipeline
allStages → m_allStages_
allQueues → m_allQueues_
currentPhase → m_currentPhase_
state → m_state_
```

The `b_` prefix for booleans was replaced with the standard `m_` prefix. That prefix was from an earlier convention attempt that never propagated — acknowledging and removing it felt better than keeping it as an oddity.

### Include path fixes

Three includes referenced wrong paths because files had been moved without updating their consumers:

```
// Before (wrong)
#include "util/DataTypes.h"       // in NullHashCache.h
#include "HashCatalog.h"          // in HashCatalog.cpp — same directory

// After (correct)
#include "types/DataTypes.h"      // DataTypes.h lives in types/
#include "hashing/HashCatalog.h"  // explicit path to inc/
```

There were also five namespace closing comments that referenced specific sub-namespace paths:

```cpp
// } // namespace photoboss::pipeline::factory
```

These became:

```cpp
// } // namespace photoboss
```

The closing comment should match the opening namespace — which in our entire codebase is just `photoboss`. Listing sub-namespaces is fragile: it breaks every time you move a file between directories.

### Missing `storeBatch()` override

`NullHashCache` (a no-op cache implementation used for testing) had every other virtual from `IHashCache` implemented except `storeBatch()`. The pure virtual existed because `CacheStore::flushBatch()` calls it in a code path that can't distinguish between cache implementations. Adding the no-op override was the fix — more appropriate than removing the pure virtual from the interface, since `SqliteHashCache` genuinely needs it.

### The ExifParser deduplication

The `ExifParser` class had two `parse()` overloads — one taking a file path, one taking a `QByteArray`. After opening the image source, they did exactly the same thing: read metadata, extract orientation, date, make, and model.

The standard refactoring — extract a private helper — eliminated ~50 lines of duplication:

```cpp
ExifData ExifParser::parse(const QString& filePath)
{
    return parseFromImage(Exiv2::ImageFactory::open(filePath.toStdString()));
}

ExifData ExifParser::parse(const QByteArray& bytes)
{
    return parseFromImage(Exiv2::ImageFactory::open(
        reinterpret_cast<const Exiv2::byte*>(bytes.constData()), bytes.size()));
}

ExifData ExifParser::parseFromImage(Exiv2::Image::UniquePtr image)
{
    // ... shared metadata extraction ...
}
```

Two call sites become one-liner delegations. The `parseFromImage` method lives in the anonymous-namespace-equivalent of a private static.

### Renaming `humanSize.h` to `HumanSize.h`

The file `util/humanSize.h` was the only header in the project using lowercase naming. It also used `static` functions, which produce redundant copies in every translation unit that includes the header. The fix: rename to `HumanSize.h` and replace `static` with `inline`.

### Removing the `hashMap` parameter from `CacheQuery`

`CacheQuery`'s constructor had an unused `std::map<QString, QString> hashMap` parameter — a leftover from when the cache was an in-memory map rather than SQLite. Removing it (and adding `explicit` to the constructor) cleaned up one call site and one dead parameter.

### Moving `HashCatalog.cpp` to `src/`

`HashCatalog.cpp` lived in `inc/photoboss/hashing/` — a header directory. It's an implementation file with actual code, not a template or inline-heavy header. Into `src/hashmethods/` it went, matching where all other hash implementation files live.

## The Signed/Unsigned Warning

The last warning in the build was in `GroupWidget.cpp`, which compared `size_t` loop variables against a `QVector::size()` returning `qsizetype` (signed), then cast to `int` for comparison with `group.bestIndex`:

```cpp
// Before — C4267 warning
for (size_t i = oldCount; i < m_thumbs_.size(); ++i) {
    if (static_cast<int>(i) == group.bestIndex)
```

The fix was to use `int` throughout — simpler, matches the type of `bestIndex`, and eliminated the static_cast:

```cpp
// After — no warning
int oldCount = static_cast<int>(m_thumbs_.size());
for (int i = oldCount; i < static_cast<int>(group.images.size()); ++i) {
    if (i == group.bestIndex)
```

Explicit casts at the boundaries where types differ; no casts inside the loop body.

## What Didn't Change

Not every convention question has been settled. Two items deliberately deferred:

1. **`ProgressCounterWidget::ProgressState`** — a private enum, only used internally, no Q_PROPERTY or signal/slot involvement. Plain `enum` is fine.
2. **`Pipeline::PipelineState`, `Pipeline::Phase`, `ImageThumbWidget::State`** — these use `Q_ENUM` because they cross queued signal/slot connections where the meta-object system needs to serialize/deserialize them. That's a functional requirement, not a style preference.

## The Results

### By the numbers

| Category | Count |
|---|---|
| Files modified | 64 |
| Lines inserted | 237 |
| Lines deleted | 393 |
| Dead files removed | 2 |
| Method renames | ~15 |
| Member variable renames | ~30 |
| Qt include style fixes | 18 |
| Include path fixes | 3 |
| Compiler warnings remaining | **0** |

### The quality diff

- Every method in the project is now camelCase — no second-guessing when writing new code
- Every member variable follows `m_` + `_` — no hunting to check if a given name is a local or a member
- Qt includes are consistent — IDEs with `<QUpperCamelCase>` completion work correctly
- The vcxproj/filters accurately reflect the file tree — no stale entries
- The codebase compiles cleanly at `/W4` with zero warnings

## What I'd Do Differently

**Standardize conventions at the start of a project, not in the middle.** I knew within two weeks of starting PhotoBoss that the naming was inconsistent. I told myself "I'll fix it later." Later arrived six months later across 64 files. The friction of changing conventions mid-project is real — rebasing branches, retraining muscle memory, explaining to collaborators why a third of the headers changed.

**Delete dead code immediately.** The ExifRead stage was dead for months. Every time I grepped for "ExifRead" or browsed the pipeline wiring, I had to mentally skip it. The cost of deleting was 30 seconds. The cost of NOT deleting was hundreds of micro-interruptions over months.

**Be suspicious of static local variables.** The pattern `static Foo lastValue` inside a member function is global state in disguise. It resists testing, complicates extraction, and breaks thread safety. Every time I find one of these, replacing it with a proper member variable pays dividends immediately.

## Reflection

I found this cleanup surprisingly satisfying. Most feature work involves adding code — new classes, new methods, new tests. Cleaning up is the opposite: every successful change is a deletion. The codebase gets smaller, the mental model gets cleaner, and the linter output is empty.

The most valuable change wasn't any single rename or removal. It was the **consistency**. Now when I open a file, I can trust that the naming conventions will be the same as the file I looked at before. That's a small thing, but it compounds. Every minute not spent guessing "is this method PascalCase or camelCase?" is a minute spent on something that matters.

## Next Steps

With the conventions settled, the remaining work is feature development:

| Priority | What | Why |
|----------|------|-----|
| 1 | Hardware-aware auto-tuning | Probe cores and storage at startup to set optimal thread counts |
| 2 | Unit tests | Pipeline stages and caching have zero test coverage |
| 3 | Pipeline error reporting | Errors are swallowed — stages need failure pathways |

The auto-tuning piece is the most technically interesting. The optimal pipeline configuration is very different on a 16-core SSD machine (8 workers, 2 disk readers) vs. an HDD (1 worker, sequential reads). Currently this is a manual setting. Detecting it automatically would make the application work well out of the box for any hardware.

---

*PhotoBoss is open source. The full repository is available at [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
