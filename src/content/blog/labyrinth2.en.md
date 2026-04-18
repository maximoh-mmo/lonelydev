---
id: labyrinth2
title: "🌀 Designing a Dynamic Maze Tile System"
seoTitle: "Designing a Dynamic Maze Tile System in Unity with C#"
date: "2025-10-27"
category: "Game Dev"
summary: "Creating the core tile types, rotations, and grid structure for a procedural Labyrinth in Unity."
project: "Labyrinth"
tags: ["Unity", "C#", "Procedural Generation", "Data Structures"]
status: "published"
isAutoTranslated: false
---

In the previous post, I introduced the idea of recreating *Verrückte Labyrinth* in Unity — a living, shifting maze that we can use to explore procedural generation.

Today, we start building it for real. Phase 1 is all about data and representation — defining what a tile is, how it connects to its neighbors, and making it appear in the scene as a small piece of a larger, living system.

## 🧩 What We're Building

- Three tile archetypes: Straight, Corner, and T-Junction
- Rotations that affect connectivity
- A simple grid of randomized tiles displayed in Unity

## Step 1 – Representing Tile Connections

The magic of the physical Labyrinth board is that each tile connects to others along its open paths. To capture that in code, we can use an enum with bit flags, one for each direction:

```csharp
[Flags]
public enum TileConnection
{
    None  = 0,
    Up    = 1 << 0,
    Right = 1 << 1,
    Down  = 1 << 2,
    Left  = 1 << 3
}
```

This lets us describe any tile shape compactly, for example:

```csharp
// A corner piece connecting Up and Right
TileConnection.Up | TileConnection.Right
```

It's efficient to test:

```csharp
bool connectsUp = (connections & TileConnection.Up) != 0;
```

## Step 2 – Rotating Tiles

Since each tile can be rotated 90° at a time, I wrote a simple helper to rotate the connection mask clockwise:

```csharp
public static class TileConnectionHelpers
{
    public static TileConnection Rotate(this TileConnection c)
    {
        TileConnection rotated = TileConnection.None;

        if (c.HasFlag(TileConnection.Up))    rotated |= TileConnection.Right;
        if (c.HasFlag(TileConnection.Right)) rotated |= TileConnection.Down;
        if (c.HasFlag(TileConnection.Down))  rotated |= TileConnection.Left;
        if (c.HasFlag(TileConnection.Left))  rotated |= TileConnection.Up;

        return rotated;
    }
}
```

Now every tile can easily adjust its connectivity when rotated in the scene.

## Step 3 – Defining Tile Types

Each type of tile (Straight, Corner, T-Junction) can be represented by a **ScriptableObject** that defines its base shape and visual prefab. This way we can tweak them in the editor instead of hardcoding data.

```csharp
[CreateAssetMenu(menuName = "Labyrinth/TileType")]
public class TileType : ScriptableObject
{
    public string displayName;
    public TileConnection baseConnections;
    public GameObject prefabVisualisation;
}
```

Example setup:
- Straight: `Up + Down`
- Corner: `Up + Right`
- T-Junction: `Up + Left + Right`

## Step 4 – Creating the Tile Instance

Each tile on the board is an instance of one of those TileTypes, with a rotation applied and a position in the grid:

```csharp
public class Tile : MonoBehaviour
{
    public TileType type;
    public int rotationSteps; // 0–3, each step = +90°

    public TileConnection Connections
    {
        get
        {
            TileConnection c = type.baseConnections;
            for (int i = 0; i < rotationSteps; i++)
                c = c.Rotate();
            return c;
        }
    }

    public void SetRotation(int steps)
    {
        rotationSteps = steps % 4;
        transform.rotation = Quaternion.Euler(0, 0, rotationSteps * 90);
    }
}
```

## Step 5 – Generating a Random Grid

To quickly test the system, a small script spawns a random layout:

```csharp
public class TileGridTest : MonoBehaviour
{
    public int gridSize = 7;
    public TileType[] tileTypes;
    private float _offset;

    void Start()
    {
        _offset = gridSize / 2f;
        InitGrid();
    }

    private void InitGrid()
    {
        for (int x = 0; x < gridSize; x++)
        {
            for (int y = 0; y < gridSize; y++)
            {
                TileType randomType = tileTypes[Random.Range(0, tileTypes.Length)];
                GameObject obj = Instantiate(randomType.prefabVisualisation);
                obj.transform.position = new Vector3(x - _offset, y - _offset, 0);
                Tile tile = obj.GetComponent<Tile>();
                tile.type = randomType;
                tile.SetRotation(Random.Range(0, 4));
            }
        }
    }
}
```

When you press Play, you should see a 7×7 grid of randomly oriented tiles — your first procedural labyrinth taking shape.

## Step 6 – Reflections and Next Steps

It's always satisfying to get that first visual confirmation that the system is working. Seeing the random grid appear in Unity makes it feel tangible.

Next time, I'll be focusing on Phase 2: the grid logic — adding the classic Verrückte Labyrinth mechanic of pushing rows, tracking the spare tile, and watching the maze shift dynamically.
