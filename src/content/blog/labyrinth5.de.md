---
id: labyrinth5
title: "\U0001F9E0 Erstellen eines echten Constraint-Lösers für das Labyrinth"
seoTitle: Aufbau eines Constraint-Lösers für die prozedurale Generierung in Unity
date: '2025-11-14'
category: Game Dev
summary: >-
  Aufbau eines geeigneten, auf Einschränkungen basierenden Argumentationssystems
  für den Labyrinthgenerator – Einführung einer einheitlichen
  Validierungspipeline, Kachel-Machbarkeitsbewertung und der Grundlagen eines
  echten Einschränkungslösers.
project: Labyrinth
tags:
  - Unity
  - C#
  - Constraint Solver
  - Algorithms
status: published
isAutoTranslated: true
---
Nach mehreren Phasen der visuellen Ausgabe, dem Verschieben von Kacheln und der Spielmechanik nahm diese Woche eine andere Wendung. Anstatt sich darauf zu konzentrieren, wie das Labyrinth *aussieht*, konzentrierte sich die Arbeit darauf, zu verstehen, wie der Generator *denkt*. Diese Phase markierte den Beginn einer bewussteren Herangehensweise an das Problem – die Behandlung des Labyrinths als **Problem der Befriedigung von Einschränkungen** und nicht als eine zufällige Anordnung von Kacheln.

Das Ziel? Schaffung eines robusten Systems, das bewerten kann, ob eine Kachelplatzierung unter einer wachsenden Sammlung von Regeln gültig ist, und es schließlich ermöglichen kann, das Labyrinth mit Absicht, Struktur und sogar Schwierigkeit zu erzeugen.

## 🎯 Warum Constraint Satisfaction?

In Phase 3 wurde das Konzept der modularen Einschränkungen über die Schnittstelle „ILabyrinthConstraint“ eingeführt. Dies stellte bereits eine große Verbesserung dar – Adjazenzprüfungen, Kachelkompatibilität und Rotationsgültigkeit waren nicht mehr fest in den Generator einprogrammiert.

Aber das Hinzufügen weiterer Einschränkungen ließ die Risse sichtbar werden. Die zufällige Platzierung der Kacheln funktioniert gut für einfache Regeln, wird jedoch spröde, sobald zusätzliche Struktur erforderlich ist. Es dauert nicht lange, bis es zu Platzierungsfehlern kommt, die weder behoben noch reproduziert werden können.

Die Lösung war klar: Gehen Sie zu einem geeigneten Modell zur Erfüllung von Einschränkungen über, bei dem der Generator **durchführbare Kandidaten** bewertet, anstatt zu raten, bis etwas passt.

---

## 🧩 Einführung in den Constraint-Kontext

Eine der ersten architektonischen Verbesserungen war die Einführung eines dedizierten „ConstraintContext“ – einer leichten Struktur, die alle Informationen enthält, die eine Einschränkung zur Bewertung einer Kachelplatzierung benötigt.

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

Durch diese Änderung wurden die Methodensignaturen drastisch reduziert und die Einschränkungslogik konsistenter gemacht. Jede Regel erhält jetzt ein einzelnes Kontextobjekt anstelle mehrerer Rohparameter, was das Hinzufügen neuer Einschränkungen erheblich vereinfacht.

---

## ✔️ Eine einheitliche Validierungspipeline

Eine weitere wichtige Neuerung war die Schaffung einer einzigen Pipeline, die für die Bewertung aller aktiven Einschränkungen verantwortlich ist. Anstatt jede Einschränkung an Ad-hoc-Stellen zu überprüfen, lässt der Generator jetzt alles durch einen klaren, zusammensetzbaren Validator laufen.

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

Der Generator kann nun nicht nur feststellen, ob eine Platzierung gültig ist, sondern auch, **welche Einschränkungen fehlgeschlagen sind**. Dies ist für das spätere Debuggen, Optimieren von Regeln oder Erstellen von Editor-Tools von unschätzbarem Wert.

## 🔍 Bewertung der Kandidatenplättchen

Nachdem die Validierungspipeline eingerichtet war, bestand der nächste Schritt darin, *alle* möglichen Kombinationen von Kacheltypen und Rotationen zu bewerten – und dabei nur die Kandidaten auszuwählen, die alle Einschränkungen erfüllen.

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

Dadurch wird der Generator effektiv zu einem einfachen Zwangslöser. Anstatt zu hoffen, dass eine Fliese passt, versteht das System jetzt, *welche* Fliesen passen und *warum*.

---

## 🧠 Designreflexionen

Phase 4 stellt einen grundlegenden Wandel in der Art und Weise dar, wie das Labyrinth gebaut wird. In den frühen Phasen ging es um schnelles Prototyping, visuelles Feedback und darum, Kacheln auf die Tafel zu bringen. Diese Phase markiert den Übergang von der prozeduralen Begeisterung zur **absichtlichen Architektur**.

- **Vorher:** Die Erzeugung war zufällig, reaktiv und schwer zu kontrollieren. - **Jetzt:** Die Generierung ist regelbasiert, modular und erweiterbar.

Das Labyrinth hat endlich ein Gehirn – als nächstes bringen wir ihm den Stil bei.
