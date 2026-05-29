---
id: "photoboss18"
title: "📊 Verbesserungen der Benutzererfahrung: Statusaktualisierungen und Fortschrittsanzeigen in Photoboss"
seoTitle: "Verbesserung der Benutzererfahrung: Statusaktualisierungen und Fortschrittsanzeigen in Photoboss"
date: "2026-05-22"
category: "Softwareentwicklung"
summary: "Dieser Beitrag dokumentiert umfassende Verbesserungen der Benutzererfahrung für Photoboss, ein Programm zum Auffinden doppelter Bilder. Der Autor geht auf mehrere Schwachstellen ein, darunter unklare Statusmeldungen, fehlende Fortschrittsanzeige, die vorzeitige Aktivierung der Löschtaste sowie Probleme mit dem Fortschrittsbalken. Er behebt diese durch die Implementierung eines Phasenanzeigebalkens, phasenspezifischer Signale und vereinfachter Statusmeldungen sowie durch die Anpassung des Zeitpunkts der Löschtaste, die nun erst nach vollständigem Abschluss des Scanvorgangs aktiviert wird."
project: "photoboss"
tags: ["UX Design", "Qt/C++", "Progress Indicators", "Desktop Applications", "UI/UX"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Bei der Entwicklung von Anwendungen, die lang andauernde Hintergrundprozesse ausführen, benötigen Nutzer klares und umsetzbares Feedback darüber, was gerade geschieht. In Photoboss – unserem Tool zum Auffinden doppelter Bilder – wies die Benutzererfahrung mehrere Mängel auf: Statusmeldungen waren unklar, es gab keine Anzeige des Fortschritts in einzelnen Phasen, und vor allem wurde die Schaltfläche „Löschen“ vorzeitig aktiviert, bevor alle Gruppen im Vorschaufenster angezeigt wurden.

Dieser Beitrag beschreibt die umfassenden Verbesserungen der Benutzererfahrung, mit denen diese Probleme behoben werden.

## Das Problem

Nutzer, die große Fotosammlungen scannten, sahen sich mit mehreren Problemen konfrontiert:

1. **Unklare Statusmeldungen** – „Wird gescannt… X Dateien gefunden“ vermittelte nicht klar, was gerade geschah
2. **Keine Sichtbarkeit des Fortschritts** – Benutzer konnten nicht erkennen, in welcher Verarbeitungsphase sich das Programm befand
3. **Zu früh aktivierter Löschbutton** – Der Löschbutton wurde mitten im Scanvorgang aktiviert, bevor alle Duplikatsgruppen angezeigt wurden
4. **Fortschrittsbalken blieb auf dem Ladekreisel stehen** – Wenn 0 Duplikate gefunden wurden, blieb der Fortschrittsbalken im unbestimmten Modus

Besonders problematisch war der Zeitpunkt der „Löschen“-Schaltfläche – die Benutzer konnten bereits mit dem Löschen von Dateien beginnen, bevor sie alle Duplikate gesehen hatten, die der Scan gefunden hatte.

## Lösungsübersicht

Ich habe vier wesentliche Verbesserungen vorgenommen:

1. **Phasenanzeigeleiste** – Eine horizontale Zeile, die drei für den Benutzer relevante Pipeline-Phasen anzeigt
2. **Phasenspezifische Signale** – Direkte Signale für UI-Aktualisierungen, die die Regex-Auswertung umgehen
3. **Vereinfachte Statusmeldungen** – Kurze Meldungen, Zählwerte nur in der Phasenanzeigeleiste
4. **Festgelegtes Timing für die Löschschaltfläche** – Die Schaltfläche ist nun erst aktiv, wenn der Scan vollständig abgeschlossen ist

## Details zur Umsetzung

### Phasenanzeigestreifen

Entsprechend den Vorgaben des Nutzers habe ich ein dreistufiges Anzeigesystem erstellt, das horizontal im Fußbereich verläuft:

```
┌──────────────────────────────────────────────────────────────────┐
│ Finding Files   │   Analyzing    │   Grouping          [✓ Done] │
│  ○  1,234       │   ○  567      │   ○  12                    │
└──────────────────────────────────────────────────────────────────┘
```

Jede Phase hat drei Status:
- **Ausstehend** (○ grau) – Noch nicht begonnen
- **Aktiv** (● gelb mit Zählstand) – Wird gerade bearbeitet
- **Abgeschlossen** (✓ grün) – Phase beendet

### Die Concurrent-Pipeline verstehen

Eine wichtige Erkenntnis aus der Analyse des Quellcodes war, dass die Pipeline-Schritte parallel und nicht nacheinander ablaufen:

- **Dateien suchen** (DirectoryScanner) – Findet Dateien auf der Festplatte
- **Analysieren** (DiskReader + HashWorker) – Liest Bilder ein und erstellt Hash-Werte
- **Gruppieren** (ResultProcessor) – Gruppiert Duplikate

Während „Dateien suchen“ noch scannt, verarbeitet „Analysieren“ möglicherweise bereits zuvor gefundene Dateien. Diese Parallelität erforderte eine sorgfältige Signalverarbeitung.

### Phasenspezifische Signale (Die Clean Architecture)

Anstatt Statusmeldungen mit regulären Ausdrücken zu analysieren, habe ich im `PipelineController` spezielle Signale für Phasenaktualisierungen hinzugefügt:

```cpp
// PipelineController.h - new signals
signals:
    void phaseFindingUpdate(int count);      // Files discovered
    void phaseAnalyzingUpdate(int count);   // Files hashed/processed
    void phaseGroupingUpdate(int count);      // Files processed for grouping
```

Dieser Ansatz ist:
- **Sauber** – Keine Syntaxanalyse oder Zeichenfolgenbearbeitung
- **Wartungsfreundlich** – Direkte Verbindungen, leicht verständlich
- **Testbar** – Signale können unabhängig voneinander überwacht werden
- **Effizient** – Kein Overhead durch reguläre Ausdrücke

### Verbesserungen bei den Statusmeldungen

Umgestellt auf kurze Meldungen mit Zahlenangaben im Phasenstreifen:

| Phase | Statusmeldung |
|-------|---------------|
| Start | „Scan gestartet...“ |
| Suche abgeschlossen | „Dateisuche abgeschlossen. Dateien werden verarbeitet...“ |
| Analyse abgeschlossen | „Dateien verarbeitet. Duplikate werden gruppiert...“ |
| Fertig | „n Duplikate gefunden – Scan abgeschlossen“ |
| Keine Duplikate | „Keine Duplikate gefunden – Scan abgeschlossen“ |

### Fehlerbehebung beim Fortschrittsbalken

Es gab einen Fehler, bei dem der Fortschrittsbalken als Lade-Symbol angezeigt blieb, wenn keine Duplikate gefunden wurden. Das Problem bestand darin, dass der Scanner nach Abschluss des Vorgangs zwar den Fortschritts-Timer startete, aber nie ein eindeutiges „progressUpdate“ ausgab, um aus dem Lade-Modus zu wechseln.

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

### Herausforderung 3: Integration der Benutzeroberfläche

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
