---
id: photoboss18
title: "📊 UX Improvements: Status Updates and Progress Indicators in Photoboss"
seoTitle: "Improving User Experience: Status Updates and Progress Indicators in Photoboss"
date: "2026-06-12"
category: "Software Engineering"
summary: "This post documents comprehensive UX improvements for Photoboss, a duplicate image finder. The author addresses several pain points including vague status messages, missing progress visibility, premature delete button activation, and progress bar issues by implementing a phase indicator strip, phase-specific signals, simplified status messages, and fixing the delete button timing to only enable when scanning fully completes."
project: "photoboss"
tags: ["UX Design","Qt/C++","Progress Indicators","Desktop Applications","UI/UX"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction

I've been using Photoboss daily while sorting through my own photo archives, and one thing kept nagging at me: I had no idea what the app was actually doing during a scan. Was it still finding files? Already hashing them? Halfway through grouping? The status bar would say "Scanning... Discovered 1,234 files," which told me a number but not where we were in the pipeline. And worse — the Delete button would light up mid-scan, letting me start deleting before all the duplicate groups had even appeared. That's a recipe for regret.

So I sat down to fix the UX properly: better status visibility, clearer pipeline stages, and—most importantly—making sure the Delete button only enables when the scan is truly done.

## The Problem

Users scanning large photo collections faced several pain points:

1. **Vague Status Messages** - "Scanning... Discovered X files" didn't clearly communicate what was happening
2. **No Progress Visibility** - Users couldn't see what stage of processing was happening
3. **Premature Delete Button** - The Delete button became active mid-scan, before all duplicate groups were displayed
4. **Progress Bar Stuck on Spinner** - When 0 duplicates found, progress bar remained in indeterminate mode

The Delete button timing was particularly problematic - users could start deleting files before they'd seen all the duplicates the scan had found.

## Solution Overview

I implemented four major improvements:

1. **Phase Indicator Strip** - A horizontal row showing three user-relevant pipeline phases
2. **Phase-Specific Signals** - Direct signals for UI updates, bypassing regex parsing
3. **Simplified Status Messages** - Short messages, counts in phase strip only
4. **Fixed Delete Button Timing** - Button now only enables when scan fully completes

## Implementation Details

### Phase Indicator Strip

I created a three-phase indicator system that runs horizontally in the footer area:

```
┌───────────────────────────────────────────────────────────┐
│ Finding Files      │   Analyzing        │   Grouping      │
│  ○  1,234          │   ○  567           │   ○  12         │
└───────────────────────────────────────────────────────────┘
```

Each phase has three states:
- **Pending** (○ gray) - Not yet started
- **Active** (● yellow with count) - Currently processing
- **Complete** (✓ green) - Phase finished

### Understanding the Concurrent Pipeline

A key insight from analyzing the codebase was that the pipeline stages run concurrently, not sequentially:

- **Finding Files** (DirectoryScanner) - Discovers files on disk
- **Analyzing** (DiskReader + HashWorker) - Reads and hashes images
- **Grouping** (ResultProcessor) - Clusters duplicates

When Finding Files is still scanning, Analyzing may already be processing previously discovered files. This concurrent nature required careful signal handling.

### Phase-Specific Signals (The Clean Architecture)

Instead of parsing status messages with regex, I added dedicated signals for phase updates in PipelineController:

```cpp
// PipelineController.h - new signals
signals:
    void phaseFindingUpdate(int count);      // Files discovered
    void phaseAnalyzingUpdate(int count);   // Files hashed/processed
    void phaseGroupingUpdate(int count);      // Files processed for grouping
```

This approach is:
- **Clean** - No parsing or string manipulation
- **Maintainable** - Direct connections, easy to understand
- **Testable** - Signals can be monitored independently
- **Efficient** - No regex overhead

### Status Message Improvements

Changed to short messages with counts in the phase strip:

| Phase                | Status Message                                  |
|----------------------|-------------------------------------------------|
| Start                | "Scan started..."                               |
| Finding Complete     | "File Discovery Complete. Processing Files..."  |
| Analyzing Complete   | "Files Processed. Grouping Duplicates..."       |
| Complete             | "n Duplicates found -- Scan Complete"           |
| No duplicates        | "No duplicates found -- Scan Complete"          |

### Progress Bar Fix

There was a bug where the progress bar remained as a spinner when 0 duplicates were found. The issue was that when the scanner finished, it started the progress timer but never emitted a determinate progressUpdate to switch from spinner mode.

Fix in PipelineController.cpp:

```cpp
// Before - no determinate emit
} else {
    m_totalFiles_ = total;
    emit status("File Discovery Complete. Processing Files...");
    m_progressTimer_.start();
}

// After - emit determinate progressUpdate
} else {
    m_totalFiles_ = total;
    emit status("File Discovery Complete. Processing Files...");
    emit phaseFindingUpdate(static_cast<int>(total));
    emit progressUpdate(0, total);  // Set determinate mode!
    m_progressTimer_.start();
}
```

### Delete Button Fix

The bug was in the enabling condition:

```cpp
// Old - enabled when ANY duplicate group was found
if (count > 0 && m_scan_found_duplicates_) {
    m_btn_delete_->setEnabled(true);
}

// New - only enabled when pipeline is fully stopped
bool canDelete = count > 0 && m_scan_found_duplicates_
              && m_pipeline_state_ == PipelineController::PipelineState::Stopped;
```

This ensures users can only delete after the scan fully completes and all groups are displayed.

## Challenges and Solutions

### Challenge 1: Extracting Phase Counts

The pipeline emits various progress signals, and mapping them to the right phase required careful analysis. Rather than parsing status messages (which would be fragile), I added dedicated signals that forward progress from each pipeline stage.

### Challenge 2: Handling Concurrent Stages

Since stages run in parallel, the code tracks each phase independently. The phase-specific signals emit counts from each stage as they progress, keeping the UI in sync.

### Challenge 3: UI Integration

The phase strip needed to fit in the existing footer layout without disrupting the progress bar or buttons. I added it as a new vertical layout item within the existing footer GroupBox.

## Reflection and Lessons Learned

This round of improvements reinforced a few principles I keep coming back to:

**Signal design is UI architecture.** Adding three dedicated phase signals instead of parsing status strings wasn't just cleaner — it fundamentally changed what the UI could display. The lesson is that the pipeline's output interface (its signals) should be designed for the UI's needs, not retrofitted from internal log messages.

**The Delete button is a safety-critical control.** The original code enabled it eagerly because "groups exist = ready to delete." But that ignored the user's mental model: they need to see all the options before making a choice. This is a case where correctness (wait until everything is displayed) beats responsiveness (enable as soon as possible).

**Progress visibility is a UX force multiplier.** The phase strip cost relatively little code to implement, but it dramatically changes how the app feels during a long scan. A few indicators and color states turned a black-box operation into something the user can follow and trust.

If I were doing this again, I'd start with the signal design rather than retrofitting it. The phase-specific signals should have been part of PipelineController from day one — it would have saved me the regex-parsing detour entirely.

## Results

Users now see:

1. **Clear Phase Indicators** - Finding Files → Analyzing → Grouping with live counts
2. **Color Coded States** - Yellow for active, green for complete, gray for pending
3. **Completed States Persist** - Phase indicators stay visible with ✓ after completion
4. **Safer Delete Button** - Only enables when scan fully completes
5. **Simplified Status Messages** - Short messages without counts
6. **Fixed Progress Bar** - Stays at 100% after completion, showing processing is done

## Looking Forward

The phase indicator system works well, but there's room to take it further:

- **Estimated time remaining per phase** — using rolling throughput averages to give the user a sense of how much longer each stage will take
- **Per-phase progress bars** — right now we show counts, but a visual fill bar would be more glanceable
- **Pause/resume scans** — the infrastructure is nearly there; it just needs a clean UI affordance
- **Progress percentage for the grouping phase** — the grouping stage is currently opaque; adding a completion ratio would round out the picture

The next post in this series will tackle consolidating the phase signals: the three separate `phase*Update` signals work, but they'd be cleaner as a single signal with an enum discriminator — reducing boilerplate and making the architecture more maintainable.