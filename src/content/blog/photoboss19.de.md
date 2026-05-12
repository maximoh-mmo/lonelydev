---
id: "photoboss19"
title: "🔄 Refactoring-Fortschrittsindikatoren: Von mehreren Signalen zu einem einheitlichen Phasensystem"
seoTitle: "Fortschrittsanzeigen bei der Refaktorisierung: Von mehreren Signalen zu einem einheitlichen Phasensystem"
date: "2026-06-19"
category: "Softwareentwicklung"
summary: "Dieser Beitrag beschreibt die Refaktorisierung eines Fortschrittsanzeigesystems in Photoboss, einem doppelten Bildsucher, von mehreren Signalen zu einem einheitlichen Phasensystem mit Enum. Die Änderungen verbesserten die Wartungsbarkeit des Codes, reduzierten Boilerplate und vereinfachten das UI-Management. Ein neues ProgressCounterWidget kapselt die Anzeigelogik und macht die Architektur übersichtlicher und erweiterbarer."
project: "photoboss"
tags: ["Refactoring", "Progress Indicators", "Software Architecture"]
status: "scheduled"
isAutoTranslated: true
---

# Refactoring von Fortschrittsanzeigen: Von mehreren Signalen zu einem einheitlichen Phasensystem

## Einleitung

Ein gutes Benutzer-Feedback während lang andauernder Vorgänge ist für Desktop-Anwendungen von entscheidender Bedeutung. In Photoboss, unserem Tool zum Auffinden doppelter Bilder, führten die in meinem vorherigen Beitrag beschriebenen Verbesserungen der Benutzererfahrung die Einführung eines Phasenanzeigesystems mit drei separaten Signalen ein – eines für jede Pipeline-Phase. Nachdem ich es eine Weile genutzt hatte, wurde mir klar, dass die Umsetzung verbesserungswürdig war: Die separaten Signale führten zu Standardcode, und die Benutzeroberfläche erforderte eine manuelle Positionierung der Ladekreise.

Dieser Beitrag dokumentiert die Umgestaltung, durch die das Phasensystem mithilfe eines auf Enums basierenden Ansatzes zu einem einzigen Signal zusammengefasst wurde, wodurch übersichtlicherer Code und eine besser wartbare Architektur entstanden sind.

## Das Problem

Die bisherige Umsetzung wies mehrere Probleme auf:

1. **Drei separate Signale** — `phaseFindingUpdate`, `phaseAnalyzingUpdate` und `phaseGroupingUpdate` — jeweils mit identischer Signatur
2. **Manuelle Positionierung der Spinner** — Der alte Code erstellte Spinner-Widgets und positionierte sie manuell mit Offsets von `move(60, 8)`
3. **Inkonsistente Statusbehandlung** — Jede Phase erforderte eine eigene Aktualisierungsfunktion und einen eigenen Handler
4. **Boilerplate-Code im MainWindow** — Drei Sätze von Labels, Spinnern, Connect-Aufrufen und Update-Methoden

Dieser Ansatz funktionierte zwar, ließ sich jedoch nicht gut skalieren und machte das Hinzufügen neuer Phasen mühsam.

## Lösungsübersicht

Ich habe eine elegantere Lösung implementiert:

1. **Phase Enum** – Eine bereichsbezogene Aufzählung in `PipelineController`: `Find`, `Analyze`, `Group`
2. **Konsolidiertes Signal** — Ein einziges `phaseUpdate(Phase phase, int current, int total)`-Signal
3. **ProgressCounterWidget** — Eine neue Widget-Klasse, die die Fortschrittsanzeige kapselt
4. **Vereinfachte Benutzeroberfläche** — Manuelle Positionierung des Spinners aus der .ui-Datei entfernt

## Details zur Umsetzung

### Phase Enum

Anstelle von drei separaten Signalen habe ich in „PipelineController.h“ eine bereichsbezogene Enumeration definiert:

```cpp
enum class Phase {
    Find,
    Analyze,
    Group
};
```

Dies sorgt für Typsicherheit und macht deutlich, dass es sich um verwandte Bundesstaaten handelt. Eine neue Phase hinzuzufügen bedeutet jetzt nur noch einen Enum-Wert.

### Vereinheitlichtes Signal

Das neue Signal trägt sowohl die Phase als auch die Zählung:

```cpp
signals:
    void phaseUpdate(Phase phase, int current, int total);
```

Jetzt übernimmt eine einzelne Verbindung alle Phasen-Updates:

```cpp
connect(m_pipeline_controller_.get(), &PipelineController::phaseUpdate,
    this, &MainWindow::progressPhase);
```

Der Handler leitet die Aktion an das entsprechende ProgressCounterWidget weiter:

```cpp
void MainWindow::progressPhase(PipelineController::Phase phase, int count, int total)
{
    if (m_phase_indicators_.contains(phase)) {
        m_phase_indicators_[phase]->setProgress(count);
    }
}
```

### FortschrittCounterWidget

Das neue Widget kapselt die Logik zur Fortschrittsanzeige:

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

Es zeigt:
- Ein Titellabel ("Scan Progress", "Analyse Progress" usw.)
- Ein wartender Spinner
- Eine Fortschrittszählung (z. B. "123 / 456")

Das Widget verwaltet seinen eigenen Zustand intern und verbirgt den Spinner, wenn die Phase abgeschlossen ist.

### UI-Vereinfachung

Die MainWindow.ui-Datei wurde vereinfacht, indem das fest codierte Phasenstreifen-Layout entfernt wurde. Stattdessen konstruiert MainWindow.cpp die Phasenindikatoren nun programmatisch:

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

Dieser Ansatz:
- Gewährt dem Code mehr Kontrolle über die Erstellung von Widgets
- Macht die manuelle Positionierung mit `move()` überflüssig
- Sorgt dafür, dass sich das Layout an die Größe des Containers anpasst

### Überarbeitung des WaitingSpinnerWidget

Das Spinner-Widget erhielt kleinere Verbesserungen:
- Umbenannte Mitgliedsvariablen zur Einhaltung der Unterstrichkonvention ('m_' → '_')
- Optionale Elternzentrierung und Deaktivierung hinzugefügt
- Hinzugefügte MIT-Lizenz-Header-Attribution
- Verbesserte Rendering von Paint-Events

### Korrektur für DirectoryScanner

Ein wichtiger Fehlerbehebung: DirectoryScanner liefert nun determinierten Fortschritt:

```cpp
// Before (indeterminate spinner)
emit progress(count, 0);

// After (determinate count)
emit progress(count, count);
```

Das stellt sicher, dass die Fortschrittsleiste den Scan-Abschluss korrekt anzeigt, anstatt im Spinner-Modus zu bleiben.

## Ergebnisse

Das refaktorierte System bietet:

1. **Saubereres Signaldesign** — Ein Signal statt drei
2. **Typsicherheit** — Phasenenum verhindert ungültige Phasenwerte
3. **Encapsulated UI Logic** — ProgressCounterWidget verwaltet seinen eigenen Zustand
4. **Weniger Standardanruf** — Einzelbehandler, Einzelverbindungsanruf
5. **Bessere Erweiterbarkeit** — Das Hinzufügen einer neuen Phase erfordert minimale Änderungen

## Herausforderungen und Lösungen

### Herausforderung: Migration bestehender Code

Das Aktualisieren vom alten Signalsystem auf das neue erforderte Änderungen in mehreren Dateien:
- PipelineController.h/cpp (Signaldefinition und Emission)
- MainWindow.h/cpp (Ersatz für Handler)
- MainWindow.ui (Layout-Vereinfachung)

Lösung: Ich habe die Änderungen schrittweise vorgenommen und den alten Code am Laufen gehalten, bis das neue System vollständig implementiert war.

### Herausforderung: Total Count Synchronisation

Die Suchphase kennt zuerst die Gesamtzahl der Dateien, aber die Analyse- und Gruppenphasen kennen diese Gesamtzahl zunächst nicht.

Lösung: Wenn die Find-Phase abgeschlossen ist, propagiere ich das Gesamtergebnis auf alle nachfolgenden Phasen:

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

## Reflexion

Dieses Refactoring hat mir mehrere Lektionen gelehrt:

1. **Enums schlagen Booleans** — Ein Phasen-Enum ist klarer als drei boolesche Flaggen
2. **Einzelne Verantwortung** — Dass ProgressCounterWidget seinen Zustand besitzt, reduziert die Komplexität des Hauptfensters
3. **Programmatic UI** — Manchmal ist das Erstellen von Widgets im Code sauberer als Designerdateien
4. **Bestimmt vs. unbestimmt** — Der richtige Fortschrittsbalkenmodus ist wichtig für die wahrgenommene Leistung

## Ich freue mich nach vorne

Mögliche zukünftige Verbesserungen:
- Pro-Phasen-Fortschrittsbalken (prozentuale Fertigstellung)
- Geschätzte verbleibende Zeit
- Pause-/Resume-Funktionalität
- Visuelle Gruppierungsindikatoren (Fortschrittspunkte, die die Anzahl der gefundenen Gruppen anzeigen)

## Fazit

Das konsolidierte Phasensystem bietet eine sauberere Architektur und erhält dabei alle UX-Vorteile der ursprünglichen Implementierung. Der Code ist nun wartbarer und erweiterbarer – das Hinzufügen einer neuen Pipeline-Phase erfordert nur wenige Codezeilen, anstatt mehrere Signalhandler zu modifizieren.
