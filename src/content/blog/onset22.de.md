---
id: "onset22"
title: "🎬 Entwicklertagebuch: Von Leichen zu Taschen – „Click-to-Loot“, Inventararchitektur und Spielfortschritt"
seoTitle: "Von Leichen zu Taschen – Zum Plündern anklicken: Inventar, Architektur und Fortschritt"
date: "2026-10-30"
category: "Game Dev"
summary: "Führt eine einheitliche „UInventoryComponent“ ein, die Spieler-Rucksäcke, Ausrüstungsplätze und Leichenbehälter steuert. Bietet eine „Click-to-Loot“-Interaktion zwischen Spielwelt und Bildschirm, Level- und Erfahrungskurven mit Datenbankmigration 4 sowie benutzerdefinierte Slate-Tools zur Erstellung von Gegnern und Beute."
project: "Onset"
tags: ["Unreal Engine", "Inventory System", "Looting", "Leveling", "PostgreSQL", "SQLite", "Editor Tooling"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Eine Kampf-Engine ohne Beute und Fortschritt ist nichts weiter als ein Arcade-Minispiel. In einem Action-RPG ist der Kern des emotionalen Spielablaufs der Belohnungszyklus: Du besiegst einen anspruchsvollen Gegner, siehst zu, wie sein Körper zusammenbricht, entdeckst das verräterische Schimmern der fallengelassenen Ausrüstung, gehst hinüber, öffnest das Beutefenster, steckst ein frisch fallengelassenes Breitschwert in deinen Charakter und beobachtest, wie deine Werte steigen, während ein goldener Level-Up-Strahl deine Gesundheit wieder vollständig auffüllt.

Bis zu diesem Sprint gab es all das bei Onset noch nicht. Besiegte Gegner verschwanden einfach ins Nichts, Ausrüstung war ein abstraktes Konzept in C++-Strukturen, und die Stufen der Charaktere waren fest programmierte Zahlen.

Innerhalb von drei Tagen und acht Commits habe ich die gesamte Pipeline für Itemisierung, Inventar und Spielfortschritt von Grund auf neu entwickelt:
* Eine einheitliche `UInventoryComponent`, die die Rucksäcke der Spieler, die ausgerüstete Ausrüstung und die Beutecontainer an Leichen steuert.
* Ein an der Spielwelt verankertes „Click-to-Loot“-Interaktionssystem mit schwebenden Beute-Popups im Bildschirmbereich.
* Eine vollständig persistierte Kurve für Erfahrung, Levelaufstieg und Attributpunkte (einschließlich Datenbankmigration 4 zwischen SQLite und PostgreSQL).
* Zwei neue Slate-Tools im Editor – das **Enemy Creation Tool** und der **Item & Loot Editor** – mit automatischer Profilerstellung und Validierung beim Schließen.

---

## Technische Erläuterung

### Die „Everything is an Inventory“-Architektur

Bei der Entwicklung eines Inventarsystems besteht eine häufige Falle darin, für jeden Typ von Gegenstandsbehälter eine eigene Klasse anzulegen: `UPlayerInventory`, `UChestContainer`, `UCorpseLootHolder`, `UVendorStock`.

In Onset habe ich die gesamte Speicherung von Gegenständen unter einer einzigen Komponente zusammengefasst: `UInventoryComponent`.

```
                  +---------------------------+
                  |    UInventoryComponent    |
                  +---------------------------+
                  | - BagSlots (Array)        |
                  | - EquipmentSlots (Map)    |
                  | - MaxWeight / MaxSlots    |
                  +---------------------------+
                                |
        +-----------------------+-----------------------+
        |                                               |
        v                                               v
+-------------------------------+               +-------------------------------+
|      AOnsetPlayerCharacter    |               |          AOnsetCorpse         |
|  - 20 Bag Slots               |               |  - 0 Bag Slots                |
|  - 6 Equipped Slots           |               |  - Dynamic Loot Drops         |
|  - Replicated to Owner        |               |  - World Interaction Target   |
+-------------------------------+               +-------------------------------+
```

Da Leichen und Spieler genau dieselbe Komponente nutzen:
1. **Das Plündern ist eine atomare Übertragung:** Das Verschieben eines Gegenstands von einer Leiche in das Inventar eines Spielers erfolgt einfach durch `SourceInventory->RemoveItem()`, gefolgt von `TargetInventory->AddItem()`.
2. **Identische Serialisierung:** Beide können in dasselbe JSON-Format serialisiert und daraus wieder deserialisiert werden.
3. **Neuberechnung der Werte:** Wenn Gegenstände in die Ausrüstungsslots eines Charakters verschoben werden, sendet `UInventoryComponent` das Ereignis `OnEquipmentChanged` aus, wodurch sofort eine serverseitige Neuberechnung der Werte ausgelöst wird.

### Click-to-Loot: Interaktion mit der Spielwelt trifft auf Bildschirm-Overlay

Bei Top-Down-ARPGs muss das Sammeln von Beute reibungslos funktionieren. Wenn ein Spieler gezwungen ist, anzuhalten, das Vollbild-Inventarfenster zu öffnen und Gegenstände über den Bildschirm zu ziehen, wird das Tempo des Kampfes unterbrochen.

Stattdessen habe ich ein schlankes, kontextsensitives Beute-Overlay implementiert:
* Wenn man den Mauszeiger über ein `AOnsetCorpse` bewegt, wird das Mesh umrandet und der Mauszeiger verwandelt sich in eine interaktive Beutehand.
* Ein Klick auf die Leiche ruft `UInteractionComponent::InteractWithTarget()` auf.
* Befindet sich der Spieler innerhalb der Interaktionsreichweite (200 Einheiten), sendet der Server den Inventarinhalt der Leiche an den Client, der ein kompaktes `ULootOverlayWidget` direkt neben der Leiche anzeigt.
* Spieler können einzelne Gegenstände anklicken, um sie zu plündern, oder auf „Alles nehmen“ klicken (bzw. die Leertaste drücken), um alles in ihren Rucksack zu packen. Sobald der Leichnam leer ist, hört er auf zu schimmern und beginnt seinen Despawn-Timer.

### Level-Mathematik und die Fortschrittskurve

Der Spielfortschritt wird von der `UOnsetLevelingLibrary` gesteuert, die Konfigurationsformeln aus der Datei `DefaultEngine.ini` ausliest:

$$\text{XPRequired}(L) = \text{XPBase} \times (L)^{\text{XPGrowth}}$$

Um zu verhindern, dass hochstufige Charaktere den Spielfortschritt durch das Farmen von Anfängerzonen trivialisieren, wird bei Kills ein **Stufenunterschiedsmultiplikator** angewendet:
* **Totenkopf/Rot (+4 oder höher):** $1,25\times$ XP-Bonus (hohes Risiko, hohe Belohnung).
* **Gelb ($\pm 2$ Stufen):** $1,0\times$ Standard-XP.
* **Grün ($-3$ bis $-5$ Stufen):** $0,5\times$ reduzierte EP.
* **Grau ($-6$ oder niedriger):** $0,0\times$ keine EP (triviale Kills bringen keinen Fortschritt).

Wenn `AddExperience()` die XP über den Schwellenwert hinaus erhöht, löst der Charakter eine Kaskade von Levelaufstiegen aus: Das Level steigt, `UnspentStatPoints` erhöht sich um 5, die aktuellen Lebens- und Manapunkte werden vollständig wiederhergestellt, und ein Gameplay-Signal (`TAG_Event_LevelUp`) löst den Partikeleffekt und den Soundclip aus.

---

## Details zur Umsetzung

### 1. Gemeinsame Inventarkomponente (`UOnsetInventoryComponent.cpp`)

Die Komponente verwaltet Stapelung, Kapazität und Geräteplätze, wobei die JSON-Serialisierung direkt in die Datenbank eingespeist wird:

```cpp
bool UOnsetInventoryComponent::AddItem(FName ItemRowName, int32 Quantity, int32& OutRemainingQuantity)
{
    OutRemainingQuantity = Quantity;
    const FOnsetItemDefinition* Def = GetItemDefinition(ItemRowName);
    if (!Def) return false;

    // 1. Try stacking onto existing bag slots
    if (Def->MaxStack > 1)
    {
        for (FOnsetInventorySlot& Slot : BagSlots)
        {
            if (Slot.ItemRowName == ItemRowName && Slot.Quantity < Def->MaxStack)
            {
                const int32 Space = Def->MaxStack - Slot.Quantity;
                const int32 ToAdd = FMath::Min(Space, OutRemainingQuantity);
                Slot.Quantity += ToAdd;
                OutRemainingQuantity -= ToAdd;

                if (OutRemainingQuantity <= 0)
                {
                    OnInventoryUpdated.Broadcast();
                    return true;
                }
            }
        }
    }

    // 2. Find first empty slot for remainder
    for (FOnsetInventorySlot& Slot : BagSlots)
    {
        if (Slot.IsEmpty())
        {
            const int32 ToAdd = FMath::Min(Def->MaxStack, OutRemainingQuantity);
            Slot.ItemRowName = ItemRowName;
            Slot.Quantity = ToAdd;
            OutRemainingQuantity -= ToAdd;

            if (OutRemainingQuantity <= 0)
            {
                OnInventoryUpdated.Broadcast();
                return true;
            }
        }
    }

    OnInventoryUpdated.Broadcast();
    return OutRemainingQuantity < Quantity;
}
```

### 2. Interaktion mit Leichen per Mausklick („Click-to-Loot“) (`InteractionComponent.cpp`)

Wenn ein Spieler auf die Welt klickt, sucht die Interaktionskomponente nach interaktiven Akteuren, bevor sie die Bewegung weiterleitet:

```cpp
void UInteractionComponent::TryInteract(AActor* TargetActor)
{
    if (!TargetActor || !TargetActor->Implements<UOnsetInteractableInterface>())
    {
        return;
    }

    const float Distance = FVector::Dist(GetOwner()->GetActorLocation(), TargetActor->GetActorLocation());
    if (Distance > MaxInteractionDistance)
    {
        // Out of range: queue approach movement
        MoveToAndInteract(TargetActor);
        return;
    }

    // In range: execute interaction on server
    Server_ExecuteInteraction(TargetActor);
}
```

Auf dem Server eröffnet `AOnsetCorpse::OnInteract()` die Beutesitzung, sperrt die Leiche für die gleichzeitige Plünderung durch andere Spieler und repliziert den Inhalt der Slots in das `ULootOverlayWidget` des Plünderers.

### 3. Levelaufstieg und Entwicklung der Werte (`AOnsetPlayerCharacter.cpp`)

Erfahrungspunkte werden über `AddExperience` übertragen, wobei mehrstufige Sprünge und die Vergabe von Attributwerten berücksichtigt werden:

```cpp
void AOnsetPlayerCharacter::AddExperience(int32 Amount)
{
    if (Amount <= 0 || CharacterLevel >= LevelCap) return;

    CurrentXP += Amount;

    while (CurrentXP >= XPToNextLevel && CharacterLevel < LevelCap)
    {
        CurrentXP -= XPToNextLevel;
        CharacterLevel++;
        UnspentStatPoints += StatPointsPerLevel;
        XPToNextLevel = UOnsetLevelingLibrary::GetXPForLevel(CharacterLevel);

        // Level-up rewards: full restoration
        GetCombatAttributeSet()->SetHealth(GetCombatAttributeSet()->GetMaxHealth());
        GetCombatAttributeSet()->SetMana(GetCombatAttributeSet()->GetMaxMana());

        // Notify systems and clients
        Multicast_OnLevelUp(CharacterLevel);
    }

    OnProgressionChanged.Broadcast(CharacterLevel, CurrentXP, XPToNextLevel, UnspentStatPoints);
}
```

### 4. Migration des Datenbankschemas 4

Um den Spielfortschritt über mehrere Sitzungen hinweg zu speichern, wurde in den Datenbanken SQLite und PostgreSQL die Migration 4 implementiert, wodurch die Spalte `unspent_stat_points` hinzugefügt wurde:

```sql
-- Migration 004: Add unspent stat points
ALTER TABLE characters ADD COLUMN unspent_stat_points INTEGER NOT NULL DEFAULT 0;
```

---

## Ergebnisse und Validierung

1. **Vollständiger „Kill-to-Loot“-Zyklus:**
   * Ein getöteter Gegner verwandelt sich in eine `AOnsetCorpse`-Leiche mit einem dezenten goldenen Schimmer.
   * Ein Rechtsklick auf die Leiche öffnet das schwebende `ULootOverlayWidget`, das ein *Eisernes Breitschwert* und 2x *Geringe Heiltränke* anzeigt.
   * Ein Klick auf „Alles plündern“ überträgt die Gegenstände in die 20-Slot-Tasche des Spielers und spielt den Sound für das Aufnehmen von Gegenständen ab.
2. **Ausrüstung & Werteskalierung:**
   * Rechtsklick auf das *Eiserne Breitschwert* im Inventarsack. Es wurde in den Ausrüstungsplatz `MainHand` verschoben.
   * Die Angriffskraft des Spielers stieg sofort von 20 auf 45; der Grundangriffsschaden gegen Trainingspuppen erhöhte sich entsprechend.
3. **Fortschrittsüberprüfung:**
   * Das Besiegen von 5 Trainingspuppen brachte 350 XP ein und löste die Ankündigung für Level 2 aus.
   * Die XP-Leiste im HUD lief flüssig, und der Charakter erhielt 5 nicht ausgegebene Attributpunkte.
   * Aus- und wieder eingeloggt: Charakterstufe, aktuelle XP, ausgerüstete Ausrüstung und nicht ausgegebene Attributpunkte wurden identisch aus dem lokalen PostgreSQL-Speicher wiederhergestellt.

---

## Herausforderungen und Lösungen

### Herausforderung 1: Fortschrittsverlust bei Unterbrechung der Verbindung während des automatischen Spielbetriebs

**Problem:** Wenn Spieler die Autoplay-Funktion aktivierten (bei der die KI vorübergehend die Steuerung des Charakters übernimmt) und die Verbindung unterbrochen wurde, behielt der `AOnsetPlayerAIController` die Kontrolle über den Spielstein, während sich der `AOnsetPlayerController` löste. Die Logik zum Speichern bei Verbindungsabbruch ging davon aus, dass der Spieler-Controller stets verbunden war, was dazu führte, dass der während des KI-Kampfes erzielte Fortschritt beim Herunterfahren des Servers verloren ging.

**Lösung:** Die Zuständigkeit für den Spielfortschritt und die `SetPersistIdentity`-Aufrufe wurden auf `AOnsetPlayerCharacter` selbst verlagert. Der Pawn speichert nun seine Identitäts- und Fortschrittsfelder unabhängig davon, welcher Controller (Spieler oder KI) ihn gerade steuert.

### Herausforderung 2: Desynchronisation von Fremdschlüsseln zwischen Tabellen in Slate

**Problem:** Im benutzerdefinierten Gegenstands- und Beute-Editor muss zum Erstellen einer Fähigkeitsschriftrolle eine Fähigkeits-ID aus `DT_Abilities` ausgewählt werden. Wenn ein Designer diese Fähigkeit später im Fähigkeits-Editor umbenannt oder gelöscht hat, blieb in der Gegenstandstabelle ein fehlerhafter Verweis erhalten, was zu Abstürzen führte, wenn Spieler versuchten, die Schriftrolle zu lesen.

**Lösung:** In `OnsetItemEditorWidget::ValidateRowData()` wurde ein tabellenübergreifender Überprüfungsprozess hinzugefügt. Wenn ein Gegenstand oder Beuteeintrag auf eine fehlende Zeile in der DataTable verweist, wird die Zelle in der Editorliste hellrot angezeigt und die Routine zum Speichern beim Schließen deaktiviert, bis der Verweis behoben ist.

---

## Reflexion und gewonnene Erkenntnisse

Indem wir Leichen als vorübergehende `UInventoryComponent`-Träger behandelten, anstatt ein maßgeschneidertes Plünderungssubsystem zu entwickeln, konnten wir enorme Mengen an Boilerplate-Code vermeiden. Wenn Systeme grundlegende Datenprimitive gemeinsam nutzen, werden neue Funktionen zu natürlichen Erweiterungen und erfordern keine architektonischen Umgestaltungen.

Das „Persist-on-Close“-Muster in unseren Slate-Tools hat Fehler aufgrund „nicht gespeicherter Daten“ vollständig beseitigt. Wenn Editoren beim Schließen automatisch speichern – gestützt durch eine strenge Validierung, die das Schreiben beschädigter Daten verhindert –, steht das Tool dem Designer nicht mehr im Weg.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| Lokale Cloud-Infrastruktur & Kampfberechnungen | ✅ Festgelegt (Beitrag 21) |
| **Rucksack-Inventar, „Click-to-Loot“ & Levelaufstieg** | ✅ **Festgelegt** |
| Quests, „Click-to-Move“ & Feinschliff der Autoplay-Funktion | ⏳ Als Nächstes (Beitrag 23) |
| Die MH-Framework-Architektur | ⏳ Geplant (Beitrag 24) |
| Steam-Packet-Authentifizierung & Sicherheit | ⏳ Geplant (Beitrag 25) |

Nachdem die Spieler nun über Ausrüstung und Stufen verfügen, brauchen wir eine Struktur: ein zielorientiertes Questsystem, eine butterweiche, clientseitige „Click-to-Move“-Wegfindung sowie eine Anpassung des Lebenszyklus des Spieler-StateTree, damit der automatische Kampf und die manuelle Steuerung nahtlos ineinander übergehen.

---

*Arc-Commits: `f7e6570`, `6bae296`, `b69cb5f`, `6070d41`. Zugehörige Dokumente: `Docs/Inventory/Inventory_System.md`, `Docs/Player/Leveling_System.md`, `Docs/Tools/Item_Loot_Editor.md`.*
