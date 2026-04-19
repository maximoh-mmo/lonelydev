---
id: photoboss3
title: "\U0001F4F8 Qt durch praktische Übungen lernen: Threads, Signale und Eigentumsrechte"
seoTitle: 'Qt-Parallelität: Threads, Signale und Objektbesitz'
date: '2025-12-10'
category: Software Engineering
summary: >-
  Ein tiefer Einblick in Qt-Threading, Signale/Slots und Objektbesitz beim
  Aufbau einer reaktionsschnellen Bildbearbeitungs-Pipeline – einschließlich
  anfänglicher Fehler und gewonnener Erkenntnisse.
project: PhotoBoss
tags:
  - C++
  - Qt
  - Concurrency
  - Signals & Slots
status: published
isAutoTranslated: true
---

Ich habe mich bei diesem Projekt für Qt entschieden, weil ich es gründlich lernen wollte. Ich habe mich zwar schon früher damit beschäftigt, aber „sich mit Qt beschäftigen“ bedeutet in der Regel, „Code von StackOverflow zu kopieren und einzufügen, bis das Fenster erscheint“.

Dieses Mal wollte ich die Maschine verstehen. Und Mann, hat die Maschine sich gewehrt!

## Thread-Affinität: Der stille Killer

Da ich aus der allgemeinen C++-Welt komme, ging ich davon aus, dass ich Methoden aufrufen könnte, wenn ich einen Zeiger auf ein Objekt hätte.

Qt sagt: „Nein.“

Ich habe drei Tage damit verbracht, eine Race Condition zu beheben, bei der meine Benutzeroberfläche *manchmal* aktualisiert wurde, aber willkürlich abstürzte. Der Übeltäter? **Thread-Affinität**. In Qt „lebt“ jedes `QObject` auf einem bestimmten Thread. Wenn man eine Methode davon aus einem anderen Thread aufruft, verstößt man gegen die Regeln.

---

## Die Erleuchtung in Sachen Signal-Slot-Verhältnis

Die Lösung – und der Moment, in dem mir das Konzept endlich „klar wurde“ – bestand darin, mich voll und ganz auf **Signals and Slots** einzulassen.

Anstelle von `worker->doWork()` sendest du `requestWork()` aus. Anstatt dass der Worker Daten zurückgibt, sendet er `workFinished(result)` aus.

Anfangs wirkt das etwas umständlich. Man schreibt Standardcode, nur um eine Funktion aufzurufen. Doch dann wird einem klar, was Qt für einen erledigt: **Es überträgt den Aufruf automatisch über Thread-Grenzen hinweg.** Verwendet man eine Queued-Verbindung, gelangen die Daten sicher in den Thread des Empfängers, ohne dass in der Geschäftslogik eine Mutex-Sperre erforderlich ist.

---

## MoveToThread() ist keine Zauberei

Eine bestimmte Falle, in die ich getappt bin:

```cpp
// Current Thread: Main
MyWorker* worker = new MyWorker();      // Created on Main Thread
QThread* thread = new QThread();
worker->moveToThread(thread);           // Moved to Worker Thread
thread->start();
```

Ich habe auf die harte Tour gelernt, dass der *Konstruktor* von `MyWorker` weiterhin im Hauptthread ausgeführt wird. Wenn man im Konstruktor Unterobjekte oder Timer anlegt, verbleiben diese im Hauptthread, während der Worker selbst verschoben wird. Das Ergebnis ist ein Frankenstein-Objekt, das sich über zwei Threads erstreckt.

Um dies zu beheben, musste ein striktes Muster eingehalten werden: Die Initialisierung muss im `start()`-Slot erfolgen, nicht im Konstruktor.

Es war eine anstrengende Woche, aber meine Pipeline ist nun vollständig lock-frei und stützt sich ausschließlich auf die Nachrichtenübermittlung. Sie ist übersichtlicher, sicherer und wohl auch „Qt“-typischer als alles, was ich bisher geschrieben habe.
