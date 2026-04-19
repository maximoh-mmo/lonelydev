---
id: labyrinth4
title: "🧠 Vom zufälligen Chaos zur strukturierten Generierung"
seoTitle: Refactoring eines Unity-Labyrinth-Generators mit Constraint-Architektur
date: '2025-10-29'
category: Game Dev
summary: >-
  Umgestaltung des Labyrinthgenerators in ein modulares, regelgesteuertes
  System, das auf Einschränkungen basiert.
project: Labyrinth
tags:
  - Unity
  - C#
  - Architecture
  - Design Patterns
status: published
isAutoTranslated: true
---
Nach den Fortschritten in Phase 2, in der das Labyrinthgitter zunächst durch zufällige Kachelplatzierung und grundlegende Verbindungsvalidierung Gestalt annahm, verlagerte sich der Schwerpunkt dieser Phase auf Struktur, Erweiterbarkeit und Kontrolle. Dabei ging es weniger um die visuelle Ausgabe als vielmehr darum, das System in etwas Robustes, Testbares und Ausdrucksstarkes zu verwandeln.

## 🧱 Neubewertung der Stiftung

Die frühere Implementierung erzielte schnell visuelle Ergebnisse – sie konnte ein Raster mit vorgefertigten Kacheln füllen und Drehungen anwenden, um die Konnektivität anzunähern. Es zeigte sich jedoch, dass das zugrunde liegende Design zu starr war. Die Logik des Generators war in monolithischen Methoden vergraben, die „GameObjects“ direkt instanziierten, was das Experimentieren erschwerte.

> *„Hören Sie auf, Kacheln zu bauen; beginnen Sie mit der Definition von Regeln.“*

## 🧩 Einführung des Constraint-Systems

Der erste große architektonische Wandel erfolgte mit der Einführung der Schnittstelle „ILabyrinthConstraint“ – einer einfachen Abstraktion, die eine bei der Generierung angewendete Regel darstellt.

Anstatt die Adjazenzlogik fest zu codieren, fragt der Generator jetzt eine Reihe von Einschränkungsobjekten ab, die jeweils eine einzelne Validierungsregel implementieren:

```csharp
public interface ILabyrinthConstraint
{
    bool Validate(TileConnection[,] grid, int x, int y, TileType type, int rotation, TileConnection mask);
}
```

Das einfachste Beispiel ist „ConnectionConstraint“, das sicherstellt, dass jede Kachel korrekt an den offenen Pfaden ihrer Nachbarn ausgerichtet ist:

```csharp
public class ConnectionConstraint : ILabyrinthConstraint
{
    public bool Validate(TileConnection[,] grid, int x, int y, TileType type, int rotation, TileConnection mask)
    {
        if (x > 0 && grid[x - 1, y] != 0)
        {
            var left = grid[x - 1, y];
            if (HasConnection(left, TileConnection.Right) != HasConnection(mask, TileConnection.Left))
                return false;
        }

        if (y > 0 && grid[x, y - 1] != 0)
        {
            var down = grid[x, y - 1];
            if (HasConnection(down, TileConnection.Up) != HasConnection(mask, TileConnection.Down))
                return false;
        }

        return true;
    }

    private static bool HasConnection(TileConnection mask, TileConnection dir)
        => (mask & dir) == dir;
}
```

Damit sind Adjazenzprüfungen keine Sonderfalllogik innerhalb des Generators mehr – sie sind nur eine von vielen möglichen Einschränkungen.

## ⚙️ Eine sauberere API-Ebene

Eine zweite Verbesserung kam mit der Einführung eines dedizierten Einstiegspunkts – der „LabyrinthGeneratorAPI“.

Bisher musste zum Generieren eines Labyrinths der Generator manuell erstellt, Einschränkungen hinzugefügt und seine Methoden direkt aufgerufen werden. Die neue API fasst dies in einen einzigen sauberen Aufruf zusammen:

```csharp
public static Tile[,] Generate(
    int gridSize,
    TileType[] tileTypes,
    Func<TileType, Tile> spawnTile,
    params ILabyrinthConstraint[] constraints)
{
    var generator = new LabyrinthGenerator(tileTypes, gridSize);
    foreach (var c in constraints) generator.AddConstraint(c);
    generator.AddConstraint(new Constraints.ConnectionConstraint());
    return generator.Generate(gridSize, tileTypes, spawnTile);
}
```

Dieses Muster – eine leichte Fabrik auf einem modularen Generator – schafft ein ausgewogenes Verhältnis zwischen Benutzerfreundlichkeit und Erweiterbarkeit.

## 🧠 Logische Generierung vor physischer Instanziierung

Eine wichtige Erkenntnis in dieser Phase: Der Generator arbeitet nun zunächst mit einer abstrakten Datenstruktur von „TileConnection“-Masken. Jede potenzielle Platzierung wird rein logisch validiert – unter Anwendung von Einschränkungen, Rotationen und Adjazenzprüfungen – bevor irgendwelche GameObjects erzeugt werden:

```csharp
var (type, rotation, connectionMask) = PickValidTile(x, y, logicalGrid, tileTypes);
logicalGrid[x, y] = connectionMask;

var tile = spawnTile(type);
tile.type = type;
tile.name = $"{type.name}_{x}_{y}";
tile.SetRotation(rotation);
```

Dadurch wird der Overhead drastisch reduziert, sodass der Generator ohne Leistungsprobleme auf größere Netze oder komplexere Randbedingungen skaliert werden kann.

## 🎮 Integration mit der Gameplay-Ebene

Auf der Gameplay-Seite wurde das „LabyrinthGrid“ „MonoBehaviour“ aktualisiert, um sich nahtlos in die Pipeline der neuen Generation zu integrieren. Es verwendet jetzt direkt die API, verwaltet die Ersatzkachelmechanik und verarbeitet das Verschieben von Zeilen und Spalten mit reibungsloser Coroutine-gesteuerter Animation.

Ein einfaches Tastatursteuerungsschema (W/A/S/D) löst die Rasterverschiebungen aus, und das System verfolgt nun vorherige Züge, um sofortige Umkehrungen zu verhindern:

```csharp
if (_hasPreviousMove && entryPoint == GetOppositePosition(_lastInsertPos))
{
    Debug.LogWarning("Cannot reverse previous insertion directly!");
    return;
}
```

## 🪞 Designreflexionen

Phase 3 markiert eine klare Entwicklung von der prozeduralen Begeisterung zur absichtlichen Architektur.

**Vorher → Jetzt:**

- **Vorher:** Die Erzeugung war zufällig, reaktiv und schwer zu kontrollieren. **Jetzt:** Die Generierung ist regelbasiert, modular und erweiterbar. - **Vorher:** Gameplay und Generierungslogik waren miteinander verflochten. **Jetzt:** Der Generator ist ein eigenständiges System, das mehrere Gameplay-Kontexte bedienen kann.

In dieser Phase wurde auch der Grundstein für erweiterte Funktionen gelegt – dynamische Schwierigkeitsanpassung, thematische Kachelgruppierung oder sogar prozeduraler Levelfortschritt. Indem alles auf Einschränkungen und Regeln ausgerichtet wird, wird die zukünftige Erweiterung zu einer Frage der Zusammensetzung und nicht der Umgestaltung.
