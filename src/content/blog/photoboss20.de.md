---
id: "photoboss20"
title: "🧹 Die große Aufräumaktion: 64 Dateien, 393 Löschvorgänge, null Reue"
seoTitle: "Die große Aufräumaktion: 64 Dateien, 393 Löschvorgänge, null Reue"
date: "2026-06-26"
category: "Softwareentwicklung"
summary: "Ein Entwickler hat in seiner C++/Qt-Anwendung zur Fotoduplikatsbereinigung technische Schulden abgebaut, indem er die Namenskonventionen vereinheitlichte, Qt-Includes korrigierte und nicht mehr benötigten Code entfernte. Der achtstündige Bereinigungsaufwand betraf 64 Dateien und führte zur Entfernung von 393 Codezeilen."
project: "photoboss"
tags: ["C++", "Qt", "Code Refactoring"]
status: "scheduled"
isAutoTranslated: true
---

# 🧹 Die große Aufräumaktion: 64 Dateien, 393 Löschvorgänge, null Reue

## Einleitung

Du weißt ja, wie es mit einem Code-Basis anfängt – einmalige Skripte werden zu Kernfunktionen, `Run()` steht neben `run()` und man redet sich ein, dass man das später mal in Ordnung bringt, und jede Qt-Include-Anweisung hat einen anderen Stil, weil man sie aus fünf verschiedenen Stack-Overflow-Antworten kopiert und eingefügt hat. Ich habe **PhotoBoss** entwickelt, eine C++/Qt-Desktop-App zum Deduplizieren von Fotosammlungen, und die Entropie hatte einen kritischen Punkt erreicht.

Ich setzte mich hin, um eine veraltete Komponente zu löschen (`ExifRead` – die bereits vor Monaten in `DiskReader` integriert, aber nie endgültig bereinigt worden war). Acht Stunden später hatte ich 64 Dateien bearbeitet, 393 Zeilen entfernt und Konventionen festgelegt, die die Entwicklung in den nächsten sechs Monaten spürbar erleichtern dürften.

Dieser Beitrag ist ein Protokoll dessen, was ich gefunden habe, was ich geändert habe und was ich über das Erlauben technischer Schuldenverschuldungen gelernt habe.

## Wie alles begann

Die Projektstruktur war eine Momentaufnahme der Unentschlossenheit. Wenn ich bei etwas Schwierigem hängen geblieben bin (Pipeline-Threading, Cache-Invalidierung, Miniaturskalierung), habe ich gerne lokale Details refaktoriert, aber nie nachgeschlagen. Das Ergebnis war eine Codebasis, in der jedes Subsystem seinen eigenen Dialekt hatte – einige intern konsistent, aber alle inkonsistent zueinander.

### Die Hölle der Namenskonventionen

Die öffentliche API war eine Mischung aus PascalCase und camelCase:

```cpp
// MainWindow
void Init();
void SetCurrentFolder(const QString& path);
void OnBrowse();
void WireConnections();

// Pipeline
State GetPhase();
void AddStage(std::unique_ptr<StageBase> stage);

// StageBase
void Run();       // public
virtual void run(); // protected — collision!
```

Bei den Member-Variablen sah es noch schlimmer aus. Manche verwendeten „m_“, andere nicht, manche nutzten „b_“ für Boolesche Werte, und die Verwendung des Suffixes „_“ war uneinheitlich:

```cpp
// HashWorker.h
bool m_abortRequested;       // m_ prefix, no suffix
HashMethod* hashMethod;      // nothing
std::atomic<bool> b_shutdown_; // b_ prefix, has suffix

// ScopedTimer.h
std::chrono::high_resolution_clock::time_point start_; // suffix, no m_
```

Wenn `m_abortRequested` in derselben Klasse direkt neben `hashMethod` steht, ist etwas schiefgelaufen.

### Qt-Inkludierdateien in dreifacher Ausfertigung

Qt hatte drei konkurrierende Stile:

```cpp
#include <qstring.h>      // Qt3/Qt4 convention — still works but deprecated
#include <QWidget>        // Qt5 convention — no .h, UpperCamelCase
#include <QImageIO.h>     // Qt5 convention but with .h — wrong
```

Qt 6.9.1 ist eindeutig: "<QUpperCamelCase>ohne Suffix ".h". Ich hatte 18 Verstöße im gesamten Codebasis.

### Tot-Code-Möbel

Toter Code sammelt sich unbemerkt an. Die `ExifRead`-Stufe war der größte Teil – eine vollständige Stufenklasse mit Header, Implementierung, vcxproj-Einträgen und MOC-Ausgabe –, die allesamt absolut nichts bewirkten. Aber es gab auch noch andere „Geister“:

- `HashScorer` wurde in `SimilarityEngine.h` vorab deklariert, aber nirgendwo definiert
- `ProgressCounterWidget` enthielt die Mitglieder `m_totalLabel_` und `m_active_`, die zwar gesetzt, aber nie gelesen wurden
- `Pipeline.h` enthielt sieben Vorabdeklarationen für Klassen, auf die im Header nie verwiesen wurde
- `GroupWidget.cpp` enthielt ein `#pragma once` – einen Header-Guard in einer `.cpp`-Datei (der nichts bewirkt)

### Eine veraltete Notlösung

Der interessanteste Fund war in 'PipelineFactory.cpp':

```cpp
#ifdef Q_PRIVATE_SLOTS
#undef Q_PRIVATE_SLOTS
#endif
```

`Q_PRIVATE_SLOTS` ist ein Qt-Makro, das vom Meta-Object Compiler verwendet wird. Etwa ab Qt 5.12 wies das Visual Studio Qt Tools-Plugin einen Fehler auf, durch den `Q_PRIVATE_SLOTS`-Deklarationen in nicht vom MOC kompilierten Übersetzungseinheiten verfälscht wurden. Die Abhilfe bestand darin, das Makro vor jedem Code zu deaktivieren, der indirekt `<QObject>` enthielt.

Dieser Fehler existiert seit Jahren nicht mehr. Qt 6.9.1 mit MSVC 2022 lässt sich ohne Hack sauber kompilieren. Ich habe es entfernt.

## Die Beschlüsse des Konvents

Vor der Bereinigung musste ich entscheiden, wie der Code aussehen sollte. Für diese Regeln habe ich mich entschieden:

1. **CamelCase für alle Methoden**, unabhängig von der Zugangsstufe. Kein PascalCase irgendwo.
2. **'m_'-Präfix + '_'-Suffix** für alle Mitgliedsvariablen. Das Präfix kennzeichnet "dies ist ein Mitglied" und das Suffix vermeidet Kollisionen mit lokalen Variablen.
3. **'doRun()' für den geschützten virtuellen**, den Unterklassen überschreiben, 'run()' für den öffentlichen Exception-Wrapping-Eintrittspunkt. Das behebt die Kollision mit 'StageBase'.
4. **'<QUpperCamelCase>'** für alle Qt enthält kein '.h'-Suffix.

Das sind keine Qt-Konventionen (Qt verwendet PascalCase für öffentliche Methoden und das Präfix 'm_' ohne Suffix). Aber das Projekt hatte bereits teilweise camelCase, und Konsistenz ist wichtiger als die gewählte Konvention.

## Die Veränderungen

### Methodenumbenennungen

Die größte Umbenennungsrunde betraf die wesentlichen Klassen:

| Datei | Vor | Nach |
|------|--------|-------|
| 'Minenfenster' | 'GetCurrentFolder', 'Init', 'SetCurrentFolder', 'Unbrowse' | 'GetCurrentFolder', 'Init', 'SetCurrentFolder', 'Unbrowse' |
| 'Pipeline' | 'Getface', 'AdStage', 'ADQ', 'AdThread' | 'Getface', 'AdStage', 'ADQ', 'AdThread' |
| 'Bühnenbasis' | 'Run()' (Öffentlich), 'Run()' (Virtuell) | 'Run()' (Öffentlich), 'Dorun()' (Virtuell) |
| 'Hashmethode' | 'inputtype()' | 'inputtype()' |
| 'Discretor' | 'fertig()' | 'fertig()' |

Alle Call-Dateien (15 Dateien) wurden in einem Durchgang aktualisiert.

### Umbenennungen der Mitgliedsvariablen

In den betroffenen Klassen wurden etwa 30 Mitglieder umbenannt:

```
// ShaderSpinnerWidget
m_spinTimer → m_spinTimer_
m_spinAngle → m_spinAngle_
m_isSpinning → m_isSpinning_
m_lastUpdate → m_lastUpdate_

// Queue.h
b_shutdown_ → m_shutdown_

// Pipeline
allStages → m_allStages_
allQueues → m_allQueues_
currentPhase → m_currentPhase_
state → m_state_
```

Das Präfix „b_“ für boolesche Werte wurde durch das Standardpräfix „m_“ ersetzt. Dieses Präfix stammte aus einem früheren Konventionsversuch, der sich nie verbreitete – es anzuerkennen und zu entfernen fühlte sich besser an, als es als Kuriosität beizubehalten.

### Korrekturen am Include-Pfad

Drei enthalten referenzierte falsche Pfade, weil Dateien verschoben wurden, ohne ihre Konsumenten zu aktualisieren:

```
// Before (wrong)
#include "util/DataTypes.h"       // in NullHashCache.h
#include "HashCatalog.h"          // in HashCatalog.cpp — same directory

// After (correct)
#include "types/DataTypes.h"      // DataTypes.h lives in types/
#include "hashing/HashCatalog.h"  // explicit path to inc/
```

Es gab außerdem fünf abschließende Kommentare zum Namensraum, die sich auf bestimmte Unternamensraumpfade bezogen:

```cpp
// } // namespace photoboss::pipeline::factory
```

Diese wurden:

```cpp
// } // namespace photoboss
```

Der abschließende Kommentar sollte mit dem Eröffnungsnamensraum übereinstimmen – der in unserem gesamten Code einfach 'photoboss' heißt. Die Auflistung von Unternamensräumen ist fragil: Jedes Mal, wenn du eine Datei zwischen Verzeichnissen verschiebst, bricht sie kaputt.

### Fehlende `storeBatch()`-Überschreibung

'NullHashCache' (eine No-Op-Cache-Implementierung für Tests) hatte alle anderen virtuellen Caches aus 'IHashCache' implementiert, außer 'storeBatch()'. Das reine virtuelle existierte, weil 'CacheStore::flushBatch()' es in einem Codepfad aufruft, der zwischen Cache-Implementierungen nicht unterscheiden kann. Das Hinzufügen des No-Op-Overrides war die Lösung – angemessener als das reine virtuelle Element aus der Schnittstelle zu entfernen, da 'SqliteHashCache' es wirklich braucht.

### Die ExifParser-Deduplizierung

Die Klasse „ExifParser“ hatte zwei „parse()“-Überladungen – eine mit einem Dateipfad und eine mit einem „QByteArray“. Nach dem Öffnen der Bildquelle taten sie genau das Gleiche: Metadaten lesen, Ausrichtung, Datum, Marke und Modell extrahieren.

Das Standard-Refactoring – einen privaten Helfer extrahieren – eliminierte ~50 Zeilen Duplikation:

```cpp
ExifData ExifParser::parse(const QString& filePath)
{
    return parseFromImage(Exiv2::ImageFactory::open(filePath.toStdString()));
}

ExifData ExifParser::parse(const QByteArray& bytes)
{
    return parseFromImage(Exiv2::ImageFactory::open(
        reinterpret_cast<const Exiv2::byte*>(bytes.constData()), bytes.size()));
}

ExifData ExifParser::parseFromImage(Exiv2::Image::UniquePtr image)
{
    // ... shared metadata extraction ...
}
```

Zwei Call-Sites werden zu Einzeiler-Delegationen. Die 'parseFromImage'-Methode existiert im anonymen Namensraum-Äquivalent eines privaten statischen Systems.

### Umbenennung von 'humanSize.h' zu 'HumanSize.h'

Die Datei 'util/humanSize.h' war der einzige Header im Projekt, der Kleinbuchstaben verwendete. Es verwendete außerdem 'statische' Funktionen, die redundante Kopien in jeder Übersetzungseinheit, die den Header enthält, erzeugen. Die Lösung: Umbenennt in 'HumanSize.h' und ersetzt 'statisch' durch 'inline'.

### Entfernung des Parameters 'hashMap' aus 'CacheQuery'

Der Konstruktor von „CacheQuery“ hatte einen ungenutzten Parameter „std::map<QString, QString> hashMap“ – ein Überbleibsel aus der Zeit, als der Cache eine In-Memory-Map und nicht SQLite war. Durch das Entfernen (und das Hinzufügen von „explicit“ zum Konstruktor) wurden eine Aufrufstelle und ein toter Parameter bereinigt.

### Verschieben von „HashCatalog.cpp“ nach „src/“.

„HashCatalog.cpp“ befand sich in „inc/photoboss/hashing/“ – einem Header-Verzeichnis. Es handelt sich um eine Implementierungsdatei mit tatsächlichem Code, nicht um eine Vorlage oder einen Inline-lastigen Header. In `src/hashmethods/` ging es, passend zum Speicherort aller anderen Hash-Implementierungsdateien.

## Die unterschriebene/unterschriebene Warnung

Die letzte Warnung im Build war in 'GroupWidget.cpp', wo 'size_t'-Schleifenvariablen mit einem 'QVector::size()' verglichen wurden, der 'qsizetype' (signed) zurückgab und dann zum Vergleich mit 'group.bestIndex' auf 'int' umsetzte:

```cpp
// Before — C4267 warning
for (size_t i = oldCount; i < m_thumbs_.size(); ++i) {
    if (static_cast<int>(i) == group.bestIndex)
```

Die Lösung bestand darin, durchgehend „int“ zu verwenden – einfacher, entspricht dem Typ von „bestIndex“ und entfernte den static_cast:

```cpp
// After — no warning
int oldCount = static_cast<int>(m_thumbs_.size());
for (int i = oldCount; i < static_cast<int>(group.images.size()); ++i) {
    if (i == group.bestIndex)
```

Explizite Sprüche an den Grenzen, an denen die Typen unterschiedlich sind; Keine Abgüsse im Loop-Body.

## Was sich nicht verändert hat

Nicht jede Kongressfrage ist geklärt. Zwei Punkte wurden bewusst zurückgestellt:

1. **'ProgressCounterWidget::P rogressState'** — ein privates Enum, nur intern verwendet, ohne Q_PROPERTY oder Signal-/Slot-Beteiligung. Schlichtes 'Enum' ist in Ordnung.
2. **'Pipeline::P ipelineState', 'Pipeline::P hase', 'ImageThumbWidget::State'** — diese verwenden 'Q_ENUM', weil sie Signal-/Slot-Verbindungen kreuzen, wo das Meta-Objekt-System sie serialisieren oder deserialisieren muss. Das ist eine funktionale Voraussetzung, keine Stilpräferenz.

## Die Ergebnisse

### Nach den Zahlen

| Kategorie | Zählen | |---|---| | Geänderte Dateien | 64 | | Eingefügte Zeilen | 237 | | Zeilen gelöscht | 393 | | Tote Dateien entfernt | 2 | | Methode wird umbenannt | ~15 | | Mitgliedsvariable wird umbenannt | ~30 | | Qt enthält Stilkorrekturen | 18 | | Pfadkorrekturen einschließen | 3 | | Verbleibende Compiler-Warnungen | **0** |

### Der Qualitätsunterschied

- Jede Methode im Projekt ist jetzt camelCase – kein Zweifeln beim Schreiben neuen Codes mehr
- Jede Mitgliedsvariable folgt auf 'm_' + '_' — keine Suche, um zu prüfen, ob ein Vorname ein lokaler oder ein Mitglied ist.
- Qt-Includes sind konsistent – IDEs mit "<QUpperCamelCase>Completion funktionieren" korrekt
- Die vcxproj/filter spiegeln den Dateibaum genau wider – keine veralteten Einträge
- Die Codebasis wird sauber bei '/W4' kompiliert, ohne Warnungen.

## Was ich anders machen würde

**Standardisiert Konventionen zu Beginn eines Projekts, nicht in der Mitte.** Innerhalb von zwei Wochen nach Beginn von PhotoBoss wusste ich, dass die Benennung inkonsistent war. Ich sagte mir: "Ich repariere es später." Sechs Monate später kam er mit 64 Akten an. Die Reibung durch wechselnde Konventionen mitten im Projekt ist real – Branche neu basen, Muskelgedächtnis neu trainieren, den Kollaborateuren erklären, warum ein Drittel der Header geändert wurde.

**Lösche toten Code sofort.** Die ExifRead-Phase war monatelang tot. Jedes Mal, wenn ich nach "ExifRead" suchte oder die Verkabelung der Pipeline durchstöberte, musste ich es mental überspringen. Die Kosten für das Löschen betrugen 30 Sekunden. Die Kosten für das NICHT-Löschen betrugen Hunderte von Mikro-Unterbrechungen über Monate.

**Seien Sie misstrauisch gegenüber statischen lokalen Variablen.** Das Muster 'static Foo lastValue' innerhalb einer Mitgliederfunktion ist der globale Zustand in Verkleidung. Es widersteht dem Testen, erschwert die Extraktion und beeinträchtigt die Gewindesicherung. Jedes Mal, wenn ich so eine finde, zahlt der Austausch durch eine richtige Mitgliedsvariable sofort Dividenden.

## Reflexion

Ich fand diese Reinigung überraschend befriedigend. Die meiste Feature-Arbeit besteht darin, Code hinzuzufügen – neue Klassen, neue Methoden, neue Tests. Aufräumen ist das Gegenteil: Jede erfolgreiche Änderung ist eine Löschung. Die Codebasis wird kleiner, das mentale Modell wird sauberer und die Linter-Ausgabe ist leer.

Die wertvollste Änderung war keine einzelne Umbenennung oder Entfernung. Es war die **Konsistenz**. Wenn ich jetzt eine Datei öffne, kann ich darauf vertrauen, dass die Namenskonventionen mit der Datei übereinstimmen, die ich mir vorher angesehen habe. Das ist eine kleine Sache, aber sie verstärken sich. Jede Minute, die nicht mit dem Raten verbracht wird: "Ist das PascalCase oder camelCase?", ist eine Minute, die mit etwas Wichtigem verbracht wird.

## Nächste Schritte

Nachdem die Konventionen geklärt sind, besteht die verbleibende Arbeit in der Entwicklung von Merkmalen:

| Priorität | Was | Warum |
|----------|------|-----|
| 1 | Hardware-bewusste Auto-Tuning | Probe Kerne und Speicher beim Start, um optimale Thread-Zählungen einzustellen |
| 2 | Unit-Tests | Pipeline-Stufen und Caching haben keinerlei Testabdeckung |
| 3 | Fehlermeldung der Pipeline | Fehler werden versunken – Stufen benötigen Fehlerwege |

Das Auto-Tuning-Stück ist technisch am interessantesten. Die optimale Pipeline-Konfiguration unterscheidet sich stark auf einer 16-Kern-SSD-Maschine (8 Werker, 2 Festplattenleser) im Vergleich zu einer HDD (1 Werker, sequentielle Lesevorgänge). Derzeit ist das eine manuelle Einstellung. Wenn man es automatisch erkennt, funktioniert die Anwendung von Anfang an gut für jede Hardware.

---

*PhotoBoss ist Open Source. Das vollständige Repository ist verfügbar unter [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
