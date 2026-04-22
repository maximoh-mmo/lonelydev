---
id: "labyrinth2"
title: "🌀 Entwurf eines dynamischen Labyrinth-Kachelsystems"
seoTitle: "Entwicklung eines dynamischen Labyrinth-Kachelsystems in Unity mit C#"
date: "2025-10-27"
category: "Spieleentwicklung"
summary: "Erstellung der grundlegenden Kacheltypen, Drehungen und der Rasterstruktur für ein prozedurales Labyrinth in Unity."
project: "Labyrinth"
tags: ["Unity", "C#", "Procedural Generation", "Data Structures"]
status: "published"
isAutoTranslated: true
---
---

Im letzten Beitrag habe ich die Idee vorgestellt, *Verrückte Labyrinth* in Unity nachzubilden – ein lebendiges, sich ständig veränderndes Labyrinth, mit dem wir die prozedurale Generierung erkunden können.

Heute fangen wir an, es wirklich zu entwickeln. In Phase 1 dreht sich alles um Daten und Darstellung – wir definieren, was eine Kachel ist, wie sie mit ihren Nachbarn verbunden ist, und sorgen dafür, dass sie in der Szene als kleiner Teil eines größeren, lebendigen Systems erscheint.

## 🧩 Was wir entwickeln

- Drei Kacheltypen: Gerade, Eck- und T-Kreuzung
- Drehungen, die sich auf die Verbindungsmöglichkeiten auswirken
- Ein einfaches Raster aus zufällig angeordneten Kacheln, dargestellt in Unity

## Schritt 1 – Darstellung der Kachelverbindungen

Das Besondere am physischen Labyrinth-Spielbrett ist, dass jede Kachel über offene Wege mit anderen verbunden ist. Um dies im Code abzubilden, können wir eine Aufzählung mit Bit-Flags verwenden, eines für jede Richtung:

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
```

Auf diese Weise können wir jede beliebige Kachelform kompakt beschreiben, zum Beispiel:

```csharp
// A corner piece connecting Up and Right
TileConnection.Up | TileConnection.Right
```

Es ist effizient, Folgendes zu testen:

```csharp
bool connectsUp = (connections & TileConnection.Up) != 0;
```

## Schritt 2 – Kacheln drehen

Da jede Kachel jeweils um 90° gedreht werden kann, habe ich ein kleines Hilfsprogramm geschrieben, um die Verbindungsmaske im Uhrzeigersinn zu drehen:

```csharp
public static class TileConnectionHelpers
{
    public static TileConnection Rotate(this TileConnection c)
    {
        TileConnection rotated = TileConnection.None;

        if (c.HasFlag(TileConnection.Up))    rotated |= TileConnection.Right;
        if (c.HasFlag(TileConnection.Right)) rotated |= TileConnection.Down;
        if (c.HasFlag(TileConnection.Down))  rotated |= TileConnection.Left;
        if (c.HasFlag(TileConnection.Left))  rotated |= TileConnection.Up;

        return rotated;
    }
}
```

Jetzt lässt sich die Verbindung jeder Kachel ganz einfach anpassen, wenn sie in der Szene gedreht wird.

## Schritt 3 – Kacheltypen definieren

Jeder Fliesentyp (gerade, Eckfliese, T-Verzweigung) kann durch ein **ScriptableObject** dargestellt werden, das seine Grundform und sein visuelles Prefab definiert. Auf diese Weise können wir sie im Editor anpassen, anstatt die Daten fest zu programmieren.

```csharp
[CreateAssetMenu(menuName = "Labyrinth/TileType")]
public class TileType : ScriptableObject
{
    public string displayName;
    public TileConnection baseConnections;
    public GameObject prefabVisualisation;
}
```

Beispielkonfiguration:
- Gerade Strecke: `Auf + Ab`
- Kurve: `Auf + Rechts`
- T-Kreuzung: `Auf + Links + Rechts`

## Schritt 4 – Erstellen der Kachelinstanz

Jedes Feld auf dem Spielbrett ist eine Instanz eines dieser Feldtypen, auf die eine Drehung angewendet wurde und die eine bestimmte Position im Raster einnimmt:

```csharp
public class Tile : MonoBehaviour
{
    public TileType type;
    public int rotationSteps; // 0–3, each step = +90°

    public TileConnection Connections
    {
        get
        {
            TileConnection c = type.baseConnections;
            for (int i = 0; i < rotationSteps; i++)
                c = c.Rotate();
            return c;
        }
    }

    public void SetRotation(int steps)
    {
        rotationSteps = steps % 4;
        transform.rotation = Quaternion.Euler(0, 0, rotationSteps * 90);
    }
}
```

## Schritt 5 – Erstellen eines zufälligen Rasters

Um das System schnell zu testen, generiert ein kleines Skript ein zufälliges Layout:

```csharp
public class TileGridTest : MonoBehaviour
{
    public int gridSize = 7;
    public TileType[] tileTypes;
    private float _offset;

    void Start()
    {
        _offset = gridSize / 2f;
        InitGrid();
    }

    private void InitGrid()
    {
        for (int x = 0; x < gridSize; x++)
        {
            for (int y = 0; y < gridSize; y++)
            {
                TileType randomType = tileTypes[Random.Range(0, tileTypes.Length)];
                GameObject obj = Instantiate(randomType.prefabVisualisation);
                obj.transform.position = new Vector3(x - _offset, y - _offset, 0);
                Tile tile = obj.GetComponent<Tile>();
                tile.type = randomType;
                tile.SetRotation(Random.Range(0, 4));
            }
        }
    }
}
```

Wenn du auf „Play“ klickst, solltest du ein 7×7-Raster aus zufällig angeordneten Kacheln sehen – dein erstes prozedurales Labyrinth nimmt Gestalt an.

## Schritt 6 – Reflexion und nächste Schritte

Es ist immer ein tolles Gefühl, wenn man zum ersten Mal sehen kann, dass das System funktioniert. Wenn das zufällige Raster in Unity erscheint, wird das Ganze plötzlich greifbar.

Das nächste Mal werde ich mich auf Phase 2 konzentrieren: die Rasterlogik – das Hinzufügen der klassischen „Verrückte Labyrinth“-Mechanik, bei der Reihen verschoben werden, das Verfolgen des Ersatzsteins und das Beobachten, wie sich das Labyrinth dynamisch verändert.
