---
id: "photoboss11"
title: "📸 Entwickler-Tagebuch: Der Ausschalter – Korrekturen für den Stopp-Button und das Pruning"
seoTitle: "Implementierung der „Stopp“-Schaltfläche in PhotoBoss und Behebung des Cache-Bereinigungsproblems"
date: "2026-04-24"
category: "Softwareentwicklung"
summary: "Implementierung einer robusten Stopp-Schaltfläche mit zustandsbeachtlicher Benutzeroberfläche für die PhotoBoss-Pipeline sowie Behebung eines Fehlers beim Cache-Bereinigen, durch den alle zwischengespeicherten Hash-Daten gelöscht wurden."
project: "PhotoBoss"
tags: ["C++", "Qt", "UX", "Bug Fix"]
status: "published"
isAutoTranslated: true
---

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
| Lädt | `Wird gestoppt...` | ❌ |

Der Status „Wird angehalten...“ ist beabsichtigt. Wenn der Benutzer auf „Scan stoppen“ klickt, friert die Pipeline nicht einfach ein – sie fordert jede Warteschlange auf, den Vorgang ordnungsgemäß abzuschließen. Dadurch wird verhindert, dass unvollständige Schreibvorgänge in den Cache gelangen oder halbverarbeitete Hash-Ergebnisse in die Ergebnismenge aufgenommen werden. Der Benutzer sieht „Wird angehalten...“, sodass er weiß, dass etwas geschieht, kann jedoch keinen zweiten Stoppbefehl auslösen, solange der erste noch ausgeführt wird.

### So funktioniert es

Der `PipelineController` verfügte bereits über eine übersichtliche `PipelineState`-Enumeration (`Stopped`, `Running`, `Stopping`) mit einem `pipelineStateChanged`-Signal, das bei jedem Übergang ausgelöst wurde. Es fehlte lediglich ein Listener in der Benutzeroberfläche.

Das „MainWindow“ stellt jetzt eine Verbindung zu „pipelineStateChanged“ her und steuert den Schaltflächentext, den aktivierten Status und setzt sogar den Fortschrittsbalken zurück, wenn die Pipeline wieder auf „Gestoppt“ wechselt:

```cpp
case PipelineController::PipelineState::Stopped:
    m_scan_button_->setText(tr("Start Scan"));
    m_scan_button_->setEnabled(true);
    m_browse_button_->setEnabled(true);
    m_progress_bar_->setValue(0);
    break;
```

Der Durchsuchen-Button ist während eines Scans ebenfalls deaktiviert, wodurch verhindert wird, dass der Benutzer während des Flugs das Verzeichnis wechselt – ein subtiler, aber wichtiger Schutz gegen einen undefinierten Zustand.

### Warum das für UX wichtig ist

Ein Elektrowerkzeug ohne Ausschalter stellt ein Sicherheitsrisiko dar. PhotoBoss durchsucht Ihre persönliche Fotobibliothek; den Nutzern jederzeit eine klare, gut sichtbare „Stopp“-Möglichkeit zu bieten, ist ein unverzichtbarer Bestandteil der Nutzungsvereinbarung. Dies signalisiert, dass die Anwendung *unter Kontrolle* ist und nicht außer Kontrolle gerät.

Kleines Detail, große Wirkung.

---

## Teil 2: Der „Pruning Bug“, der Ihre Daten verschlungen hat

Wenn Dateien aus Ihren gescannten Ordnern verschwinden, sollten sie auch aus Ihrem Cache verschwinden. Genau darum geht es beim Bereinigungsschritt – veraltete Einträge zu entfernen, damit sie Ihre Ergebnisse nicht überladen oder fälschlicherweise als Duplikate melden.

Nachdem ich die Stopp-Schaltfläche hinzugefügt hatte, wandte ich mich der Cache-Pflege zu. Der SQLite-Cache wuchs mit jedem Scan, wurde aber nie bereinigt.

### Der bestehende Maschinenpark

Die Klasse `SqliteHashCache` verfügte bereits über eine Methode `prune(const QString& root)`, die:
- Datenbankeinträge für Dateien löscht, die im aktuellen Scan NICHT gefunden wurden
- `last_seen_scan_id` verwendet, um veraltete Einträge zu identifizieren
- sich auf SQLite-Fremdschlüssel mit der Eigenschaft `ON DELETE CASCADE` stützt, um Hashes und EXIF-Daten automatisch zu bereinigen

Die Methode war toter Code – sie wurde nirgendwo in der Pipeline aufgerufen.

### Die Lösung: Nach Abschluss des Scans aufrufen

Die Bereinigung muss nach Abschluss eines Scans ausgeführt werden. Der beste Zeitpunkt dafür ist `PipelineController::onThumbnailWorkerFinished()`, wenn alle Thumbnail-Worker fertig sind und die Pipeline kurz davor steht, in den Status `Stopped` zu wechseln:

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

Nach dem Scannen eines Ordners verschwinden alle zwischengespeicherten Hash-Daten. Ihre Bilder wurden korrekt verarbeitet, aber beim nächsten Scan – selbst ohne Dateien zu löschen – berechnete PhotoBoss jeden einzelnen Hash von Grund auf neu. Der Cache bestand nicht mehr. Es war ein reiner Schreibladen.

### Die Untersuchung

Die Prune-Methode in 'SqliteHashCache' sah auf der Oberfläche korrekt aus. Es hatte das richtige SQL, die richtige WHERE-Klausel, die richtige Fremdschlüsselbehandlung. Das Problem lag darin, wie es genannt wurde:

```cpp
SqliteHashCache cache(0);
cache.prune(m_current_request_.directory);
```

Ich habe '0' als Scan-ID durchgegeben. Lassen Sie mich erklären, warum das den Cache zerstört hat.

Jede Datei in der Datenbank hat eine Spalte 'last_seen_scan_id' – die ID des Scans, der sie zuletzt verarbeitet hat. Beim Pruning werden Einträge gelöscht, bei denen 'last_seen_scan_id' nicht mit dem *aktuellen* Scan übereinstimmt. Dateien, die in diesem Scan zu sehen sind, werden aktualisiert; Dateien, die nicht gesehen werden (weil sie von der Festplatte gelöscht wurden), werden entfernt.

Aber mit 'scanId = 0' wurde die Abfrage:

```sql
DELETE FROM files WHERE path = ? AND last_seen_scan_id != 0
```

Da für jede Datei im Cache „last_seen_scan_id“ auf eine tatsächliche Scannummer (nicht 0) gesetzt ist, stimmte diese Bedingung mit **jeder einzelnen Zeile** überein. Die Bereinigung fand keine veralteten Einträge – sie vernichtete das gesamte Verzeichnis.

### Die Lösung

Gib die tatsächliche Scan-ID aus dem Anforderungskontext über:

```cpp
SqliteHashCache cache(m_scan_id_);
cache.prune(m_current_request_.directory);
```

Jetzt verhält sich die Pflaume korrekt: Sie löscht nur Dateien, die in diesem Scan nicht gesehen wurden – also Dateien, die tatsächlich aus dem Ordner entfernt wurden.

### Bonus-Aufräumen: Entfernen von Dead Code

Während ich die Pflaucke reparierte, fiel mir auch auf, dass die Pipeline eine merkwürdige 'onStart()'-Lebenszyklusmethode hatte, die niemand benutzte. Jede einzelne Stufe implementierte es als leeren Stub:

```cpp
void DiskReader::onStart() { }
void HashWorker::onStart() { }
// ... every other stage
```

Die Basisklasse `StageBase::Run()` rief sie früher auf, aber ich hatte diesen Pfad bereits in einer früheren Änderung umgestaltet. Die Methode war einfach nur da, virtuell und vererbt, ohne irgendetwas zu tun.

Also habe ich es entfernt. Der Phasenlebenszyklus ist jetzt nur noch:

- 'run()' — das Werk (in jeder Stufe umgesetzt)
- 'onStop()' — elegantes Abschalten

Außerdem habe ich 'CachePrune.h' gelöscht – eine Header-Datei, die ich für eine separate Prune-Phase erstellt hatte und die nie verwendet wurde. Die Begrenzung wird jetzt direkt in 'PipelineController' behandelt.

### Die Lektion

Dieser Bug existierte still. Die unmittelbare Funktion (Scannen und Hashing) wurde erfolgreich abgeschlossen. Der Schaden trat erst später auf, als Nutzer erwarteten, ihre zuvor berechneten Hashes wiederzuverwenden. "Scheint zu funktionieren" ist nicht dasselbe wie "korrekt umgesetzt".
