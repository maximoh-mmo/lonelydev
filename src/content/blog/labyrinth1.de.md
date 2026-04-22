---
id: "labyrinth1"
title: "🌀 Ein lebendes Labyrinth bauen"
seoTitle: "Ein lebendes Labyrinth erstellen: Prozedurale Labyrinthe in Unity"
date: "2025-10-27"
category: "Spieleentwicklung"
summary: "Erkundung der prozeduralen Labyrinthgenerierung, inspiriert von „Verrückte Labyrinth“, und Umsetzung von Brettspielmechaniken in einem Unity-Projekt."
project: "Labyrinth"
tags: ["Unity", "C#", "Procedural Generation", "Game Design"]
status: "published"
isAutoTranslated: true
---

Gestern Abend habe ich mit meiner Tochter *Verrückte Labyrinth* (auch bekannt als *The aMAZEing Labyrinth*) gespielt. Während wir die Spielsteine über das Brett schoben und zusahen, wie neue Wege entstanden, ging mir ein Gedanke nicht aus dem Kopf: Diese Spielmechanik wäre perfekt, um prozedurale Generierung und kachelbasierte Systeme in Unity zu erforschen.

Also habe ich beschlossen, diese Idee in ein kleines Nebenprojekt (und eine Blogreihe) umzusetzen: **Building a Living Labyrinth** – eine digitale Interpretation der Ideen des Brettspiels, von Grund auf mit Code, Zufallselementen und einem Hauch von Designphilosophie entwickelt.

## 🎯 Projektziel

Im Kern dreht sich bei *Verrückte Labyrinth* alles um Struktur und Veränderung. Das Labyrinth besteht aus einem Raster aus Kacheln, doch mit jedem Zug kann sich seine Form verändern – ganze Reihen verschieben sich, neue Durchgänge öffnen sich und andere schließen sich. Diese Mischung aus Stabilität und Chaos macht es zu einem vielfältigen Spielfeld für prozedurales Design.

Mein Ziel für diese Serie: **Einen Unity-Prototyp erstellen**, der ein kachelbasiertes Labyrinth – inspiriert von der Mechanik des Brettspiels – prozedural generiert und bearbeitet, und diesen als Lehrmittel für die prozedurale Generierung nutzen.

## 🧱 Die Kernidee: Kacheln und Vernetzung

Als Erstes wollen wir uns mit dem Kachelsystem befassen. Jede Kachel im Spiel verfügt über eine Reihe von Verbindungen – Wege, über die sie mit anderen Kacheln verbunden werden kann. Im physischen Spiel gibt es drei Grundtypen:

- **Gerade Kachel** – verbindet zwei gegenüberliegende Kanten (│ oder ─)
- **Eckkachel** – verbindet zwei benachbarte Kanten (┐, └ usw.)
- **T-Verzweigungskachel** – verbindet drei Kanten (├, ┬ usw.)

Die Drehung jedes Steins bestimmt, wie er in das Labyrinth passt. Anstatt also die Ausrichtung festzulegen, werde ich die Steine anhand der Seiten darstellen, an die sie angrenzen:

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

Dadurch erhalten wir ein flexibles, datengesteuertes System – wir können später Kacheln drehen, Verbindungen überprüfen oder sogar prozedural neue Kacheltypen generieren.

## ♻️ Das Raster und die „Ersatz“-Kachel

Das Spielbrett besteht aus einem quadratischen Raster – in der Regel 7×7 – mit einem zusätzlichen Spielstein an der Seite. Und jetzt kommt der Clou: Dieser „Ersatz“-Spielstein kann in jede bewegliche Reihe oder Spalte eingesetzt werden, wodurch die anderen Spielsteine nach vorne rücken und ein Spielstein auf der gegenüberliegenden Seite herausfällt.

Dieser Mechanismus verwandelt das Labyrinth in ein lebendiges System – teils Raster, teils Warteschlange –, in dem einige Felder fest an ihrem Platz bleiben, während sich andere in jeder Runde dynamisch verschieben.

## ⚙️ Was ich als Erstes bauen werde

- **Darstellung der Kacheln:** Erstelle Prefabs oder skriptfähige Objekte für jeden Kacheltyp.
- **Rasterverwaltung:** Erstelle einen einfachen GridManager, um den Status und die Positionen der Kacheln zu speichern.
- **Manuelles Verschieben:** Ermögliche es dem Spieler, durch Klicken Kacheln zu verschieben und die Veränderung zu animieren.

Das reicht aus, um das Gefühl eines echten Labyrinths nachzubilden. Sobald das funktioniert, kann ich damit beginnen, die prozedurale Level-Generierung einzuführen – also die Anordnung zufällig zu gestalten und dabei gültige Wege beizubehalten.

## 🧭 Ein Blick in die Zukunft

Hier ist ein grober Fahrplan dafür, wie ich dieses Projekt gerne gestalten möchte:

| Phase | Schwerpunkt | Beschreibung |
|-------|-------|-------------|
| 1 | Kachelsystem | Darstellung und Visualisierung von Kacheln mit Drehung und Verbindungen |
| 2 | Rasterlogik | Implementierung der Mechanik zum Verschieben von Zeilen und Spalten |
| 3 | Prozedurale Generierung | Zufällige Generierung gültiger Labyrinthe |
| 4 | Wegfindung | Navigation eines Spielers (oder einer KI) durch das dynamische Labyrinth |
| 5 | Erweiterungen | Neue Labyrinthregeln, Animationen und eventuell eine Online-Demo |

## ✨ Warum das wichtig ist

Was mich an *Verrückte Labyrinth* als Programmierprojekt begeistert, ist, dass es Datenstrukturen, prozedurale Generierung und Spielerinteraktion miteinander verbindet. Es ist einfach genug, um es an einem Wochenende zu programmieren, aber tiefgründig genug, um sich monatelang damit zu beschäftigen.

## 🧠 Nächstes Mal

Im nächsten Beitrag werde ich mich näher mit dem Kachelsystem selbst befassen – dem Aufbau des Datenmodells und der dynamischen Darstellung von Kacheln in Unity. Wir beginnen mit einem einfachen Raster aus zufällig ausgerichteten Kacheln, und am Ende wirst du in der Lage sein, die Grundstruktur deines eigenen lebendigen Labyrinths zu visualisieren.

Bleibt dran – und wenn ihr Ideen für Funktionen oder Möglichkeiten zur Visualisierung der Verschiebungsmechanik habt, würde ich mich sehr darüber freuen!
