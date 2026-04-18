---
id: labyrinth1
title: "🌀 Building a Living Labyrinth"
seoTitle: "Building a Living Labyrinth: Procedural Mazes in Unity"
date: "2025-10-27"
category: "Game Dev"
summary: "Exploring procedural maze generation inspired by Verrückte Labyrinth and turning board game mechanics into a Unity project."
project: "Labyrinth"
tags: ["Unity", "C#", "Procedural Generation", "Game Design"]
status: "published"
isAutoTranslated: false
---

Last night, I was playing *Verrückte Labyrinth* (also known as *The aMAZEing Labyrinth*) with my daughter. As we slid tiles around the board and watched new paths appear, I couldn't stop thinking — this mechanic would be perfect for exploring procedural generation and tile-based systems in Unity.

So, I've decided to turn that spark into a small side project (and blog series): **Building a Living Labyrinth** — a digital take on the board game's ideas, built from the ground up with code, randomness, and a touch of design philosophy.

## 🎯 Project Goal

At its heart, *Verrückte Labyrinth* is about structure and change. The maze exists as a grid of tiles, but every turn the shape of that maze can shift — entire rows move, new passages open, and others close. That mix of stability and chaos makes it a rich playground for procedural design.

My goal for this series: **Create a Unity prototype** that procedurally generates and manipulates a tile-based labyrinth — inspired by the board game's mechanics — and use it as a teaching tool for procedural generation.

## 🧱 The Core Idea: Tiles and Connectivity

The first concept to tackle is the tile system. Each tile in the game has a set of connections — pathways that can connect to other tiles. In the physical game, there are three archetypes:

- **Straight Tile** — connects two opposite edges (│ or ─)
- **Corner Tile** — connects two adjacent edges (┐, └, etc.)
- **T-Junction Tile** — connects three edges (├, ┬, etc.)

Each tile's rotation determines how it fits into the labyrinth. So rather than hardcoding orientations, I'll represent tiles by the sides they connect to:

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

// Example: a corner connecting Up and Right
TileConnection.Up | TileConnection.Right
```

This gives us a flexible, data-driven system — we can rotate, check connections, or even generate new tile types procedurally later.

## ♻️ The Grid and the "Spare" Tile

The game board is a square grid — typically 7×7 — with an extra tile off to the side. Here's the fun part: that "spare" tile can be inserted into any movable row or column, pushing the others forward and ejecting a tile on the opposite side.

That mechanic turns the maze into a living system — part grid, part queue — where some tiles are fixed in place, and others shift dynamically each turn.

## ⚙️ What I'll Build First

- **Tile representation:** Create prefabs or scriptable objects for each tile type.
- **Grid management:** Build a simple GridManager to store tile states and positions.
- **Manual shifting:** Let a player click to push tiles and animate the change.

That's enough to recreate the feeling of the physical labyrinth. Once that's working, I can start introducing procedural level generation — randomizing layouts while maintaining valid paths.

## 🧭 Looking Ahead

Here's a rough roadmap for where I'd like to take this project:

| Phase | Focus | Description |
|-------|-------|-------------|
| 1 | Tile System | Represent and visualize tiles with rotation and connections |
| 2 | Grid Logic | Implement the shifting row/column mechanic |
| 3 | Procedural Generation | Randomly generate valid labyrinths |
| 4 | Pathfinding | Let a player (or AI) navigate the dynamic maze |
| 5 | Extensions | New maze rules, animations, and maybe an online demo |

## ✨ Why This Matters

What excites me about *Verrückte Labyrinth* as a programming project is that it blends data structures, procedural generation, and player interaction. It's simple enough to code in a weekend, but deep enough to study for months.

## 🧠 Next Time

In the next post, I'll dive into the tile system itself — setting up the data model and rendering tiles dynamically in Unity. We'll start with a simple grid of randomly oriented tiles, and by the end of it, you'll be able to visualize the bones of your own living labyrinth.

Stay tuned — and if you have ideas for features or ways to visualize the shifting mechanic, I'd love to hear them!
