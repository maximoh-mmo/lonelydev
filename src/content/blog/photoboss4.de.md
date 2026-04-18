---
id: photoboss4
title: "\U0001F4F8 Hashing von Bildern: Mehr als nur Prüfsummen"
seoTitle: Multithread-perzeptuelles und kryptografisches Bild-Hashing in C++
date: '2025-12-24'
category: Software Engineering
summary: >-
  Implementierung von kryptografischem und wahrnehmungsbezogenem Bild-Hashing,
  Aufteilung von E/A, Dekodierung und Berechnung in Pipeline-Stufen mit
  Worker-Pools für mehr Leistung.
project: PhotoBoss
tags:
  - C++
  - Multithreading
  - Hashing
  - Cryptography
status: published
isAutoTranslated: true
---
Wenn Sie einem Programmierer „Dateivergleich“ sagen, greift er instinktiv nach MD5 oder SHA-256. Es ist ein Reflex.

Das habe ich also getan. Ich habe eine blitzschnelle Pipeline erstellt, die SHA-256-Hashes für jede Datei in meiner Bibliothek berechnet. Ich war stolz darauf. Es hat 100 GB Fotos in wenigen Minuten durchgekaut.

Es war auch nutzlos.

## Die MD5-Falle

Ein einzelner Bit-Flip verändert einen SHA-256-Hash vollständig. Das Öffnen einer JPEG-Datei und das erneute Speichern (auch bei 100 % Qualität) ändert den Hash. Wenn Sie die Größe eines Bildes um 1 Pixel ändern, ändert sich der Hash. Meine Bibliothek war voll von „Duplikaten“, die zwar bytespezifisch, aber optisch identisch waren.

---

## Geben Sie Perceptual Hashing ein

Ich brauchte einen Hash, der sich wie ein menschliches Auge verhält. Wenn ich auf ein Bild einer Katze blinzele und dann auf eine kleinere Version desselben Bildes blinzele, sehen sie gleich aus.

Dies führte mich in die Welt von **pHash** (Perceptual Hash) und **aHash** (Average Hash).

- **aHash** zerlegt das Bild in ein 8x8-Raster aus Graustufenpixeln und vergleicht jedes Pixel mit der durchschnittlichen Helligkeit. Es ist unglaublich schnell und eignet sich hervorragend zum Auffinden verkleinerter Kopien. - **pHash** verwendet eine diskrete Kosinustransformation (DCT) – die gleiche Mathematik wie bei der JPEG-Komprimierung – um die Niederfrequenzstruktur des Bildes zu erfassen. Es konzentriert sich eher auf die „Form“ des Bildes als auf die Pixel.

---

## Die Kosten des Sehens

Der Haken? Die Berechnung eines pHash ist teuer. Sie müssen das vollständige Bild dekodieren, in Graustufen konvertieren und eine Matrixberechnung durchführen.

Meine Pipeline verlangsamte sich auf ein Kriechtempo. Der Scanner lieferte sofort Dateipfade, aber die „Hasher“-Stufe verlangsamte die CPU-Auslastung.

Dies zwang mich dazu, meinen Arbeitskräftepool zu überdenken. Ich könnte nicht nur einen „Hasher“-Thread haben. Ich brauchte einen Schwarm davon. Ich habe die Pipeline aktualisiert, um den Worker-Pool basierend auf der CPU-Kernanzahl des Benutzers dynamisch zu skalieren (minus eins, damit die Benutzeroberfläche reagiert).

Jetzt ist der Blick auf den Task-Manager zufriedenstellend: 100 % Auslastung aller Kerne, Speicherdurchlauf mit maximaler Geschwindigkeit.
