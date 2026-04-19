---
id: photoboss6
title: "\U0001F449 Entwurf eines persistenten Hash-Caches mit SQLite"
seoTitle: Entwicklung eines persistenten SQLite-Hash-Caches in C++
date: '2026-01-21'
category: Software Engineering
summary: >-
  Aufbau einer erstklassigen Cache-Stufe mit SQLite: Identifizieren von Dateien,
  Speichern mehrerer Hash-Algorithmen und Rückführen der Ergebnisse in die
  Pipeline, um überflüssige Arbeitsschritte zu vermeiden.
project: PhotoBoss
tags:
  - C++
  - SQLite
  - Database Design
  - Schema Versioning
status: published
isAutoTranslated: true
---

Der Rechner wurde zwar immer schneller, hatte aber immer noch das Gedächtnis eines Goldfisches. Jedes Mal, wenn ich die App neu startete, musste sie alles über meine Fotobibliothek neu lernen. Es war an der Zeit, PhotoBoss ein dauerhaftes Gedächtnis zu verschaffen.

## Identität ohne Lesen

Die zentrale Herausforderung bei einem Cache ist das Vertrauen. Wenn ich die Datenbank frage: *„Kennst du den Hash für Photo.jpg?“*, und sie antwortet: *„Ja“*, muss ich mir zu 100 % sicher sein, dass sich `Photo.jpg` seit der Berechnung dieses Hashs nicht verändert hat.

Aber ich kann die Datei nicht lesen, um das zu überprüfen, denn genau das möchte ich ja vermeiden.

Die Lösung ist eine Proxy-Identität. Ich gehe davon aus, dass eine Datei unverändert ist, wenn drei Werte konstant bleiben:

1.  **Absoluter Pfad** (Speicherort)
2.  **Größe in Byte** (Umfang)
3.  **Zeitpunkt der letzten Änderung** (Verlauf)

Ist es theoretisch möglich, eine Datei zu ändern, ohne dass sich ihre Größe und ihr Zeitstempel verändern? Ja. Ist es wahrscheinlich, dass das bei meinen Familienurlaubsfotos passiert? Nein.

---

## Das Schema

Das Entwerfen der Datenbank kam mir vor wie das Zusammensetzen eines Puzzles. Ich wollte keine einzige flache Tabelle. Ich wollte ein System, das mehrere Hash-Algorithmen (MD5, pHash, BlockMean) für dieselbe Datei verarbeiten kann.

Ich habe mich für eine normalisierte Struktur mit drei Tabellen entschieden:

-   **Dateitabelle:** Speichert den Pfad, die Größe und den Zugriffszeitstempel (MTime). Dies ist der „Schlüssel“.
-   **Methodentabelle:** Speichert den Namen des Algorithmus (z. B. „pHash“) und dessen *Version*.
-   **Hash-Tabelle:** Das Bindeglied. Sie verknüpft eine Datei mit einer Methode und speichert die Blob-Daten.

Diese Trennung ist sehr effektiv. Wenn ich meinen Code zur Berechnung der pHash-Werte aktualisiere, erhöhe ich einfach die Versionsnummer in der Methodentabelle. Die App erkennt die Versionsinkongruenz und berechnet automatisch die neuen Hash-Werte neu, während die MD5-Hash-Werte unverändert bleiben.

---

## Der Cache als Bestandteil der Pipeline

Das Beste an diesem Design? Der Cache ist kein separater Nebenprozess. Er ist einfach nur eine weitere Stufe in der Pipeline.

Die **CacheLookup**-Phase folgt direkt auf den Scanner. Sie überprüft die Datenbank. Wenn sie einen Treffer findet, sendet sie das Ergebnis direkt an die Benutzeroberfläche und umgeht dabei die ressourcenintensiven Phasen „Laden“ und „Hashing“ vollständig. Das kommt einem fast wie Schummeln vor.
