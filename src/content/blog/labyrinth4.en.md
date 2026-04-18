---
id: labyrinth4
title: "🧠 From Random Chaos to Structured Generation"
seoTitle: "Refactoring a Unity Labyrinth Generator with Constraint Architecture"
date: "2025-10-29"
category: "Game Dev"
summary: "Refactoring the labyrinth generator into a modular, rule-driven system built on constraints."
project: "Labyrinth"
tags: ["Unity", "C#", "Architecture", "Design Patterns"]
status: "published"
isAutoTranslated: false
---

Following the progress in Phase 2, where the labyrinth grid first took shape through random tile placement and basic connection validation, the focus of this phase shifted toward structure, extensibility, and control. This was less about visual output, and more about engineering the system into something robust, testable, and expressive.

## 🧱 Reassessing the Foundation

The earlier implementation achieved visual results quickly — it could fill a grid with tile prefabs and apply rotations to approximate connectivity. However, it became clear that the underlying design was too rigid. The generator's logic was buried inside monolithic methods that directly instantiated `GameObjects`, which made experimentation difficult.

> *"Stop building tiles; start defining rules."*

## 🧩 Introducing the Constraint System

The first major architectural shift came with the introduction of the `ILabyrinthConstraint` interface — a lightweight abstraction that represents a rule applied during generation.

Instead of hardcoding adjacency logic, the generator now queries a set of constraint objects that each implement a single validation rule:

```csharp
public interface ILabyrinthConstraint
{
    bool Validate(TileConnection[,] grid, int x, int y, TileType type, int rotation, TileConnection mask);
}
```

The simplest example is the `ConnectionConstraint`, which ensures that each tile aligns correctly with its neighbors' open paths:

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

With this in place, adjacency checks are no longer special-case logic inside the generator — they're just one of many possible constraints.

## ⚙️ A Cleaner API Layer

A second improvement came with the introduction of a dedicated entry point — the `LabyrinthGeneratorAPI`.

Previously, generating a labyrinth required manually constructing the generator, adding constraints, and invoking its methods directly. The new API wraps this into a single clean call:

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

This pattern — lightweight factory on top of a modular generator — strikes a strong balance between ease of use and extensibility.

## 🧠 Logical Generation Before Physical Instantiation

A key insight this phase: the generator now first operates on an abstract data structure of `TileConnection` masks. Each potential placement is validated purely in logic — applying constraints, rotations, and adjacency checks — before any GameObjects are spawned:

```csharp
var (type, rotation, connectionMask) = PickValidTile(x, y, logicalGrid, tileTypes);
logicalGrid[x, y] = connectionMask;

var tile = spawnTile(type);
tile.type = type;
tile.name = $"{type.name}_{x}_{y}";
tile.SetRotation(rotation);
```

This dramatically reduces overhead, allowing the generator to scale up to larger grids or more complex constraint sets without performance issues.

## 🎮 Integration with the Gameplay Layer

On the gameplay side, the `LabyrinthGrid` `MonoBehaviour` was updated to integrate seamlessly with the new generation pipeline. It now uses the API directly, manages the spare tile mechanic, and handles shifting rows and columns with smooth coroutine-driven animation.

A simple keyboard control scheme (W/A/S/D) triggers the grid shifts, and the system now tracks previous moves to prevent immediate reversals:

```csharp
if (_hasPreviousMove && entryPoint == GetOppositePosition(_lastInsertPos))
{
    Debug.LogWarning("Cannot reverse previous insertion directly!");
    return;
}
```

## 🪞 Design Reflections

Phase 3 marks a clear evolution from procedural enthusiasm to intentional architecture.

**Before → Now:**

- **Before:** Generation was random, reactive, and hard to control. **Now:** Generation is rule-based, modular, and extensible.
- **Before:** Gameplay and generation logic were intertwined. **Now:** The generator is a self-contained system that can serve multiple gameplay contexts.

This phase also laid the foundation for more advanced features — dynamic difficulty adjustment, thematic tile grouping, or even procedural level progression. By framing everything around constraints and rules, future expansion becomes a matter of composition, not refactoring.
