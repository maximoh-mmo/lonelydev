---
id: labyrinth3
title: "🌀 Making the Labyrinth Shift!"
seoTitle: "Animating Tile Grid Shifting in Unity"
date: "2025-10-28"
category: "Game Dev"
summary: "Animating tile movement and grid shifting in Unity — bringing the Labyrinth to life with smooth transitions and interactive mechanics."
project: "Labyrinth"
tags: ["Unity", "C#", "Animation", "Coroutines"]
status: "published"
isAutoTranslated: false
---

Last time, we laid the groundwork for our digital version of *The Crazy Labyrinth* — building the concept of a grid, tiles, and a spare tile that can slide into the maze to change its layout.

This week, we bring that concept to life. We now have a working Labyrinth grid in Unity, complete with tile movement, grid shifting, and a simple input system to control it.

## 🎯 The Goal for This Phase

Our objectives for this step were:

- Generate a grid of random tile types (Straight, Bend, or T-junction)
- Keep track of the spare tile (the "one out" tile that will be pushed in)
- Allow inserting the spare tile from any valid side of the grid
- Have the inserted tile "push" a row or column, ejecting the opposite tile
- Animate tile movement to visually represent the shifting labyrinth
- Set up basic keyboard controls for shifting (W, A, S, D)

It's a deceptively simple mechanic, but it's the foundation that the whole labyrinth gameplay sits on.

## 🧩 Structuring the System

The core of the project is the `LabyrinthGrid` component, managing a 2D array of `Tile` objects and the spare tile, along with logic to insert and shift them around the board.

We also introduced a lightweight `GridPosition` struct to represent coordinates:

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

## 🧭 Input and Movement

For player control, we're using Unity's Input System directly:

```csharp
_shiftUp = new InputAction("Shift Up");
_shiftUp.AddBinding("<Keyboard>/W");
_shiftUp.Enable();
```

When one of these is pressed, we insert the spare tile into the corresponding edge:

```csharp
if (_shiftUp.WasPerformedThisFrame())
    InsertTile(new GridPosition(3, 0));
```

## 🔄 Shifting the Grid

When we insert a tile, we determine which direction the shift should occur and perform the array manipulation:

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

This pattern applies for all directions, ejecting the opposite tile and updating the spare. To prevent undoing the last move, we track the previous insertion and disallow reversals.

## 🌀 Visual Movement with Animation

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
