---
id: photoboss7
title: "📸 Arbeitsabläufe verkürzen: Einführung eines persistenten Hash-Caches"
seoTitle: Persistentes Hash-Caching mit SQLite zur Optimierung der Pipeline
date: '2026-01-27'
category: Software Engineering
summary: >-
  Einführung eines versionierten, persistenten Hash-Caches, um die erneute
  Berechnung rechenintensiver Perzeptual-Hashes zu vermeiden. Dieser Beitrag
  behandelt die Dateidentität, das „Cache-First“-Pipeline-Design, die Persistenz
  in SQLite sowie die Frage, wie die Behandlung von zwischengespeicherten
  Ergebnissen als vollwertige Pipeline-Ausgaben unnötigen Aufwand drastisch
  reduziert.
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

In meinem letzten Beitrag habe ich das Schema für meinen Cache entworfen. Nun war es an der Zeit, ihn zu implementieren.

## Die Umsetzung

Das „Identitätsproblem“ war die erste Hürde. Ich musste einen Weg finden, eine Datei zu identifizieren, ohne sie zu lesen. Ich entschied mich für einen zusammengesetzten Schlüssel:

```cpp
// Any change to these fields invalidates cached hashes
struct FileIdentity {
    QString path;
    quint64 sizeBytes;
    quint64 modifiedTime;
};
```

Ist es theoretisch möglich, eine Datei zu ändern, ohne dass sich ihre Größe und ihr Zeitstempel verändern? Ja. Ist es wahrscheinlich, dass das bei meinen Familienurlaubsfotos passiert? Nein.

Für die Datenbank selbst benötigte ich ein Schema, das mehrere Hash-Algorithmen pro Datei verarbeiten konnte. Ich habe einen normalisierten Ansatz gewählt:

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

Hier hat sich die Pipeline-Architektur, für die ich mich in Teil 2 eingesetzt habe, wirklich ausgezahlt. Hätte ich eine Schleife mit Spaghetti-Code geschrieben, wäre das Hinzufügen von Caching ein Albtraum aus `if`-Anweisungen geworden.

Stattdessen habe ich einfach einen neuen Knoten in den Graphen eingefügt:

`Scanner --> CacheLookup`
`CacheLookup -->|Treffer| Ergebnisaggregation`
`CacheLookup -->|Fehltreffer| DiskLoader`

Der `CacheLookup`-Worker nimmt einen Dateipfad entgegen, fragt SQLite ab und trifft eine Entscheidung. Wenn der Hash vorhanden ist, erzeugt er ein „Job Done“-Signal und leitet es direkt an die Ziellinie weiter. Der Disk Loader erfährt nicht einmal, dass die Datei überhaupt existiert hat.

---

## Der erste Lauf

Ich habe das SQLite-Backend implementiert, das WAL (Write-Ahead Logging) für die Parallelverarbeitung eingerichtet und das Ganze in Betrieb genommen.

**Lauf 1:** 45 Minuten. (Wie erwartet. Es musste alles von Grund auf neu berechnen).

Dann kam der Moment der Wahrheit. Ich schloss die App. Öffnete sie erneut. Und wählte dieselben 50.000 Fotos aus.

**Lauf 2:** 4 Sekunden.

Ich musste tatsächlich laut lachen. Der Engpass hatte sich komplett von „JPEGs parsen“ zu „Wie schnell kann SQLite Zeilen zurückgeben?“ verlagert (Antwort: sehr schnell).

## Laufzeitkonfiguration

Da ich die Hash-Methoden in der Datenbank mit Versionsnummern versehen hatte, konnte ich nun etwas Tolles machen: Ich habe einen „Einstellungen“-Dialog hinzugefügt, in dem ich einzelne Algorithmen ein- und ausschalten kann.

Möchten Sie aus Gründen der Geschwindigkeit nur MD5 verwenden? Deaktivieren Sie „Perceptual Hash“. Die Pipeline passt sich sofort an. Möchten Sie die Funktion wieder aktivieren? Das System überprüft den Cache, erkennt die fehlenden Werte für *diesen bestimmten Algorithmus* und plant Jobs, um nur die fehlenden Daten zu berechnen.

Es fühlte sich an, als hätte ich das Biest endlich gezähmt. Die Infrastruktur war solide. Jetzt konnte ich mich endlich auf das eigentliche Ziel konzentrieren: die Duplikate zu finden.
