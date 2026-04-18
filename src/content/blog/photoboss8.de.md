---
id: photoboss8
title: "📸 Die Nadel im Heuhaufen finden: Ähnlichkeitssuche & Gruppierung"
seoTitle: "Ähnlichkeitssuche & Gruppierung zur exakten Bild-Deduplizierung"
date: "2026-02-17"
category: "Software Engineering"
summary: "Implementierung einer Ähnlichkeits-Engine mit gewichteter Bewertung (pHash, dHash, aHash), um fast identische Bilder zu gruppieren, und Refactorierung der Pipeline für mehr Pragmatismus."
project: "PhotoBoss"
tags: ["C++", "Qt", "Ähnlichkeitssuche", "Algorithmen", "Refactoring"]
status: "published"
isAutoTranslated: false
---

Wir haben eine Pipeline. Wir haben einen Thread-basierten Worker-Pool. Wir haben einen robusten, versionierten Datenbank-Cache. Die Maschine ist gebaut. Jetzt ist es an der Zeit, sie einzuschalten und das zu tun, weswegen wir hier sind: **Die Duplikate finden.**

## Die Gruppierungsstrategie

Mir wurde früh klar, dass ein „Ein-Durchgang-für-alles“-Ansatz falsch war. Die Gruppierung exakter Byte-Übereinstimmungen ist einfach (und objektiv). Die Gruppierung „ähnlicher“ Bilder ist unscharf (und subjektiv).

Ich habe mich für einen Sieve-ähnlichen Ansatz entschieden:

### Ebene 1: Die exakte Übereinstimmung

Zuerst führe ich einen blitzschnellen Durchgang mit SHA-256 durch. Wenn zwei Dateien denselben Hash haben, sind sie dieselbe Datei. Punkt. Dies hat sofort etwa 4.000 Dateien aus meiner Bibliothek entfernt. Das sind die sicheren Treffer.

### Ebene 2: Die visuelle Übereinstimmung

Hier wird die Mathematik spannend. Ich vergleiche jedes Bild mit jedem anderen Bild (natürlich unter Verwendung eines Indexbaums, um den O(n^2)-Wahnsinn zu vermeiden).

Ich habe einen „Similarity Score“ definiert, der auf einem gewichteten Durchschnitt basiert:

```cpp
struct Config {
    double strongThreshold = 0.90;
    
    // Komponenten
    double pHashWeight = 0.45;  // Shape/Structure
    double dHashWeight = 0.25;  // Gradients
    double aHashWeight = 0.20;  // Average Color
    double ratioWeight = 0.10;  // Aspect Ratio
};
```

Warum mischen? Weil `pHash` großartig darin ist, Kompressionsartefakte zu überstehen, aber manchmal denkt, dass ein Gebäude wie ein Buch aussieht. `aHash` ist super bei Farben, versagt aber, wenn man das Bild beschneidet. Zusammen bilden sie eine Jury. Wenn die Jury zu 90 % mit „Ja“ stimmt, ist es ein Treffer.

---

## Das Ergebnis (und die Fehlalarme)

Ich drückte auf „Scan“. Die Pipeline erwachte zum Leben. Die Cache-Treffer flogen vorbei. Und dann fing der Zähler für „Gefundene Gruppen“ an zu steigen.

Ich öffnete den Ergebnis-Viewer (den ich schließlich in einem schicken Dark Mode gestaltet habe, denn wir sind ja keine Barbaren), und da waren sie.

Ein Foto meines Hundes aus dem Jahr 2018. Neben einer etwas kleineren Version mit der Beschriftung „Instagram Export“. Daneben eine Version mit einem Sepia-Filter. **PhotoBoss wusste, dass sie identisch waren.**

Aber es war nicht perfekt. Es entschied auch, dass ein Bild einer grauen Wand identisch mit einem Bild einer grauen Himmels sei. Und es gruppierte zwei völlig verschiedene Sonnenuntergänge, weil die Farbpaletten mathematisch identisch waren.

Die Similarity-Engine ist im Moment wie ein übermütiger Welpe. Er findet den Ball, aber manchmal bringt er einem stattdessen einen Stein. Ich muss die Bewertungsschwellen verschärfen und vielleicht eine „Sicherheitsprüfung“ für Grenzfälle einführen.

---

## Was kommt als Nächstes?

Ich kann also die Duplikate *sehen*. Aber ich kann sie noch nicht einfach löschen.

Ich habe eine Thumbnail-Ansicht, aber der eigentliche „Löschen“-Button ist erschreckend effektiv. Ich muss einen „Prüfen & Bestätigen“-Workflow bauen, der sich sicher anfühlt, wenn man ihn auf 15 Jahre Erinnerungen anwendet. UX ist schwer, besonders wenn der Preis für einen Fehlklick das Löschen der ersten Schritte des Kindes ist.

Der Motor läuft. Jetzt muss ich nur noch lernen, ihn zu steuern.
