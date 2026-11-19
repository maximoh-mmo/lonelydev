---
id: website1
title: "🖥️ Designing for Recruiters: The X-Ray 'Player vs. System' Hero & Attention-Ordered Motion Choreography"
seoTitle: "Designing for Recruiters The X Ray Player vs System Hero and Attention Ordered Motion Choreography"
date: "2026-12-04"
category: "Software Engineering"
summary: "Redesigns maxheinze.com around an interactive 'Player View vs. System View' X-Ray hero overlay for Kyoto Conflict, evidence-led multiplayer authority diagrams, and a single-pass motion sequence engineered around recruiter attention order."
project: "Portfolio"
tags: ["React", "Portfolio Design", "UI Engineering", "SVG", "Motion Design", "Accessibility", "Unreal Engine"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction: Solving the Systems Programmer's Portfolio Paradox

When I explained in **`onset29`** why I pivoted away from a solo MMO, I pointed out a core dilemma every gameplay and multiplayer programmer faces: **the hardest engineering work we do is invisible in a screenshot.**

You can spend weeks fixing race conditions on a listen server, designing authority boundaries for a dedicated server, or building a cache-first multithreaded pipeline—and when a recruiter lands on your homepage, they see a game screenshot that tells them almost nothing about *which parts you built* or *how the system holds up under pressure*.

Over **28 commits** on `maximoh-mmo/lonelydev` (`eab02ff` through `02dea04`), I redesigned **maxheinze.com** from the ground up to close that gap—making backend architecture immediately inspectable without sacrificing visual polish.

---

## 1. The Interactive "Player View vs. System View" X-Ray Hero

Rather than opening the homepage with generic bio bullet points, the redesigned hero (`src/pages/Home.jsx`) leads with key art from **Kyoto Conflict**—our 13-person Unreal Engine online Capture the Flag FPS—and layers a toggleable **X-Ray System Overlay** (`src/components/KyotoHeroSystems.jsx`) directly on top of the frame.

At any moment, a visitor can switch between two views of the exact same feature:
* **Player View:** Shows the raw gameplay scene annotated with two concise engineering leader notes: *"Forward-base control updates spawn eligibility"* and *"The server owns every flag-state transition."*
* **System View:** Reveals a hand-crafted SVG recreation of our Unreal Blueprint graph (`PickupFlag`: `OnPickedUpEvent`, `OnRespawnEvent`, `OnFlagReturnedHome`, `Set Visibility`, and Wwise `PostEvent` calls) paired directly beside the authoritative C++ method `AKyotoPickupFlag::GivePickupTo()`—highlighting `SetFlagStatus(EKyotoFlagStatus::Held)`, `ServerRPC_SetHasFlag(true)`, and `DropFlagDelegate.BindUFunction`.

```text
+-------------------------------------------------------------------+
|  [ Player View ]  [ System View ]                                 |
|                                                                   |
|  1. Blueprint Graph (SVG)                                         |
|     OnPickedUpEvent ---> Set Visibility (false) ---> PostEvent    |
|                                                                   |
|  2. Server-Authoritative C++ (KyotoPickupFlag.cpp)                |
|     state->SetFlagStatus(EKyotoFlagStatus::Held);                 |
|     PlayerState->ServerRPC_SetHasFlag(true);                      |
|     FlagHolder->DropFlagDelegate.BindUFunction(this, "DropFlag"); |
+-------------------------------------------------------------------+
```

Instead of claiming *"I know Unreal C++ and replication,"* the first viewport puts **verified Blueprint execution flow, C++ RPC authority, and playable proof** side by side within five seconds of page load.

---

## 2. Evidence-Led Case Studies & Interactive Authority Boundaries

That same "show the architecture, not just the blurb" philosophy extends down the homepage and into dedicated project reading pages (`cd50432`, `dc2a410`, `c8de5ff`):

* **Kyoto Conflict Case Study (`CaseStudy.motion.css`):** Breaks down end-to-end Capture the Flag ownership with an animated **Capture Path** flow (`At base → Pickup → Carried → Capture → Score and reset`, plus the `Dropped → Returned` branch), a 3-column **Players → Listen-server host → Every client** authority split, and candid architectural tradeoffs (such as matching an external programmer's Blueprint-only workflow for compatibility over pure C++ purity).
* **Onset Authority Boundary Map (`Home.jsx`):** Renders a three-lane architecture map (*Gameplay path*, *AI & simulation*, *Online & data*) bounded above by the **Server-authoritative C++ core** and anchored below by **Dedicated Server (authoritative simulation & state)**. Hovering or focusing a lane illuminates the entire path from input to persistence.
* **PhotoBoss Pipeline Evidence:** Pairs the Dark Mode duplicate-review screenshot directly with the architectural proof note documenting how SQLite caching and `Direct-to-Size` decoding cut repeat 50,000-image scans from minutes down to seconds.

---

## 3. Attention-Ordered Motion Choreography

Too many developer portfolios scatter continuous floating cards, typewriter delays, and repeating shimmers across every element on screen. In [MOTION-DIRECTION.md](https://github.com/maximoh-mmo/lonelydev/blob/main/MOTION-DIRECTION.md), I enforced strict rules: **one dominant attention cue per viewport, zero scroll hijacking, and every animation settles once into a strong static design.**

Every millisecond of the hero sequence (`Home.motion.css`) follows a deliberate **Recruiter Attention Order** (*Role & Relevance → Claim → Action → Proof → Context*):

| Timestamp | Visual Cue | Attention Purpose |
| :---: | :--- | :--- |
| **`0.00s`** | Role kicker & full headline visible immediately | Zero hidden text on first paint |
| **`0.15s`** | Cyan accent draws under the final line of *"under pressure."* | Core engineering claim |
| **`0.55s`** | Background mark sweeps across *"gameplay, multiplayer, and tools"* | Role & relevance |
| **`0.85s`** | Primary CTA underline extends to full width (`1.3s` arrow nudge) | Primary action (Case Study) |
| **`1.05s – 1.40s`** | Proof border rules draw downward, then each ownership claim settles | Verified proof |
| **`1.60s – 1.95s`** | Image leader lines, dots, and context labels extend | Gameplay context |
| **`2.05s+`** | Blueprint wires trace and key C++ lines highlight in sequence | System architecture reveal |
| **`2.60s`** | Scroll cue nudges gently twice, then rests | Next chapter |

### Solving Multilingual Line-Wrap Precision with `getClientRects()`
Because the site is fully bilingual (**English** and **German**), the headline phrase *"under pressure."* / *"unter Druck bestehen."* wraps differently across desktop, tablet, and mobile widths. A naive `::after { width: 100% }` underline on a wrapped inline `<span>` stretches across the entire box width instead of matching the actual last line of text.

In `Home.jsx`, a `ResizeObserver` combined with `document.fonts.ready` reads `text.getClientRects()` and assigns `--echo-left` and `--echo-width` dynamically from the **last client rect**, guaranteeing the cyan accent underline snaps cleanly beneath the final rendered word in every language and viewport width.

### Resilience Under `prefers-reduced-motion` and No-JS
Sections below the fold use a single shared `IntersectionObserver` (`threshold: 0.16`, unobserving immediately after triggering once). Crucially, `.motion-ready` is only attached if JavaScript executes and `prefers-reduced-motion: reduce` is **not** active—ensuring zero invisible elements if JS fails, and presenting the completed static emphasis immediately for reduced-motion users.

---

## Next Up: Under the Hood of maxheinze.com

Designing the visual experience also surfaced three tricky front-end and build-pipeline problems: getting artifact-free outlined typography across Windows, Linux, and macOS; keeping 60+ bilingual blog posts fast to index; and preventing deep-link 404s on Cloudflare Pages. We break down those solutions in **`website2`**.
