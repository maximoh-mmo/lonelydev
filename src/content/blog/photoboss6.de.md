---
id: photoboss6
title: "\U0001F4F8 Entwurf eines persistenten Hash-Caches mit SQLite"
seoTitle: Design eines SQLite-persistenten Hash-Caches in C++
date: '2026-01-21'
category: Software Engineering
summary: >-
  Erstellung einer erstklassigen Cache-Stufe mit SQLite: Dateie identifizieren,
  mehrere Hash-Algorithmen speichern und Ergebnisse wieder in die Pipeline
  einfügen, um redundante Arbeit zu überspringen.
project: PhotoBoss
tags:
  - C++
  - SQLite
  - Database Design
  - Schema Versioning
status: published
isAutoTranslated: true
---

Die Maschine wurde schneller, aber sie hatte immer noch ein Gedächtnis wie ein Goldfisch. Jedes Mal, wenn ich die App neu gestartet habe, musste sie alles über meine Fotobibliothek neu lernen. Es war Zeit, PhotoBoss ein dauerhaftes Gehirn zu geben.

## Identität ohne Lesen

Die zentrale Herausforderung eines Caches ist Vertrauen. Wenn ich die Datenbank frage *"Kennst du den Hash für Photo.jpg?" *, und es steht *"Ja", * Ich muss mir zu 100 % sicher sein, dass sich 'Photo.jpg' seit der Berechnung dieses Hashs nicht geändert hat.

Aber ich kann die Datei nicht lesen, um das zu überprüfen, weil ich genau das Lesen der Datei vermeiden möchte.

Die Lösung ist eine Proxy-Identität. Ich nehme an, eine Datei bleibt unverändert, wenn drei Werte konstant bleiben:

1. **Absoluter Pfad** (Ort)
2. **Größe in Bytes** (Magnitude)
3. **Letzte Modifizierte Zeit** (Geschichte)

Ist es theoretisch möglich, eine Datei zu verändern, während Größe und Zeitstempel exakt gleich bleiben? Ja. Ist es wahrscheinlich, dass es bei meinen Familienurlaubsfotos passiert? Nein.

---

## Das Schema

Die Gestaltung der Datenbank fühlte sich an, als würde man ein Puzzle zusammensetzen. Ich wollte keinen einzigen flachen Tisch. Ich wollte ein System, das mehrere Hash-Algorithmen (MD5, pHash, BlockMean) für dieselbe Datei verarbeiten kann.

Ich entschied mich für eine normalisierte 3-Tabellen-Struktur:

- **Dateitabelle:** Speichert Pfad, Größe und MTime. Das ist der "Schlüssel".
- **Methodentabelle:** Speichert den Namen des Algorithmus (z. B. "pHash") und seine *Version*.
- **Hashes Table:** Der Klebstoff. Es verknüpft eine Datei mit einer Methode und speichert die Blob-Daten.

Diese Trennung ist kraftvoll. Wenn ich meinen pHash-Berechnungscode aktualisiere, verschiebe ich einfach die Versionsnummer in der Methods-Tabelle. Die App erkennt die Versionsabweichung und berechnet automatisch die neuen Hashes neu, während die MD5-Hashes unverändert bleiben.

---

## Der Cache als Bestandteil der Pipeline

Das Beste an diesem Design? Der Cache ist kein Side-Car-Prozess. Es ist nur eine weitere Phase in der Pipeline.

Die **CacheLookup**-Phase liegt direkt nach dem Scanner. Es überprüft die Datenbank. Wenn es einen Treffer gibt, sendet er das Ergebnis direkt an die Benutzeroberfläche, wodurch die starken "Lade-" und "Hashing"-Phasen komplett umgangen werden. Es fühlt sich wie Betrug an.
