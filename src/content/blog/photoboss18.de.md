---
id: "photoboss18"
title: "📊 Verbesserungen der Benutzererfahrung: Statusaktualisierungen und Fortschrittsanzeigen in Photoboss"
seoTitle: "Verbesserung der Benutzererfahrung: Statusaktualisierungen und Fortschrittsanzeigen in Photoboss"
date: "2026-06-12"
category: "Softwareentwicklung"
summary: "Dieser Beitrag dokumentiert umfassende UX-Verbesserungen für Photoboss, einen Suchdienst für doppelte Bilder. Der Autor geht auf mehrere Schwachstellen ein, darunter unklare Statusmeldungen, fehlende Fortschrittsanzeige, die vorzeitige Aktivierung der Löschtaste sowie Probleme mit dem Fortschrittsbalken. Er behebt diese durch die Implementierung einer Phasenanzeige, phasenspezifischer Signale und vereinfachter Statusmeldungen sowie durch die Anpassung des Zeitpunkts der Löschtaste, die nun erst nach vollständigem Abschluss des Scanvorgangs aktiviert wird."
project: "photoboss"
tags: ["UX Design", "Qt/C++", "Progress Indicators", "Desktop Applications", "UI/UX"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Ich habe Photoboss täglich beim Durchforsten meines eigenen Fotoarchivs genutzt, und eine Sache hat mich immer wieder gestört: Ich hatte keine Ahnung, was die App während eines Scans eigentlich tat. War sie noch dabei, Dateien zu finden? Hatte sie bereits mit der Hash-Berechnung begonnen? War sie schon halb mit dem Gruppieren fertig? In der Statusleiste stand nur „Scannen… 1.234 Dateien gefunden“, was mir zwar eine Zahl nannte, aber nicht verriet, wo wir uns gerade im Prozess befanden. Und schlimmer noch – die Schaltfläche „Löschen“ leuchtete mitten im Scan auf, sodass ich mit dem Löschen beginnen konnte, noch bevor alle Duplikatsgruppen überhaupt angezeigt worden waren. Das ist ein Rezept für Reue.

Also habe ich mich hingesetzt, um die Benutzererfahrung ordentlich zu optimieren: bessere Sichtbarkeit des Status, klarere Pipeline-Phasen und – was am wichtigsten ist – die Sicherstellung, dass die Schaltfläche „Löschen“ erst dann aktiviert wird, wenn der Scan wirklich abgeschlossen ist.

## Das Problem

Nutzer, die große Fotosammlungen scannten, sahen sich mit mehreren Problemen konfrontiert:

1. **Unklare Statusmeldungen** – „Wird gescannt… X Dateien gefunden“ vermittelte nicht klar, was gerade geschah
2. **Keine Sichtbarkeit des Fortschritts** – Die Benutzer konnten nicht erkennen, in welcher Phase der Verarbeitung sich das Programm befand
3. **Zu früh aktivierter Löschbutton** – Der Löschbutton wurde mitten im Scanvorgang aktiviert, bevor alle Duplikatsgruppen angezeigt wurden
4. **Fortschrittsbalken blieb auf dem Ladekreisel stehen** – Wenn 0 Duplikate gefunden wurden, blieb der Fortschrittsbalken im unbestimmten Modus

Besonders problematisch war der Zeitpunkt der „Löschen“-Schaltfläche – die Benutzer konnten bereits mit dem Löschen von Dateien beginnen, bevor sie alle Duplikate gesehen hatten, die der Scan gefunden hatte.

## Lösungsübersicht

Ich habe vier wesentliche Verbesserungen vorgenommen:

1. **Phasenanzeigeleiste** – Eine horizontale Leiste, die drei für den Benutzer relevante Pipeline-Phasen anzeigt
2. **Phasenspezifische Signale** – Direkte Signale für UI-Aktualisierungen, die die Regex-Analyse umgehen
3. **Vereinfachte Statusmeldungen** – Kurze Meldungen, Zählungen nur im Phasenstreifen
4. **Festgelegtes Timing der Löschschaltfläche** – Die Schaltfläche ist nun erst aktiv, wenn der Scan vollständig abgeschlossen ist

## Details zur Umsetzung

### Phasenanzeigestreifen

Ich habe ein dreistufiges Anzeigesystem entwickelt, das horizontal im Fußbereich verläuft:

```
┌───────────────────────────────────────────────────────────┐
│ Finding Files      │   Analyzing        │   Grouping      │
│  ○  1,234          │   ○  567           │   ○  12         │
└───────────────────────────────────────────────────────────┘
```

Jede Phase hat drei Status:
- **Ausstehend** (○ grau) – Noch nicht begonnen
- **Aktiv** (● gelb mit Zählstand) – Wird gerade bearbeitet
- **Abgeschlossen** (✓ grün) – Phase beendet

### Die Concurrent-Pipeline verstehen

Eine wichtige Erkenntnis aus der Analyse des Quellcodes war, dass die Pipeline-Schritte parallel und nicht nacheinander ablaufen:

- **Dateien suchen** (DirectoryScanner) – Findet Dateien auf der Festplatte
- **Analysieren** (DiskReader + HashWorker) – Liest Bilder ein und erstellt Hash-Werte
- **Gruppieren** (ResultProcessor) – Fasst Duplikate zusammen

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
|----------------------|-------------------------------------------------|
| Start | „Scan gestartet...“ |
| Suche abgeschlossen     | „Dateisuche abgeschlossen. Dateien werden verarbeitet...“  |
| Analyse abgeschlossen   | „Dateien verarbeitet. Duplikate werden gruppiert...“ |
| Fertig | „n Duplikate gefunden – Scan abgeschlossen“ |
| Keine Duplikate | „Keine Duplikate gefunden – Scan abgeschlossen“ |

### Fortschrittsbalken-Korrektur

Es gab einen Fehler, bei dem der Fortschrittsbalken als Spinner blieb, wenn 0 Duplikate gefunden wurden. Das Problem bestand darin, dass der Scanner, als er fertig war, den Fortschrittstimer startete, aber nie ein bestimmtes progressUpdate ausgab, um vom Spinner-Modus zu wechseln.

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

Der Fehler lag in der Aktivierungsbedingung:

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

Die Pipeline sendet verschiedene Fortschrittssignale aus und ihre Zuordnung zur richtigen Phase erforderte eine sorgfältige Analyse. Anstatt Statusmeldungen zu analysieren (was fragil wäre), habe ich dedizierte Signale hinzugefügt, die den Fortschritt jeder Pipeline-Stufe weiterleiten.

### Herausforderung 2: Umgang mit parallel laufenden Phasen

Da die Phasen parallel ablaufen, verfolgt der Code jede Phase unabhängig. Die phasenspezifischen Signale geben im weiteren Verlauf Zählungen von jeder Stufe aus und halten die Benutzeroberfläche synchron.

### Herausforderung 3: UI-Integration

Der Phasenstreifen musste in das vorhandene Fußer-Layout passen, ohne die Fortschrittsleiste oder die Tasten zu stören. Ich habe es als neues vertikales Layout-Element in der bestehenden Footer-GroupBox hinzugefügt.

## Reflexion und gewonnene Erkenntnisse

Diese Verbesserungsrunde hat einige Grundsätze gestärkt, auf die ich immer wieder zurückkomme:

**Signaldesign ist UI-Architektur.** Das Hinzufügen von drei dedizierten Phasensignalen anstelle von Statusstrings war nicht nur sauberer – es veränderte grundlegend, was die Benutzeroberfläche anzeigen konnte. Die Lehre ist, dass die Ausgabeschnittstelle der Pipeline (ihre Signale) für die Anforderungen der Benutzeroberfläche ausgelegt sein sollte und nicht aus internen Log-Nachrichten nachgerüstet werden sollte.

**Der Lösch-Button ist eine sicherheitskritische Kontrolle.** Der ursprüngliche Code ermöglichte sie eifrig, weil "Gruppen existieren = bereit zum Löschen." Aber das ignorierte das mentale Modell des Nutzers: Er muss alle Optionen sehen, bevor er eine Entscheidung trifft. Dies ist ein Fall, in dem Korrektheit (warten, bis alles angezeigt ist) die Reaktionsfähigkeit schlägt (so schnell wie möglich aktivieren).

**Fortschrittssichtbarkeit ist ein UX-Kraftmultiplikator.** Der Phasenstreifen kostet relativ wenig Code in der Implementierung, verändert aber dramatisch, wie sich die App während eines langen Scans anfühlt. Einige Indikatoren und Farbzustände haben eine Black-Box-Operation in etwas verwandelt, dem der Nutzer folgen und dem er vertrauen kann.

Wenn ich das noch einmal machen würde, würde ich mit dem Signaldesign beginnen, anstatt es nachzurüsten. Die phasenspezifischen Signale hätten vom ersten Tag an Teil von PipelineController sein sollen – das hätte mir den Umweg über das Parsen von regulären Ausdrücken vollständig erspart.

## Ergebnisse

Nutzer sehen jetzt:

1. **Phasenindikatoren löschen** – Dateien finden → Analyse → Gruppierung mit Live-Zählungen
2. **Farbcodierte Zustände** – Gelb für aktiv, grün für abgeschlossen, grau für ausstehende Zustände
3. **Abgeschlossene Zustände bleiben bestehen** – Phasenindikatoren bleiben nach Abschluss mit ✓ sichtbar
4. **Sicherer Löschknopf** – Nur aktiviert, wenn der Scan vollständig abgeschlossen ist
5. **Vereinfachte Statusnachrichten** – Kurze Nachrichten ohne Zählzahlen
6. **Fixed Progress Bar** – Bleibt nach Abschluss bei 100 % und zeigt an, dass die Verarbeitung abgeschlossen ist

## Ich freue mich auf

Das Phasenanzeigesystem funktioniert gut, aber es gibt noch Raum, weiterzugehen:

- **Geschätzte verbleibende Zeit pro Phase** – Verwendung gleitender Durchsatzdurchschnitte, um dem Benutzer ein Gefühl dafür zu geben, wie lange jede Phase dauern wird - **Fortschrittsbalken pro Phase** – Im Moment zeigen wir die Anzahl an, aber ein visueller Füllbalken wäre besser erkennbar - **Scans anhalten/fortsetzen** – die Infrastruktur ist fast fertig; Es braucht lediglich eine saubere Benutzeroberfläche - **Fortschrittsprozentsatz für die Gruppierungsphase** – die Gruppierungsphase ist derzeit undurchsichtig; Das Hinzufügen einer Abschlussquote würde das Bild abrunden

Der nächste Beitrag in dieser Reihe befasst sich mit der Konsolidierung der Phasensignale: Die drei separaten „Phase*Update“-Signale funktionieren, aber als einzelnes Signal mit einem Enum-Diskriminator wären sie sauberer – das reduziert den Boilerplate und macht die Architektur wartbarer.
