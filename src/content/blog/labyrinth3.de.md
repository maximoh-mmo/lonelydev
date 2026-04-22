---
id: "labyrinth3"
title: "🌀 Das Labyrinth verschiebt sich!"
seoTitle: "Animieren der Verschiebung eines Kachelrasters in Unity"
date: "2025-10-28"
category: "Spieleentwicklung"
summary: "Animation von Kachelbewegungen und Rasterverschiebungen in Unity – das Labyrinth mit flüssigen Übergängen und interaktiven Mechaniken zum Leben erwecken."
project: "Labyrinth"
tags: ["Unity", "C#", "Animation", "Coroutines"]
status: "published"
isAutoTranslated: true
---
---

Letztes Mal haben wir die Grundlagen für unsere digitale Version von *The Crazy Labyrinth* gelegt – wir haben das Konzept eines Rasters, von Spielfeldern und eines zusätzlichen Spielfelds entwickelt, das in das Labyrinth geschoben werden kann, um dessen Anordnung zu verändern.

Diese Woche setzen wir dieses Konzept in die Tat um. Wir haben nun ein funktionierendes Labyrinth-Raster in Unity, komplett mit Kachelbewegung, Rasterverschiebung und einem einfachen Eingabesystem zur Steuerung.

## 🎯 Das Ziel dieser Phase

Unsere Ziele für diesen Schritt waren:

- Erzeuge ein Raster aus zufälligen Kacheltypen (gerade, gebogen oder T-Kreuzung)
- Behalte den Überblick über die Ersatzkachel (die „überzählige“ Kachel, die hineingeschoben wird)
- Erlaube das Einfügen der Ersatzkachel von jeder gültigen Seite des Rasters
- Lass die eingefügte Kachel eine Reihe oder Spalte „verschieben“ und dabei die gegenüberliegende Kachel herausdrücken
- Animieren Sie die Kachelbewegung, um das sich verschiebende Labyrinth visuell darzustellen
- Richte grundlegende Tastaturbefehle für das Verschieben ein (W, A, S, D)

Es ist ein Mechanismus, der auf den ersten Blick einfach wirkt, aber er bildet die Grundlage für das gesamte Labyrinth-Gameplay.

## 🧩 Aufbau des Systems

Das Herzstück des Projekts ist die Komponente `LabyrinthGrid`, die ein 2D-Array aus `Tile`-Objekten und der Ersatzkachel verwaltet und über die Logik verfügt, diese auf dem Spielfeld einzufügen und zu verschieben.

Außerdem haben wir eine schlanke Struktur `GridPosition` eingeführt, um Koordinaten darzustellen:

```csharp
public struct GridPosition : IEquatable<GridPosition>
{
    private readonly int _x;
    private readonly int _y;
    public int X => _x;
    public int Y => _y;

    public static readonly GridPosition Invalid = new GridPosition(-1, -1);

    public static GridPosition operator +(GridPosition a, GridPosition b) =>
        new GridPosition(a._x + b._x, a._y + b._y);
}
```

## 🧭 Eingabe und Bewegung

Für die Spielersteuerung nutzen wir direkt das Eingabesystem von Unity:

```csharp
_shiftUp = new InputAction("Shift Up");
_shiftUp.AddBinding("<Keyboard>/W");
_shiftUp.Enable();
```

Wenn eine dieser Tasten gedrückt wird, setzen wir die Ersatzkachel in die entsprechende Kante ein:

```csharp
if (_shiftUp.WasPerformedThisFrame())
    InsertTile(new GridPosition(3, 0));
```

## 🔄 Das Raster verschieben

Wenn wir eine Kachel einfügen, legen wir fest, in welche Richtung die Verschiebung erfolgen soll, und führen die Array-Bearbeitung durch:

```csharp
private Tile ShiftRowRight(int row)
{
    var ejected = _tiles[gridSize - 1, row];
    for (var x = gridSize - 1; x > 0; x--)
        _tiles[x, row] = _tiles[x - 1, row];
    _tiles[0, row] = _spareTile;
    return ejected;
}
```

Dieses Muster gilt für alle Richtungen: Dabei wird der Stein in der entgegengesetzten Richtung entfernt und der Ersatzstein aktualisiert. Um zu verhindern, dass der letzte Zug rückgängig gemacht wird, verfolgen wir den vorherigen Einfügungszug und lassen keine Umkehrungen zu.

## 🌀 Visuelle Bewegung mit Animation

We animate every tile when the labyrinth shifts, so it looks fluid and satisfying. Instead of running dozens of separate coroutines, we batch the updates into one smooth animation coroutine:

```csharp
private IEnumerator AnimateAllTiles(float duration = 0.5f)
{
    var startPositions = new Dictionary<Tile, Vector3>();
    var targetPositions = new Dictionary<Tile, Vector3>();

    for (var x = 0; x < gridSize; x++)
        for (var y = 0; y < gridSize; y++)
            if (_tiles[x, y])
            {
                startPositions[_tiles[x, y]] = _tiles[x, y].transform.position;
                targetPositions[_tiles[x, y]] = new Vector3(x - _offset, y - _offset, 0);
            }

    float elapsed = 0f;
    while (elapsed < duration)
    {
        float t = elapsed / duration;
        foreach (var kvp in startPositions)
            kvp.Key.transform.position = Vector3.Lerp(kvp.Value, targetPositions[kvp.Key], t);
        elapsed += Time.deltaTime;
        yield return null;
    }

    foreach (var kvp in targetPositions)
        kvp.Key.transform.position = kvp.Value;
}
```

## 🧱 Quality of Life Additions

Unity's `[ContextMenu]` allows triggering functions from the Inspector — no runtime code required:

```csharp
[ContextMenu("Rebuild Grid")]
private void InitializeGrid() { ... }
```

## 🧩 The Result

At this stage, the labyrinth:

- Randomly generates a full grid of tiles
- Has a spare tile ready for insertion
- Responds to keyboard input (W, A, S, D)
- Smoothly shifts tiles with animation
- Prevents illegal reverse insertions

## 🔮 Next Steps

In the next phase, we'll focus on:

- Introducing fixed tiles (corners)
- Adding visual insertion indicators (clickable entry points)
- Tracking paths and connectivity between tiles

Once these pieces are in place, we can add player tokens and objectives, transforming this demo into a playable Labyrinth game.
