---
id: "achi2"
title: "🎨 Farbblindenfreundliche UX, 4-Farben-Paletten und GPU-übergreifendes 2D-Vektor-Anti-Aliasing"
seoTitle: "„Pre Attentive Colorblind UX“ – 4 Farbpaletten und GPU-übergreifendes 2D-Vektor-Anti-Aliasing"
date: "2026-12-14"
category: "Game Dev"
summary: "Kombiniert das auf die unbewusste Wahrnehmung ausgerichtete Silhouetten-Design „Kreis vs. abgerundetes Quadrat“ und die farbenblindenfreundlichen 4-Farben-Paletten nach Okabe-Ito mit der Darstellung konzentrischer konvexer Polygone, CPU-gestütztem Anti-Aliasing für mobile GPUs und einer 1:1-Koordinatenspezifikation."
project: "Achi"
tags: ["Godot 4", "2D Rendering", "Accessibility", "Colorblind UX", "Vector Graphics", "Cross-Platform"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Bei abstrakten Strategiespielen kommt es entscheidend auf sofortige visuelle Übersichtlichkeit an. Bei der Entwicklung von **Achi** für Smartphones, Tablets, Browser und Desktops habe ich mir eine strenge kreative Vorgabe gesetzt: **Jedes Element des Spielbretts und der Benutzeroberfläche muss dynamisch aus einer austauschbaren 4-Farben-Palette (`color_bg`, `color_structure`, `color_p1`, `color_p2`) dynamisch gerendert werden – und dabei für Spieler mit Protanopie, Deuteranopie, Tritanopie oder vollständiger Achromatopsie zu 100 % lesbar bleiben.**

Um diese Anforderung im `gl_compatibility`-Renderer von Godot 4 zu erfüllen, mussten sowohl ein Problem der visuellen Wahrnehmung als auch drei subtile Fallstricke beim GPU-übergreifenden Rendering gelöst werden.

---

## 1. Asymmetrie der Silhouette vor der Aufmerksamkeit und Okabe-Ito-Paletten

Bei frühen Tests kamen zwei runde Spielsteine zum Einsatz, die sich durch ihre Farbe und die Muster im Innenring unterschieden. Selbst wenn die Muster deutlich voneinander abgehoben waren, zwangen die identischen äußeren Umrisse die Spieler dazu, den *Innenbereich* jedes Spielsteins zu betrachten, um die Seiten voneinander unterscheiden zu können.

Der Durchbruch bestand darin, die Unterscheidung auf die **vorab berechnete Außenkonturgeometrie** innerhalb von `BoardView.draw_token_shape()` zu verlagern:
* **Spieler 1:** Ein **Kreis (`●`)** mit einem konzentrischen hohlen Ring.
* **Spieler 2 / Gegner:** Ein **abgerundetes Quadrat (`■`)**, dessen Eckenradius von `0,34` auf **`0,22` der Halbbreite** verringert wurde – wodurch es scharfe, zu 78 % gerade Kanten erhielt, die bei kleinen HUD-Größen niemals zu einem Kreis verschwimmen.

Neben den klar abgegrenzten Silhouetten habe ich die Standardpaletten anhand eines **von Okabe-Ito inspirierten Primärkontrasts** angepasst, sodass nur die spezielle Voreinstellung für Barrierefreiheit in Schwarz-Weiß (`base_greyscale`) Graustufen verwendet:

| Grundpalette | Leinwand (`color_bg`) | Raster (`color_structure`) | Spieler 1 (`color_p1` ●) | Spieler 2 (`color_p2` ■) |
| :--- | :--- | :--- | :--- | :--- |
| **`base_light`** | `#F5F3EF` Alabaster | `#1E2229` Schiefer-Tinte | `#2563EB` Königsblau | `#E05A2B` Zinnober-Bernstein |
| **`base_dark`** | `#16181D` Obsidian | `#E4E7EC` Zarte Kreide | `#3B9EFF` Himmelblau | `#FF8A3D` Sonnenuntergangs-Bernstein |
| **`base_high_contrast`** | `#000000` Pechschwarz | `#FFFFFF` Reines Weiß | `#FFE600` Leuchtgelb | `#00E5FF` Himmelcyan |
| **`base_greyscale`** | `#E2E2E2` Silberpapier | `#141414` Anthrazit | `#2E2E2E` Dunkles Graphit | `#8A8A8A` Mittleres Zinn |

Damit der Palettenwechsel eher spürbar als abrupt wirkt, interpoliert `PaletteManager` `active_palette` sanft über `AchiPalette.lerp_to() über einen Zeitraum von `0,28 s` unter Verwendung eines kubischen „Ease-out“-Tweenings – dabei wird die Löschfarbe des Ansichtsfensters aktualisiert und `palette_changed` Frame für Frame gesendet.

![Achi: Farbblinde-freundliche 4-Farben-Semantikpaletten und Silhouettenasymmetrie](/images/achi/achi-palettes-comparison.svg)

---

## 2. Drei Fallstricke beim 2D-Vektor-Rendering über mehrere GPUs hinweg

Bei der Überprüfung der vektorbasierten Darstellung auf mobilen OpenGL ES 3.0-GPUs, in WebGL2-Browser-Tabs und in Desktop-Treibern wurden drei Darstellungsfehler aufgedeckt, die architektonische Korrekturen erforderten.

### Falle 1: Dicke 'draw_polyline()'-Eckgehrungsartefakte
Ursprünglich wurde der innere Ring des Rounded Square-Tokens von Spieler 2 ('■') als dick gestrichener 'draw_polyline()'-Pfad gezeichnet. Bei kleinen '8px'-Token im HUD-Reservestreifen erzeugt Godots CPU-Polyline-Triangulator überlappende innere Gehrungsartefakte, sobald die Strichbreite sich dem Eckradius nähert.

**Fix:** Dicke gestrichene Polylinien wurden durch **konzentrisch gefüllte konvexe Polygone** ('draw_colored_polygon') ersetzt, die rückwärts nach vorne gestapelt sind: Außenstruktur-Polygon → inneres 'color_p2'-Polygon → inneres 'color_bg'-Ausschnittspolygon → mittiges 'color_p2'-Kernpolygon. Konvexe Dreiecksventilatoren schneiden sich niemals auf irgendeiner Skala selbst.

### Falle 2: Gekerbte Polygonsilhouetten, wenn mobile Entwickler MSAA ignorieren
Im `gl_compatibility`-Renderer von Godot 4 erzeugen `draw_line(..., antialiased=true)` und `draw_arc(..., antialiased=true)` auf der CPU einen Dreiecksstreifen mit weichem Alpha-Farbverlauf, wodurch auf jeder GPU glatte Kanten entstehen. Allerdings **verfügen `draw_circle()` und `draw_colored_polygon()` über keinen `antialiased`-Parameter**, und viele kachelbasierte GPUs für Mobilgeräte sowie WebGL2-Kontexte ignorieren 2D-Framebuffer-MSAA.

**Fix:** Neben der Aktivierung von 'msaa_2d=2' in 'project.godot' habe ich jeden ausgefüllten Kreis und jedes abgerundete Quadratpolygon in 'BoardView.draw_token_shape()' mit einem **'1,25px' CPU-gefederten 'draw_arc(..., true)' / 'draw_polyline(..., true)'** entlang seines exakten äußeren Randes kombiniert – was messerscharfe Anti-Aliasing lieferte, selbst ohne jegliche Hardware-MSAA-Unterstützung.

### Trap 3: Asymmetrische Porträt- vs. Landschaftsfenster-Skalierung
Ursprünglich verwendete 'project.godot' ein porträtisches logisches Viewport ('540 × 920') mit 'stretch/mode="canvas_items"' und 'stretch/aspect="expand"'. Das Drehen eines Telefons um 90° in Querformat ('920 × 540') verlagerte Godots Maßstabsfaktor von 'min(540/540, 920/920) = 1,0' auf 'min(920/540, 540/920) = 0,587' – wodurch sich jede Schriftart und jede Taste um 41 % verkleinerte.

**Korrektur:** Der logische Basis-Viewport in `project.godot` wurde auf ein **symmetrisches Quadrat (`640 × 640`)** festgelegt, wobei die Überschreibungen für das Desktop-Fenster (`540 × 920`) beibehalten wurden. Da `min(W / 640, H / 640)` mathematisch invariant ist, wenn `W` und `H` vertauscht werden, bleiben Typografie und Steuerelemente bei einer Drehung um 90° sowohl in Hochformat-Stacks als auch in zweispaltigen Querformat-Aufteilungen identisch.

---

## 3. Verriegelung proportionaler Geometrie & die 14%ige Polstermarge

Um dynamische Größenanpassungen und zukünftige benutzerdefinierte Grafikpakete ohne Verzerrung zu unterstützen, leitet sich die gesamte Geometrie des Boards proportional aus einem strikten '1:1'-quadratischen Begrenzungsrahmen ab ('Seite = min(Breite, Höhe)'):

| Element | Codeformel | Bruchteil von 'Seite' | Größe auf der '1024 × 1024' Leinwand |
| :--- | :--- | :---: | :--- |
| **Äußerer Rand** | 'Seite * 0,14' | '14,0%' | '143 px'-Polster an jeder Kante |
| **Aktive Gitterspannweite** | 'Side - Padding * 2,0' | '72,0%' | '738 × 738 px' zentriertes Raster |
| **Token-Radius ($R$)** | 'Seite * 0,088' | '8,8%' | '90 px' Radius ('180 px' Durchmesser) |
| **Leere Knotenring** | 'Seite * 0,032' | '3,2%' | '33 px' Radius |
| **Basislinienbreite** | 'maxf(3,0, seitlich * 0,015)' | '1,5%' | '15 px' Streckbreite |

Jeder Knoten und jeder Token ist in seinem exakt geometrischen Zentrum verankert ("(0,140, 0,500, 0,860)' normalisierte UVs). Selbst wenn ein Eck-Token beim Hover oder Auswahlen um '1,12×' nach oben pulsiert ('R = 101 px' um den Anker herum '(143, 143)'), garantiert der äußere Rand von '14%' **'42 px' Freigabe** vor dem Leinwandrand – sodass Token und Leuchten nie schneiden.

---

## Als Nächstes: Zero-Asset-Prozedurale Audiosynthese

Visuelle Silhouetten und 4-Farbpaletten lösen die Lesbarkeit mit '0 KB' externer Sprite-Dateien. In **'achi3'** wenden wir genau dieselbe prozedurale Philosophie auf den Sound an – wir synthetisieren jedes hölzerne Klopfen, jeden Token-Slide und jeden Victory-Akkord direkt in 16-Bit-PCM-Puffern beim Start.
