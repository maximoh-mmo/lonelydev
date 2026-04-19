---
id: labyrinth2
title: "🌀 Entwerfen eines dynamischen Labyrinth-Kachelsystems"
seoTitle: Entwerfen eines dynamischen Labyrinthkachelsystems in Unity mit C#
date: '2025-10-27'
category: Game Dev
summary: >-
  Erstellen der Kernkacheltypen, Rotationen und Gitterstrukturen für ein
  prozedurales Labyrinth in Unity.
project: Labyrinth
tags:
  - Unity
  - C#
  - Procedural Generation
  - Data Structures
status: published
isAutoTranslated: true
---
Im vorherigen Beitrag habe ich die Idee vorgestellt, das *Verrückte Labyrinth* in Unity nachzubilden – ein lebendiges, sich veränderndes Labyrinth, das wir zur Erforschung der prozeduralen Generierung nutzen können.

Heute fangen wir an, es wirklich aufzubauen. In Phase 1 dreht sich alles um Daten und Darstellung – es wird definiert, was eine Kachel ist, wie sie mit ihren Nachbarn verbunden ist und sie in der Szene als kleiner Teil eines größeren, lebenden Systems erscheinen zu lassen.

## 🧩 Was wir bauen

- Drei Fliesenarchetypen: Gerade, Ecke und T-Verbindung - Rotationen, die sich auf die Konnektivität auswirken - Ein einfaches Raster aus zufälligen Kacheln, das in Unity angezeigt wird

## Schritt 1 – Kachelverbindungen darstellen

Der Zauber des physischen Labyrinthbretts besteht darin, dass jedes Plättchen entlang seiner offenen Pfade mit anderen verbunden ist. Um dies im Code zu erfassen, können wir eine Aufzählung mit Bit-Flags verwenden, eines für jede Richtung:

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

Damit lässt sich jede beliebige Fliesenform kompakt beschreiben, zum Beispiel:

```csharp
// A corner piece connecting Up and Right
TileConnection.Up | TileConnection.Right
```

Es ist effizient zu testen:

```csharp
bool connectsUp = (connections & TileConnection.Up) != 0;
```

## Schritt 2 – Rotierende Kacheln

Da jede Kachel jeweils um 90° gedreht werden kann, habe ich einen einfachen Helfer geschrieben, um die Verbindungsmaske im Uhrzeigersinn zu drehen:

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

Jetzt kann jede Kachel ihre Konnektivität einfach anpassen, wenn sie in der Szene gedreht wird.

## Schritt 3 – Kacheltypen definieren

Jeder Fliesentyp (gerade, Ecke, T-Verbindung) kann durch ein **ScriptableObject** dargestellt werden, das seine Grundform und sein visuelles Fertigteil definiert. Auf diese Weise können wir sie im Editor optimieren, anstatt die Daten fest zu codieren.

```csharp
[CreateAssetMenu(menuName = "Labyrinth/TileType")]
public class TileType : ScriptableObject
{
    public string displayName;
    public TileConnection baseConnections;
    public GameObject prefabVisualisation;
}
```

Beispiel-Setup: - Geradeaus: „Auf + Ab“. - Ecke: „Oben + Rechts“. - T-Kreuzung: „Oben + Links + Rechts“.

## Schritt 4 – Erstellen der Tile-Instanz

Jede Kachel auf der Tafel ist eine Instanz eines dieser TileTypes mit einer angewendeten Drehung und einer Position im Raster:

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

## Schritt 5 – Generieren eines Zufallsrasters

Um das System schnell zu testen, erzeugt ein kleines Skript ein zufälliges Layout:

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

Wenn Sie auf „Play“ drücken, sollten Sie ein 7×7-Raster aus zufällig ausgerichteten Kacheln sehen – Ihr erstes prozedurales Labyrinth nimmt Gestalt an.

## Schritt 6 – Überlegungen und nächste Schritte

Es ist immer eine Genugtuung, die erste visuelle Bestätigung zu erhalten, dass das System funktioniert. Wenn man sieht, wie das Zufallsraster in Unity erscheint, fühlt es sich greifbar an.

Das nächste Mal werde ich mich auf Phase 2 konzentrieren: die Gitterlogik – das Hinzufügen der klassischen Verrückte-Labyrinth-Mechanik, bei der Reihen verschoben, das freie Feld verfolgt und beobachtet wird, wie sich das Labyrinth dynamisch verschiebt.
