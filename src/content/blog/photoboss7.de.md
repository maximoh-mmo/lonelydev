---
id: photoboss7
title: "\U0001F4F8 Kurzschlussarbeit: Einführung eines persistenten Hash-Caches"
seoTitle: Persistentes Hash-Caching mit SQLite zur Pipeline-Optimierung
date: '2026-01-27'
category: Software Engineering
summary: >-
  Hinzufügung eines versionierten, persistenten Hash-Caches, um eine
  Neuberechnung teurer Wahrnehmungshashes zu vermeiden. Dieser Eintrag behandelt
  Dateiidentität, Cache-First-Pipeline-Design, SQLite-Persistenz und wie die
  Behandlung von zwischengespeicherten Ergebnissen als erstklassige
  Pipeline-Ausgaben unnötige Arbeit dramatisch reduziert.
project: PhotoBoss
tags:
  - C++
  - SQLite
  - Optimization
  - Caching
  - Systems Design
status: published
isAutoTranslated: true
---

In meinem letzten Beitrag habe ich das Schema für meinen Cache entworfen. Jetzt war es Zeit, es zu verkabeln.

## Die Umsetzung

Das Problem der "Identität" war die erste Hürde. Ich brauchte eine Möglichkeit, eine Akte zu fingerabdrücken, ohne sie zu lesen. Ich entschied mich für eine zusammengesetzte Tonart:

```cpp
// Any change to these fields invalidates cached hashes
struct FileIdentity {
    QString path;
    quint64 sizeBytes;
    quint64 modifiedTime;
};
```

Ist es theoretisch möglich, eine Datei zu verändern, während Größe und Zeitstempel exakt gleich bleiben? Ja. Ist es wahrscheinlich, dass es bei meinen Familienurlaubsfotos passiert? Nein.

Für die Datenbank selbst brauchte ich ein Schema, das mehrere Hash-Algorithmen pro Datei verarbeiten kann. Ich habe einen normalisierten Ansatz verwendet:

```sql
-- Files table (The Identity)
CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    mtime_unix INTEGER NOT NULL,
    UNIQUE(path, size_bytes, mtime_unix)
);

-- Hashes table (The Expensive Work)
CREATE TABLE hashes (
    file_id INTEGER NOT NULL,
    hash_method_id INTEGER NOT NULL,
    value BLOB NOT NULL,
    PRIMARY KEY (file_id, hash_method_id)
);
```

Hier hat sich die Pipeline-Architektur, für die ich in Teil 2 gekämpft habe, wirklich ausgezahlt. Wenn ich eine Spaghetti-Code-Schleife geschrieben hätte, wäre das Hinzufügen von Caching ein Albtraum von 'if'-Anweisungen gewesen.

Stattdessen habe ich einfach einen neuen Knoten im Diagramm eingefügt:

'Scanner --> CacheLookup'
'CacheLookup -->|Hit| ResultAggregation'
'CacheLookup -->|Miss| DiskLoader'

Der 'CacheLookup'-Worker nimmt einen Dateipfad, fragt SQLite ab und trifft eine Entscheidung. Wenn der Hash existiert, erzeugt er ein "Job erledigt"-Signal und sendet es direkt zur Ziellinie. Der Diskloader weiß nicht einmal, dass die Datei existiert.

---

## Der erste Lauf

Ich habe das SQLite-Backend implementiert, das WAL (Write-Ahead Logging) für die Parallelverarbeitung eingerichtet und das Ganze in Betrieb genommen.

**Lauf 1:** 45 Minuten. (Erwartet. Es musste alles von Grund auf hashen).

Dann kam der Moment der Wahrheit. Ich habe die App geschlossen. Wieder geöffnet. Und richtete es auf dieselben 50.000 Fotos.

**Lauf 2:** 4 Sekunden.

Ich musste tatsächlich laut lachen. Der Engpass hatte sich komplett von "JPEGs parsen" auf "Wie schnell kann SQLite Zeilen zurückgeben?" verschoben. (Antwort: sehr schnell).

## Laufzeitkonfiguration

Da ich die Hash-Methoden in der Datenbank versioniert hatte, konnte ich jetzt etwas Cooles machen: Ich fügte einen "Einstellungen"-Dialog hinzu, in dem ich einzelne Algorithmen ein- und ausschalten konnte.

Willst du MD5 nur für die Geschwindigkeit verwenden? Deaktivieren Sie "Perceptual Hash". Die Pipeline passt sich sofort an. Wieder aktivieren? Das System überprüft den Cache, sieht die fehlenden Werte für *diesen speziellen Algorithmus* und plant Jobs, die nur die fehlenden Daten berechnen.

Es fühlte sich an, als hätte ich das Biest endlich gezähmt. Die Infrastruktur war solide. Jetzt konnte ich mich endlich auf das eigentliche Ziel konzentrieren: die Duplikate zu finden.
