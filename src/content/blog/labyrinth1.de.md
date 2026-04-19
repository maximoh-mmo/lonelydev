---
id: labyrinth1
title: "🌀 Ein lebendiges Labyrinth bauen"
seoTitle: 'Aufbau eines lebendigen Labyrinths: Prozedurale Labyrinthe in Einheit'
date: '2025-10-27'
category: Game Dev
summary: >-
  Erforschung der prozeduralen Labyrinthgenerierung, inspiriert vom Verrückten
  Labyrinth, und Umwandlung der Brettspielmechanik in ein Unity-Projekt.
project: Labyrinth
tags:
  - Unity
  - C#
  - Procedural Generation
  - Game Design
status: published
isAutoTranslated: true
---
Gestern Abend habe ich mit meiner Tochter *Verrückte Labyrinth* (auch bekannt als *The aMAZEing Labyrinth*) gespielt. Als wir Kacheln über das Spielbrett schoben und zusahen, wie neue Wege auftauchten, konnte ich nicht aufhören zu denken: Diese Mechanik wäre perfekt, um prozedurale Generierung und kachelbasierte Systeme in Unity zu erkunden.

Deshalb habe ich beschlossen, diesen Funken in ein kleines Nebenprojekt (und eine Blog-Serie) umzuwandeln: **Building a Living Labyrinth** – eine digitale Interpretation der Ideen des Brettspiels, von Grund auf mit Code, Zufälligkeit und einem Hauch von Designphilosophie erstellt.

## 🎯 Projektziel

Im Kern geht es in *Verrückte Labyrinth* um Struktur und Veränderung. Das Labyrinth besteht aus einem Gitter aus Kacheln, aber mit jeder Runde kann sich die Form dieses Labyrinths ändern – ganze Reihen verschieben sich, neue Durchgänge öffnen sich und andere schließen sich. Diese Mischung aus Stabilität und Chaos macht es zu einem reichhaltigen Spielplatz für prozedurales Design.

Mein Ziel für diese Serie: **Erstelle einen Unity-Prototyp**, der prozedural ein kachelbasiertes Labyrinth generiert und manipuliert – inspiriert von der Mechanik des Brettspiels – und verwende ihn als Lehrmittel für die prozedurale Generierung.

## 🧱 Die Kernidee: Kacheln und Konnektivität

Das erste Konzept, das es in Angriff zu nehmen gilt, ist das Fliesensystem. Jedes Plättchen im Spiel verfügt über eine Reihe von Verbindungen – Pfade, die mit anderen Plättchen verbunden werden können. Im physischen Spiel gibt es drei Archetypen:

- **Gerade Kachel** – verbindet zwei gegenüberliegende Kanten (│ oder ─) - **Eckkachel** – verbindet zwei benachbarte Kanten (┐, └ usw.) - **T-Junction Tile** – verbindet drei Kanten (├, ┬ usw.)

Die Drehung jeder Kachel bestimmt, wie sie in das Labyrinth passt. Anstatt Ausrichtungen fest zu codieren, stelle ich Kacheln anhand der Seiten dar, mit denen sie verbunden sind:

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

Dies gibt uns ein flexibles, datengesteuertes System – wir können später rotieren, Verbindungen überprüfen oder sogar neue Kacheltypen prozedural generieren.

## ♻️ Das Gitter und die „Ersatz“-Kachel

Das Spielbrett ist ein quadratisches Gitter – normalerweise 7×7 – mit einem zusätzlichen Plättchen an der Seite. Und hier kommt der Spaß: Dieser „Ersatz“-Kachel kann in jede beliebige bewegliche Reihe oder Spalte eingefügt werden, wobei er die anderen nach vorne schiebt und einen Kachel auf der gegenüberliegenden Seite auswirft.

Diese Mechanik verwandelt das Labyrinth in ein lebendiges System – teils Gitter, teils Warteschlange –, in dem einige Kacheln fest an ihrem Platz sind und andere sich in jeder Runde dynamisch verschieben.

## ⚙️ Was ich zuerst bauen werde

- **Kacheldarstellung:** Erstellen Sie vorgefertigte oder skriptfähige Objekte für jeden Kacheltyp. - **Gitterverwaltung:** Erstellen Sie einen einfachen GridManager zum Speichern von Kachelzuständen und -positionen. - **Manuelles Verschieben:** Lassen Sie einen Spieler klicken, um Kacheln zu verschieben und die Änderung zu animieren.

Das reicht aus, um das Gefühl des physischen Labyrinths wiederherzustellen. Sobald das funktioniert, kann ich mit der Einführung der Generierung auf prozeduraler Ebene beginnen – zufällige Layouts unter Beibehaltung gültiger Pfade.

## 🧭 Blick nach vorne

Hier ist eine grobe Roadmap, wohin ich dieses Projekt führen möchte:

| Phase | Fokus | Beschreibung | |-------|-------|-------------| | 1 | Fliesensystem | Kacheln mit Rotation und Verbindungen darstellen und visualisieren | | 2 | Grid-Logik | Implementieren Sie die Mechanik zum Verschieben von Zeilen/Spalten | | 3 | Prozedurale Generierung | Generiere zufällig gültige Labyrinthe | | 4 | Wegfindung | Lassen Sie einen Spieler (oder eine KI) durch das dynamische Labyrinth navigieren | 5 | Erweiterungen | Neue Labyrinthregeln, Animationen und vielleicht eine Online-Demo |

## ✨ Warum das wichtig ist

Was mich an *Verrückte Labyrinth* als Programmierprojekt begeistert, ist, dass es Datenstrukturen, prozedurale Generierung und Spielerinteraktion miteinander verbindet. Es ist einfach genug, um es an einem Wochenende zu programmieren, aber tief genug, um es monatelang zu lernen.

## 🧠 Nächstes Mal

Im nächsten Beitrag werde ich auf das Kachelsystem selbst eingehen – das Einrichten des Datenmodells und das dynamische Rendern von Kacheln in Unity. Wir beginnen mit einem einfachen Raster aus zufällig ausgerichteten Kacheln und am Ende werden Sie in der Lage sein, die Knochen Ihres eigenen lebenden Labyrinths zu visualisieren.

Bleiben Sie dran – und wenn Sie Ideen für Funktionen oder Möglichkeiten zur Visualisierung der Schaltmechanik haben, würde ich mich freuen, sie zu hören!
