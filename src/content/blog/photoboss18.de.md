---
id: "photoboss18"
title: "📊 UX-Verbesserungen: Statusupdates und Fortschrittsindikatoren in Photoboss"
seoTitle: "Verbesserung der Benutzererfahrung: Statusaktualisierungen und Fortschrittsanzeigen in Photoboss"
date: "2026-05-22"
category: "Softwareentwicklung"
summary: "Dieser Beitrag dokumentiert umfassende UX-Verbesserungen für Photoboss, einen Suchdienst für doppelte Bilder. Der Autor geht auf mehrere Schwachstellen ein, darunter unklare Statusmeldungen, fehlende Fortschrittsanzeige, die vorzeitige Aktivierung der Löschtaste sowie Probleme mit dem Fortschrittsbalken. Er behebt diese durch die Implementierung einer Phasenanzeige, phasenspezifischer Signale und vereinfachter Statusmeldungen sowie durch die Anpassung des Zeitpunkts der Löschtaste, die nun erst nach vollständigem Abschluss des Scanvorgangs aktiviert wird."
project: "photoboss"
tags: ["UX Design", "Qt/C++", "Progress Indicators", "Desktop Applications", "UI/UX"]
status: "scheduled"
isAutoTranslated: true
---

# Verbesserung der Benutzererfahrung: Statusaktualisierungen und Fortschrittsanzeigen in Photoboss

## Einleitung

Bei der Entwicklung von Anwendungen, die lang andauernde Hintergrundvorgänge ausführen, benötigen Nutzer klares und umsetzbares Feedback darüber, was gerade geschieht. In Photoboss – unserem Tool zum Auffinden doppelter Bilder – wies die Benutzererfahrung mehrere Mängel auf: Statusmeldungen waren unklar, es gab keine Anzeige des Fortschritts in einzelnen Phasen, und vor allem wurde die Schaltfläche „Löschen“ vorzeitig aktiviert, bevor alle Gruppen im Vorschaufenster angezeigt wurden.

Dieser Beitrag beschreibt die umfassenden Verbesserungen der Benutzererfahrung, mit denen diese Probleme behoben werden.

## Das Problem

Nutzer, die große Fotosammlungen scannten, sahen sich mit mehreren Problemen konfrontiert:

1. **Vage Statusnachrichten** - "Scannen... X-Dateien entdeckt" nicht klar kommunizierte, was vor sich ging
2. **Keine Fortschrittssichtbarkeit** – Nutzer konnten nicht sehen, in welcher Phase der Verarbeitung stattfand
3. **Vorzeitiger Löschknopf** – Der Löschknopf wurde mitten im Scan aktiv, bevor alle doppelten Gruppen angezeigt wurden
4. **Fortschrittsleiste am Spinner hängen geblieben** – Wenn 0 Duplikate gefunden wurden, blieb die Fortschrittsleiste im unbestimmten Modus

Das Timing der Löschtaste war besonders problematisch – Nutzer konnten Dateien löschen, bevor sie alle Duplikate gesehen hatten, die der Scan gefunden hatte.

## Lösungsübersicht

Ich habe vier große Verbesserungen umgesetzt:

1. **Phase Indicator Strip** – Eine horizontale Zeile, die drei benutzerrelevante Pipeline-Phasen zeigt
2. **Phasenspezifische Signale** – Direkte Signale für UI-Updates, die Regex-Parsing umgehen
3. **Vereinfachte Statusmeldungen** – Kurze Nachrichten, nur Zählungen im Phasenstreifen
4. **Fehler-Knopf-Timing korrigiert** – Der Button wird jetzt nur aktiviert, wenn der Scan vollständig abgeschlossen ist

## Implementierungsdetails

### Phasenanzeigestreifen

Nach der Spezifikation des Nutzers habe ich ein dreiphasiges Indikatorsystem erstellt, das horizontal im Fußbereich verläuft:

```
┌──────────────────────────────────────────────────────────────────┐
│ Finding Files   │   Analyzing    │   Grouping          [✓ Done] │
│  ○  1,234       │   ○  567      │   ○  12                    │
└──────────────────────────────────────────────────────────────────┘
```

Jede Phase hat drei Zustände:
- **Ausstehend** (○ grau) - Noch nicht begonnen
- **Aktiv** (● gelb mit Zählung) – Derzeit in Verarbeitung
- **Abgeschlossen** (✓ grün) - Phase beendet

### Verständnis der Nebenlaufbahn

Eine wichtige Erkenntnis aus der Analyse der Codebasis war, dass die Pipeline-Stufen gleichzeitig und nicht sequentiell ablaufen:

- **Dateien finden** (DirectoryScanner) – Entdeckt Dateien auf der Festplatte
- **Analyzing** (DiskReader + HashWorker) – Liest und hasht Bilder
- **Grouping** (ResultProcessor) – Clustert dupliziert

Wenn Finding Files noch scannt, kann Analyzing bereits zuvor entdeckte Dateien verarbeiten. Diese gleichzeitige Natur erforderte einen sorgfältigen Umgang mit Signalen.

### Phasenspezifische Signale (Die saubere Architektur)

Anstatt Statusmeldungen mit Regex zu parsen, habe ich dedizierte Signale für Phasenupdates in PipelineController hinzugefügt:

```cpp
// PipelineController.h - new signals
signals:
    void phaseFindingUpdate(int count);      // Files discovered
    void phaseAnalyzingUpdate(int count);   // Files hashed/processed
    void phaseGroupingUpdate(int count);      // Files processed for grouping
```

Dieser Ansatz ist:
- **Clean** - Kein Parsing oder String-Manipulation
- **Wartbar** – Direkte Verbindungen, leicht verständlich
- **Testbar** – Signale können unabhängig überwacht werden
- **Effizient** - Kein Regex-Overhead

### Verbesserungen der Statusnachrichten

Wechselte zu kurzen Nachrichten mit Zählungen im Phasenstreifen:

| Phase | Statusmeldung |
|-------|---------------|
| Start | "Scan gestartet..." |
| Vollständige Suche | "Dateifindung abgeschlossen. Bearbeitung von Dateien..." |
| Analyse komplett | "Akten bearbeitet. Gruppiere Duplikate..." |
| Vollständig | "n Duplikate gefunden -- Scan abgeschlossen" |
| Keine Duplikate | "Keine Duplikate gefunden – Scan abgeschlossen" |

### Fortschrittsbalken-Korrektur

Es gab einen Bug, bei dem die Fortschrittsleiste als Spinner blieb, obwohl keine Duplikate gefunden wurden. Das Problem war, dass der Scanner, wenn er fertig war, den Fortschrittstimer startete, aber nie ein bestimmtes ProgressUpdate zum Wechsel aus dem Spinner-Modus ausgab.

Beheben in PipelineController.cpp:

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

### Knopfkorrektur löschen

Der Bug befand sich in der Ermöglichungsbedingung:

```cpp
// Old - enabled when ANY duplicate group was found
if (count > 0 && m_scan_found_duplicates_) {
    m_btn_delete_->setEnabled(true);
}

// New - only enabled when pipeline is fully stopped
bool canDelete = count > 0 && m_scan_found_duplicates_
              && m_pipeline_state_ == PipelineController::PipelineState::Stopped;
```

Dies stellt sicher, dass Benutzer erst löschen können, wenn der Scan vollständig abgeschlossen ist und alle Gruppen angezeigt werden.

## Herausforderungen und Lösungen

### Herausforderung 1: Phasenzählen extrahieren

Die Pipeline sendet verschiedene Fortschrittssignale, und die Übertragung dieser auf die richtige Phase erforderte eine sorgfältige Analyse. Anstatt Statusnachrichten zu parsen (was fragil wäre), habe ich dedizierte Signale hinzugefügt, die den Fortschritt von jeder Pipeline-Stufe weiterleiten.

### Herausforderung 2: Bewältigung gleichzeitiger Phasen

Da die Stufen parallel ablaufen, verfolgt der Code jede Phase unabhängig voneinander. Die phasenspezifischen Signale senden im Verlauf von jeder Stufe Zähler aus, sodass die Benutzeroberfläche synchron bleibt.

### Herausforderung 3: UI-Integration

Der Phasenstreifen musste in das vorhandene Fußer-Layout passen, ohne die Fortschrittsleiste oder die Tasten zu stören. Ich habe es als neues Verticallaout-Element in der bestehenden Footer-GroupBox hinzugefügt.

## Ergebnisse

Nutzer sehen jetzt:

1. **Phasenindikatoren löschen** – Dateien finden → Analyse → Gruppierung mit Live-Zählungen
2. **Farbcodierte Zustände** – Gelb für aktiv, grün für abgeschlossen, grau für ausstehende Zustände
3. **Abgeschlossene Zustände bleiben bestehen** - Phasenindikatoren bleiben nach Abschluss mit ✓ sichtbar
4. **Sicherer Löschknopf** – Nur aktiviert, wenn der Scan vollständig abgeschlossen ist
5. **Vereinfachte Statusnachrichten** – Kurze Nachrichten ohne Zählzahlen
6. **Fixed Progress Bar** – Bleibt nach Abschluss bei 100 % und zeigt an, dass die Verarbeitung abgeschlossen ist

## Ich freue mich nach vorne

Mögliche zukünftige Verbesserungen:

- Geschätzte verbleibende Zeit pro Phase
- Fortschrittsbalken pro Phase (nicht nur Zählungen)
- Möglichkeit, Scans zu pausieren oder fortzusetzen
- Fortschrittsprozentsatz für die Gruppierungsphase

## Fazit

Die Verbesserungen bieten den Nutzern einen vollständigen Überblick über die Pipeline, ohne sie mit technischen Details zu überfordern. Die gleichzeitige Natur der Pipeline wird nun über klare Phasenindikatoren kommuniziert, und Nutzer können darauf vertrauen, dass die Löschtaste erst aktiviert wird, wenn das Scannen vollständig abgeschlossen ist.
