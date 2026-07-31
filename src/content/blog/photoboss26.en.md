---
id: photoboss26
title: "🔧 Hardening PhotoBoss to v1.0.0: Stability, Telemetry, and Release Engineering"
seoTitle: "Hardening PhotoBoss to v1.0.0 Stability, Telemetry, and Release Engineering"
date: "2026-08-07"
category: "Software Engineering"
summary: "This post details the critical work done to harden PhotoBoss for its v1.0.0 release, focusing on pipeline teardown correctness, memory bounding, cache integrity, deletion safety, and thread-safety audit fixes. It also covers the release engineering effort: build scripts, CI configuration, an Inno Setup installer, and GitHub Releases automation. The author reflects on lessons learned around convergence-based state machines, memory profiling, and the discipline of remote CI debugging."
project: "photoboss"
tags: ["C++","Qt","CI/CD","Release Engineering","Memory Management","SQLite","Thread Safety"]
status: "scheduled"
isAutoTranslated: false
---

The last post ended on a good note. The duplicate-detection bug was fixed at the root — similarity against *all* cluster members, and a reconciliation path that guaranteed the final group list reached the screen. The delete-then-rescan repro finished at zero duplicates on both runs. The app was, functionally, correct.

But "correct" and "shippable" are different things. PhotoBoss had no way to build outside the Visual Studio IDE, no CI, no installer, and — as I found by actually reading the pipeline with fresh eyes instead of the eyes of whoever wrote each line — a handful of latent stability bugs that only show up under load or when you stop a scan mid-flight. This post is the story of the two threads that ran between the last post and the v1.0.0 release: a **Tier-0 stability pass** that fixed lifecycle and memory bugs, and the **release engineering** that turned the project into something someone else can download, install, and run.

## Setting the stage: what "hardening" meant here

PhotoBoss is a staged, multi-threaded producer-consumer pipeline: `FileEnumerator → CacheLookup → DiskReader → HashWorker → CacheStore` with a `SimilarityEngine` and `ResultProcessor` on the tail, all connected by bounded queues on their own threads. Bounded queues are the backpressure mechanism; every stage blocks when the next queue is full. That design is great for memory safety, but it makes teardown and shutdown ordering critical — and it's exactly the kind of code where a bug sits dormant until the right unlucky timing.

I grouped the work into two batches. First, the stability fixes, which split into five buckets:

1. **Pipeline teardown** — stop a scan, then start another, without races.
2. **Memory** — a scan that held every decoded image resident.
3. **Keep-best resolution** — the "quality" heuristic scoring garbage.
4. **Cache correctness** — poisoned rows, stale algorithms, stale pruning.
5. **Deletion safety** — you should never be able to delete the last copy.

Then the release thread: dark theme cleanup, version metadata, `build.ps1`, a GitHub Actions workflow, an Inno Setup installer, and GitHub Releases.

## 1. Pipeline teardown: stop exactly once

The old `stop()` was optimistic:

```cpp
emit stateChanged(PipelineState::Stopping);
clearQueues();
m_state_ = PipelineState::Stopped;
emit stateChanged(PipelineState::Stopped);
```

It cleared queues and immediately declared itself Stopped — *while worker threads were still running*, blocked on the very queues it just cleared, or mid-item. A subsequent `start()` could then run alongside threads that hadn't finished unwinding. The destructor had the same problem in reverse: it joined threads *before* asking them to shut down, so a thread blocked on a full queue would sit there until the 5-second `wait()` timeout.

The fix makes the *last finishing thread* the authority on "Stopped":

```cpp
void Pipeline::stop()
{
    if (m_state_ == PipelineState::Stopped)
        return;

    emit stateChanged(PipelineState::Stopping);
    m_state_ = PipelineState::Stopping;

    // Discard pending work and wake all blocked consumers/producers. Threads
    // drain their current items and exit; the Stopped state is emitted by
    // onThreadFinished() once the last thread has finished.
    requestShutdown();
    clearQueues();
}
```

`requestShutdown()` sets the shutdown flag on every queue and wakes everything blocked on them; `clearQueues()` drops the pending work. Each thread finishes its current item, sees the shutdown, and exits. The last one out calls `onThreadFinished()`, which now emits `Stopped` unconditionally (it previously only did when the state was `Running`, which broke the `stop()` → `start()` cycle). And the destructor now requests shutdown *before* joining, so joins return immediately instead of timing out.

The key insight was that "Stopped" is a *converged* state, not an *announced* one — you can't know you're stopped until every thread has actually stopped. This was the difference between a status label and a real state machine.

## 2. Memory: every decoded image was resident

`ResultProcessor` kept a `decodedImage` on every entry in `m_items_` for the *entire scan*, so the thumbnail generator could reuse the already-decoded frame instead of re-reading from disk. On a 10k-photo scan that's 10,000 full-resolution decodes sitting in RAM at once — the exact class of bug (OOM on large scans) that bit the project earlier in its life.

The fix is a two-liner in spirit: the thumbnail request takes a copy, and the long-lived reference is dropped immediately after. I also bounded the thumbnail queue at 512 items, so even during the grouping tail the pipeline can't buffer an unbounded pile of decoded images:

```cpp
auto requestThumbnail = [&](const ImageEntry &img) {
    if (m_thumbnailRequested_.contains(img.path))
        return true;
    auto thumbReq = std::make_shared<ThumbnailRequest>();
    thumbReq->path = img.path;
    thumbReq->rotation = img.rotation;
    thumbReq->width = settings::ThumbnailWidth;
    thumbReq->height = settings::ThumbnailWidth;
    auto srcIt = m_pathToItem_.find(img.path);
    if (srcIt != m_pathToItem_.end()) {
        thumbReq->preDecoded = srcIt.value()->decodedImage;
        thumbReq->fileIdentity.emplace(srcIt.value()->fileIdentity);
        // The request now holds its own copy; drop the long-lived reference
        // so decoded images don't accumulate for the whole scan.
        srcIt.value()->decodedImage.reset();
    }
    if (!m_thumbnailOutput_.push(std::move(thumbReq))) {
        thumbnailQueueClosed = true;
        return false;
    }
    m_thumbnailRequested_.insert(img.path);
    return true;
};
```

Now the pipeline's steady-state memory is bounded by the queue capacity, not by the number of files. This was invisible until I thought about what "10,000 in-flight decodes" actually meant in RAM.

## 3. Keep-best resolution: the heuristic was scoring a thumbnail

The `SimilarityEngine` picks a cluster *representative* using a quality heuristic — biggest, sharpest, best-encoded image wins:

```cpp
double score = pixels;
score += img.fileSize * 0.001;
if (ext == "png") score *= 1.05;
```

But `pixels` was computed from `HashedImageResult::resolution`, which was... the *scaled* image. `HashWorker` decodes at 32×32 for hashing and 140×140 for thumbnails, and that thumbnail size was being recorded as the "resolution". Every image scored ~equal, so the "keep the best" representative was effectively arbitrary — and the representative is what the group widget highlights as the one to keep.

The fix threads the true resolution through: `ImageLoader` reads the native size from `QImageReader::size()` *before* applying `setScaledSize()` (so it's the pre-IDCT-decode dimensions), transposes it for EXIF orientations 5–8, and returns it alongside the decoded image:

```cpp
QSize nativeSize = reader.size();
reader.setScaledSize(QSize(size, size));
QImage img = reader.read();
...
if (orientation >= 5 && orientation <= 8) {
    nativeSize.transpose();
}
if (!nativeSize.isValid() || nativeSize.isEmpty()) {
    nativeSize = img.size();
}
return LoadedImage{ std::move(img), nativeSize };
```

`HashEngine` records that as the result's resolution, and the representative-promotion logic was tightened to compare the candidate against the *cluster* representative directly. The old code promoted a node only if it beat the exact-group's representative *and* the cluster representative was still that same member — so a better node arriving after the cluster representative had already changed was silently ignored:

```cpp
if (better(*node, *cluster.representative)) {
    cluster.representative = node;
}
```

Now the "best" badge and the representative genuinely point at the highest-resolution member of each group.

## 4. Cache: schema v2, poison removal, and honest pruning

The SQLite cache had four correctness problems, all of which could silently degrade results:

**Poisoned rows.** Failed decodes were persisted as marker hashes like `"decode_failed"`. On a later scan, `CacheLookup` saw a "valid" hash and skipped the file — a file that never actually got hashed. Migration `1→2` deletes them:

```cpp
bool SqliteHashCache::migrate_1_to_2()
{
    QSqlQuery q(m_db_);
    if (!q.exec("BEGIN IMMEDIATE TRANSACTION;")) return false;

    // Error-marker hashes (e.g. "decode_failed") were previously persisted
    // and can poison future lookups into false cache hits — remove them.
    q.prepare(R"(DELETE FROM hashes WHERE hash_value='decode_failed';)");
    if (!execOrLog(q, "delete error hashes")) { q.exec("ROLLBACK;"); return false; }

    q.prepare("UPDATE meta SET value='2' WHERE key='schema_version';");
    if (!execOrLog(q, "bump schema_version")) { q.exec("ROLLBACK;"); return false; }

    q.exec("COMMIT;");
    return true;
}
```

And `CacheStore` now refuses to persist `HashSource::Error` results at all, so the class of poison can't re-occur.

**Stale algorithm versions.** Each hash method has a version. If a future change alters the algorithm, every cached hash from the old version is untrustworthy. The lookup query now joins in `hash_methods.version` and returns a miss if it doesn't match what the current catalog expects:

```cpp
const int expectedVersion = cacheQuery.methodVersions.value(methodKey, -1);
if (expectedVersion != q.value(9).toInt()) {
    return CacheLookupResult{ Lookup::Miss, cacheQuery.fileIdentity };
}
```

**Prune didn't cover subdirectories.** `prune(root)` only deleted files whose path *equalled* the root — so stale entries under subfolders of a rescanned directory survived forever. Now it deletes the root *or* anything under it:

```cpp
DELETE FROM files
WHERE (last_seen_scan_id IS NULL OR last_seen_scan_id != :scanId)
  AND (path = :path OR path LIKE :pathPrefix);
```

**Contention.** The cache is a single SQLite connection writing in batched transactions from the `CacheStore` thread, while lookups run on another connection. Without a busy timeout, the lookup could fail with `SQLITE_BUSY` and treat every file as a miss. `PRAGMA busy_timeout=5000` makes SQLite wait instead of failing.

## 5. Deletion safety: the two guards

Two small, high-value changes:

**At-least-one-Keep.** `GroupWidget` now refuses to let the user unmark the last `Keep` entry in a group. Without this, a group of three identical files could have all three marked Delete — and the delete dialog happily lets you destroy every copy:

```cpp
void GroupWidget::onThumbSelectionChanged(ImageThumbWidget* thumb, bool nowKeep)
{
    // Safety: never allow a group to end up with zero Keep entries, which
    // would let the user delete every copy of a group.
    if (!nowKeep && countKept() == 0) {
        thumb->setState(ImageThumbWidget::State::Keep);
        return;
    }
    m_userModified_ = true;
    emit selectionChanged();
}
```

**Trash-only deletion.** In the previous post I added a permanent-delete fallback when `QFile::moveToTrash` fails (network drives, unsupported filesystems). On reflection, that fallback was a *data-safety* compromise: the confirmation dialog promises an undoable operation, so silently destroying a file to honor "deletion" violates the more important contract. `TrashDeletionStrategy` is now trash-only:

```cpp
bool deleteFile(const QString& path) override
{
    // Move to the system trash only. Never fall back to a permanent
    // delete: the confirmation dialog promises an undoable operation,
    // and silently destroying data would violate that contract.
    QString nativePath = QDir::toNativeSeparators(path);
    return QFile::moveToTrash(nativePath);
}
```

If the trash move fails, the file stays — the user sees it wasn't deleted and can investigate, rather than losing data they were told they could recover.

## The audit pass: QPixmap, queue shutdown, and exceptions

After the stability fixes I did a full audit and found a batch of "it mostly works but it's wrong" items, committed as *Fix remaining audit items*:

**QPixmap is GUI-thread-only, and we were violating that.** `QPixmap::fromImage` was being called on worker threads (in the `UiUpdateQueue::setThumbnail` path). Qt documents this as unsupported; `QPixmap` is backed by native resources that assume GUI-thread ownership. The pipeline now carries `QImage` end-to-end, and conversion to `QPixmap` happens in one place on the GUI thread — `ThumbnailManager::distributeThumbnails`, which also finally *populates its own thumbnail cache* (it had been silently empty, so the delete dialog's cache-reuse from the previous post never actually hit):

```cpp
void ThumbnailManager::distributeThumbnails(const QMap<QString, QImage>& thumbnails)
{
    for (auto it = thumbnails.constBegin(); it != thumbnails.constEnd(); ++it) {
        const QImage& img = it.value();
        // QPixmap must only be created on the GUI thread; this method is
        // always invoked from the UI thread.
        QPixmap pix = QPixmap::fromImage(img);
        m_thumbnailCache_[path] = pix;
        ...
    }
}
```

**`Queue::producer_done()` could leave a queue open forever.** The producer-count `fetch_sub` could underflow if a producer called it more times than it registered — which happens exactly when a stage unwinds abnormally — leaving the count at, say, `-1`, and the queue open for the rest of the process. It's now idempotent:

```cpp
void producer_done() {
    const auto remaining =
        m_producers_.fetch_sub(1, std::memory_order_acq_rel) - 1;
    if (remaining <= 0) {
        m_producers_.store(0, std::memory_order_relaxed);
        shutdown();
    }
}
```

**`onStop()` wasn't guaranteed.** `StageBase::run()` called `onStop()` only after `doRun()` returned cleanly. If `doRun()` threw (non-std exceptions, `QString`-based throws), `onStop()` never ran, and every queue producer it owns was never released — permanent pipeline hang. Now an RAII guard guarantees it, and the catch-all also surfaces the error:

```cpp
struct EnsureStop {
    StageBase* stage;
    ~EnsureStop() { stage->onStop(); }
} ensureStop{ this };

try {
    doRun();
}
catch (const std::exception& e) {
    error(QString::fromUtf8(e.what()));
}
catch (...) {
    error(QStringLiteral("Unknown error in pipeline stage"));
}
```

**Stage errors went nowhere.** `StageBase::error` had no subscribers. `PipelineFactory` now wires every stage's error to a handler that logs it and reflects it in the status bar — so a stage failure stops being a silent mystery.

**Dead code.** Removed the never-used `weakThreshold` config and the Aspect-Ratio hash branch that was registered but never actually created a method.

**Tunable thresholds.** The similarity thresholds moved from compile-time constants to `QSettings` (via a small `SimilaritySettings.h` helper), defaulting to the compiled-in values — so tuning `strong`/`pHashGate`/`dHashGate` no longer requires a rebuild:

```cpp
inline double similarityThreshold(const QString& key, double defaultValue)
{
    return QSettings().value(QStringLiteral("similarity/") + key, defaultValue).toDouble();
}
```

## Release engineering: from IDE to installer

The stability pass made the app *right*. The release thread made it *distributable*.

**Dark theme:** the stylesheet used `var(#2d2d2d)` syntax everywhere — invalid in Qt stylesheets, so a chunk of styling was silently dead. Replaced with hex literals.

**Identity:** an `app.ico`, a `.rc` version resource declaring `1.0.0` (so the exe shows proper properties), and the window icon wired in `main.cpp`.

**`build.ps1`:** the project previously required Qt VS Tools installed in the IDE. The script auto-detects MSBuild and Qt (via `vswhere`/`QT_DIR`/a `C:\Qt` scan), passes `-p:QtInstall`, and — with `-Deploy` — runs `windeployqt`, bundles the VC++ CRT DLLs (windeployqt only drops the redist *installer*, not the DLLs), bundles the vcpkg runtime DLLs, and zips a portable folder. `windeployqt --compiler-runtime` plus an explicit copy of `msvcp140.dll` etc. means the output folder runs on a machine with nothing installed:

```powershell
& $windeployqt --release --no-translations --no-system-d3d-compiler --no-opengl-sw --compiler-runtime $deployDir
...
$crtDll = Get-ChildItem $redistRoot -Recurse -Filter "msvcp140.dll" |
    Where-Object { $_.FullName -match "x64\\Microsoft\.VC\d+\.CRT\\" } |
    Sort-Object FullName -Descending | Select-Object -First 1
if ($crtDll) {
    Copy-Item (Join-Path $crtDll.DirectoryName "*.dll") $deployDir
}
```

**CI (GitHub Actions).** The workflow builds Release x64, deploys with windeployqt, bundles vcpkg DLLs, compiles the installer, and uploads artifacts. The interesting part was getting Qt to build on a runner *without* the VS extension: the standalone `qt-vsaddin-msbuild-<ver>.zip` provides `Qt.props`/`qt.targets`, so a downloaded copy pointed at via `-p:QtMsBuild` reproduces exactly what the extension does locally.

This is where I earned the "honest documentation" rule the hard way — the CI path took **five commits** of debugging, and every failure was a real, reproducible lesson:

1. **`qtsvg` module didn't exist.** The workflow listed it as a Qt module; the install step failed immediately. (It's bundled in the base Qt 6.9.1 install and the app doesn't use it.) Deleted the line.
2. **`libexpat.dll` was missing on the runner.** Local vcpkg's exiv2 dynamically links libexpat; the runner's vcpkg exiv2 *statically* links it. The hardcoded DLL list broke deploy. Fix: copy the *whole* vcpkg `bin` directory — "the exact set varies by vcpkg version" is a lesson, not a caveat.
3. **Zip-in-a-zip.** I packaged a zip, then uploaded it — users downloading the artifact got a zip containing a zip. Fix: upload the `dist\photoboss` folder directly; GitHub compresses on download.
4. **Tag pushes didn't trigger the workflow.** The `on:` clause listed branches but not tags, so the v1.0.0 tag I pushed did nothing. Added `tags: ['v*']`.
5. **`gh release create` failed with HTTP 403.** The default `GITHUB_TOKEN` is read-only; creating a release needs `permissions: contents: write` on the job.

Each failure was found by reading the Actions logs — you can't step-debug a remote runner, so the workflow became unusually self-explanatory, with every step asserting its output (`if (-not (Test-Path $installer)) { throw "Installer was not produced" }`).

**Installer.** `installer.iss` (Inno Setup 6) packages the deploy folder into a single `PhotoBoss-Setup-<ver>.exe` — Program Files or per-user, Start Menu/desktop shortcuts, uninstaller, versioned setup metadata. The version is derived from the git tag at CI time:

```ini
[Setup]
AppId={{EBD1991B-CE9A-4B45-837E-82F853F8FE78}
AppVersion={#MyAppVersion}
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=lzma2
SolidCompression=yes

[Files]
Source: "{#DeployDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
```

**Releases.** Pushing a `v*` tag now builds, deploys, compiles the installer, and runs `gh release create` with the installer attached:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

## The SmartScreen reality

There's one honest caveat that ships with every build: PhotoBoss is **not code-signed**. Authenticode certificates are paid, this is free/open-source software, and I deliberately deferred signing. The consequence is that Windows SmartScreen shows *"Windows protected your PC"* on downloaded builds — not because the file is malicious, but because it's unsigned and unknown. The README documents exactly what to do (More info → Run anyway, unblock the zip after download) and names the remaining option: sign in CI with a certificate stored as a GitHub secret. I researched Azure Artifact Signing (Microsoft's managed signing service) as the likely path — Public-Trust certificates that are designed to clear SmartScreen — but left the repo unsigned for now. It's a distribution-quality decision, not a correctness one, and it's documented rather than hidden.

## Results & validation

- **v1.0.0 is published**: https://github.com/maximoh-mmo/PhotoBoss/releases/tag/v1.0.0, with `PhotoBoss-Setup-1.0.0.exe` attached (18 MB), produced entirely by CI.
- **Stop/start is safe.** Stopping mid-scan and immediately starting another no longer races; the pipeline converges to a real `Stopped` state.
- **Memory is bounded.** A large scan's decoded images now flow through a 512-item queue and are released, instead of accumulating for the whole run.
- **The cache is honest.** Poisoned rows are migrated away and can't re-appear; algorithm-version changes invalidate instead of trusting stale hashes; subdirectory pruning actually prunes.
- **Deletion can't nuke a group.** At-least-one-Keep is enforced in the UI, and every deletion is a trash move or nothing.
- **The audit items are closed.** No more `QPixmap` on worker threads, `producer_done` is idempotent, `onStop()` is exception-safe, and stage errors surface in the status bar.
- **The CI gauntlet is real.** Six commits of workflow debugging produced a pipeline that builds, deploys, installers, and releases from a single tag push — and I can reproduce every step locally via `build.ps1`.

Limitations, honestly: everything is still verified *manually*. There is no automated test suite — the same gap the previous post flagged as "next". And the builds remain unsigned until I decide distribution warrants the cost.

## Challenges & solutions

- **Teardown is a convergence problem.** The hardest part was internalizing that "Stopped" can only be emitted by the *last* thread to finish — any code that announces it earlier is guessing. Once I stopped announcing and started converging, the stop/start cycle became trivially safe.
- **Memory bugs are invisible until they aren't.** 10k resident decodes don't fail on a 5k-photo folder; they fail later, on the user's 200k-photo library. The fix (reset the long-lived reference the moment it's copied) is small; the diagnosis (tracing where decoded images lived for a whole scan) is the real work.
- **The cache lied quietly.** `"decode_failed"` rows made the cache *confidently wrong* — the worst failure mode, because nothing logs and results look correct. Version-aware lookups and poison removal turn a silent lie into an explicit recompute.
- **Remote debugging is a different discipline.** You cannot step-debug a GitHub Actions runner. The workflow failures forced me to make every step assert its own success and fail loudly — which turned out to be better CI design than what I would have written with a debugger available.
- **The signing trade-off.** I explicitly chose "not signed + documented" over "signed at cost" for v1.0.0. It's the right call for this project's stage, and the README gives users a clear, safe path.

## Reflection & lessons learned

**Shipping forces you to answer questions you've been avoiding.** The pipeline "worked" for months — until I asked what happened on a second scan, or during teardown, or under 10k images. Every stability bug in this post was the same shape: correct for the happy path, wrong for the boundary. The audit mindset (read every line as if it's wrong) is what surfaced them.

**Thread-safety is about contracts, not just races.** The `QPixmap` bug had no visible race — it was a violation of a documented API contract that Qt allows to work by accident. Reading the Qt docs with suspicion (what is *required* of the caller?) caught a class of bug that a sanitizer never would.

**Tooling compounds.** A one-command build script (`build.ps1`) was the prerequisite for CI; CI was the prerequisite for an installer; the installer was the prerequisite for a release. None of the release engineering would have happened if the build had stayed IDE-only, because I wouldn't have had anything trustworthy to attach to a release.

**The best fixes are the invisible ones.** Nothing in this post changed a single pixel of the UI or a single grouping result. But the app is dramatically more reliable — and a user who hits a teardown hang or a silent cache lie doesn't care that the grouping math was perfect.

## Forward-looking

| Area | Status |
| --- | --- |
| Pipeline teardown (stop exactly once) | ✅ v1.0.0 |
| Bounded memory (thumbnail queue + reference drop) | ✅ v1.0.0 |
| Keep-best resolution (native size) | ✅ v1.0.0 |
| Cache v2: poison removal, version-aware, subdir prune | ✅ v1.0.0 |
| Deletion safety (at-least-one-Keep, trash-only) | ✅ v1.0.0 |
| Thread-safety audit (QPixmap, queue, exceptions) | ✅ v1.0.0 |
| `build.ps1` + GitHub Actions + installer + Releases | ✅ v1.0.0 |
| Automated test suite for `SimilarityEngine` | 🔜 next |
| Code signing (Azure Artifact Signing) | 🔜 if distribution grows |
| Scan-profile tuning / further performance work | 🔜 as needed |

The last post promised a real test harness for `SimilarityEngine` "next", and this post quietly didn't deliver one — that's the honest gap, and it's next on the list. The clustering engine now has concrete behavioural guarantees worth testing (all-members recall, chain-group bounds, representative selection), and now that the pipeline itself is stable, the tests have a solid thing to run against. Between then and now: PhotoBoss went from "works on my machine" to a v1.0.0 release that anyone can install.