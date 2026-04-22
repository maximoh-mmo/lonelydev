---
id: photoboss13
title: "🧹 The Great Cleanup: A Four-Phase Journey to Cleaner Code"
seoTitle: "The Great Cleanup: A Four-Phase Journey to Cleaner Code"
date: "2026-05-08"
category: "Software Engineering"
summary: "A developer shares their four-phase strategy for cleaning up a well-understood codebase through removing dead code, centralizing configuration, eliminating duplicates, and enforcing naming conventions. The process spanned two weeks and improved maintainability without adding features."
project: "photoboss"
tags: ["code cleanup","refactoring","software engineering"]
status: "scheduled"
isAutoTranslated: false
---

# The Great Cleanup: A Four-Phase Journey to Cleaner Code

I've been in this codebase almost every day for months. I know it pretty well - can navigate straight to the relevant file when debugging, remember where I left off on half-finished features, that kind of thing. So when it came time to start preparing Photoboss for public release, I wasn't coming in completely blind. I knew pretty much exactly what was there.

That said, even familiar code accumulates gunk when you've been heads-down shipping features. Little experiments that didn't pan out, TODO comments from early implementation, constants that got copied inline rather than centralized, naming that drifted as my style evolved. Nothing terrible - not security issues or algorithmic mess - just the normal accumulation of a project that's been actively developed. I figured while I was doing the polish anyway, I might as well clean up some of the loose ends.

What started as "let's clean up a few things" turned into four distinct phases.

## Phase One: The Easy Wins

First pass was about finding the obvious stuff - dead code that compiled but wasn't called, hardcoded values that should reference centralized constants, comments that had outlived their purpose.

The `SimilarityWeights` struct in `GroupTypes.h` was the big one. I'd created it early on as a planned replacement for the similarity configuration, then moved in a different direction with the approach but never deleted the prototype. The weights were different from what I actually ended up using in `SimilarityEngine::Config` (0.45 vs 0.60 for pHash), so if anyone had tried to use it, they'd have gotten wrong results. Dead code that would have caused bugs if someone tried to use it - worth removing.

A hardcoded `140` in `ImageThumbWidget.cpp` that should have been `settings::ThumbnailWidth` - which was already defined in AppSettings.h, just not used. And a TODO comment in `MainWindow.cpp` that said "Implement actual deletion to trash" from when I first built that feature years ago. The functionality had long since been implemented, just the comment remained.

The `parentWidget()->parentWidget()` thing in `onGroupUpdated` was actually interesting. I wrote that during a rush to get the thumbnail waiting logic working, using two parent calls to walk up the Qt widget hierarchy and verify an ImageThumbWidget belonged to the right GroupWidget. The comment right next to it said "very hacky" - which, fair enough, it was. Once I mapped out the actual widget relationships (ImageThumbWidget's parent is GroupWidget, so just check the direct parent), the fix was cleaner than the original. One of those things that works fine until someone changes the hierarchy, and then doesn't.

All small changes, but they added up. About a day's work spread across a few sessions.

## Phase Two: Taming Configuration

The thresholds for similarity detection were inline in the hashing logic - values like 0.98 and 0.94 embedded directly in comparisons. Works fine when you know the code, but not very discoverable if someone wants to understand what controls detection sensitivity.

I added a configuration section in `AppSettings.h`:

```cpp
static inline constexpr double SimilarityStrongThreshold = 0.97;
static inline constexpr double SimilarityWeakThreshold = 0.92;
static inline constexpr double SimilarityPHashGate = 0.98;
static inline constexpr double SimilarityDHashGate = 0.94;
```

Then wired these into `SimilarityEngine::Config` as defaults. Now the thresholds live in one place, with names that explain their purpose, and the engine reads from a config object rather than magic values. Same treatment for UI timing values - batch timer intervals, scroll area dimensions, dialog sizes. All moved to centralized constants with clear names.

The type safety fix was more substantive. The `GroupWidget` class had a method that used `reinterpret_cast` to treat one struct type as another:

```cpp
result.push_back(reinterpret_cast<const HashedImageResult*>(&thumb->Image()));
```

Technically worked - memory layout was compatible - but it was technically incorrect. If the structures ever diverged, silent corruption. I replaced it with a simpler version that just returns a count rather than pointers to internal structures. Smaller API, correct API.

## Phase Three: Removing Duplicate Logic

This one surprised me when I found it. Two implementations of the same EXIF orientation transformation - the same switch statement for applying rotation based on EXIF tags, copied into two places.

`HashWorker.cpp` had its own version, and `OrientImage.cpp` had a utility that did the same thing but with better error handling. I wrote the first version, then later created the utility, then used the worker version instead of refactoring to the utility. Classic.

Refactored HashWorker to call the existing `OrientImage` function:

```cpp
QImage img;
img.loadFromData(item->imageBytes);
img = OrientImage(img, item->fileIdentity.exif().orientation.value_or(1));

if (img.isNull()) {
    result->source = HashSource::Error;
}
```

Eight lines replacing sixty. The utility already handles the early-return for unrotated images, so no need to duplicate that optimization. One source of truth now.

While reviewing the refactor, I caught that I'd initially forgotten to assign the return value - calling the function without capturing the result. Rotated images would have silently failed. Fixed before it shipped, but one of those subtle bugs that duplicate code invites - slightly different implementations that don't quite behave the same way.

## Phase Four: Naming Consistency

After three phases worth cleaning up, the naming conventions were bothering me more. Some member variables had `m_` prefixes, some didn't. Some had trailing underscores, some didn't. A mix that evolved over time.

Standardized on the Qt convention: `m_memberName_` - m prefix, camelCase, underscore suffix. Matches what Qt's own code uses. Several files, maybe fifty variables renamed. Now predictable - see an identifier with that pattern, you know it's a member variable.

## The Outcome

A week's worth of cleanup work spread across several coding sessions. No security vulnerabilities found, no algorithmic rewrites, no features added. Just the normal polish that actively-developed projects need.

The codebase is cleaner now. More consistent. More ready for someone else to read and understand. That's the goal - code that doesn't fight the people maintaining it. Even if in the end the only people is me!