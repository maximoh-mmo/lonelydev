---
id: achi1
title: "♟️ 9-Bit Bitboards & Zero-Allocation Negamax: Optimizing Turn-Based AI in Godot's Bytecode VM"
seoTitle: "9 Bit Bitboards and Zero Allocation Negamax Optimizing Turn Based AI in Godots Bytecode VM"
date: "2026-12-11"
category: "Game Dev"
summary: "Explores the rules of 3-token and 4-token Achi, Base-3 state hashing for threefold repetition draws, and how packing the board into two 9-bit bitmasks with O(1) lookup tables and zero-allocation stack recursion powers a 4-tier Negamax AI in GDScript."
project: "Achi"
tags: ["Godot 4", "Bitboards", "AI", "Negamax", "Algorithms", "GDScript", "Performance"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction

At first glance, a 3×3 grid looks like Tic-Tac-Toe—a game solved on restaurant placemats before most of us turn eight. Centuries ago in Ghana, players of **Achi** turned that 3×3 board into an intense tactical duel with one simple twist: **the match does not end when all pieces are on the board.**

In Achi, nine nodes (`0` through `8`) are connected horizontally, vertically, and along the two main diagonals through the central 8-way hub (`4`). Players alternate dropping tokens during a **Placement Phase**; if nobody forms three-in-a-row, play shifts into a **Movement Phase** where tokens slide along connected lines into adjacent empty intersections.

In the **4-Token variant**, eight of the nine nodes are occupied—leaving **only a single empty intersection** on the entire board. Every slide you make vacates the one square your opponent wants, or seals them in where none of their pieces can move. Making **encirclement a first-class win condition** (a blocked player with zero legal slides loses) transforms Achi into a knife fight in a phone booth.

While developing **Achi** in **Godot 4** for mobile, web (WebGL2/WASM), and desktop, I needed a deep AI solver that runs smoothly even inside GDScript's bytecode VM—without heap allocation stutter.

---

## 1. Why Bitboards Matter in GDScript's Bytecode VM

In C++ or Rust, looping over a 9-element array versus performing a bitwise `AND` is a difference of nanoseconds. In **GDScript**, the cost profile inside an 8-to-10-ply game tree search looks completely different. Searching thousands of nodes per turn inside a high-level scripting VM quickly hits two bottlenecks:

1. **Bytecode loop dispatch and bounds checks:** Iterating 8 winning lines × 3 cells = 24 array lookups at every node of the search tree.
2. **Heap allocations and `RefCounted` churn:** Cloning state objects or arrays tens of thousands of times per move.

By representing the entire board around **9-bit bitboards**, we eliminate both bottlenecks completely.

![Achi 9-Bit Bitboard Topology and 4-Token Encirclement Trap](/images/achi/achi-board-bitmask.svg)

---

## 2. Packing the Board into Two 9-Bit Integers & an `O(1)` Win LUT

Instead of storing an array of nine node integers, `GameState` encodes player occupancy as two 9-bit masks (`0` to `511`):
* `p1_mask`: Bit `i` (`1 << i`) is `1` if Player 1 occupies node `i`.
* `p2_mask`: Bit `i` (`1 << i`) is `1` if Player 2 occupies node `i`.

Finding empty squares, applying moves, and checking wins collapse into single-instruction bitwise math:

```gdscript
const FULL_BOARD_MASK: int = 0x1FF # 0b111111111 (511)

func get_empty_mask() -> int:
	return (~(p1_mask | p2_mask)) & FULL_BOARD_MASK

# Slide toggle in RulesEngine: clears from_node and sets to_node in one XOR
mover_mask ^= (1 << action.from_node) | (1 << action.to_node)
```

Because a single player's mask only ever spans 9 bits (`2^9 = 512` possible states), `BoardGraph` precomputes a **512-byte lookup table (`WIN_LUT`)** once at startup against the 8 winning line masks (`0b000000111`, `0b100010001`, etc.):

```gdscript
static var WIN_LUT: PackedByteArray = PackedByteArray()

static func has_won_mask(player_mask: int) -> bool:
	return WIN_LUT[player_mask & FULL_BOARD_MASK] != 0
```

Checking whether any board mask contains a winning three-in-a-row inside the AI search tree takes **zero loops, zero branches, and one array lookup**.

Similarly, encoding the graph's legal edges as nine 9-bit `NEIGHBOR_MASKS` (for example, center hub `4` is `0b111101111`, connected to all 8 outer nodes) lets us test whether a player is trapped in the Movement Phase by checking `NEIGHBOR_MASKS[idx] & empty_mask` across set bits.

---

## 3. Base-3 Hashing for Threefold Repetition Draws

Because pieces are never captured during Achi's Movement Phase, two players could theoretically shuttle tokens back and forth forever. Like Chess, our rules enforce a **Threefold Repetition Draw**: if the exact same position (with the same active player and phase) appears three times, the match ends in a draw.

Each of the 9 nodes has 3 possible states (`0 = Empty`, `1 = Player 1`, `2 = Player 2`), meaning every board layout maps uniquely to a 9-digit **Base-3 integer** (`3^9 = 19,683` combinations):

```gdscript
func compute_state_hash() -> int:
	var h: int = 0
	for i in range(9):
		h = h * 3 + board[i]
	# Pack active_player (2 bits) and phase (2 bits) into the low bits
	h = (h << 2) | (active_player & 0x3)
	h = (h << 2) | (int(phase) & 0x3)
	return h
```

With zero string formatting or dictionary key allocations, every state collapses into one 64-bit integer—used both to trigger draw detection and to index our AI's transposition table.

---

## 4. Zero-Allocation Negamax Across a Two-Phase Boundary

When writing the AI solver (`AchiAI._negamax()`), I pushed optimization one step further: **inside the recursive search tree, no `GameState` or `TurnAction` objects are ever instantiated.**

Instead, `_negamax()` passes `my_mask`, `opp_mask`, `my_placed`, `opp_placed`, `alpha`, and `beta` directly on the GDScript call stack as raw integer value types:

```gdscript
# 1. Did the opponent's previous move form 3-in-a-row?
if BoardGraph.WIN_LUT[opp_mask] != 0:
	return -(SCORE_WIN - ply)

var is_placement: bool = (my_placed < tokens_per_player)
var empty_mask: int = (~(my_mask | opp_mask)) & BoardGraph.FULL_BOARD_MASK

# 2. In Movement Phase, check for Encirclement / Trap loss
if not is_placement:
	if not BoardGraph.has_any_legal_slide(my_mask, empty_mask):
		return -(SCORE_WIN - ply)
```

Notice how cleanly the search handles Achi's phase transition: because turns alternate deterministically, the active player is in the Placement Phase **if and only if** `my_placed < tokens_per_player`. Searching from late placement into early movement happens seamlessly without tracking separate phase flags on the stack.

### Designing Four Playable Personalities
A mathematically optimal 10-ply solver with a Transposition Table (`Master`) is great for veterans, but unbeatable AIs drive away casual players in two minutes. Using the same Negamax core with alpha-beta pruning and distance-to-mate scoring (`SCORE_WIN - ply`), I tuned four distinct tiers:
* **Easy (1 ply):** Spots immediate 1-move wins and blocks, paired with a controlled blunder rate and wide near-tie window so newcomers can construct forks.
* **Medium (3 plies):** Evaluates center-hub control (`4`), two-in-a-row threats, and mobility differential with subtle opening variation.
* **Hard (6 plies):** Full tactical and encirclement trap evaluation, move ordering, and threefold repetition awareness.
* **Master (10 plies + TT):** Deep solver backed by a hash-indexed Transposition Table that uncovers forced 4-token encirclement traps multiple moves ahead.

---

## Up Next: Colorblind-Safe Silhouettes & Cross-GPU 2D Vector Rendering

With a zero-allocation engine running underneath, the next challenge was making the board immediately readable to every player—regardless of color vision deficiency, screen rotation, or mobile GPU anti-aliasing quirks. We explore the rendering math in **`achi2`**.
