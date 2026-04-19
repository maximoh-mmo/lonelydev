---
isAutoTranslated: true
---
# Entwickler-Tagebuch: Der Ausschalter — Stopp-Button-Fail & Das Beschneidungs-Desaster

## Teil 1: Dem Benutzer die Bremsen geben

Ein Scan, der nicht angehalten werden kann, ist ein Scan, dem man nicht vertrauen kann.

Bis jetzt war das Drücken von „Scan starten" in PhotoBoss eine Einbahnstraße. Die Engine würde starten, alle Bilder im Ordner durchkäuen und schließlich von selbst anhalten. Es gab keinen Weg zurück, wenn man versehentlich auf das falsche Verzeichnis gezeigt oder einfach seine Meinung geändert hatte.

Das ändert sich heute.

### Das Ziel: Ein Button, der weiß, was er tut

Ich wollte, dass die UI sich *lebendig* anfühlt und sich des Pipeline-Zustands bewusst ist. Der „Scan starten"-Button sollte kein statisches Element sein — er sollte widerspiegeln, was die App gerade macht.

Die drei Zustände sind:

| Zustand | Button-Text | Button aktiviert |
|---|---|---|
| Leerlauf | `Scan starten` | ✅ |
| Läuft | `Scan stoppen` | ✅ |
| Wird beendet | `Wird gestoppt...` | ❌ |

Der „Wird gestoppt..."-Zustand ist beabsichtigt. Wenn der Benutzer auf „Scan stoppen" klickt, friert die Pipeline nicht einfach ein — sie bittet jede Warteschlange, ordnungsgemäß geleert zu werden. Dies verhindert abgeschnittene Schreibvorgänge in den Cache oder halb verarbeitete Hash-Ergebnisse, die in das Ergebnis gelangen. Der Benutzer sieht „Wird gestoppt...", damit er weiß, dass etwas passiert, aber kann keine zweite Stoppanfrage auslösen, während die erste noch bearbeitet wird.

### Wie es funktioniert

Der `PipelineController` hatte bereits ein sauberes `PipelineState`-Enum (`Stopped`, `Running`, `Stopping`) mit einem `pipelineStateChanged`-Signal, das bei jedem Übergang ausgelöst wird. Alles, was nötig war, war ein Listener in der UI.

Das `MainWindow` verbindet sich jetzt mit `pipelineStateChanged` und steuert den Button-Text, den aktivierten Zustand und setzt sogar die Fortschrittsleiste zurück, wenn die Pipeline wieder auf `Stopped` zurückkehrt:

```cpp
case PipelineController::PipelineState::Stopped:
    m_scan_button_->setText(tr("Scan starten"));
    m_scan_button_->setEnabled(true);
    m_browse_button_->setEnabled(true);
    m_progress_bar_->setValue(0);
    break;
```

Der Durchsuchen-Button wird während eines Scans ebenfalls deaktiviert, um zu verhindern, dass der Benutzer das Verzeichnis mitten im Flug ändert — ein subtiler, aber wichtiger Schutz gegen undefinierten Zustand.

### Warum das für UX wichtig ist

Ein Kraftwerkzeug ohne Ausschalter ist eine Sicherheitsgefahr. PhotoBoss scannt Ihre persönte Fotobibliothek; den Benutzern einen klaren, sichtbaren „Stopp" zu jedem Zeitpunkt zu geben, ist ein nicht verhandelbarer Teil des Benutzervertrags. Es signalisiert, dass die Anwendung *unter Kontrolle* ist, nicht mit sich selbst durchläuft.

Kleines Detail, große Auswirkung.

---

## Teil 2: Der Beschneidungs-Fehler, der Ihre Daten fraß

Wenn Dateien aus Ihren gescannten Ordnern verschwinden, sollten sie auch aus Ihrem Cache verschwinden. Das ist der gesamte Punkt des Beschneidungsschritts — das Bereinigen von veralteten Einträgen, damit sie Ihre Ergebnisse nicht überladen oder den Duplikatstatus falsch melden.

Nach dem Hinzufügen des Stopp-Buttons widmete ich mich der Cache-Wartung. Der SQLite-Cache wuchs mit jedem Scan, aber nichts wurde jemals bereinigt.

### Die bestehende Mechanik

Die `SqliteHashCache`-Klasse hatte bereits eine `prune(const QString& root)`-Methode, die:
- Datenbankeinträge für Dateien löscht, die NICHT im aktuellen Scan gesehen wurden
- `last_seen_scan_id` verwendet, um veraltete Einträge zu identifizieren
- Sich auf SQLite `ON DELETE CASCADE`-Fremdschlüssel verlässt, um hashes und EXIF-Daten automatisch zu bereinigen

Die Methode war toter Code — wurde nie irgendwo in der Pipeline aufgerufen.

### Die Lösung: Es am Scan-Ende aufrufen

Das Beschneiden musste nach Abschluss eines Scans ausgeführt werden. Der beste Ort ist `PipelineController::onThumbnailWorkerFinished()`, wenn alle Thumbnail-Worker fertig sind und die Pipeline gerade auf `Stopped` übergehen soll:

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

### Das Symptom

Nach dem Scannen eines Ordners verschwanden alle zwischengespeicherten Hash-Daten. Ihre Bilder wurden korrekt verarbeitet, aber beim nächsten Scan — selbst ohne Dateien zu löschen — recomputete PhotoBoss jeden einzelnen Hash von Grund auf. Der Cache wurde nicht beibehalten. Es war ein Nur-Schreib-Speicher.

### Die Untersuchung

Die Prune-Methode in `SqliteHashCache` sah auf der Oberfläche korrekt aus. Sie hatte das richtige SQL, die richtige WHERE-Klausel, die richtige Fremdschlüsselbehandlung. Das Problem lag darin, wie sie aufgerufen wurde:

```cpp
SqliteHashCache cache(0);
cache.prune(m_current_request_.directory);
```

Ich habe `0` alsScan-ID übergeben. Lassen Sie mich erklären, warum das den Cache zerstörte.

Jede Datei in der Datenbank hat eine `last_seen_scan_id`-Spalte — die ID des Scans, der sie zuletzt verarbeitet hat. Wenn das Beschneiden läuft, löscht es Einträge, bei denen `last_seen_scan_id` nicht mit dem *aktuellen* Scan übereinstimmt. In diesem Scan gesehene Dateien werden aktualisiert; nicht gesehte (weil sie vom Datenträger gelöscht wurden) werden entfernt.

Aber mit `scanId = 0` wurde die Abfrage:

```sql
DELETE FROM files WHERE path = ? AND last_seen_scan_id != 0
```

Da jede Datei im Cache `last_seen_scan_id` auf eine tatsächliche Scannummer gesetzt hat (nicht 0), stimmte diese Bedingung mit **jeder einzelnen Zeile** überein. Das Beschneiden fand keine veralteten Einträge — es zerstörte das gesamte Verzeichnis.

### Die Lösung

Die tatsächliche Scan-ID aus dem Anfragekontext übergeben:

```cpp
SqliteHashCache cache(m_scan_id_);
cache.prune(m_current_request_.directory);
```

Jetzt verhält sich das Beschneiden korrekt: Es löscht nur Dateien, die in diesem Scan nicht gesehen wurden — d.h. Dateien, die tatsächlich aus dem Ordner entfernt wurden.

### Bonus-Bereinigung: Entfernen von totem Code

Während ich das Beschneiden behebe, fiel mir auch auf, dass die Pipeline eine neugierige `onStart()`-Lebenszyklusmethode hatte, die niemand verwendete. Jede einzelne Stage implementierte sie als leere Stub:

```cpp
void DiskReader::onStart() { }
void HashWorker::onStart() { }
// ... jede andere Stage
```

Die Basisklasse `StageBase::Run()` rief sie früher auf, aber ich hatte diesen Pfad bereits in einer früheren Änderung refaktoriert. Die Methode war einfach da, virtuell und vererbt, und tat nichts.

Also entfernte ich sie. Der Stage-Lebenszyklus ist jetzt nur noch:

- `run()` — die Arbeit (von jeder Stage implementiert)
- `onStop()` — ordnungsgemäße Abschaltung

Ich löschte auch `CachePrune.h` — eine Header-Datei, die ich für eine separate Prune-Stage erstellt hatte, die nie verwendet wurde. Das Beschneiden wird jetzt direkt in `PipelineController` behandelt.

### Die Lektion

Dieser Fehler existierte still. Die unmittelbare Funktion (Scannen und Hashen) wurde erfolgreich abgeschlossen. Der Schaden zeigte sich erst später, als Benutzer erwarteten, ihre zuvor berechneten hashes wiederzuverwenden. „Scheint zu funktionieren" ist nicht dasselbe wie „korrekt implementiert".