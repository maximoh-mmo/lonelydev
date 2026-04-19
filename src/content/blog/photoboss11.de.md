---
id: photoboss11
title: "📸 Entwickler-Tagebuch: Der Ausschalter – Korrekturen für den Stopp-Button und das Pruning"
seoTitle: >-
  Implementierung der „Stopp“-Schaltfläche in PhotoBoss und Fehlerbehebung beim
  Cache-Bereinigungsprozess
date: '2026-04-24'
category: Software Engineering
summary: >-
  Implementierung einer robusten Stopp-Schaltfläche mit zustandsbeachtlicher
  Benutzeroberfläche für die PhotoBoss-Pipeline sowie Behebung eines Fehlers
  beim Cache-Bereinigen, durch den alle zwischengespeicherten Hash-Daten
  gelöscht wurden.
project: PhotoBoss
tags:
  - C++
  - Qt
  - UX
  - Bug Fix
status: published
isAutoTranslated: true
---

# Technik-Tagebuch: Der Ausschalter – Fehlfunktion des Stoppknopfs & missglücktes Ausdünnen

## Teil 1: Dem Benutzer die Kontrolle geben

Ein Scan, der nicht gestoppt werden kann, ist ein Scan, dem man nicht trauen kann.

Bislang war das Klicken auf „Scan starten“ in PhotoBoss ein Vorgang ohne Rückweg. Die Engine sprang an, arbeitete sich durch jedes Bild im Ordner und beendete den Vorgang schließlich von selbst. Es gab keinen Ausweg, wenn man versehentlich das falsche Verzeichnis ausgewählt hatte oder es sich einfach anders überlegt hatte.

Das ändert sich heute.

### Das Ziel: Eine Schaltfläche, die weiß, was sie tut

Ich wollte, dass sich die Benutzeroberfläche *lebendig* anfühlt und den Status der Pipeline widerspiegelt. Die Schaltfläche „Scan starten“ sollte kein statisches Element sein – sie sollte widerspiegeln, was die App gerade tatsächlich tut.

Die drei Bundesstaaten sind:

| Status | Schaltflächentext | Schaltfläche aktiv |
|---|---|---|
| Im Leerlauf | `Scan starten` | ✅ |
| Läuft | `Scan stoppen` | ✅ |
| Lädt | `Wird angehalten...` | ❌ |

Der Status „Wird angehalten...“ ist beabsichtigt. Wenn der Benutzer auf „Scan stoppen“ klickt, friert die Pipeline nicht einfach ein – sie fordert jede Warteschlange auf, den Vorgang ordnungsgemäß abzuschließen. Dadurch wird verhindert, dass unvollständige Schreibvorgänge in den Cache gelangen oder halbverarbeitete Hash-Ergebnisse in die Ergebnismenge aufgenommen werden. Der Benutzer sieht „Wird angehalten...“, sodass er weiß, dass etwas geschieht, kann jedoch keinen zweiten Stoppbefehl auslösen, solange der erste noch ausgeführt wird.

### So funktioniert es

Der `PipelineController` verfügte bereits über eine übersichtliche `PipelineState`-Enumeration (`Stopped`, `Running`, `Stopping`) mit einem `pipelineStateChanged`-Signal, das bei jedem Übergang ausgelöst wurde. Es fehlte lediglich ein Listener in der Benutzeroberfläche.

Das `MainWindow` ist nun mit dem Ereignis `pipelineStateChanged` verknüpft und steuert den Text der Schaltfläche sowie deren Aktivierungsstatus; außerdem setzt es den Fortschrittsbalken zurück, sobald der Status der Pipeline wieder auf `Stopped` wechselt:

```cpp
case PipelineController::PipelineState::Stopped:
    m_scan_button_->setText(tr("Start Scan"));
    m_scan_button_->setEnabled(true);
    m_browse_button_->setEnabled(true);
    m_progress_bar_->setValue(0);
    break;
```

Die Schaltfläche „Durchsuchen“ ist während eines Scanvorgangs ebenfalls deaktiviert, sodass der Benutzer das Verzeichnis während des Vorgangs nicht wechseln kann – eine subtile, aber wichtige Sicherheitsmaßnahme gegen undefinierte Zustände.

### Warum dies für die Benutzererfahrung wichtig ist

Ein Elektrowerkzeug ohne Ausschalter stellt ein Sicherheitsrisiko dar. PhotoBoss durchsucht Ihre persönliche Fotobibliothek; den Nutzern jederzeit eine klare, gut sichtbare „Stopp“-Möglichkeit zu bieten, ist ein unverzichtbarer Bestandteil der Nutzungsvereinbarung. Dies signalisiert, dass die Anwendung *unter Kontrolle* ist und nicht außer Kontrolle gerät.

Kleines Detail, große Wirkung.

---

## Teil 2: Der „Pruning Bug“, der Ihre Daten verschlungen hat

Wenn Dateien aus Ihren gescannten Ordnern verschwinden, sollten sie auch aus Ihrem Cache verschwinden. Genau darum geht es beim Bereinigungsschritt – veraltete Einträge zu entfernen, damit sie Ihre Ergebnisse nicht überladen oder fälschlicherweise als Duplikate melden.

Nachdem ich die Stopp-Schaltfläche hinzugefügt hatte, wandte ich mich der Cache-Pflege zu. Der SQLite-Cache wuchs mit jedem Scan, wurde aber nie bereinigt.

### The Existing Machinery

Die Klasse `SqliteHashCache` verfügte bereits über eine Methode `prune(const QString& root)`, die:
- Datenbankeinträge für Dateien löscht, die im aktuellen Scan NICHT gefunden wurden
- `last_seen_scan_id` verwendet, um veraltete Einträge zu identifizieren
- sich auf SQLite-Fremdschlüssel mit der Eigenschaft `ON DELETE CASCADE` stützt, um Hashes und EXIF-Daten automatisch zu bereinigen

The method was dead code — never called anywhere in the pipeline.

### The Fix: Call It at Scan Completion

The prune needed to run after a scan completes. The best place is `PipelineController::onThumbnailWorkerFinished()`, when all thumbnail workers are done and the pipeline is about to transition to `Stopped`:

```cpp
void PipelineController::onThumbnailWorkerFinished()
{
    if (--m_activeThumbnailWorkers_ == 0) {
        qDebug() << "All thumbnail workers finished. Cleaning up pipeline.";

        // Prune stale cache entries for this directory
        if (!m_current_request_.directory.isEmpty()) {
            SqliteHashCache cache(0);
            cache.prune(m_current_request_.directory);
        }

        SetPipelineState(PipelineState::Stopped);
        destroyPipeline();
    }
}
```

### The Symptom

After scanning a folder, all the cached hash data would vanish. Your images were being processed correctly, but on the next scan — even without deleting any files — PhotoBoss would recompute every single hash from scratch. The cache wasn't persisting. It was a write-only store.

### The Investigation

The prune method in `SqliteHashCache` looked correct on the surface. It had the right SQL, the right WHERE clause, the right foreign key handling. The problem was in how it was being called:

```cpp
SqliteHashCache cache(0);
cache.prune(m_current_request_.directory);
```

I was passing `0` as the scan ID. Let me explain why that shattered the cache.

Every file in the database has a `last_seen_scan_id` column — the ID of the scan that last processed it. When pruning runs, it deletes entries where `last_seen_scan_id` doesn't match the *current* scan. Files seen in this scan get updated; files not seen (because they were deleted from disk) get removed.

But with `scanId = 0`, the query became:

```sql
DELETE FROM files WHERE path = ? AND last_seen_scan_id != 0
```

Since every file in the cache has `last_seen_scan_id` set to an actual scan number (not 0), this condition matched **every single row**. The prune wasn't finding stale entries — it was annihilating the entire directory.

### The Fix

Pass the actual scan ID from the request context:

```cpp
SqliteHashCache cache(m_scan_id_);
cache.prune(m_current_request_.directory);
```

Now the prune behaves correctly: it only deletes files that weren't seen in this scan — i.e., files that were actually removed from the folder.

### Bonus Cleanup: Removing Dead Code

While fixing the prune, I also noticed the pipeline had a curious `onStart()` lifecycle method that nobody was using. Every single stage implemented it as an empty stub:

```cpp
void DiskReader::onStart() { }
void HashWorker::onStart() { }
// ... every other stage
```

The base class `StageBase::Run()` used to call it, but I'd already refactored that path in an earlier change. The method was just sitting there, virtual and inherited, doing nothing.

So I removed it. The stage lifecycle is now just:

- `run()` — the work (implemented by each stage)
- `onStop()` — graceful shutdown

I also deleted `CachePrune.h` — a header file I'd created for a separate prune stage that never got used. The prune is handled directly in `PipelineController` now.

### The Lesson

This bug existed silently. The immediate function (scanning and hashing) completed successfully. The damage only showed up later, when users expected to reuse their previously computed hashes. "Seems to work" isn't the same as "correctly implemented."
