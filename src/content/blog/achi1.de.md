---
id: "achi1"
title: "♟️ 9-Bit-Bitboards und Zero-Allocation-Negamax: Optimierung der rundenbasierten KI in der Bytecode-VM von Godot"
seoTitle: "9-Bit-Bitboards und Zero-Allocation-Negamax zur Optimierung der rundenbasierten KI in der Godot-Bytecode-VM"
date: "2026-12-11"
category: "Game Dev"
summary: "Untersucht die Regeln von Achi mit 3 und 4 Spielsteinen, das Basis-3-Zustands-Hashing für dreifache Wiederholungszüge sowie die Frage, wie die Komprimierung des Spielfelds in zwei 9-Bit-Bitmasken mit O(1)-Nachschlagetabellen und einer Stack-Rekursion ohne Speicherzuweisung eine 4-stufige Negamax-KI in GDScript antreibt."
project: "Achi"
tags: ["Godot 4", "Bitboards", "AI", "Negamax", "Algorithms", "GDScript", "Performance"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Auf den ersten Blick sieht ein 3×3-Raster aus wie „Tic-Tac-Toe“ – ein Spiel, das die meisten von uns schon vor ihrem achten Lebensjahr auf Tischsets im Restaurant gespielt haben. Vor Jahrhunderten verwandelten die Spieler von **Achi** in Ghana dieses 3×3-Spielbrett in ein spannendes taktisches Duell mit einer einfachen Besonderheit: **Das Spiel endet nicht, wenn alle Spielsteine auf dem Brett liegen.**

In Achi sind neun Knotenpunkte (`0` bis `8`) horizontal, vertikal und entlang der beiden Hauptdiagonalen über den zentralen 8-Wege-Knotenpunkt (`4`) miteinander verbunden. Während einer **Platzierungsphase** legen die Spieler abwechselnd Spielsteine ab; wenn niemand eine Dreierreihe bildet, geht das Spiel in eine **Bewegungsphase** über, in der die Spielsteine entlang der verbundenen Linien in benachbarte leere Kreuzungen gleiten.

In der **4-Token-Variante** sind acht der neun Knotenpunkte besetzt – sodass auf dem gesamten Spielbrett **nur ein einziger leerer Schnittpunkt** übrig bleibt. Mit jedem Zug, den du machst, machst du das eine Feld frei, das dein Gegner haben will, oder sperrst ihn ein, sodass keiner seiner Steine sich bewegen kann. Indem **die Einkreisung zu einer erstklassigen Gewinnbedingung** wird (ein blockierter Spieler ohne zulässige Züge verliert), verwandelt sich Achi in einen Messerkampf in einer Telefonzelle.

Bei der Entwicklung von **Achi** in **Godot 4** für Mobilgeräte, das Web (WebGL2/WASM) und den Desktop benötigte ich einen leistungsstarken KI-Solver, der auch innerhalb der Bytecode-VM von GDScript reibungslos läuft – ohne Ruckler durch Heap-Zuweisungen.

---

## 1. Warum Bitboards in der Bytecode-VM von GDScript eine wichtige Rolle spielen

In C++ oder Rust beträgt der Zeitunterschied zwischen dem Durchlaufen eines Arrays mit 9 Elementen und der Ausführung eines bitweisen `AND`-Operators nur wenige Nanosekunden. In **GDScript** sieht das Leistungsprofil bei einer Suche in einem 8- bis 10-stufigen Spielbaum völlig anders aus. Das Durchsuchen von Tausenden von Knoten pro Zug innerhalb einer hochrangigen Skript-VM stößt schnell auf zwei Engpässe:

1. **Bytecode-Schleifenausführung und Bereichsprüfungen:** Iteration über 8 Gewinnzeilen × 3 Zellen = 24 Array-Zugriffe an jedem Knoten des Suchbaums.
2. **Heap-Zuweisungen und `RefCounted`-Wechsel:** Klonen von Zustandsobjekten oder Arrays zehntausende Male pro Zug.

Indem wir das gesamte Board als **9-Bit-Bitboards** darstellen, beseitigen wir beide Engpässe vollständig.

![Achi-9-Bit-Bitboard-Topologie und 4-Token-Einkreisungsfalle](/images/achi/achi-board-bitmask.svg)

---

## 2. Komprimierung des Spielfelds in zwei 9-Bit-Ganzzahlen und eine `O(1)`-Win-LUT

Anstatt ein Array mit neun Knoten-Ganzzahlen zu speichern, kodiert `GameState` die Belegung durch die Spieler als zwei 9-Bit-Masken (`0` bis `511`):
* `p1_mask`: Bit `i` (`1 << i`) ist `1`, wenn Spieler 1 den Knoten `i` belegt.
* `p2_mask`: Bit `i` (`1 << i`) ist `1`, wenn Spieler 2 den Knoten `i` belegt.

Das Auffinden leerer Felder, das Ausführen von Zügen und das Prüfen auf einen Sieg lassen sich auf bitweise Rechenoperationen mit jeweils einem Befehl reduzieren:

```gdscript
const FULL_BOARD_MASK: int = 0x1FF # 0b111111111 (511)

func get_empty_mask() -> int:
	return (~(p1_mask | p2_mask)) & FULL_BOARD_MASK

# Slide toggle in RulesEngine: clears from_node and sets to_node in one XOR
mover_mask ^= (1 << action.from_node) | (1 << action.to_node)
```

Da die Maske eines einzelnen Spielers stets nur 9 Bit umfasst (`2^9 = 512` mögliche Zustände), berechnet `BoardGraph` beim Start einmalig eine **512-Byte-Nachschlagetabelle (`WIN_LUT`)** anhand der 8 Masken für Gewinnlinien (`0b000000111`, `0b100010001` usw.):

```gdscript
static var WIN_LUT: PackedByteArray = PackedByteArray()

static func has_won_mask(player_mask: int) -> bool:
	return WIN_LUT[player_mask & FULL_BOARD_MASK] != 0
```

Um zu prüfen, ob eine Spielfeldmaske eine gewinnbringende Dreierreihe innerhalb des KI-Suchbaums enthält, sind **null Schleifen, null Verzweigungen und ein Array-Zugriff** erforderlich.

Ebenso können wir durch die Kodierung der zulässigen Kanten des Graphen als neun 9-Bit-`NEIGHBOR_MASKS` (zum Beispiel ist der zentrale Knoten `4` `0b111101111`, der mit allen 8 äußeren Knoten verbunden ist) ermöglicht es uns, in der Bewegungsphase zu prüfen, ob ein Spieler festsitzt, indem wir `NEIGHBOR_MASKS[idx] & empty_mask` anhand der gesetzten Bits überprüfen.

---

## 3. Hashing zur Basis 3 für Ziehungen mit dreifacher Wiederholung

Da während der Bewegungsphase von Achi niemals Figuren geschlagen werden, könnten zwei Spieler theoretisch die Spielsteine endlos hin und her schieben. Wie beim Schach sehen unsere Regeln ein **Unentschieden bei dreimaliger Wiederholung** vor: Wenn genau dieselbe Stellung (mit demselben aktiven Spieler und derselben Phase) dreimal auftritt, endet die Partie unentschieden.

Jeder der 9 Knoten hat 3 mögliche Zustände (`0 = leer`, `1 = Spieler 1`, `2 = Spieler 2`), was bedeutet, dass jede Spielfeldanordnung eindeutig einer 9-stelligen **Ganzzahl zur Basis 3** zugeordnet ist (`3^9 = 19.683` Kombinationen):

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

Ohne jegliche Zeichenfolgenformatierung oder Zuweisung von Wörterbuchschlüsseln lässt sich jeder Zustand auf eine 64-Bit-Ganzzahl reduzieren – diese dient sowohl zur Auslösung der Zugerkennung als auch zur Indizierung der Transpositionstabelle unserer KI.

---

## 4. Zero-Allocation-Negamax über eine Zweiphasengrenze hinweg

Beim Schreiben des KI-Lösers (`AchiAI._negamax()`) habe ich die Optimierung noch einen Schritt weiter vorangetrieben: **Innerhalb des rekursiven Suchbaums werden zu keinem Zeitpunkt `GameState`- oder `TurnAction`-Objekte instanziiert.**

Stattdessen übergibt `_negamax()` `my_mask`, `opp_mask`, `my_placed`, `opp_placed`, `alpha` und `beta` direkt auf dem GDScript-Aufrufstapel als reine Ganzzahltypen:

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

Beachten Sie, wie sauber die Suche den Phasenübergang bei Achi handhabt: Da sich die Züge deterministisch abwechseln, befindet sich der aktive Spieler genau dann in der Platzierungsphase, **wenn und nur wenn** `my_placed < tokens_per_player` gilt. Der Übergang von der späten Platzierungsphase zur frühen Bewegungsphase erfolgt nahtlos, ohne dass separate Phasenflags auf dem Stack verfolgt werden müssen.

### Entwicklung von vier spielbaren Charakteren
Ein mathematisch optimaler 10-Ply-Löser mit einer Transpositionstabelle („Master“) ist für erfahrene Spieler großartig, aber unschlagbare KI-Gegner schrecken Gelegenheitsspieler innerhalb von zwei Minuten ab. Unter Verwendung desselben Negamax-Kerns mit Alpha-Beta-Pruning und einer Bewertung anhand der Entfernung zum Matt („SCORE_WIN – Züge“) habe ich vier unterschiedliche Schwierigkeitsstufen optimiert:
* **Leicht (1 Zug):** Erkennt sofortige 1-Zug-Gewinne und Blockaden, gepaart mit einer kontrollierten Fehlerquote und einem breiten Fenster für fast ausgeglichene Stellungen, damit Anfänger Gabeln bilden können.
* **Mittel (3 Züge):** Bewertet die Kontrolle über zentrale Knotenpunkte (`4`), „Zwei-in-einer-Reihe“-Bedrohungen und Mobilitätsunterschiede mit subtilen Eröffnungsvarianten.
* **Schwer (6 Züge):** Vollständige Bewertung von taktischen Zügen und Einfassungsfallen, Zugreihenfolge sowie Erkennung von Dreifachwiederholungen.
* **Meister (10 Züge + TT):** Tiefgreifender Solver, unterstützt durch eine hash-indizierte Transpositionstabelle, die erzwungene 4-Stein-Einkreisungsfallen mehrere Züge im Voraus aufdeckt.

---

## Als Nächstes: Farbenblindheitssichere Silhouetten und GPU-übergreifendes 2D-Vektor-Rendering

Da im Hintergrund eine Zero-Allocation-Engine läuft, bestand die nächste Herausforderung darin, das Spielfeld für jeden Spieler sofort lesbar zu machen – unabhängig von Farbsehschwächen, Bildschirmdrehung oder Eigenheiten des Anti-Aliasing der mobilen GPU. Wir untersuchen die mathematischen Grundlagen der Darstellung in **`achi2`**.
