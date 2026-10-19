---
id: "onset20"
title: "🎬 Entwickler-Tagebuch: Die „Ability Workbench“ – Slate-Tabellen, datengesteuerte Zauber und räumliche Spawner"
seoTitle: "Die „Ability Workbench“, „Slate“, Tabellenkalkulationen, datengesteuerte Zaubersprüche und räumliche Spawner"
date: "2026-10-23"
category: "Game Dev"
summary: "Überarbeitet fest programmierte Kampffähigkeiten zu einer datengesteuerten Pipeline unter Verwendung von DT_Abilities, UOnsetGA_Generic und komponierbaren Sprungbewegungen. Erstellt eine Slate-Tabellenkalkulations-Workbench im Editor mit dynamischen Spaltenbreiten, vorübergehender PropertyView-Prüfung, Live-PIE-Hot-Reloading und visuellen Spawner-Point-Helfern."
project: "Onset"
tags: ["Unreal Engine", "Gameplay Ability System", "Slate", "Editor Tooling", "Data-Driven Design", "Combat Systems"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

In den Beiträgen 16 und 18, als ich die erste Phase der Kampffähigkeiten hinzufügte – den Flächenangriff, den frontalen Kegel und „Schattenschritt“ –, war jede einzelne davon eine eigene, maßgeschneiderte C++-Klasse. Wenn ich eine Fähigkeit wollte, die in einem Kreis von 400 Einheiten Feuerschaden verursachte, musste ich eine Unterklasse von `UOnsetGameplayAbility` erstellen, Konstruktor-Bindungen schreiben, Effektklassen fest einprogrammieren, ein Blueprint-Kind erstellen und es mit dem Charakter verknüpfen. Es funktionierte zwar, aber es kam mir jedes Mal so vor, als müsste ich ein Engine-Modul schreiben, wenn ich einen Zauber entwerfen wollte.

Schlimmer noch: Das Anpassen von Zahlen erforderte eine Neukompilierung oder das Durchforsten von fünf Ebenen verschachtelter Blueprint-Asset-Fenster. Wenn dieses Spiel jemals Dutzende unterschiedlicher Fähigkeiten, gegnerspezifische Ausrüstungssets oder schnelle Anpassungen der Kampfbalance bieten sollte, waren fest programmierte Klassen eine Sackgasse.

In vier Tagen und elf Commits habe ich die Architektur der Fähigkeiten von fest programmierten Klassen zu einer vollständig **datengesteuerten Fähigkeiten-Pipeline** umgestaltet. Zur Laufzeit liest eine einzige generische Fähigkeitsklasse (`UOnsetGA_Generic`) Konfigurationszeilen aus `DT_Abilities` aus und übernimmt die Verarbeitung von Zielformen, Reichweitenbegrenzungen, Sichtlinienprüfungen und parabolischen Sprungbewegungen. Im Editor habe ich eine benutzerdefinierte, auf Slate basierende Arbeitsumgebung erstellt – eine Tabellenkalkulation direkt im Editor mit dynamischer Spaltenanpassung und Live-Eigenschaftsprüfung –, sodass das Erstellen und Ausbalancieren von Fähigkeiten in Sekundenschnelle erfolgt, ohne dass C++ oder die manuelle Bearbeitung von rohen DataTables erforderlich ist.

---

## Technische Erläuterung

### Die Unterscheidung zwischen Parametern und Logik bei Spielfähigkeiten

Im Unreal Gameplay Ability System (GAS) verfallen Entwickler oft in eines von zwei Extremen:
1. **Die Blueprint-Flut:** Es werden Hunderte winziger Blueprint-Unterklassen von `UGameplayAbility` erstellt, jede mit doppelten Ereignisgraphen für Reichweitenprüfung, Zielerfassung und die Anwendung von Effekten.
2. **Der C++-Monolith:** Das Schreiben einer eigenen C++-Klasse für jede einzelne Fähigkeit, was bei Anpassungen der Spielbalance zu enormen Neukompilierungszeiten führt.

Der entscheidende Punkt besteht darin, die **Dispatch-Logik** von der **Parameteranpassung** zu trennen:

```
+-------------------------------------------------------------+
|                        DT_Abilities                         |
|   (Row: DisplayName, Shape, Range, Radius, Cooldown, FX)   |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                      UOnsetGA_Generic                       |
|  - Spatial Query (SingleTarget / AoE / PB-AoE / Cone)      |
|  - Range & Line-of-Sight Gating                             |
|  - Optional Composable Movement (Parabolic Leap)           |
|  - Shared Effect Application (Damage / Snare / Slow)        |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                 Gameplay Effects & Execution                |
|       (GE_GenericDamage, GE_GenericSnare, SetByCaller)      |
+-------------------------------------------------------------+
```

`UOnsetGA_Generic` ist für die Ausführungsregeln zuständig. Es fragt die Datentabelle ab:
* *Welche Form hat dieser Effekt?* (`SingleTarget`, `AoE`, `PointBlankAoE` oder `Cone`)
* *Ist eine Bewegung des Zaubernden damit verbunden?* (`None` oder `Leap`)
* *Welche Effekte sollen angewendet werden?* (Ein Array aus Stärken, Dauer und Schadens-Tags)

Da alles über `FOnsetAbilityDefinition` abgewickelt wird, sind neue Fähigkeiten einfach nur Zeilen in einer Tabelle.

### Überprüfung vor der Festlegung

Ein klassischer Fehler in Top-Down-ARPGs ist die „Fizzle-Strafe“: Ein Spieler klickt auf eine Fähigkeit, während sich sein Ziel leicht außerhalb der Reichweite befindet oder hinter einer Säule in Deckung gegangen ist; die Fähigkeit trifft nicht, aber GAS verbraucht dennoch Mana und löst die volle Abklingzeit aus.

Um dies zu verhindern, erzwingt `UOnsetGA_Generic` eine strenge **Prüfung vor dem Commit**:
1. Vorhandensein und Lebensfähigkeit des Ziels (Prüfung von `IsAlive` über die Zielkomponente).
2. Reichweiten- und Abstandsprüfungen (mithilfe von sphärischen Abtastungen vom Zaubernden zum Ziel bzw. zum Boden).
3. Raycasts zur Überprüfung der Sichtlinie gegen statische Kollisionen in der Spielwelt.

Erst wenn alle Raum- und Zustandsprüfungen erfolgreich sind, ruft die Fähigkeit `CommitAbility()` auf. Wenn eine Prüfung fehlschlägt, wird die Fähigkeit ordnungsgemäß beendet, ohne dass Ressourcenkosten anfallen oder eine Abklingzeit-Strafe verhängt wird.

### Warum eine maßgefertigte Werkbank aus Schiefer bauen?

Der standardmäßige DataTable-Editor von Unreal ist für flache Daten ausgelegt. Sobald verschachtelte Strukturen zum Einsatz kommen – wie beispielsweise ein Array von `FOnsetAbilityEffect`- oder optionale `FOnsetAbilityMovement`-Parameter –, verwandelt sich die Standard-Baumansicht in ein unübersichtliches Durcheinander aus winzigen Aufklappdreiecken.

Ich wollte einen Editor, der sich wie eine richtige Arbeitsumgebung für das Spieldesign anfühlt:
* Eine übersichtliche Tabellenansicht auf der linken Seite, in der wichtige Werte (ID, Typ, Eingabe, Abklingzeit, Reichweite) auf einen Blick erkennbar sind, mit dynamischen Spaltenbreiten, die sich an die Textlänge anpassen.
* Ein kontextbezogenes Detailfenster auf der rechten Seite, das mithilfe von Unreals `PropertyView` (`UDetailsView`) automatisch übersichtliche Eigenschaftsfelder generiert.
* Sofortiges Hot-Reloading: Ein Klick auf „Speichern“ speichert die DataTable auf der Festplatte und leert sofort den zwischengespeicherten Registrierungsdatensatz von `UOnsetAbilityLibrary`, sodass „Play-In-Editor“ (PIE)-Tests neue Fähigkeiten erfassen, ohne den Editor neu starten zu müssen.

---

## Details zur Umsetzung

### 1. Das datengesteuerte Schema (`OnsetAbilityTypes.h`)

Der zentrale Konfigurationsvertrag ist in `FOnsetAbilityDefinition` enthalten. Beachten Sie, wie optionale Verhaltensweisen wie `FOnsetAbilityMovement` übersichtlich gekapselt sind:

```cpp
UENUM(BlueprintType)
enum class EOnsetAbilityType : uint8
{
    SingleTarget    UMETA(DisplayName = "Single Target"),
    AoE             UMETA(DisplayName = "AoE"),
    PointBlankAoE   UMETA(DisplayName = "Point Blank AoE"),
    Cone            UMETA(DisplayName = "Cone")
};

USTRUCT(BlueprintType)
struct FOnsetAbilityEffect
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Effect")
    EOnsetAbilityEffectType Type = EOnsetAbilityEffectType::Damage;

    /** Damage: amount | Snare: move-speed mult (< 1) | Slow: cooldown mult (> 1). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Effect")
    float Magnitude = 0.0f;

    /** 0 = instant (Damage); > 0 = debuff window (Snare/Slow). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Effect")
    float Duration = 0.0f;

    /** Damage.Physical | Damage.Magical (Damage effects only). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Effect")
    FGameplayTag DamageTypeTag;
};

USTRUCT(BlueprintType)
struct FOnsetAbilityDefinition : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ability")
    FText DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ability")
    TSoftObjectPtr<UTexture2D> AbilityIcon;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ability")
    EOnsetAbilityType AbilityType = EOnsetAbilityType::SingleTarget;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ability")
    float CooldownSeconds = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ability")
    FGameplayTag CooldownTag;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ability")
    FOnsetAbilityMovement Movement;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ability")
    TArray<FOnsetAbilityEffect> Effects;
};
```

### 2. Kombinierbare Sprünge in `UOnsetGA_Generic`

Bei „Jump-Slam“-Fähigkeiten berechnet `UOnsetGA_Generic` eine sanfte parabolische Kurve in Richtung der erfassten Koordinaten des Ziels, anstatt eine benutzerdefinierte `RootMotionSource` zu schreiben oder eine manuelle Tick-Schleife für den Charakter zu programmieren. 

Der Bogen berechnet den horizontalen Fortschritt linear und wendet dabei einen normalisierten Sinus-Versatz auf die vertikale Höhe an:

```cpp
void UOnsetGA_Generic::TickLeap(float DeltaTime)
{
    LeapElapsed += DeltaTime;
    const float Alpha = FMath::Clamp(LeapElapsed / CurrentDefinition.Movement.LeapDuration, 0.0f, 1.0f);

    // Linear horizontal interpolation between start and target landing spot
    FVector CurrentPos = FMath::Lerp(LeapStartLocation, LeapTargetLocation, Alpha);

    // Parabolic arc: peak elevation at Alpha = 0.5
    const float HeightOffset = FMath::Sin(Alpha * PI) * CurrentDefinition.Movement.LeapArcHeight;
    CurrentPos.Z += HeightOffset;

    if (ACharacter* Char = Cast<ACharacter>(GetAvatarActorFromActorInfo()))
    {
        Char->SetActorLocation(CurrentPos, true);
    }

    if (Alpha >= 1.0f)
    {
        FinishLeapAndResolveEffects();
    }
}
```

Bewegt sich das Ziel, während sich der Zaubernde in der Luft befindet, landet der Sprung dort, wo sich das Ziel zu Beginn der Fähigkeit *befand* – wodurch bewegliche Gegner belohnt werden und der Sprungangriff gleichzeitig eine gut erkennbare Vorwarnung bietet.

### 3. Die benutzerdefinierte Slate-Arbeitsfläche (`UOnsetAbilityEditorWidget`)

Um benutzerdefinierte DataTable-Zeilen in der nativen PropertyView von Unreal anzuzeigen, ohne für jeden einzelnen Datentyp ein maßgeschneidertes Slate-Widget erstellen zu müssen, habe ich ein Muster mit einem transienten Wrapper-Objekt verwendet:

```cpp
/**
 * Transient UObject exposing a single row to the PropertyView so the details panel
 * auto-generates the edit form (asset pickers, enums, number fields).
 */
UCLASS(Transient)
class UOnsetAbilityEditRowWrapper : public UObject
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ability")
    FOnsetAbilityDefinition Definition;
};
```

Wenn der Designer im Editor-Widget auf eine Zeile in der Tabellenliste auf der linken Seite klickt, kopiert `SelectRow()` die Daten der Tabellenzeile in `EditWrapper->Definition` und übergibt sie an `PropertyView->SetObject(EditWrapper)`. Die Engine zeichnet sofort alle Dropdown-Menüs, Farbauswahlfelder und Asset-Auswahlfelder, ohne dass manueller UI-Code erforderlich ist:

```cpp
void UOnsetAbilityEditorWidget::SelectRow(FName RowName)
{
    SelectedRowName = RowName;
    if (FOnsetAbilityDefinition* Row = CachedTable->FindRow<FOnsetAbilityDefinition>(RowName, TEXT("AbilityEditor")))
    {
        EditWrapper->Definition = *Row;
        PropertyView->SetObject(EditWrapper);
        HighlightSelectedButton(RowName);
    }
}
```

Wenn auf „Speichern“ geklickt wird, wird der Inhalt des Wrappers zurück in die zwischengespeicherte DataTable kopiert, `CachedTable->MarkPackageDirty()` wird aufgerufen, und `UOnsetAbilityLibrary::RefreshRegistry()` lädt die Definitionen sofort per Hot-Reload in den PIE-Speicher.

### 4. Visuelle Spawner-Werkzeuge

Im Zuge der Überarbeitung der Editor-Tools habe ich mich mit der Einrichtung des Spawners in `AOnsetSpawner` befasst. Bisher mussten für die Konfiguration von Spawn-Packs mit mehreren NPCs die 3D-Offset-Vektoren manuell in ein Array eingegeben werden.

Ich habe `AOnsetSpawner` um Hilfsfunktionen für die Erstellung im Editor erweitert, die `USpawnPointComponent`-Gizmos im Ansichtsfenster automatisch instanziieren:

```cpp
void AOnsetSpawner::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);

    // Auto-generate visual spawn markers in the editor viewport
    SynchronizeSpawnPointComponents();
}
```

Entwickler können nun im Level-Editor die visuellen Diamanten, die die Spawn-Punkte darstellen, einfach über das Terrain ziehen, und der Spawner liest deren Welt-Transformationen zur Laufzeit automatisch aus.

---

## Ergebnisse und Validierung

Nach der Umsetzung der Änderungen:
1. **Zugriff auf das Tool:** Wenn ihr in Unreal die obere Menüleiste öffnet und **Tools $\rightarrow$ Onset Ability Editor** auswählt, wird die benutzerdefinierte Registerkarte „Nomad“ geöffnet.
2. **Benutzeroberfläche der Tabelle:** Die Tabelle zeigt „Name“, „Typ“, „Eingabe“, „Abklingzeit“ und „Reichweite“ in übersichtlichen, sich automatisch anpassenden Spalten an. Ein Klick auf einen beliebigen Eintrag füllt das rechte Fenster sofort aus.
3. **Fähigkeitsablauf im Spiel:**
   * Die Fähigkeit `LeapSlam` wurde zugewiesen: Springt in 0,4 Sekunden 800 Einheiten quer durch die Arena, landet mit einer Kamerabewegung, verursacht einen physischen Schadensausbruch mit einem Radius von 350 und verlangsamt die Bewegung um 30 % für 3,5 Sekunden.
   * Der Versuch, die Fähigkeit über `LeapMaxRange` hinaus oder bei Behinderung durch die Levelgeometrie einzusetzen, schlägt sofort fehl, ohne Mana zu verbrauchen oder eine Abklingzeit auszulösen.
4. **Hot-Reloading:** Ich habe `LeapArcHeight` im Editor von 200 auf 450 geändert, auf „Speichern“ geklickt und Alt+P gedrückt. Der Charakter sprang beim nächsten Sprung sofort doppelt so hoch.

---

## Herausforderungen und Lösungen

### Herausforderung 1: Die „TakeWidget()“-Snapshot-Falle

**Problem:** In C++ erstellte Editor-Utility-Widgets erben von `UEditorUtilityWidget` (das wiederum von `UUserWidget` abgeleitet ist). Beim ersten Aufruf von `TakeWidget()` beim Öffnen eines Tabs erstellt Unreal einen internen Slate-Wrapper-Snapshot. Wenn Sie Ihre Widget-Hierarchie nach diesem Zeitpunkt verzögert innerhalb von Slate-Callbacks aufbauen, öffnet sich die Nomad-Registerkarte leer oder es werden Duplikate gerendert.

**Lösung:** In `UOnsetAbilityEditorWidget::OpenEditor()` habe ich sichergestellt, dass `BuildUI()` explizit aufgerufen wird, um die übergeordneten Elemente `SVerticalBox`, `SSplitter` und `UDetailsView` *vor* dem Aufruf von `TakeWidget()` durch die Nomad-Registerkarte zu erstellen.

### Herausforderung 2: Garbage Collection – Die zwischengespeicherte Tabelle wird gestohlen

**Problem:** Wenn die Editor-Registerkarte mehrere Minuten lang geöffnet blieb, führte das Klicken auf „Speichern“ gelegentlich zu einem Absturz des Editors. Der Garbage Collector von Unreal löschte den Zeiger `CachedTable`, da Editor-Registerkarten nicht Teil des normalen Serialisierungsgraphen der Spielwelt sind.

**Lösung:** `UPROPERTY(Transient)` wurde zu `CachedTable` hinzugefügt und `EditWrapper->AddToRoot()` wurde während der Erstellung des Widgets registriert, mit einem entsprechenden `RemoveFromRoot()` in `BeginDestroy()`.

---

## Reflexion und gewonnene Erkenntnisse

Eine datengesteuerte Architektur ist nur so gut wie die Tools, mit denen die Daten erstellt werden. Monatelang habe ich die manuelle Bearbeitung von DataTables in Kauf genommen, weil „es vorerst funktioniert“. Doch nachdem ich zwei Tage damit verbracht hatte, eine spezielle Slate-Workbench zu entwickeln, hat sich die Entwicklungsgeschwindigkeit des gesamten Projekts grundlegend verändert.

Ich wünschte, Unreal würde den `UOnsetAbilityEditRowWrapper`-Trick deutlicher dokumentieren. Anstatt Slate-Schieberegler, Asset-Picker und Farbfelder von Hand zu programmieren, kann man jede beliebige C++-Struktur in ein transientes `UObject` einbinden und `UDetailsView` eine makellose, professionelle Editor-Oberfläche dafür generieren lassen.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A4.6 – Fest programmierte Kampffähigkeiten | ✅ Festgelegt (Beiträge 16–18) |
| Persistenz – Identitätssichere Speicherstände | ✅ Fertiggestellt (Beitrag 19) |
| **Datengesteuerte Fähigkeiten & Fähigkeits-Workbench** | ✅ **Fertiggestellt** |
| Lokale DynamoDB-Infrastruktur & Kampfberechnungen | ⏳ Als Nächstes (Beitrag 21) |
| Rucksack-Inventar, „Click-to-Loot“ & Levelaufstieg | ⏳ Geplant (Beitrag 22) |

Da das Erstellen von Fähigkeiten nun nur noch Sekunden dauert, ist der nächste Engpass die Tiefe des Kampfsystems: Wir benötigen Heilung, Damage-over-Time (DoTs), eine Skalierung der Ausrüstungswerte und eine zuverlässige Kampfberechnungs-Engine. Was die Infrastruktur angeht, verlangsamt die Entwicklung mit entfernten AWS-Cloud-Tabellen den Iterationsprozess – es ist an der Zeit, DynamoDB lokal zu nutzen.

---

*Arc-Commits: `8bd187c`, `f9763e0`, `87af332`. Zugehörige Dokumente: `Docs/EditorToolPlan.md`, `Docs/Gameplay/Ability_Targeting_System.md`.*
