---
id: labyrinth5
title: "🧠 Building a Real Constraint Solver for the Labyrinth"
seoTitle: "Building a Constraint Solver for Procedural Generation in Unity"
date: "2025-11-14"
category: "Game Dev"
summary: "Building a proper constraint-based reasoning system for the labyrinth generator — introducing a unified validation pipeline, tile feasibility evaluation, and the foundations of a real constraint solver."
project: "Labyrinth"
tags: ["Unity", "C#", "Constraint Solver", "Algorithms"]
status: "published"
isAutoTranslated: false
---

After several phases of visual output, shifting tiles, and gameplay mechanics, this week took a different turn. Instead of focusing on what the labyrinth *looks* like, the work shifted toward understanding how the generator *thinks*. This phase marked the beginning of a more deliberate approach to the problem — treating the Labyrinth as a **constraint satisfaction problem** rather than a random tile arranger.

The goal? To create a robust system that can evaluate whether a tile placement is valid under a growing collection of rules, and eventually allow the labyrinth to be generated with intent, structure, and even difficulty.

## 🎯 Why Constraint Satisfaction?

In Phase 3, the concept of modular constraints was introduced through the `ILabyrinthConstraint` interface. This was already a big improvement — adjacency checks, tile compatibility, and rotation validity were no longer hardcoded into the generator.

But adding more constraints made the cracks show. Random tile placement works fine for simple rules, but becomes brittle as soon as additional structure is required. Before long, you end up with placement failures that are impossible to debug or reproduce.

The solution was clear: move toward a proper constraint satisfaction model, where the generator evaluates **feasible candidates** rather than guessing until something fits.

---

## 🧩 Introducing the Constraint Context

One of the first architectural improvements was the introduction of a dedicated `ConstraintContext` — a lightweight struct that carries all the information a constraint needs to evaluate a tile placement.

```csharp
public readonly struct ConstraintContext
{
    public readonly TileConnection[,] grid;
    public readonly int x, y;
    public readonly TileType type;
    public readonly int rotation;
    public readonly TileConnection mask;

    public ConstraintContext(TileConnection[,] grid, int x, int y, TileType type, int rotation, TileConnection mask)
    {
        this.grid = grid;
        this.x = x;
        this.y = y;
        this.type = type;
        this.rotation = rotation;
        this.mask = mask;
    }
}
```

This change reduced method signatures dramatically and made constraint logic more consistent. Each rule now receives a single context object instead of multiple raw parameters, which makes adding new constraints far easier.

---

## ✔️ A Unified Validation Pipeline

Another major addition was the creation of a single pipeline responsible for evaluating all active constraints. Instead of each constraint being checked in ad-hoc places, the generator now flows everything through a clear, composable validator.

```csharp
public static bool ValidateAll(
    ConstraintContext ctx,
    IEnumerable<ILabyrinthConstraint> constraints,
    out List<ILabyrinthConstraint> failed)
{
    failed = new List<ILabyrinthConstraint>();

    foreach (var c in constraints)
    {
        if (!c.Validate(ctx))
            failed.Add(c);
    }

    return failed.Count == 0;
}
```

The generator can now not only determine whether a placement is valid, but also **which constraints failed**. This is invaluable for debugging, tweaking rules, or building editor tools later on.

## 🔍 Evaluating Candidate Tiles

With the validation pipeline in place, the next step was to evaluate *all* possible combinations of tile types and rotations — selecting from only the candidates that satisfy all constraints.

```csharp
var candidates = new List<(TileType, int, TileConnection)>();

foreach (var type in tileTypes)
{
    for (int rot = 0; rot < 4; rot++)
    {
        var mask = type.baseConnections.Rotate(rot);
        var ctx = new ConstraintContext(grid, x, y, type, rot, mask);

        if (ValidateAll(ctx, constraints, out _))
            candidates.Add((type, rot, mask));
    }
}
```

This effectively turns the generator into a simple constraint solver. Instead of hoping a tile fits, the system now understands *which* tiles fit and *why*.

---

## 🧠 Design Reflections

Phase 4 represents a fundamental shift in how the labyrinth is built. The early stages were about rapid prototyping, visual feedback, and getting tiles on the board. This phase marks the transition from procedural enthusiasm to **intentional architecture**.

-   **Before:** Generation was random, reactive, and hard to control.
-   **Now:** Generation is rule-based, modular, and extensible.

The labyrinth finally has a brain — next, we’ll teach it style.
