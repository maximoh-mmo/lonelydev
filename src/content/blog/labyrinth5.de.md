---
id: "labyrinth5"
title: "🧠 Entwicklung eines echten Constraint-Solvers für das Labyrinth"
seoTitle: "Entwicklung eines Constraint-Solvers für die prozedurale Generierung in Unity"
date: "2025-11-14"
category: "Spieleentwicklung"
summary: "Entwicklung eines geeigneten, auf Einschränkungen basierenden Schlussfolgerungssystems für den Labyrinthgenerator – Einführung einer einheitlichen Validierungspipeline, Bewertung der Machbarkeit von Kacheln und Grundlagen eines echten Einschränkungslösers."
project: "Labyrinth"
tags: ["Unity", "C#", "Constraint Solver", "Algorithms"]
status: "published"
isAutoTranslated: true
---

Nach mehreren Phasen, in denen es um die visuelle Darstellung, die Anordnung der Kacheln und die Spielmechanik ging, nahm die Arbeit diese Woche eine andere Wendung. Anstatt uns darauf zu konzentrieren, wie das Labyrinth *aussieht*, verlagerte sich der Fokus darauf, zu verstehen, wie der Generator *denkt*. Diese Phase markierte den Beginn einer bewussteren Herangehensweise an das Problem – das Labyrinth wurde nun eher als **Problem der Erfüllung von Nebenbedingungen** betrachtet denn als zufälliger Kachelanordner.

Das Ziel? Ein robustes System zu entwickeln, das anhand einer ständig wachsenden Sammlung von Regeln prüfen kann, ob die Platzierung eines Spielsteins gültig ist, und es schließlich ermöglicht, das Labyrinth mit einer bestimmten Absicht, Struktur und sogar einem bestimmten Schwierigkeitsgrad zu generieren.

## 🎯 Warum Constraint Satisfaction?

In Phase 3 wurde das Konzept der modularen Einschränkungen über die Schnittstelle `ILabyrinthConstraint` eingeführt. Dies war bereits eine große Verbesserung – Überprüfungen der Nachbarschaft, der Kachelkompatibilität und der Rotationsgültigkeit waren nun nicht mehr fest im Generator programmiert.

Doch durch das Hinzufügen weiterer Einschränkungen traten Schwachstellen zutage. Die zufällige Platzierung von Kacheln funktioniert bei einfachen Regeln gut, wird jedoch instabil, sobald zusätzliche Strukturen erforderlich sind. Schon bald kommt es zu Platzierungsfehlern, die sich weder beheben noch reproduzieren lassen.

Die Lösung lag auf der Hand: Man sollte zu einem richtigen Modell zur Erfüllung von Nebenbedingungen übergehen, bei dem der Generator **realisierbare Kandidaten** auswertet, anstatt so lange zu raten, bis etwas passt.

---

## 🧩 Einführung in den Constraint-Kontext

Eine der ersten architektonischen Verbesserungen war die Einführung eines eigenen `ConstraintContext` – einer schlanken Struktur, die alle Informationen enthält, die eine Einschränkung benötigt, um die Platzierung einer Kachel zu bewerten.

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

Diese Änderung hat die Methodensignaturen erheblich vereinfacht und die Logik der Einschränkungen konsistenter gemacht. Jede Regel erhält nun ein einziges Kontext-Objekt anstelle mehrerer Rohparameter, was das Hinzufügen neuer Einschränkungen erheblich vereinfacht.

---

## ✔️ Eine einheitliche Validierungspipeline

Eine weitere wichtige Neuerung war die Einrichtung einer einzigen Pipeline, die für die Überprüfung aller aktiven Einschränkungen zuständig ist. Anstatt jede Einschränkung an beliebigen Stellen zu prüfen, leitet der Generator nun alle Daten durch einen übersichtlichen, modular aufgebauten Validator.

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

Der Generator kann nun nicht nur feststellen, ob eine Platzierung gültig ist, sondern auch, **welche Einschränkungen nicht erfüllt wurden**. Dies ist von unschätzbarem Wert für die Fehlersuche, die Optimierung von Regeln oder die spätere Entwicklung von Editor-Tools.

## 🔍 Bewertung der in Frage kommenden Kacheln

Nachdem die Validierungspipeline eingerichtet war, bestand der nächste Schritt darin, *alle* möglichen Kombinationen aus Kacheltypen und Drehungen zu bewerten – wobei nur diejenigen Kandidaten berücksichtigt wurden, die alle Einschränkungen erfüllten.

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

Dadurch wird der Generator praktisch zu einem einfachen Constraint-Solver. Anstatt darauf zu hoffen, dass eine Kachel passt, erkennt das System nun, *welche* Kacheln passen und *warum*.

---

## 🧠 Überlegungen zum Design

Phase 4 stellt einen grundlegenden Wandel in der Art und Weise dar, wie das Labyrinth aufgebaut wird. In den ersten Phasen ging es um schnelle Prototypenentwicklung, visuelles Feedback und das Platzieren von Spielsteinen auf dem Spielbrett. Diese Phase markiert den Übergang von prozeduraler Begeisterung zu **bewusster Architektur**.

-   **Früher:** Die Generierung erfolgte zufällig, reaktiv und war schwer zu steuern.
-   **Heute:** Die Generierung erfolgt regelbasiert, modular und ist erweiterbar.

Das Labyrinth hat endlich ein Gehirn – als Nächstes bringen wir ihm Stil bei.
