---
id: photoboss2
title: "\U0001F4F8 Von der Idee zur Architektur: Entwurf einer skalierbaren Bildverarbeitungspipeline"
seoTitle: Skalierbare Bildverarbeitungs-Pipeline-Architektur in C++
date: '2025-11-26'
category: Software Engineering
summary: >-
  Wie ich eine unübersichtliche Fotobibliothek als parallele Pipeline aus
  Scannen, Dekodierung, Hashing und Aggregation modelliert habe, um eine
  skalierbare und reaktionsfähige Bildverarbeitung zu ermöglichen.
project: PhotoBoss
tags:
  - System Architecture
  - Pipeline Pattern
  - Scalability
status: published
isAutoTranslated: true
---
In meinem Kopf war die Logik einfach. Durchlaufen Sie jeden Ordner, laden Sie jedes Bild, hashen Sie es und suchen Sie nach Duplikaten. Einfach, oder?

Ich habe den ersten Prototyp als einzelne Schleife geschrieben. Bei einem Testordner mit 100 Bildern funktionierte es wunderbar. Dann zeigte ich auf meine Hauptbibliothek mit über 50.000 Fotos.

Die Benutzeroberfläche fror sofort ein. Das Klappern der Scheibe war aus dem Nebenzimmer zu hören. Und als ich den Prozess schließlich abbrach, wurde mir klar, dass ich keine Möglichkeit hatte, neu zu starten, ohne bei Null zu beginnen.

## Identifizierung der Engpässe

Mir wurde klar, dass das „Verarbeiten eines Bildes“ keine einzelne atomare Aktion ist. Es handelt sich tatsächlich um eine Reihe sehr unterschiedlicher Vorgänge, von denen jeder seinen eigenen spezifischen Engpass hat:

- **Scannen:** Schnell, aber festplattengebunden (suchend). - **Laden:** Extrem IO-lastig (sequentielle Lesevorgänge). - **Dekodierung:** CPU-lastig, variable Zeit (JPEGs sind chaotisch). - **Hashing:** Reine Mathematik, CPU-gebunden.

Indem ich diese in einer einzigen Sequenz ausführte, zwang ich meine schnelle CPU, auf die langsame Festplatte zu warten, und zwang dann die inaktive Festplatte, auf die ausgelastete CPU zu warten. Es war das Schlimmste aus beiden Welten.

---

## Denken in Pipelines

Ich habe die einzelne Schleife verworfen und das System als **Pipeline** neu gestaltet. Anstatt dass ein Arbeiter alles erledigt, stellte ich mir eine Fabriklinie vor.

Ein **Scanner**-Thread läuft voran, findet Dateien und wirft Pfade in eine Warteschlange. Ein Pool von **Ladern** greift nach Pfaden, ruft die Daten von der Festplatte ab und übergibt die Rohpuffer an einen Pool von **Dekodierern**. Schließlich führen die **Hasher** die Berechnung durch und senden die Ergebnisse an die Benutzeroberfläche.

Dieser Ansatz – Produzenten-Konsumenten-Warteschlangen, die einzelne Phasen verbinden – löste das Problem der Reaktionsfähigkeit sofort. Wenn die Festplatte langsam ist, pausieren die Hasher einfach. Wenn die CPU überlastet ist, warten die Scanner. Das System gleicht sich auf natürliche Weise aus.

## Warum Strukturierung wichtig ist

Es ist verlockend, „nur Threads zu verwenden“ („std::async“ ist genau das Richtige!), aber rohes Threading führt schnell zu einem Wirrwarr aus Mutexes und Race Conditions.

Durch die Durchsetzung einer strikten Pipeline-Struktur habe ich nicht nur Leistung erzielt. Ich bin **vernünftig**. Jede Stufe hat einen einzelnen Eingang und einen einzelnen Ausgang. Ich kann die „Decoder“-Stufe isoliert testen, ohne ein gültiges Festplattensystem zu benötigen. Ich kann den „Scanner“ gegen einen Testkabelbaum austauschen.

Die Architektur wurde festgelegt. Jetzt musste ich es nur noch in Qt implementieren, ohne mir selbst ins Bein zu schießen.
