---
id: achi2
title: "🎨 Pre-Attentive Colorblind UX, 4-Color Palettes & Cross-GPU 2D Vector Anti-Aliasing"
seoTitle: "Pre Attentive Colorblind UX 4 Color Palettes and Cross GPU 2D Vector Anti Aliasing"
date: "2026-12-14"
category: "Game Dev"
summary: "Combines pre-attentive Circle vs. Rounded Square silhouette design and Okabe-Ito colorblind-safe 4-color palettes with concentric convex polygon rendering, CPU-feathered anti-aliasing for mobile GPUs, and a 1:1 coordinate specification."
project: "Achi"
tags: ["Godot 4", "2D Rendering", "Accessibility", "Colorblind UX", "Vector Graphics", "Cross-Platform"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction

Abstract strategy games live or die on instant visual clarity. When designing **Achi** for phones, tablets, browsers, and desktops, I set a strict creative constraint: **every piece of the board and UI must render dynamically from a swappable 4-color semantic palette (`color_bg`, `color_structure`, `color_p1`, `color_p2`)**—while remaining 100% readable for players with protanopia, deuteranopia, tritanopia, or complete achromatopsia.

Meeting that bar in Godot 4's `gl_compatibility` renderer required solving both a visual perception problem and three subtle cross-GPU rendering traps.

---

## 1. Pre-Attentive Silhouette Asymmetry & Okabe-Ito Palettes

Early tests used two circular tokens differentiated by color and inner ring patterns. Even when the patterns were distinct, identical outer silhouettes forced players' eyes to scan *inside* each token to tell sides apart.

The breakthrough was shifting the distinction to **pre-attentive outer contour geometry** inside `BoardView.draw_token_shape()`:
* **Player 1:** A **Circle (`●`)** with a concentric hollow ring.
* **Player 2 / Opponent:** A **Rounded Square (`■`)** whose corner radius was tightened from `0.34` down to **`0.22` of half-width**—giving it crisp 78% straight edges that never blur into a circle at small HUD sizes.

Alongside distinct silhouettes, I calibrated the default palettes using **Okabe-Ito-inspired primary contrast** so only the dedicated monochrome accessibility preset (`base_greyscale`) uses shades of grey:

| Base Palette | Canvas (`color_bg`) | Grid (`color_structure`) | Player 1 (`color_p1` ●) | Player 2 (`color_p2` ■) |
| :--- | :--- | :--- | :--- | :--- |
| **`base_light`** | `#F5F3EF` Alabaster | `#1E2229` Slate Ink | `#2563EB` Royal Azure | `#E05A2B` Vermilion Amber |
| **`base_dark`** | `#16181D` Obsidian | `#E4E7EC` Soft Chalk | `#3B9EFF` Sky Azure | `#FF8A3D` Sunset Amber |
| **`base_high_contrast`** | `#000000` Pitch Black | `#FFFFFF` Pure White | `#FFE600` Beacon Yellow | `#00E5FF` Sky Cyan |
| **`base_greyscale`** | `#E2E2E2` Silver Paper | `#141414` Carbon | `#2E2E2E` Dark Graphite | `#8A8A8A` Mid Pewter |

To keep palette switching tactile rather than jarring, `PaletteManager` interpolates `active_palette` smoothly via `AchiPalette.lerp_to()` over `0.28s` using a cubic ease-out tween—updating the viewport clear color and broadcasting `palette_changed` frame by frame.

![Achi Colorblind-Safe 4-Color Semantic Palettes and Silhouette Asymmetry](/images/achi/achi-palettes-comparison.svg)

---

## 2. Solving Three Cross-GPU 2D Vector Rendering Traps

Auditing procedural vector rendering across OpenGL ES 3.0 mobile GPUs, WebGL2 browser tabs, and desktop drivers exposed three rendering defects that needed architectural fixes.

### Trap 1: Thick `draw_polyline()` Corner Miter Artifacts
Originally, the inner ring of Player 2's Rounded Square token (`■`) was drawn as a thick stroked `draw_polyline()` path. On small `8px` tokens in the HUD reserve strip, Godot's CPU polyline triangulator produces overlapping inner miter artifacts whenever the stroke width approaches the corner radius.

**Fix:** Replaced thick stroked polylines with **concentric filled convex polygons** (`draw_colored_polygon`) stacked back-to-front: outer structure polygon → inner `color_p2` polygon → inner `color_bg` cutout polygon → center `color_p2` core polygon. Convex triangle fans never self-intersect at any scale.

### Trap 2: Jagged Polygon Silhouettes When Mobile Drivers Ignore MSAA
In Godot 4's `gl_compatibility` renderer, `draw_line(..., antialiased=true)` and `draw_arc(..., antialiased=true)` generate a feathered alpha-gradient triangle strip on the CPU, producing smooth edges on every GPU. However, **`draw_circle()` and `draw_colored_polygon()` expose no `antialiased` parameter**, and many mobile tile-based GPUs and WebGL2 contexts ignore 2D framebuffer MSAA.

**Fix:** Alongside enabling `msaa_2d=2` in `project.godot`, I paired every filled circle and rounded-square polygon in `BoardView.draw_token_shape()` with a **`1.25px` CPU-feathered `draw_arc(..., true)` / `draw_polyline(..., true)`** along its exact outer perimeter—delivering razor-sharp anti-aliasing even with zero hardware MSAA support.

### Trap 3: Asymmetric Portrait vs. Landscape Viewport Scaling
Initially, `project.godot` used a portrait logical viewport (`540 × 920`) with `stretch/mode="canvas_items"` and `stretch/aspect="expand"`. Rotating a phone 90° into Landscape (`920 × 540`) shifted Godot's scale factor from `min(540/540, 920/920) = 1.0` down to `min(920/540, 540/920) = 0.587`—shrinking every font and button by 41%.

**Fix:** Locked the logical base viewport in `project.godot` to a **symmetric square (`640 × 640`)** while retaining desktop window overrides (`540 × 920`). Because `min(W / 640, H / 640)` is mathematically invariant when `W` and `H` swap, rotating 90° keeps typography and controls identical across Portrait stacks and Landscape two-column splits.

---

## 3. Locking Proportional Geometry & the 14% Cushion Margin

To support dynamic resizing and future custom artwork packs without distortion, all board geometry derives proportionally from a strict `1:1` square bounding box (`side = min(width, height)`):

| Element | Code Formula | Fraction of `side` | Size on `1024 × 1024` Canvas |
| :--- | :--- | :---: | :--- |
| **Outer Margin** | `side * 0.14` | `14.0%` | `143 px` cushion on each edge |
| **Active Grid Span** | `side - padding * 2.0` | `72.0%` | `738 × 738 px` centered grid |
| **Token Radius ($R$)** | `side * 0.088` | `8.8%` | `90 px` radius (`180 px` diameter) |
| **Empty Node Ring** | `side * 0.032` | `3.2%` | `33 px` radius |
| **Base Line Width** | `maxf(3.0, side * 0.015)` | `1.5%` | `15 px` stroke width |

Every node and token is anchored at its exact geometric center (`(0.140, 0.500, 0.860)` normalized UVs). Even when a corner token pulses upward by `1.12×` on hover or selection (`R = 101 px` around anchor `(143, 143)`), the `14%` outer margin guarantees **`42 px` of clearance** before the canvas border—so tokens and glows never clip.

---

## Up Next: Zero-Asset Procedural Audio Synthesis

Visual silhouettes and 4-color palettes solve readability with `0 KB` of external sprite files. In **`achi3`**, we apply that exact same procedural philosophy to sound—synthesizing every wooden knock, token slide, and victory chord directly into 16-bit PCM buffers at startup.
