---
id: photoboss4
title: "📸 Bild-Hashing: Mehr als nur Prüfsummen"
seoTitle: >-
  Multithread-basiertes wahrnehmungsorientiertes und kryptografisches
  Bild-Hashing in C++
date: '2025-12-24'
category: Software Engineering
summary: >-
  Implementierung sowohl kryptografischer als auch wahrnehmungsbasierter
  Bild-Hashing-Verfahren, wobei E/A, Dekodierung und Berechnung zur
  Leistungsoptimierung in Pipeline-Stufen mit Worker-Pools aufgeteilt werden.
project: PhotoBoss
tags:
  - C++
  - Multithreading
  - Hashing
  - Cryptography
status: published
isAutoTranslated: true
---

Wenn man einem Programmierer von „Dateivergleich“ erzählt, denkt er instinktiv an MD5 oder SHA-256. Das ist ein Reflex.

Also habe ich genau das getan. Ich habe eine blitzschnelle Pipeline entwickelt, die für jede Datei in meiner Bibliothek SHA-256-Hashes berechnet. Ich war stolz darauf. Sie hat 100 GB an Fotos in wenigen Minuten verarbeitet.

Es war auch sinnlos.

## Die MD5-Falle

Schon ein einziger Bitwechsel verändert einen SHA-256-Hash vollständig. Das Öffnen einer JPEG-Datei und das erneute Speichern (selbst bei 100 % Qualität) verändert den Hash. Eine Größenänderung des Bildes um nur 1 Pixel verändert den Hash. Meine Bibliothek war voll von „Duplikaten“, die sich zwar auf Byte-Ebene unterschieden, optisch jedoch identisch waren.

---

## Einführung in Perceptual Hashing

Ich brauchte einen Hash, der sich wie ein menschliches Auge verhält. Wenn ich ein Bild einer Katze aus den Augenwinkeln betrachte und dann eine kleinere Version desselben Bildes aus den Augenwinkeln betrachte, sehen beide gleich aus.

Das führte mich in die Welt von **pHash** (Perceptual Hash) und **aHash** (Average Hash).

-   **aHash** unterteilt das Bild in ein 8×8-Raster aus Graustufenpixeln und vergleicht jedes Pixel mit der durchschnittlichen Helligkeit. Das Verfahren ist unglaublich schnell und eignet sich hervorragend zum Auffinden von Kopien mit geänderter Bildgröße.
-   **pHash** nutzt eine diskrete Kosinustransformation (DCT) – dieselbe mathematische Methode, die auch hinter der JPEG-Komprimierung steckt –, um die Niederfrequenzstruktur des Bildes zu erfassen. Es konzentriert sich eher auf die „Form“ des Bildes als auf die einzelnen Pixel.

---

## Die Kosten des Sehens

Der Haken daran? Die Berechnung eines pHash ist rechenintensiv. Man muss das gesamte Bild dekodieren, in Graustufen umwandeln und Matrixberechnungen durchführen.

Meine Pipeline lief nur noch im Schneckentempo. Der Scanner lieferte die Dateipfade zwar sofort, aber die „Hasher“-Phase kam aufgrund der hohen CPU-Auslastung ins Stocken.

Das zwang mich dazu, meinen Worker-Pool zu überdenken. Ich konnte nicht einfach nur einen einzigen „Hasher“-Thread verwenden. Ich brauchte eine ganze Schar davon. Ich habe die Pipeline so angepasst, dass der Worker-Pool dynamisch an die Anzahl der CPU-Kerne des Benutzers angepasst wird (abzüglich eines Kerns, damit die Benutzeroberfläche reaktionsschnell bleibt).

Es ist ein befriedigendes Gefühl, jetzt einen Blick auf den Task-Manager zu werfen: 100 % Auslastung auf allen Kernen, der Arbeitsspeicher wird mit Höchstgeschwindigkeit durchforstet.
