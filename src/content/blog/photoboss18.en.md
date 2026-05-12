---
id: photoboss18
title: "📊 UX Improvements: Status Updates and Progress Indicators in Photoboss"
seoTitle: "Improving User Experience: Status Updates and Progress Indicators in Photoboss"
date: "2026-05-22"
category: "Software Engineering"
summary: "This post documents comprehensive UX improvements for Photoboss, a duplicate image finder. The author addresses several pain points including vague status messages, missing progress visibility, premature delete button activation, and progress bar issues by implementing a phase indicator strip, phase-specific signals, simplified status messages, and fixing the delete button timing to only enable when scanning fully completes."
project: "photoboss"
tags: ["UX Design","Qt/C++","Progress Indicators","Desktop Applications","UI/UX"]
status: "scheduled"
isAutoTranslated: false
---

# Improving User Experience: Status Updates and Progress Indicators in Photoboss

## Introduction

When building applications that perform long-running background operations, users need clear, actionable feedback on what's happening. In Photoboss - our duplicate image finder - the UX had several issues: status messages were unclear, there was no multi-stage progress visibility, and critically, the Delete button enabled prematurely before all groups were displayed in the preview pane.

This post documents the comprehensive UX improvements that address these issues.

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

Following the user's specification, I created a three-phase indicator system that runs horizontally in the footer area:

```
┌──────────────────────────────────────────────────────────────────┐
│ Finding Files   │   Analyzing    │   Grouping          [✓ Done] │
│  ○  1,234       │   ○  567      │   ○  12                    │
└──────────────────────────────────────────────────────────────────┘
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

| Phase | Status Message |
|-------|---------------|
| Start | "Scan started..." |
| Finding Complete | "File Discovery Complete. Processing Files..." |
| Analyzing Complete | "Files Processed. Grouping Duplicates..." |
| Complete | "n Duplicates found -- Scan Complete" |
| No duplicates | "No duplicates found -- Scan Complete" |

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

The phase strip needed to fit in the existing footer layout without disrupting the progress bar or buttons. I added it as a new verticallaout item within the existing footer GroupBox.

## Results

Users now see:

1. **Clear Phase Indicators** - Finding Files → Analyzing → Grouping with live counts
2. **Color Coded States** - Yellow for active, green for complete, gray for pending
3. **Completed States Persist** - Phase indicators stay visible with ✓ after completion
4. **Safer Delete Button** - Only enables when scan fully completes
5. **Simplified Status Messages** - Short messages without counts
6. **Fixed Progress Bar** - Stays at 100% after completion, showing processing is done

## Looking Forward

Possible future improvements:

- Estimated time remaining per phase
- Per-phase progress bars (not just counts)
- Ability to pause/resume scans
- Progress percentage for the grouping phase

## Conclusion

The improvements balance giving users full visibility into the pipeline while not overwhelming them with technical details. The concurrent nature of the pipeline is now communicated through clear phase indicators, and users can trust that the Delete button only becomes active when scanning is fully complete.