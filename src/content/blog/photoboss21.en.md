---
id: photoboss21
title: "🏗️ From Monolith to Composition Root: SOLID Refactoring in a Qt Desktop App"
seoTitle: "From Monolith to Composition Root SOLID Refactoring Qt Desktop App"
date: "2026-07-03"
category: "Software Engineering"
summary: "This post walks through a multi-phase refactoring that converts a monolithic Qt main window into a clean composition root using SOLID principles. Services are extracted, widget ownership clarified, and dependencies injected, resulting in a more testable, maintainable, and readable codebase."
project: "photoboss"
tags: ["Qt","C++","SOLID","Dependency Injection","Refactoring","Architecture"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction

I've been building **PhotoBoss**, a C++/Qt desktop application that scans directories for duplicate photos and helps you clean them up. Like many projects that start as a prototype, the code worked — but it wasn't exactly beautiful. Over time, `MainWindow.cpp` had grown into a monolithic ~700-line class that managed the pipeline, owned the entire UI tree, queued thumbnail updates, handled deletion logic, and generally knew way too much about everything.

This post walks through a multi-phase refactoring that transformed that monolithic `MainWindow` into a clean **composition root** with clear separation of concerns. (A composition root is a single location in the application — typically `main()` — where all dependency graphs are assembled. Every other class receives its dependencies fully formed.) Along the way I extracted services, eliminated SOLID violations, and ended up with something I'm not embarrassed to open in the morning.

## The Starting Point: What Was Wrong

When I first wrote `MainWindow`, I followed the pattern you see in every Qt tutorial: a single `QMainWindow` subclass that does everything. The `Init()` method was particularly egregious:

```cpp
void MainWindow::Init()
{
    // Create pipeline controller
    m_pipeline_controller_ = new PipelineController();

    // Create thumbnail scroll area, layout, groups...
    m_thumbnail_scroll_ = new QScrollArea();
    m_thumbnail_container_ = new QWidget();
    m_thumbnail_layout_ = new QVBoxLayout(m_thumbnail_container_);

    // Create preview pane
    m_preview_pane_ = new PreviewPane(this);

    // Create deletion service inline
    // ... all mixed together
}
```

The problems were numerous:
- **Violation of the Dependency Inversion Principle (DIP)**: `MainWindow` directly instantiated every dependency. There was no way to test or swap implementations.
- **Violation of the Single Responsibility Principle (SRP)**: `MainWindow` handled UI layout, pipeline orchestration, thumbnail management, and file deletion.
- **Widget ownership scattered everywhere**: Pointers to child widgets were spread across the class with no clear ownership hierarchy.
- **Dead code**: Some members lingering from earlier iterations were declared but never read.

## Phase 1: Extracting Standalone Services

The codebase had already come a long way — the naming conventions were standardized (see [The Great Cleanup](#)), the pipeline had been modularized into single-responsibility stages, and the phase indicator system was consolidated into a clean `Pipeline::Phase` enum. But `MainWindow` still owned everything and wired it all by hand. The first step was identifying logical boundaries in the monolith and extracting them into their own classes.

### UiSnapshot: A Standalone Data Structure

The `UiUpdateQueue` class had a nested `Snapshot` struct that bundled all the state the UI needed to render. It was already well-designed — a value type with no behavior — so its extraction was straightforward:

```cpp
// photoboss/inc/photoboss/ui/UiSnapshot.h
struct UiSnapshot {
    Pipeline::PipelineState pipelineState = Pipeline::PipelineState::Stopped;
    QString statusMessage;
    std::deque<ImageGroup> pendingGroups;
    QMap<quint64, ImageGroup> updatedGroups;
    QMap<QString, QPixmap> thumbnailCache;
    QMap<Pipeline::Phase, QPair<int, int>> phaseProgress;
};
```

This is now shared between `UiUpdateQueue` (producer) and `MainWindow` (consumer) without either needing to know about the other's internal types.

### ThumbnailManager: Owning the Thumbnail Tree

The thumbnail management code was the most tightly coupled piece. `MainWindow` owned the scroll area, the container widget, the layout, the group widgets map, the thumbnail waiter multimap, and the thumbnail cache. The extraction was messy because these dependencies cross-referenced each other.

**Key insight**: After extraction, `ThumbnailManager` needed to know about `PreviewPane` (to wire up preview signals), but it also needed to provide its widget subtree to `MainWindow`. The clean solution was to have `ThumbnailManager` own its entire subtree internally and expose it through `rootWidget()`:

```cpp
class ThumbnailManager : public QObject {
    Q_OBJECT
public:
    explicit ThumbnailManager(PreviewPane* previewPane, QObject* parent = nullptr);
    
    QWidget* rootWidget() const;        // Returns the QScrollArea
    int minimumWidthHint() const;       // Layout hint for the splitter
    
    // Group/thumbnail management
    void processPendingGroup(const ImageGroup& group);
    void processUpdatedGroups(const QMap<quint64, ImageGroup>& updatedGroups);
    void distributeThumbnails(const QMap<QString, QPixmap>& thumbnails);
    void clearResults();

signals:
    void selectionChanged();

private:
    QScrollArea* m_scrollArea_;
    QWidget* m_container_;
    QVBoxLayout* m_layout_;
    // ...
};
```

Inside the constructor, it builds the complete widget hierarchy:

```cpp
ThumbnailManager::ThumbnailManager(PreviewPane* previewPane, QObject* parent)
    : QObject(parent), m_previewPane_(previewPane)
{
    m_container_ = new QWidget();
    m_layout_ = new QVBoxLayout(m_container_);

    // Compute minimum width from settings + layout metrics
    int spacing = m_layout_->spacing();
    int margins = m_layout_->contentsMargins().left() +
        m_layout_->contentsMargins().right();
    m_minimumWidth_ = settings::ThumbnailsPerRow * settings::ThumbnailWidth
        + settings::ThumbnailsPerRow * spacing + margins;

    m_container_->setMinimumWidth(m_minimumWidth_);
    m_container_->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Expanding);

    m_scrollArea_ = new QScrollArea();
    m_scrollArea_->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Expanding);
    m_scrollArea_->setWidgetResizable(true);
    m_scrollArea_->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    m_scrollArea_->setWidget(m_container_);
}
```

### DeletionService: Extracting Deletion Logic

Deletion logic was another natural boundary. The delete confirmation dialog and move-to-trash functionality already existed from earlier work (covered in previous posts), but it was all wired directly into `MainWindow`. Methods like `countSelectedForDeletion()` and `onDeleteClicked()` operated on the same set of selected thumbnails but lived in the window class. I extracted these into a `DeletionService` class.

To follow DIP for the actual deletion behavior, I introduced an interface:

```cpp
class IDeletionStrategy {
public:
    virtual ~IDeletionStrategy() = default;
    virtual bool deleteFile(const QString& path) = 0;
};
```

With a trivial concrete implementation:

```cpp
class TrashDeletionStrategy : public IDeletionStrategy {
public:
    bool deleteFile(const QString& path) override {
        return QFile::moveToTrash(path);
    }
};
```

This made the `DeletionService` testable — I could inject a mock strategy that recorded files rather than actually deleting them.

### Fixing the Static `lastState`

During extraction of `updatePhaseProgress()`, I noticed `applySnapshot()` had a `static Pipeline::PipelineState lastState`. This was a correctness bug waiting to happen: static locals in member functions are global state in disguise. I promoted it to a proper member variable `m_lastPipelineState_`, which also made the extraction straightforward.

## Phase 2: From `Init()` to Composition Root

The first phase extracted services but left `MainWindow` still responsible for wiring them together. The second phase moved that responsibility out entirely.

### Widget Ownership: The Key Design Decision

My first design sketch had ThumbnailManager receiving the container and layout from Init() — a compromise to avoid restructuring too much at once. But this created a circular dependency on paper: MainWindow would need ThumbnailManager to own the widgets, but ThumbnailManager would need MainWindow to create them.

The real answer was simpler: **ThumbnailManager should own its own widget subtree.** Once I made that change, MainWindow no longer needed `m_thumbnail_scroll_`, `m_thumbnail_container_`, or `m_thumbnail_layout_` at all.

### Constructor Injection

The `MainWindow` constructor now takes all its dependencies as `unique_ptr`:

```cpp
MainWindow(std::unique_ptr<PipelineController> controller,
           std::unique_ptr<ThumbnailManager> thumbnailManager,
           std::unique_ptr<PreviewPane> previewPane,
           std::unique_ptr<DeletionService> deletionService,
           QWidget* parent = nullptr);
```

Inside `Init()`, there are no `new` calls for services — it just places the injected widgets into the UI:

```cpp
void MainWindow::Init()
{
    // Phase indicators (still owned by MainWindow, but that's OK — thin UI widgets)
    m_phase_indicators_[Pipeline::Phase::Find] = new ProgressCounterWidget("Scanning", this);
    m_phase_indicators_[Pipeline::Phase::Analyze] = new ProgressCounterWidget("Analysis", this);
    m_phase_indicators_[Pipeline::Phase::Group] = new ProgressCounterWidget("Grouping", this);

    // Split body: thumbnails | preview
    m_splitter_ = new QSplitter(Qt::Horizontal);
    m_splitter_->addWidget(m_thumbnailManager_->rootWidget());
    m_splitter_->addWidget(m_preview_pane_.get());

    m_deletionService_->setDialogParent(this);

    // Wire signals
    connect(m_thumbnailManager_.get(), &ThumbnailManager::selectionChanged,
            this, &MainWindow::onGroupSelectionChanged);
    connect(m_deletionService_.get(), &DeletionService::deletionCompleted,
            this, [this]() { clearResults(); updateDeleteButtonState(); });

    WireConnections();
}
```

### The Composition Root

With that change, `main.cpp` becomes the **composition root** — the one place in the application where dependency graphs are assembled:

```cpp
int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    app.setStyleSheet(/* ... */);

    auto controller = std::make_unique<photoboss::PipelineController>();
    auto previewPane = std::make_unique<photoboss::PreviewPane>();
    auto thumbnailManager = std::make_unique<photoboss::ThumbnailManager>(previewPane.get());
    auto deletionService = std::make_unique<photoboss::DeletionService>(
        thumbnailManager.get(),
        std::make_unique<photoboss::TrashDeletionStrategy>(),
        nullptr);

    photoboss::MainWindow window(
        std::move(controller),
        std::move(thumbnailManager),
        std::move(previewPane),
        std::move(deletionService));

    window.show();
    return app.exec();
}
```

Notice the order: services are constructed bottom-up in dependency order. `previewPane` is created before `thumbnailManager` because the latter needs a raw pointer to the former (for the preview signal). `thumbnailManager` is created before `deletionService` because the latter iterates over the former's group widgets.

## Phase 3: Applying YAGNI Wisely

Not every SOLID principle needs to be applied dogmatically. I opted out of two abstractions:

**No `IPipelineController` interface.** The pipeline controller has one stable implementation with no mock requirement. Adding an interface would be pure boilerplate with zero benefit.

```cpp
// Not this:
std::unique_ptr<IPipelineController> controller;

// Just this:
std::unique_ptr<PipelineController> controller;
```

**No `IAppConfig` interface.** The application settings (`settings::ThumbnailWidth`, `settings::SCHEMA_VERSION`, etc.) are compile-time constants. They're not volatile dependencies that need mocking.

## The Results

Here's what the diff looks like in numbers:

| Metric | Before | After |
|---|---|---|
| `MainWindow.cpp` lines | ~700 | ~270 |
| `MainWindow` member variables | 26+ | 15 |
| Services created in `Init()` | 5 | 0 |
| SOLID violations in MainWindow | Several | Minimal |
| New files added | — | 7 |
| Compiler warnings | 1 | 0 |

(There was also a stray U+FFFD replacement character lurking in `SqliteHashCache.cpp` that triggered a C4828 warning — replaced it with an ordinary ASCII hyphen. A small find, but the kind of thing that pays to clean up when you're already in the code.)

### What Works

- **Testability**: Each service can be instantiated and tested independently
- **Readability**: `MainWindow` now clearly delegates to named services rather than doing everything inline
- **Changeability**: Swapping strategies (e.g., `TrashDeletionStrategy` → permanent delete) requires zero changes to `MainWindow`
- **Widget ownership**: Each widget has a clear owner; no dangling pointers

### Lessons Learned

A few things I'd flag for my future self:

1. **Write the composition root first.** The `main()` function should always be the place where the application graph is assembled. Building it last meant retrofitting the constructor signatures — doable, but more friction than necessary.
2. **The `setDialogParent()` pattern is a smell.** The deletion dialog's parent is the MainWindow object, which doesn't exist yet at composition-root time. I needed a late-bound setter. A more disciplined approach would be to have `MainWindow` own the dialog creation directly via a factory, or to make the dialog parent-agnostic and reparent it after construction.
3. **Signals that cross service boundaries want a mediator.** Signals like `selectionChanged()` link ThumbnailManager to MainWindow. For now, MainWindow acts as the thin glue layer, and that's fine. If the signal graph grows much more, a dedicated mediator class would be worth extracting.

## Next Steps

With the architecture cleaned up, the immediate priorities are:

- **Remove the remaining dead member `m_body_`** from MainWindow — declared but unused since the splitter took over the body area.
- **Unit tests for `DeletionService`** with a mock `IDeletionStrategy`, and `ThumbnailManager` with a mock `PreviewPane`. Both are now independently testable.
- **Pipeline error reporting**: The state machine currently has basic Stopped/Running/Stopping states. More granular error propagation would let the UI surface per-stage failures.

## Reflection

This refactoring confirmed something I've suspected for a while: **SOLID principles are most useful as a diagnostic tool, not a prescriptive checklist.** The code told me where the problems were — `MainWindow::Init()` was impossible to read, changes had cascade effects, testing required the full application stack. SOLID gave me the vocabulary to describe *why* those were problems and what to do about them.

The most valuable takeaway? **Widget ownership is the C++/Qt equivalent of dependency injection.** In a web framework, you'd inject services through constructor parameters. In Qt, you also need to think about who owns each widget, who deletes it, and how the parent-child hierarchy maps to your dependency graph. Getting widget ownership right made everything else fall into place.

---

*PhotoBoss is open source. The full repository is available at [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
