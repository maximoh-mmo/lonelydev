---
id: "onset18"
title: "🎬 Entwicklertagebuch: HUD v2 – Bodenabzielkreuze, Ziel-Skins und die Content-Pipeline"
seoTitle: "HUD v2: Bodenabsehen, Ziel-Skins und die Content-Pipeline"
date: "2026-10-16"
category: "Game Dev"
summary: "Überarbeitung des HUDs mit einem Fadenkreuz in Form eines Bodendekals unter den Füßen des Ziels (anstelle der Bildschirmprojektion), zielspezifische Skins (Normal/Elite/Boss), die die Materialien der Lebensbalken und die Decal-Farben steuern, einen statischen, am Designer verankerten Lebensbalken für Ziele, datengesteuerte Fähigkeitssymbole aus Blueprint-CDOs sowie eine Umstrukturierung der Inhalte in „Content/Maps“ und „Content/Game/Combat“ mit festgelegten Asset-Pfaden."
project: "Onset"
tags: ["Unreal Engine", "HUD", "UI", "Decal System", "Data-Driven UI", "Content Pipeline", "DPI Scaling"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Post 17 hat ein HUD erstellt und es als Grundlage bezeichnet. Das war es auch – aber Grundlagen dienen dazu, darauf aufzubauen, und der v2-Commit (sowie eine Überarbeitung am nächsten Tag) hat einige der Annahmen aus v1 über den Haufen geworfen. Das Bildschirm-Fadenkreuz, das ich für den Zielrahmen skizziert hatte? Weg, ersetzt durch ein Bodendekal, das sich tatsächlich unter den Füßen des Ziels befindet. Die Lebensanzeige des Ziels, die eigentlich über der Spielwelt schweben sollte? Stattdessen statisch im HUD verankert, mit Skins für Normal-, Elite- und Boss-Ziele. Die Fähigkeits-Slots erhielten echte Symbole, die von den Fähigkeits-Blueprints gesteuert werden, und der gesamte Inhaltsbaum wurde aus einem flachen `Content/`-Stammverzeichnis in `Content/Maps` und `Content/Game/Combat` neu organisiert.

In diesem Beitrag geht es weniger um „neue Systeme“ als vielmehr um den zweiten Durchgang – den, bei dem man einräumt, dass der erste Instinkt bezüglich der Benutzeroberfläche falsch war, die Struktur an das tatsächliche Spielgefühl anpasst und die Fehler im Koordinatensystem behebt, die nur bei hoher DPI-Einstellung auftreten.

---

## Technische Darstellung

### Zwei Ansätze zur Zielrückmeldung

In Version 1 (Beitrag 17) war der Zielrahmen ein schwebendes Element, das den Gegner im Weltraum verfolgen sollte. Fadenkreuze im Bildschirmraum sind der klassische ARPG-Ansatz – das HUD platziert einen Marker über dem Kopf des Ziels. Sie sehen auf Screenshots großartig aus, fühlen sich in der Praxis jedoch falsch an: Sie flackern, verzögern die Bewegung des Ziels durch eine Neuprojektion und lenken die Aufmerksamkeit des Spielers vom Charakter ab.

v2 kehrt diese Philosophie um. **Der Marker bewegt sich in die Spielwelt hinein** – als Decal-Komponente auf dem Zielcharakter selbst, sodass er von der Spielwelt direkt zu Füßen des Charakters gerendert wird, vollkommen stabil und ohne jegliche Projektion. Und **die Lebensanzeige bleibt im HUD** – einmalig oben in der Mitte verankert und liest die Gesundheit des Ziels über die vorhandenen Attribut-Delegaten aus. Die beiden Hälften des „Ziel-Feedbacks“ teilen sich entlang der Achse auf, die jede von ihnen stabil macht: weltbezogene Grafiken für die Position, bildschirmbezogene Grafiken für Informationen.

### Warum die Umstrukturierung der Inhalte?

Durch den Commit wurde `DemoLevel.umap` in den Ordner `Content/Maps/` und die Blueprints in den Ordner `Content/Game/Combat/` verschoben. Dafür gab es zwei Gründe. Erstens war der flache Stammordner `Content/` bereits überfüllt – allein die Combat-GEs benötigten mehr als 9 Dateien. Zweitens sind in C++ mehrere Asset-Pfade über `ConstructorHelpers::FObjectFinder` und `LoadObject` fest codiert, sodass die Struktur ein für alle Mal festgelegt und festgeschrieben werden musste. Das Checklisten-Dokument, das ich dazu verfasst habe (`UI_ASSET_CHECKLIST.md`), legt diese Pfade nun fest, sodass sie als verbindliche Vorgabe gelten und nicht dem Zufall überlassen sind.

---

## Details zur Umsetzung

### 1. Der Aufkleber mit dem Bodenabsehen

Jedes Objekt verfügt nun in seinem Konstruktor über eine `UDecalComponent`:

```cpp
TargetReticleDecal = CreateDefaultSubobject<UDecalComponent>(TEXT("TargetReticleDecal"));
TargetReticleDecal->SetupAttachment(GetCapsuleComponent());
TargetReticleDecal->SetRelativeRotation(FRotator(-90.0f, 0.0f, 0.0f));
TargetReticleDecal->SetRelativeLocation(FVector(0.0f, 0.0f, -(GetCapsuleComponent()->GetScaledCapsuleHalfHeight() + 60.0f)));
TargetReticleDecal->DecalSize = FVector(120.0f, 50.0f, 50.0f);
TargetReticleDecal->SetHiddenInGame(true);
```

Es ist zunächst ausgeblendet. Mit `SetTargetReticle(bool)` wird es ein- oder ausgeblendet, und solange es sichtbar ist, projiziert der Charakter es bei jedem Tick neu, sodass es sich dem Gelände anpasst:

```cpp
void AOnsetBaseCharacter::UpdateTargetReticle()
{
    const FVector TraceStart = GetCapsuleComponent()->GetComponentLocation();
    const FVector TraceEnd = TraceStart - FVector(0.0f, 0.0f, 2000.0f);

    FHitResult Hit;
    FCollisionQueryParams QueryParams(FName(TEXT("TargetReticleTrace")), false, this);
    QueryParams.bTraceComplex = false;

    if (GetWorld()->LineTraceSingleByChannel(Hit, TraceStart, TraceEnd, ECC_Visibility, QueryParams) && Hit.bBlockingHit)
    {
        const float Radius = GetCapsuleComponent()->GetScaledCapsuleRadius();
        constexpr float ReticleDepth = 80.0f;

        // Decals project along local +X, so point +X against the surface normal.
        const FRotator SurfaceRotation = FRotationMatrix::MakeFromX(-Hit.ImpactNormal).Rotator();

        // Slight margin above the surface so the ground plane is strictly inside the box.
        const FVector ReticleCenter = Hit.ImpactPoint - Hit.ImpactNormal * (ReticleDepth - 5.0f);
        TargetReticleDecal->SetWorldLocationAndRotation(ReticleCenter, SurfaceRotation);
        TargetReticleDecal->DecalSize = FVector(ReticleDepth, Radius * 1.4f, Radius * 1.4f);
    }
}
```

Ein paar Details machen hier den Unterschied zwischen „funktioniert“ und „sieht richtig aus“:
- Decals projizieren entlang **local +X**, daher wird die Oberflächenrotation aus der *negierten* Normalen berechnet (`MakeFromX(-ImpactNormal)`).
- Die Decal-Box hat Tiefe, daher wird sie um `ReticleDepth - 5` versenkt, damit ihre Oberseite an der Oberfläche bleibt, ohne in die Kapsel des Charakters hineinzuragen.
- Der Radius wird aus der Kapsel des Charakters abgeleitet, sodass ein Boss mit einer dicken Kapsel automatisch einen größeren Ring erhält.

### 2. Zieltyp pro Zeichen

Jeder Charakter verfügt über eine `TargetType`-Enumeration (Normal / Elite / Boss), die vom Designer im Editor festgelegt wird:

```cpp
UENUM(BlueprintType)
enum class ETargetType : uint8
{
    Normal  UMETA(DisplayName = "Normal"),
    Elite   UMETA(DisplayName = "Elite"),
    Boss    UMETA(DisplayName = "Boss")
};
```

Wenn das Ziel-HUD ein Ziel erfasst, liest es den Typ aus und übergibt ihn an den Blueprint, damit die Lebensanzeige das Skin wechseln kann:

```cpp
void UTargetHUDWidget::SetTarget(AOnsetBaseCharacter* InTarget)
{
    // ... unbind previous target ASC, retire its ground reticle ...
    TrackedTarget = IsValid(InTarget) ? InTarget : nullptr;

    if (TrackedTarget)
    {
        TrackedTarget->SetTargetReticle(true);
        TargetType = TrackedTarget->TargetType;
        // ...
        OnTargetAcquired(TargetType);
    }
    else
    {
        TargetType = ETargetType::Normal;
        OnTargetCleared();
    }
    RefreshHealth();
    SetVisibleState(TrackedTarget != nullptr);
}
```

`OnTargetAcquired(ETargetType)` ist ein `BlueprintImplementableEvent` – das WBP_TargetHUD reagiert darauf, indem es das Füllmaterial bzw. die Farben seiner Lebensanzeige für diese Stufe anpasst. Das Decal erhält zudem eine klassenbezogene Materialüberschreibung (`TargetReticleMaterial`), sodass ein Elite-Gegner einen andersfarbigen Ring haben kann als ein einfacher Gegner.

### 3. Die statische Lebensanzeige des Ziels

Die Lebensleiste ist nun explizit **statisch** – sie ist einmalig an einer festgelegten Position verankert (oben in der Mitte von WBP_HUD) und folgt niemals dem Ziel. In der Kopfzeile wird dies als bewusste Entscheidung dokumentiert:

> *Das Widget bewegt sich NICHT und folgt dem Ziel auch nicht – der Designer verankert es einmalig. Es wird für jeden Gegner/Boss verwendet; das WBP wählt ein „Skin“ basierend auf dem offengelegten TargetType aus, sobald ein Ziel erfasst wird. Das Fadenkreuz im Bildschirmbereich ist verschwunden: Stattdessen markiert ein Bodenaufkleber auf dem Ziel-Actor das aktuelle Ziel.*

„Health Fill“ ist ein Shader-Material in WBP_TargetHUD, das von `TargetHealthPercent` gesteuert und über den Delegaten des Health-Attributs des Ziel-ASC aktualisiert wird – dasselbe `RefreshHealth`-Muster wie in Version 1. Die einzige Änderung an der Logik besteht darin, dass sich das Widget automatisch löscht, wenn das verfolgte Ziel stirbt:

```cpp
void UTargetHUDWidget::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
    if (!IsValid(TrackedTarget) || !TrackedTarget->IsAlive())
    {
        if (TrackedTarget)
        {
            SetTarget(nullptr);
        }
        else
        {
            SetVisibleState(false);
        }
    }
}
```

Töte das Ziel, und die Lebensanzeige verschwindet – keine Projektion, kein Hinterherlaufen hinter einer Leiche.

### 4. Datengesteuerte Fähigkeitsplätze

Die Slot-Abfrage der Fähigkeitsleiste wurde von „ASC anhand der Eingabe-ID abfragen“ auf „ASC abfragen und anschließend den Blueprint der Fähigkeit nach dem Symbol und dem Abklingzeit-Tag durchsuchen“ umgestellt. `RebuildSlots` ruft nun beides aus dem CDO der Fähigkeit ab:

```cpp
if (UOnsetGameplayAbility* AbilityCDO = Cast<UOnsetGameplayAbility>(Spec->Ability))
{
    Entry.Widget->SetAbility(AbilityCDO->AbilityIcon, AbilityCDO->GetPrimaryCooldownTag());
    Entry.CooldownTag = AbilityCDO->GetPrimaryCooldownTag();
}
```

Die Symbole stammen aus `UOnsetGameplayAbility::AbilityIcon` – einem `TSoftObjectPtr<UTexture2D>`, das pro Fähigkeit in ihrem Blueprint festgelegt wird. Slots werden als gesperrt/leer dargestellt, wenn für diese Eingabe-ID keine Fähigkeit zugewiesen ist. Die Datei `UI_ASSET_CHECKLIST.md` des Designers legt genau fest, welche Blueprint-Eigenschaft welchen Slot versorgt.

### 5. Korrekturen zur Anpassung von DPI und Geometrieskala

Das HUD der Version 1 wies einen versteckten Fehler auf, auf den ich hingewiesen hatte: `ProjectWorldLocationToScreen` gibt Viewport-Pixel zurück, UMG positioniert Widgets jedoch in Layout-Einheiten. In Version 2 wurde das Problem endgültig behoben, indem durch den Geometrieskalenfaktor des Widgets dividiert wurde:

```cpp
const float GeometryScale = GetCachedGeometry().Scale > 0.0f ? GetCachedGeometry().Scale : 1.0f;
OutScreenPos = ViewportPixels / GeometryScale;
```

Dies ist die Korrektur, die dafür sorgt, dass Schadenswerte mit 150 % DPI auf ihren Zielen landen, anstatt um eine Zeichenbreite daneben zu liegen. Ich habe ein einmaliges Diagnoseprotokoll hinterlassen, um Regressionen zu erkennen – eine `[HUDDiag]`-Zeile, die die erste Projektion, die Viewport-Größe, den DPI-Maßstab und den Geometrie-Maßstab zusammen protokolliert.

---

## Ergebnisse und Validierung

- **Bodenabzielkreuz** — Dekal unter den Füßen des Ziels, wird pro Frame neu projiziert, um dem Gelände zu folgen; Radius wird an die Kapsel des Charakters angepasst, Material kann pro Klasse überschrieben werden
- **Ziel-Skins** — `ETargetType` bestimmt den Skin der Lebensanzeige sowie das Dekal-Material bei Zielerfassung
- **Statische Lebensanzeige** — vom Designer verankert, wird beim Tod des Ziels automatisch gelöscht, keine Projektionskosten
- **Fähigkeitsslots** — Symbole + Abklingzeit-Tags werden über `AbilityIcon` aus den Fähigkeits-Blueprints gelesen
- **Content-Pipeline** — `Content/Maps` + `Content/Game/Combat`, Pfade in der UI-Asset-Checkliste festgehalten
- **DPI-Korrektur** — Schadenszahlen werden bei hoher DPI durch Division der Geometrieskalierung ausgerichtet

Die Ziel-Rückkopplungsschleife sieht nun endlich fertig aus: ein stabiler Ring unter dem Gegner, eine übersichtliche Lebensanzeige am oberen Bildschirmrand und Schadenszahlen, die genau dort erscheinen, wo die Treffer landen.

---

## Herausforderungen und Lösungen

### Das Bildschirm-Fadenkreuz war ein Fehlgriff

**Problem:** Der Plan für Version 1 sah einen am HUD befestigten Marker vor, der über das Ziel projiziert wurde. In der Praxis flackerte dieser jedoch, verursachte durch die erneute Projektion Verzögerungen beim Ziel und wirkte während der Action wie Störgeräusche.

**Lösung:** Verschieben Sie den Marker als Decal, das dem Ziel-Akteur gehört, in die Spielwelt. Da er im Weltraum gerendert wird, ist er vollkommen stabil und seine Projektion verursacht keine Kosten. Die Informationen (Gesundheit) bleiben im HUD, wo sie hingehören. Diese Trennung – Weltgrafiken für die Position, Bildschirmgrafiken für Informationen – ist nun die Leitregel für alle Ziel-Benutzeroberflächen.

### Aufkleber haben eine Projektionsachse, keine Oberfläche

**Problem:** Wenn man ein Abziehbild auf eine aus `+ImpactNormal` erstellte Rotation anbrachte, wurde der Ring seitlich oder durch den Boden hindurch gerendert.

**Lösung:** Decals werden entlang der lokalen +X-Achse projiziert, daher muss die Drehung von `-ImpactNormal` ausgehen, und das Decal muss um seine eigene Tiefe versenkt werden, damit seine Oberseite bündig mit der Oberfläche abschließt. Beide Details sind in `UpdateTargetReticle` dokumentiert, da sie nicht offensichtlich sind und leicht falsch „korrigiert“ werden können.

### Inhaltspfade wurden zu einer Vereinbarung

**Problem:** In C++ sind die Pfade zu den Assets (`/Game/Game/Combat/GA_AoE` usw.) für die Ability-Blueprints fest codiert. Würde ein Designer ein Asset verschieben, würde dies die Suche stillschweigend unterbrechen und das System würde auf die C++-Klasse ohne Symbol zurückgreifen.

**Lösung:** Das Dokument `UI_ASSET_CHECKLIST.md` legt jeden Pfad und jeden Bind-Namen als Voraussetzung fest, und `GrantDefaultAbilities` sorgt dafür, dass die C++-Klasse als Fallback dient, sodass das Spiel auch dann noch läuft (allerdings ohne Symbole), wenn ein Asset fehlt. Die Vereinbarung ist eindeutig; der Fehler wird elegant abgefangen.

---

## Reflexion und gewonnene Erkenntnisse

Die wichtigste Erkenntnis aus Version 2: **Dein erster Instinkt in Bezug auf die Benutzeroberfläche ist eine Hypothese, kein Plan.** Das Fadenkreuz im Bildschirmbereich funktionierte auf dem Papier, versagte aber auf dem Bildschirm – und mir wurde erst bewusst, wie sehr, als ich die Version mit dem Bodenaufkleber direkt daneben sah. Die Überarbeitung war nicht aufwendig – das Decal war bereits in der Charakterklasse vorhanden, die Delegaten waren bereits im ASC vorhanden –, da die zugrunde liegenden Systeme von Anfang an auf den richtigen Abstraktionen aufgebaut waren.

Die Enumeration `ETargetType` ist ein winziges Stück Code von enormem Wert. Sie bildet die Schnittstelle, über die die Designer das Aussehen von Bossen individuell anpassen können, ohne den Gameplay-Code zu verändern, und sie verkörpert denselben datengesteuerten Ansatz, der sich durch das gesamte Projekt zieht – das Asset soll der Benutzeroberfläche mitteilen, was angezeigt werden soll.

Die Umstrukturierung der Inhalte ist der am wenigsten spektakuläre Commit in diesem Beitrag, aber wohl der wichtigste für die Zukunft des Projekts. Ein Stammverzeichnis `Content/` mit 50 flachen Assets ist der Ort, an dem Spiele ihr Ende finden; `Content/Maps` + `Content/Game/Combat` ist eine Struktur, die skalierbar ist. Indem ich die Pfade in einem Checklisten-Dokument festhalte, bleibt die Struktur auch dann erhalten, wenn ich mich nicht mehr daran erinnern kann, wo sich alles befindet.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A4.6 – Fähigkeiten der Phase 1 | ✅ Festgelegt (Beitrag 16) |
| A6.1 — Grundlagen des In-Game-HUD | ✅ Festgelegt (Beitrag 17) |
| **A6.1 — HUD v2 (Zielerfassung, Fadenkreuz, Skins)** | ✅ **Festgelegt** |

Das HUD verfügt nun über alle Funktionen für die aktuellen Fähigkeiten. Die naheliegenden nächsten Schritte sind: das in `Docs/EditorToolPlan.md` dokumentierte Tool zum Bearbeiten von Fähigkeiten (eine datengesteuerte `DT_Abilities`-Tabelle, die fest programmierte Fähigkeitszuweisungen ersetzt) sowie die Arbeit am Demo-Loop, der alles zu einer spielbaren Welle zusammenfügt. Zunächst tauchte jedoch ein Fehler auf, der Spielerdaten verschlang – von der Art, die erst nach einem vollständigen Anmelde-/Abmeldezyklus sichtbar wird. Das ist Beitrag 19.

---

*Arc-Commits: `5361653`, `2e61a43`. Zugehörige Dokumente: `Docs/UI_ASSET_CHECKLIST.md`, `Docs/EditorToolPlan.md`.*


