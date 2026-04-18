---
id: photoboss3
title: "\U0001F4F8 Qt durch Aufbau lernen: Threads, Signale und Eigentum"
seoTitle: 'Qt-Parallelität: Threads, Signale und Objektbesitz'
date: '2025-12-10'
category: Software Engineering
summary: >-
  Ein tiefer Einblick in Qt-Threading, Signale/Slots und Objektbesitz beim
  Aufbau einer reaktionsfähigen Fotoverarbeitungspipeline – einschließlich
  früher Fehler und gewonnener Erkenntnisse.
project: PhotoBoss
tags:
  - C++
  - Qt
  - Concurrency
  - Signals & Slots
status: published
isAutoTranslated: true
---
Ich habe Qt für dieses Projekt ausgewählt, weil ich es richtig lernen wollte. Ich habe mich schon einmal damit beschäftigt, aber „versuchen“ in Qt bedeutet normalerweise „Kopieren und Einfügen von StackOverflow, bis das Fenster angezeigt wird“.

Dieses Mal wollte ich die Maschine verstehen. Und oh Mann, hat sich die Maschine gewehrt?

## Thread-Affinität: Der stille Killer

Da ich einen generischen C++-Hintergrund hatte, ging ich davon aus, dass ich Methoden dafür aufrufen könnte, wenn ich einen Zeiger auf ein Objekt hätte.

Qt sagt: **„Nein.“**

Ich habe drei Tage damit verbracht, eine Race-Bedingung zu debuggen, bei der meine Benutzeroberfläche *manchmal* aktualisiert wurde, aber zufällig abstürzte. Der Schuldige? **Thread-Affinität**. In Qt „lebt“ jedes „QObject“ in einem bestimmten Thread. Wenn Sie eine Methode aus einem anderen Thread aufrufen, verstoßen Sie gegen das Gesetz.

---

## Die Signal-/Slot-Erleuchtung

Die Lösung – und der Moment, in dem das Framework für mich endlich „Klick“ gemacht hat – bestand darin, **Signale und Slots** vollständig zu nutzen.

Anstelle von „worker->doWork()“ geben Sie „requestWork()“ aus. Anstatt dass der Worker Daten zurückgibt, gibt er „workFinished(result)“ aus.

Es fühlt sich zunächst umständlich an. Sie schreiben ein Musterbeispiel, nur um eine Funktion aufzurufen. Aber dann wird Ihnen klar, was Qt für Sie tut: **Es leitet den Aufruf automatisch über Thread-Grenzen hinweg weiter.** Wenn Sie eine Verbindung in der Warteschlange verwenden, kommen die Daten sicher im Thread des Empfängers an, ohne dass in Ihrer Geschäftslogik eine Mutex-Sperre erforderlich ist.

---

## MoveToThread() ist keine Zauberei

Eine konkrete Falle, in die ich getappt bin:

```cpp
// Current Thread: Main
MyWorker* worker = new MyWorker();      // Created on Main Thread
QThread* thread = new QThread();
worker->moveToThread(thread);           // Moved to Worker Thread
thread->start();
```

Ich habe auf die harte Tour gelernt, dass der *Konstruktor* von „MyWorker“ immer noch im Hauptthread läuft. Wenn Sie im Konstruktor Unterobjekte oder Timer zuweisen, bleiben diese im Hauptthread, während der Worker selbst verschoben wird. Das Ergebnis ist ein Frankenstein-Objekt, das sich über zwei Threads erstreckt.

Um dieses Problem zu beheben, war ein strenges Muster erforderlich: Führen Sie das Setup in einem „start()“-Slot durch, nicht im Konstruktor.

Es war eine schmerzhafte Woche, aber meine Pipeline ist jetzt völlig sperrenfrei und verlässt sich ausschließlich auf die Weitergabe von Nachrichten. Es ist sauberer, sicherer und wohl mehr „Qt“ als alles, was ich bisher geschrieben habe.
