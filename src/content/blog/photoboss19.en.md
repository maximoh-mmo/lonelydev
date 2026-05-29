---
id: photoboss19
title: "🔄 Refactoring Progress Indicators: From Multiple Signals to a Unified Phase System"
seoTitle: "Refactoring Progress Indicators: From Multiple Signals to a Unified Phase System"
date: "2026-06-19"
category: "Software Engineering"
summary: "This post details the refactoring of a progress indicator system in Photoboss, a duplicate image finder, from multiple signals to a unified phase system with an enum. The changes improved code maintainability, reduced boilerplate, and simplified UI management. A new ProgressCounterWidget encapsulates the display logic, making the architecture cleaner and more extensible."
project: "photoboss"
tags: ["Refactoring","Progress Indicators","Software Architecture"]
status: "scheduled"
isAutoTranslated: false
---


## Introduction

Good user feedback during long-running operations is critical for desktop applications. In Photoboss, our duplicate image finder, the UX improvements I described in my previous post introduced a phase indicator system with three separate signals—one for each pipeline stage. After using it for a while, I realized the implementation had room for improvement: the separate signals created boilerplate code, and the UI required manual spinner positioning.

This post documents the refactoring that consolidated the phase system into a single signal with an enum-based approach, creating cleaner code and a more maintainable architecture.

## The Problem

The previous implementation had several issues:

1. **Three separate signals** — `phaseFindingUpdate`, `phaseAnalyzingUpdate`, and `phaseGroupingUpdate` — each with identical signatures
2. **Manual spinner positioning** — The old code created spinner widgets and manually positioned them with `move(60, 8)` offsets
3. **Inconsistent state handling** — Each phase required its own update function and handler
4. **Boilerplate in MainWindow** — Three sets of labels, spinners, connect calls, and update methods

While functional, this approach didn't scale well and made adding new phases tedious.

## Solution Overview

I implemented a more elegant solution:

1. **Phase Enum** — A scoped enum in PipelineController: `Find`, `Analyze`, `Group`
2. **Consolidated Signal** — Single `phaseUpdate(Phase phase, int current, int total)` signal
3. **ProgressCounterWidget** — A new widget class that encapsulates progress display
4. **Simplified UI** — Removed manual spinner positioning from the .ui file

## Implementation Details

### Phase Enum

Instead of three separate signals, I defined a scoped enum in PipelineController.h:

```cpp
enum class Phase {
    Find,
    Analyze,
    Group
};
```

This provides type safety and makes it clear that these are related states. Adding a new phase is now just adding an enum value.

### Unified Signal

The new signal carries both the phase and the count:

```cpp
signals:
    void phaseUpdate(Phase phase, int current, int total);
```

Now a single connection handles all phase updates:

```cpp
connect(m_pipeline_controller_.get(), &PipelineController::phaseUpdate,
    this, &MainWindow::progressPhase);
```

The handler dispatches to the appropriate ProgressCounterWidget:

```cpp
void MainWindow::progressPhase(PipelineController::Phase phase, int count, int total)
{
    if (m_phase_indicators_.contains(phase)) {
        m_phase_indicators_[phase]->setProgress(count);
    }
}
```

### ProgressCounterWidget

The new widget encapsulates the progress display logic:

```cpp
class ProgressCounterWidget : public QWidget {
    Q_OBJECT
public:
    explicit ProgressCounterWidget(const QString& title, QWidget* parent = nullptr);

    void setProgress(int current, int total = 0);
    void setTotal(int total);
    void finish();
    void reset();
};
```

It displays:
- A title label ("Scan Progress", "Analyse Progress", etc.)
- A waiting spinner
- A progress count (e.g., "123 / 456")

The widget manages its own state internally, hiding the spinner when the phase is complete.

### UI Simplification

The MainWindow.ui file was simplified by removing the hard-coded phase strip layout. Instead, MainWindow.cpp now constructs the phase indicators programmatically:

```cpp
m_phase_indicators_[PipelineController::Phase::Find] = new ProgressCounterWidget("Scan Progress", this);
m_phase_indicators_[PipelineController::Phase::Analyze] = new ProgressCounterWidget("Analyse Progress", this);
m_phase_indicators_[PipelineController::Phase::Group] = new ProgressCounterWidget("Group Progress", this);

QWidget* container = new QWidget(m_ui_->phaseStrip);
QHBoxLayout* layout = new QHBoxLayout(container);
for (auto& indicator : m_phase_indicators_) {
    layout->addWidget(indicator);
}
m_ui_->phaseStripLayout->addWidget(container);
```

This approach:
- Gives the code more control over widget construction
- Eliminates the need for manual `move()` positioning
- Makes the layout responsive to container size

### WaitingSpinnerWidget Refactoring

The spinner widget received minor improvements:
- Renamed member variables to follow underscore convention (`m_` → `_`)
- Added optional parent centering and disabling
- Added MIT license header attribution
- Improved paint event rendering

### DirectoryScanner Fix

An important bug fix: DirectoryScanner now emits determinate progress:

```cpp
// Before (indeterminate spinner)
emit progress(count, 0);

// After (determinate count)
emit progress(count, count);
```

This ensures the progress bar correctly reflects scan completion rather than staying in spinner mode.

## Results

The refactored system provides:

1. **Cleaner Signal Design** — One signal instead of three
2. **Type Safety** — Phase enum prevents invalid phase values
3. **Encapsulated UI Logic** — ProgressCounterWidget manages its own state
4. **Less Boilerplate** — Single handler, single connect call
5. **Better Extensibility** — Adding a new phase requires minimal changes

## Challenges and Solutions

### Challenge: Migrating Existing Code

Updating from the old signal system to the new one required changes in multiple files:
- PipelineController.h/cpp (signal definition and emission)
- MainWindow.h/cpp (handler replacement)
- MainWindow.ui (layout simplification)

Solution: I made the changes incrementally, keeping the old code working until the new system was fully in place.

### Challenge: Total Count Synchronization

The Find phase knows the total files first, but the Analyze and Group phases don't initially know this total.

Solution: When the Find phase completes, I propagate the total to all subsequent phases:

```cpp
void MainWindow::progressPhase(PipelineController::Phase phase, int count, int total)
{
    if (m_phase_indicators_.contains(phase)) {
        if (phase == PipelineController::Phase::Find) {
            for (auto& indicator : m_phase_indicators_) {
                if (indicator.key() != phase) {
                    indicator.value()->setTotal(total);
                }
            }
        }
        m_phase_indicators_[phase]->setProgress(count);
    }
}
```

## Reflection

This refactoring taught me several lessons:

1. **Enums beat booleans** — A Phase enum is clearer than three boolean flags
2. **Single responsibility** — ProgressCounterWidget owning its state reduces MainWindow complexity
3. **Programmatic UI** — Sometimes building widgets in code is cleaner than designer files
4. **Determinate vs indeterminate** — Getting progress bar mode right matters for perceived performance

## Looking Forward

Possible future improvements:
- Per-phase progress bars (percentage completion)
- Estimated time remaining
- Pause/resume functionality
- Visual grouping indicators (progress dots showing number of groups found)

## Conclusion

The consolidated phase system provides a cleaner architecture while maintaining all the UX benefits of the original implementation. The code is now more maintainable and extensible—adding a new pipeline phase requires just a few lines of code instead of modifying multiple signal handlers.