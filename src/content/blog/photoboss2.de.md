---
id: photoboss2
title: "📸 Von der Idee zur Architektur: Entwurf einer skalierbaren Bildverarbeitungs-Pipeline"
seoTitle: Skalierbare Architektur für eine Bildverarbeitungs-Pipeline in C++
date: '2025-11-26'
category: Software Engineering
summary: >-
  Wie ich eine unübersichtliche Fotobibliothek als parallele Pipeline aus
  Scannen, Dekodieren, Hashing und Aggregation modelliert habe – und damit eine
  skalierbare und reaktionsschnelle Bildverarbeitung ermöglicht habe.
project: PhotoBoss
tags:
  - System Architecture
  - Pipeline Pattern
  - Scalability
status: published
isAutoTranslated: true
---

In meinem Kopf war die Logik ganz einfach. Alle Ordner durchgehen, jedes Bild laden, einen Hashwert berechnen und auf Duplikate prüfen. Ganz einfach, oder?

Ich habe den ersten Prototyp als einfache Schleife programmiert. Bei einem Testordner mit 100 Bildern funktionierte das hervorragend. Dann habe ich ihn auf meine Hauptbibliothek mit über 50.000 Fotos angewendet.

Die Benutzeroberfläche fror sofort ein. Das Lauten der Festplatte war sogar im Nebenzimmer zu hören. Und als ich den Prozess schließlich beendete, wurde mir klar, dass ich keinen Neustart durchführen konnte, ohne wieder ganz von vorne anzufangen.

## Engpässe erkennen

Mir wurde klar, dass die „Bildbearbeitung“ kein einzelner, isolierter Vorgang ist. Es handelt sich vielmehr um eine Abfolge sehr unterschiedlicher Schritte, von denen jeder seine eigenen spezifischen Engpässe aufweist:

-   **Scannen:** Schnell, aber festplattenabhängig (Suchvorgänge).
-   **Laden:** Extrem IO-intensiv (sequenzielle Lesevorgänge).
-   **Dekodieren:** CPU-intensiv, variable Dauer (JPEGs sind komplex).
-   **Hashing:** Reine Mathematik, CPU-abhängig.

Indem ich diese Vorgänge nacheinander ausführte, zwang ich meine schnelle CPU dazu, auf die langsame Festplatte zu warten, und zwang dann die untätige Festplatte dazu, auf die ausgelastete CPU zu warten. Das war das Schlimmste aus beiden Welten.

---

## Denken in Pipelines

Ich habe die einzelne Schleife verworfen und das System als **Pipeline** neu gestaltet. Anstatt dass ein einzelner Worker alles erledigt, habe ich mir eine Fertigungsstraße vorgestellt.

Ein **Scanner**-Thread läuft im Hintergrund, sucht nach Dateien und fügt die Pfade einer Warteschlange hinzu. Ein Pool von **Loadern** greift auf die Pfade zu, liest die Daten von der Festplatte und leitet die Rohpuffer an einen Pool von **Decodern** weiter. Schließlich führen die **Hashers** die Berechnungen durch und senden die Ergebnisse an die Benutzeroberfläche.

Dieser Ansatz – Produzenten-Verbraucher-Warteschlangen, die einzelne Phasen miteinander verbinden – löste das Problem der Reaktionsfähigkeit sofort. Ist die Festplatte langsam, halten die Hasher einfach inne. Ist die CPU ausgelastet, warten die Scanner. Das System gleicht sich auf natürliche Weise selbst aus.

## Warum Struktur wichtig ist

Es ist verlockend, „einfach Threads zu verwenden“ (`std::async` steht ja direkt zur Verfügung!), doch das direkte Arbeiten mit Threads führt schnell zu einem Wirrwarr aus Mutexen und Race Conditions.

Durch die Einführung einer strengen Pipeline-Struktur habe ich nicht nur an Leistung gewonnen, sondern auch **Übersichtlichkeit**. Jede Stufe hat einen einzigen Eingang und einen einzigen Ausgang. Ich kann die „Decoder“-Stufe isoliert testen, ohne ein funktionierendes Plattensystem zu benötigen. Ich kann den „Scanner“ gegen einen Test-Harness austauschen.

Die Architektur stand fest. Jetzt musste ich sie nur noch in Qt umsetzen, ohne mir dabei selbst ins Bein zu schießen.
