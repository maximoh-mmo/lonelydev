---
id: onset29
title: "🎬 Engineering Diary: MHAudio, Equipment Lifecycles, Automating UI via MCP — and Why I'm Pivoting Away from Onset"
seoTitle: "MHAudio Equipment Lifecycles Automating UI via MCP and Why I am Pivoting Away from Onset"
date: "2026-11-23"
category: "Game Dev"
summary: "Wraps up the Onset engineering arc with the provider-neutral MHAudio framework, an evergreen equipment durability and duplicate infusion economy, and 12 Widget Blueprints automated via Unreal MCP — followed by a candid retrospective on MMO scope creep and why I am pivoting toward focused, visually tangible projects."
project: "Onset"
tags: ["Unreal Engine", "C++", "Audio Architecture", "Game Economy", "CommonUI", "MCP", "Project Retrospective"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction

After completing Onset's authoring suite, Academy hub, and live viewport combat balancers in **Post 28**, I pushed one final sprint of foundational systems on **October 25, 2026** across 7 commits (`6938836` through `4c3df24`):

* **`MHAudio` Framework Plugin (`6938836`):** A provider-neutral audio abstraction decoupling gameplay, abilities, doors, and animation montages from concrete audio backends.
* **Equipment Lifecycle & Economy (`5e2f876`):** Dual quality grade rolls (`Grade D` through `Grade S`), non-destructive durability degradation, material salvaging, and duplicate item infusion.
* **Tactical HUD & Automated Widget Blueprints (`2fd0ee4`..`4c3df24`):** 9 C++ `CommonUI` widget controllers, Python-generated layout wireframes, and 12 `WBP_*` assets constructed and refined directly in the Unreal Editor via MCP.

This post documents that final engineering sprint—and serves as the **series finale for Onset**, explaining openly why I am pivoting away from a solo MMO project to better align my portfolio with what speaks clearly to the job market.

---

## Part 1: The Final Technical Sprint

### 1. Decoupled Audio Architecture (`MHAudio` Plugin)

In commit `6938836`, I built **`MHAudio`** as an independent framework plugin so gameplay systems, `FOnsetAbilityDefinition` data tables, `AOnsetDoor`, and editor preview viewports never bind directly to `USoundBase*` assets or vendor middleware like Wwise or FMOD:

```text
+-------------------------------------------------------------+
|                        Gameplay Code                        |
|   (Abilities, Enemies, Doors, AnimNotifies, Settings UI)    |
+-------------------------------------------------------------+
                              |
                              | Speaks to UMHAudioSubsystem
                              v
+-------------------------------------------------------------+
|                           MHAudio                           |
|  - IMHAudioProvider (Interface)                             |
|  - UMHAudioCatalog (DataAsset Mapping)                      |
|  - UMHAudioSubsystem (GameInstance Subsystem)               |
|  - UMHAnimNotify_AudioEvent (Montage Animation Notify)      |
+-------------------------------------------------------------+
                              |
        +---------------------+---------------------+
        |                                           |
        v                                           v
+-------------------------+             +-------------------------+
| FMHUnrealAudioProvider  |             | FMHWwiseProvider (Drop-in|
| (Native UE / MetaSound) |             |  / FMHFMODProvider)     |
+-------------------------+             +-------------------------+
```

Every cue is triggered by `FGameplayTag` (`PostEvent`, `PostEventAttached`) and mapped inside `UMHAudioCatalog` to native sound assets, volume/pitch multipliers, attenuation rules, and normalized submix buses (`Master`, `Music`, `SFX`, `Ambience`, `Voice`, `UI`).

To support reactive soundscapes, `FMHUnrealAudioProvider` tracks discrete `CombatState` transitions (`Exploration` → `Combat` → `Boss`) for dual-track music crossfades alongside continuous RTPC modulation (`PlayerHealthPercent` ducking music and applying muffled low-pass filtering below 25% HP). Swapping native Unreal audio for Wwise or FMOD requires implementing `IMHAudioProvider` in one bridge class with zero edits to abilities or Blueprints.

---

### 2. Evergreen Equipment Lifecycles: Quality Grades, Salvage & Duplicate Infusion

In commit `5e2f876`, I replaced disposable vendor-trash loot with an evergreen item economy built around `FOnsetEquipmentInstanceData`, `UOnsetEquipmentLibrary`, and `UOnsetInventoryComponent`:

#### Dual Quality Grade Rolls
Each weapon or armor drop rolls independent `PrimaryStatGrade` (damage/defense) and `SecondaryStatGrade` (`Strength`, `Intellect`, `Vitality`, `Agility`, `Luck`) tiers skewed by the killer's `Luck` attribute and item rarity:

| Quality Grade | Designation | Stat Multiplier | Base Drop Weight |
| :--- | :--- | :---: | :---: |
| **Grade D** | Surplus / Defective | `0.85×` | 25.0% |
| **Grade C** | Standard Issue | `1.00×` | 50.0% |
| **Grade B** | Refined / Mil-Spec | `1.15×` | 20.0% |
| **Grade A** | Overclocked | `1.30×` | 4.5% |
| **Grade S** | Apex / Masterwork | `1.50×` | 0.5% |

#### Zero-Destruction "Malfunctioning" Durability
Instead of deleting hard-earned gear at `0.0` durability, weapons degrade `0.05` per hit dealt, armor degrades `0.10` per hit absorbed, and player death applies a `-15%` durability penalty across equipped gear. At `0.0`, an item enters the **`Malfunctioning`** state—halving (`-50%`) primary combat stats, secondary attribute bonuses, and shield block rates until repaired with credits and `CompositeScrap`.

#### Salvage & Duplicate Infusion
Unwanted gear dismantles via `UOnsetInventoryComponent::SalvageItem` into 6 material tiers (`CompositeScrap`, `ReinforcedAlloy`, `NaniteFilament`, `QuantumCore`, `WeaponChassis`, `ArmorPlating`), ensuring common drops remain valuable repair fuel at endgame.

Duplicate copies of the same item row can instead be sacrificed via `InfuseItem` to push a target piece toward **Grade S**:

| Transition | Duplicates Required | Progress Per Catalyst |
| :--- | :---: | :---: |
| **Grade D → Grade C** | 1 Duplicate | `+100.0%` |
| **Grade C → Grade B** | 2 Duplicates | `+50.0%` |
| **Grade B → Grade A** | 3 Duplicates | `+33.4%` |
| **Grade A → Grade S** | 5 Duplicates | `+20.0%` |

Every infusion roll also carries a `15%` chance for **Critical Resonance**, immediately promoting the item to the next grade and granting a free `100%` durability restore.

---

### 3. Tactical HUD & Automated Widget Blueprints via Unreal MCP

Across `2fd0ee4`, `fb6b41a`, `0450b08`, `2b860fc`, and `4c3df24`, I built out Onset's full HUD and screen layer on top of **CommonUI** (`Game`, `Menu`, `Modal`, and `Viewport / HUD` layers):

* **Continuous Dedicated-Server Semantics (`fb6b41a`):** Because Onset runs on an authoritative dedicated server, opening `WBP_PauseMenu` switches local input to `ECommonInputMode::Menu` without ever pausing the live simulation around the player.
* **9 C++ Widget Controllers:** `UOnsetDeathScreen`, `UOnsetPauseMenuScreen`, `UOnsetSettingsScreen`, `UOnsetItemTooltipWidget`, `UOnsetItemActionMenuWidget`, `UOnsetBuffBarWidget`, `UOnsetCastBarWidget`, `UOnsetDurabilityWarningWidget`, and `UOnsetQuestTrackerWidget`.
* **Spec-Driven UI Creation via MCP:** Rather than wiring UMG hierarchies blindly by hand, I wrote [generate_mockups.py](https://github.com/maximoh-mmo/PortfolioTutorial) (`0450b08`) to render pixel-exact wireframe specifications, then generated and styled all 12 `WBP_*` Widget Blueprints directly inside the Unreal Editor over MCP (`2b860fc`, `4c3df24`).

![Onset Tactical HUD Wireframe](/images/onset/layout_hud.png)

![Onset Inventory and Equipment Screen Wireframe](/images/onset/layout_inventory_screen.png)

![Onset Death and Respawn Modal Wireframe](/images/onset/layout_death_screen.png)

---

## Part 2: Stepping Back — Why I'm Pivoting Away from Onset

With `MHAudio`, the equipment lifecycle, and the full UI shell in place, October 25 marked a natural checkpoint—and forced an honest evaluation of the project as a whole.

**I am officially pausing and pivoting away from Onset as the centerpiece of my portfolio and this blog series.**

### What I Loved About Building It
I genuinely enjoy the massive engineering scope of an MMO. Tackling network traffic budgets, dedicated-server authority, account and character persistence, Gameplay Ability System combat math, AI state trees, and custom editor authoring tools has been deeply rewarding. Writing 29 engineering diaries around Onset pushed my Unreal C++ and architectural instincts harder than any smaller prototype could have.

### Where the Solo MMO Math Breaks Down
The constant reality of Onset, however, has been **relentless scope creep**. Every time a core backend system became solid—packet framing, inventory replication, StateTree leashing, economy loops—it immediately exposed another three dependencies that a real Action RPG needs before it feels cohesive.

More importantly, there is a hard truth about how engineering work is evaluated from the outside: **for one developer working alone, bringing an MMO-scale 3D project to a point where it is genuinely presentable and evokes immediate interest takes a very, very long journey—because initial interest is almost always tied to visuals.**

You can architect a clean client/dedicated-server boundary or a zero-allocation ability pipeline, and yet on screen it still reads as greyboxes, placeholder mannequins, and developer wireframes unless you invest months or years into bespoke 3D environments, character rigging, animations, and VFX.

### Aligning My Portfolio With the Job Market
A central goal of this blog series—and of my portfolio work right now—is to **appeal to recruiters, technical leads, and studios, and clearly demonstrate my capabilities to the job market.**

As proud as I am of the architecture inside Onset, an endless solo MMO ultimately fails to sell my skills as effectively as it challenges them. In a 30-second portfolio review, a finished, visually compelling tool or a shipped compact game communicates engineering discipline far more clearly than an ambitious, unfinished vertical slice.

---

## Looking Ahead: Where the Blog Goes Next

Stepping away from Onset is not stepping away from hard systems engineering—it is a deliberate shift toward **tightly scoped, finishable, visually backed projects** where the code speaks for itself:

1. **Tooling & Security Architecture for a 3D Artist (`JTS3D`):** Building a zero-code portfolio studio, media validation pipeline (`ffprobe`, WebP, PDF inspection), and zero-trust split-repo publishing system for a 3D environment artist.
2. **Redesigning `maxheinze.com`:** Turning invisible backend C++ and Blueprint architecture into an interactive **"Player View vs. System View"** X-Ray portfolio experience.
3. **A Complete, Visual-First Strategy Game (*Achi*):** Applying bitboards, zero-allocation Negamax AI, colorblind-safe vector rendering, and zero-asset 16-bit PCM procedural audio synthesis inside a shippable cross-platform project.
4. **C++17 Procedural Systems (`Ivy Sim`):** Extracting procedural botanical growth into a standalone, unit-tested C++17 Godot GDExtension (`godot-cpp`) with deterministic `PCG32` simulation and spatial attraction math.

Thank you to everyone who followed the 29-post journey of *Onset*. The code remains public in [`maximoh-mmo/PortfolioTutorial`](https://github.com/maximoh-mmo/PortfolioTutorial) as an open Unreal C++ architectural reference—and now, it is time to ship work you can see and play.

---

*Arc commits: `6938836`, `5e2f876`, `2fd0ee4`, `fb6b41a`, `0450b08`, `2b860fc`, `4c3df24`.*
