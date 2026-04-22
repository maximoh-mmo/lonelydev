---
id: "labyrinth4"
title: "🧠 Vom zufälligen Chaos zur strukturierten Erzeugung"
seoTitle: "Überarbeitung eines Unity-Labyrinth-Generators mit Constraint Architecture"
date: "2025-10-29"
category: "Spieleentwicklung"
summary: "Umgestaltung des Labyrinthgenerators zu einem modularen, regelbasierten System, das auf Einschränkungen aufbaut."
project: "Labyrinth"
tags: ["Unity", "C#", "Architecture", "Design Patterns"]
status: "published"
isAutoTranslated: true
---

Nach den Fortschritten in Phase 2, in der das Labyrinthgitter zunächst durch zufällige Kachelplatzierung und grundlegende Verbindungsprüfungen Gestalt annahm, verlagerte sich der Schwerpunkt dieser Phase auf Struktur, Erweiterbarkeit und Steuerung. Dabei ging es weniger um die visuelle Darstellung, sondern vielmehr darum, das System so zu gestalten, dass es robust, testbar und ausdrucksstark ist.

## 🧱 Die Grundlagen neu überdenken

Die frühere Implementierung lieferte schnell sichtbare Ergebnisse – sie konnte ein Raster mit vorgefertigten Kacheln füllen und durch Drehungen eine ungefähre Verbindung herstellen. Es stellte sich jedoch heraus, dass das zugrunde liegende Design zu starr war. Die Logik des Generators war in monolithischen Methoden verborgen, die `GameObjects` direkt instanziierten, was Experimente erschwerte.

> *„Hör auf, Kacheln zu erstellen; fang an, Regeln zu definieren.“*

## 🧩 Vorstellung des Constraint-Systems

Der erste große architektonische Wandel erfolgte mit der Einführung der Schnittstelle `ILabyrinthConstraint` – einer schlanken Abstraktion, die eine bei der Generierung angewandte Regel darstellt.

Anstatt die Logik für die Nachbarschaft fest zu programmieren, fragt der Generator nun eine Reihe von Einschränkungsobjekten ab, von denen jedes eine einzelne Validierungsregel implementiert:

```csharp
public interface ILabyrinthConstraint
{
    bool Validate(TileConnection[,] grid, int x, int y, TileType type, int rotation, TileConnection mask);
}
```

Das einfachste Beispiel ist die `ConnectionConstraint`, die sicherstellt, dass jede Kachel korrekt an den offenen Pfaden ihrer Nachbarn ausgerichtet ist:

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

Damit sind Nachbarschaftsprüfungen keine Sonderfälle mehr innerhalb des Generators – sie sind lediglich eine von vielen möglichen Einschränkungen.

Eine übersichtlichere API-Schicht

Eine zweite Verbesserung ergab sich durch die Einführung einer speziellen Schnittstelle – der `LabyrinthGeneratorAPI`.

Bisher musste man zur Erzeugung eines Labyrinths den Generator manuell erstellen, Einschränkungen hinzufügen und dessen Methoden direkt aufrufen. Die neue API fasst dies in einem einzigen, übersichtlichen Aufruf zusammen:

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

Dieses Muster – eine „Lightweight Factory“ auf Basis eines modularen Generators – bietet ein ausgewogenes Verhältnis zwischen Benutzerfreundlichkeit und Erweiterbarkeit.

## 🧠 Logische Generierung vor der physischen Instanziierung

Eine wichtige Erkenntnis in dieser Phase: Der Generator arbeitet nun zunächst mit einer abstrakten Datenstruktur aus `TileConnection`-Masken. Jede potenzielle Platzierung wird rein logisch überprüft – unter Anwendung von Einschränkungen, Drehungen und Nachbarschaftsprüfungen –, bevor GameObjects erzeugt werden:

```csharp
var (type, rotation, connectionMask) = PickValidTile(x, y, logicalGrid, tileTypes);
logicalGrid[x, y] = connectionMask;

var tile = spawnTile(type);
tile.type = type;
tile.name = $"{type.name}_{x}_{y}";
tile.SetRotation(rotation);
```

Dadurch werden die Overhead-Kosten drastisch reduziert, sodass der Generator ohne Leistungseinbußen auf größere Netzwerke oder komplexere Beschränkungssätze skaliert werden kann.

## 🎮 Integration in die Spielebene

Was das Gameplay betrifft, wurde das `LabyrinthGrid`-`MonoBehaviour` aktualisiert, um sich nahtlos in die Pipeline der neuen Generation zu integrieren. Es nutzt nun direkt die API, verwaltet die Mechanik der Ersatzkacheln und sorgt mit flüssigen, durch Coroutinen gesteuerten Animationen für die Verschiebung von Zeilen und Spalten.

Eine einfache Tastatursteuerung (W/A/S/D) löst die Rasterverschiebungen aus, und das System speichert nun frühere Bewegungen, um eine sofortige Umkehrung zu verhindern:

```csharp
if (_hasPreviousMove && entryPoint == GetOppositePosition(_lastInsertPos))
{
    Debug.LogWarning("Cannot reverse previous insertion directly!");
    return;
}
```

## 🪞 Gedanken zum Design

Phase 3 markiert einen deutlichen Übergang von prozeduraler Begeisterung hin zu bewusster Architektur.

**Früher → Heute:**

- **Früher:** Die Generierung war zufällig, reaktiv und schwer zu steuern. **Heute:** Die Generierung ist regelbasiert, modular und erweiterbar.
- **Früher:** Gameplay und Generierungslogik waren eng miteinander verflochten. **Heute:** Der Generator ist ein eigenständiges System, das in verschiedenen Spielkontexten eingesetzt werden kann.

Diese Phase legte auch den Grundstein für fortgeschrittenere Funktionen – dynamische Schwierigkeitsanpassung, thematische Kachelgruppierung oder sogar prozeduraler Levelaufbau. Indem alles auf Einschränkungen und Regeln ausgerichtet wurde, wird die zukünftige Erweiterung zu einer Frage der Gestaltung und nicht der Überarbeitung.
