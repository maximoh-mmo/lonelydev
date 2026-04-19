---
id: labyrinth3
title: "🌀 Das Labyrinth verändern!"
seoTitle: Animieren der Kachelgitterverschiebung in Unity
date: '2025-10-28'
category: Game Dev
summary: >-
  Animieren von Kachelbewegungen und Rasterverschiebungen in Unity – erwecken
  Sie das Labyrinth mit sanften Übergängen und interaktiven Mechanismen zum
  Leben.
project: Labyrinth
tags:
  - Unity
  - C#
  - Animation
  - Coroutines
status: published
isAutoTranslated: true
---
Letztes Mal haben wir den Grundstein für unsere digitale Version von *The Crazy Labyrinth* gelegt – das Konzept eines Gitters, Kacheln und einer Ersatzkachel, die in das Labyrinth geschoben werden kann, um sein Layout zu ändern.

Diese Woche erwecken wir dieses Konzept zum Leben. Wir haben jetzt ein funktionierendes Labyrinthgitter in Unity, komplett mit Kachelbewegung, Gitterverschiebung und einem einfachen Eingabesystem zu seiner Steuerung.

## 🎯 Das Ziel für diese Phase

Unsere Ziele für diesen Schritt waren:

- Erzeugen Sie ein Raster aus zufälligen Kacheltypen (gerade, gebogen oder T-Verbindung). - Behalten Sie den Überblick über das Ersatzplättchen (das „One-Out“-Plättchen, das hineingeschoben wird) - Ermöglichen Sie das Einsetzen der Ersatzkachel von jeder gültigen Seite des Gitters - Lassen Sie die eingefügte Kachel eine Reihe oder Spalte „schieben“ und die gegenüberliegende Kachel auswerfen - Animieren Sie die Bewegung der Kacheln, um das sich bewegende Labyrinth visuell darzustellen - Richten Sie grundlegende Tastatursteuerungen zum Umschalten ein (W, A, S, D)

Es ist eine täuschend einfache Mechanik, aber sie ist die Grundlage, auf der das gesamte Labyrinth-Gameplay basiert.

## 🧩 Strukturierung des Systems

Der Kern des Projekts ist die „LabyrinthGrid“-Komponente, die ein 2D-Array von „Tile“-Objekten und die Ersatzkachel sowie die Logik zum Einfügen und Verschieben dieser Objekte auf der Platine verwaltet.

Wir haben auch eine einfache „GridPosition“-Struktur zur Darstellung von Koordinaten eingeführt:

```csharp
public struct GridPosition : IEquatable<GridPosition>
{
    private readonly int _x;
    private readonly int _y;
    public int X => _x;
    public int Y => _y;

    public static readonly GridPosition Invalid = new GridPosition(-1, -1);

    public static GridPosition operator +(GridPosition a, GridPosition b) =>
        new GridPosition(a._x + b._x, a._y + b._y);
}
```

## 🧭 Eingabe und Bewegung

Zur Spielersteuerung verwenden wir direkt das Eingabesystem von Unity:

```csharp
_shiftUp = new InputAction("Shift Up");
_shiftUp.AddBinding("<Keyboard>/W");
_shiftUp.Enable();
```

Wenn eine davon gedrückt wird, fügen wir die Ersatzfliese in die entsprechende Kante ein:

```csharp
if (_shiftUp.WasPerformedThisFrame())
    InsertTile(new GridPosition(3, 0));
```

## 🔄 Das Raster verschieben

Wenn wir eine Kachel einfügen, bestimmen wir, in welche Richtung die Verschiebung erfolgen soll, und führen die Array-Manipulation durch:

```csharp
private Tile ShiftRowRight(int row)
{
    var ejected = _tiles[gridSize - 1, row];
    for (var x = gridSize - 1; x > 0; x--)
        _tiles[x, row] = _tiles[x - 1, row];
    _tiles[0, row] = _spareTile;
    return ejected;
}
```

Dieses Muster gilt für alle Richtungen, wobei die gegenüberliegende Kachel ausgeworfen und die Ersatzkachel aktualisiert wird. Um zu verhindern, dass der letzte Zug rückgängig gemacht wird, verfolgen wir die vorherige Einfügung und verbieten Umkehrungen.

## 🌀 Visuelle Bewegung mit Animation

Wir animieren jede Kachel, wenn sich das Labyrinth verschiebt, damit es flüssig und zufriedenstellend aussieht. Anstatt Dutzende separater Coroutinen auszuführen, bündeln wir die Aktualisierungen in einer reibungslosen Animations-Coroutine:

```csharp
private IEnumerator AnimateAllTiles(float duration = 0.5f)
{
    var startPositions = new Dictionary<Tile, Vector3>();
    var targetPositions = new Dictionary<Tile, Vector3>();

    for (var x = 0; x < gridSize; x++)
        for (var y = 0; y < gridSize; y++)
            if (_tiles[x, y])
            {
                startPositions[_tiles[x, y]] = _tiles[x, y].transform.position;
                targetPositions[_tiles[x, y]] = new Vector3(x - _offset, y - _offset, 0);
            }

    float elapsed = 0f;
    while (elapsed < duration)
    {
        float t = elapsed / duration;
        foreach (var kvp in startPositions)
            kvp.Key.transform.position = Vector3.Lerp(kvp.Value, targetPositions[kvp.Key], t);
        elapsed += Time.deltaTime;
        yield return null;
    }

    foreach (var kvp in targetPositions)
        kvp.Key.transform.position = kvp.Value;
}
```

## 🧱 Verbesserungen der Lebensqualität

Unitys „[ContextMenu]“ ermöglicht das Auslösen von Funktionen über den Inspektor – kein Laufzeitcode erforderlich:

```csharp
[ContextMenu("Rebuild Grid")]
private void InitializeGrid() { ... }
```

## 🧩 Das Ergebnis

In diesem Stadium ist das Labyrinth:

- Erzeugt zufällig ein vollständiges Kachelraster - Hat eine Ersatzfliese zum Einlegen bereit - Reagiert auf Tastatureingaben (W, A, S, D) - Verschiebt Kacheln sanft mit Animation - Verhindert illegale Rückwärtseinfügungen

## 🔮 Nächste Schritte

In der nächsten Phase konzentrieren wir uns auf:

- Einführung fester Fliesen (Ecken) - Hinzufügen visueller Einfügungsindikatoren (anklickbare Einstiegspunkte) - Verfolgung von Pfaden und Verbindungen zwischen Kacheln

Sobald diese Teile vorhanden sind, können wir Spielermarker und Ziele hinzufügen und so diese Demo in ein spielbares Labyrinth-Spiel verwandeln.
