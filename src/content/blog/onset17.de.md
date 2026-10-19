---
id: "onset17"
title: "🎬 Entwicklertagebuch: Das HUD nimmt Gestalt an – Gesundheitsanzeige, Fähigkeiten und gesammelte Schadenswerte"
seoTitle: "Das HUD zeigt die Gesundheitswerte und die gesammelten Schadenswerte an"
date: "2026-10-12"
category: "Game Dev"
summary: "Erstellt die Grundlage für das In-Game-HUD in C++: Lebensbalken des Spielers, Fähigkeitsleiste mit vier dynamischen Slots, die anhand der Eingabe-ID aus dem ASC ermittelt werden, Zielrahmen zur Verfolgung der Zielkomponente sowie eine gepoolte Schadensanzeigeebene mit 64 Slots. Alle Widgets sind ereignisgesteuert und basieren auf Delegaten für ASC-Attributänderungen, wobei Logik und Darstellung in C++ bzw. Blueprint getrennt sind."
project: "Onset"
tags: ["Unreal Engine", "HUD", "UI", "Gameplay Ability System", "Widget Pooling", "CommonUI"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Während des gesamten Projekts wurde die Feedback-Schleife im Spiel durch Debug-Text und Log-Zeilen zusammengehalten. Schadenswerte? Keine. Lebensbalken? Nur im Weltraum der NPC-KI. Abklingzeiten? Das Timing musste man nach Gefühl einschätzen. Mit Patch 16 wurde ein echtes Fähigkeits-Kit eingeführt, und ein Kit ohne Anzeige ist wie ein Klavier ohne Noten – vom Spieler wird erwartet, dass er spielt, ohne die Noten zu sehen.

Dieser Commit bildet die Grundlage für das HUD im Spiel in C++: ein Container-Widget, das mit der „Ability System Component“ des besessenen Spielfiguren-Pawns verknüpft ist, eine Gesundheitsanzeige für den Spieler, eine Fähigkeitsleiste mit vier zuweisbaren Slots, einen Zielrahmen und eine gemeinsame Ebene für Schadenswerte. Die zentrale architektonische Entscheidung – die ich gleich zu Beginn klarstellen möchte – ist, dass **C++ die gesamte Logik übernimmt und der Widget-Blueprint für das gesamte Erscheinungsbild zuständig ist**. WBP_HUD verschachtelt den visuellen Baum; C++ verknüpft ihn mit dem Gameplay.

---

## Technische Darstellung

### Warum das HUD über OnRep_Pawn anzeigen?

Das HUD muss an einen ASC gebunden werden, und der ASC befindet sich auf dem Spielfigur. Der naheliegende Zeitpunkt ist `OnRep_Pawn` – der Client-Callback, der ausgelöst wird, wenn der Besitzstatus des Servers nach unten repliziert wird. Zu diesem Zeitpunkt verfügt der Client über einen gültigen Spielstein, der Ladebildschirm nach dem Zonenwechsel kann geschlossen werden, und wir können das HUD an einer Stelle erstellen:

```cpp
void AOnsetPlayerController::OnRep_Pawn()
{
    Super::OnRep_Pawn();

    if (!IsLocalController()) return;

    APawn* NewPawn = GetPawn();
    if (!NewPawn) return;

    // The client now possesses a pawn — dismiss the loading screen and build the HUD.
    if (UOnsetUISubsystem* UI = GetGameInstance()->GetSubsystem<UOnsetUISubsystem>())
    {
        UI->HideLoadingScreen();
    }

    CreateHUD(NewPawn);
    Server_OnClientPossessed();
}
```

Die `IsLocalController()`-Prüfung ist der entscheidende Teil: Sie wird auf jedem Client ausgeführt, und nur der lokale Spieler sollte ein HUD erstellen. `CreateHUD` instanziiert dann die Widget-Klasse (die pro Projekt über `HUDWidgetClass` überschrieben werden kann) und bindet sie an den Pawn.

### Delegaten für Attributänderungen: der reaktive Kern

Alles in diesem HUD wird ereignisgesteuert über die Delegaten für Attributänderungen des ASC ausgelöst. Die Lebensanzeige des Spielers abonniert `Health` und `MaxHealth`; das Zielbild abonniert die `Health` des Ziels; die Schadenswerte werden über die HUD-eigenen Abonnements für beide Werte ausgegeben. Dies ist dasselbe GAS-Muster wie bei der Persistenz aus Beitrag 14 – man sollte Attribute niemals bei jedem Tick abfragen, wenn der ASC einem sofort mitteilt, sobald sie sich ändern.

---

## Details zur Umsetzung

### 1. Der HUD-Container (`UHUDWidget`)

`BindToPlayer` ist der einzige Einstiegspunkt. Er speichert den Controller, den Pawn, die Zielkomponente und das ASC im Cache und übergibt anschließend jedem Unter-Widget die benötigten Referenzen:

```cpp
void UHUDWidget::BindToPlayer(AOnsetPlayerController* InController, AOnsetBaseCharacter* InPawn)
{
    BoundController = InController;
    BoundPawn = InPawn;
    BoundTargeting = InPawn->TargetingComponent;
    PlayerASC = InPawn->AbilitySystemComponent;

    if (PlayerHealthBar)
    {
        PlayerHealthBar->BindToASC(PlayerASC);
    }
    if (AbilityBar)
    {
        AbilityBar->BindToPlayer(InController, PlayerASC);
    }
    if (BoundTargeting)
    {
        BoundTargeting->OnTargetChanged.AddDynamic(this, &UHUDWidget::HandleTargetChanged);
        HandleTargetChanged(BoundTargeting->GetTarget());
    }
    if (PlayerASC)
    {
        PlayerASC->GetGameplayAttributeValueChangeDelegate(UOnsetAttributeSet::GetHealthAttribute())
            .AddUObject(this, &UHUDWidget::HandlePlayerHealthChanged);
    }
}
```

Die Unter-Widgets sind `BindWidgetOptional`-Elemente – der Widget-Blueprint verschachtelt sie nach Namen, aber selbst wenn eines fehlt, funktioniert das HUD weiterhin. Das ist beabsichtigt: Dadurch ist das C++-HUD widerstandsfähig gegenüber unvollständigen Designer-Einstellungen während der Iteration.

### 2. Gesundheitsbalken des Spielers (`UPlayerHealthBarWidget`)

Die Gesundheitsanzeige abonniert sowohl die Delegaten „Health“ als auch „MaxHealth“ und berechnet daraus einen Füllgrad zwischen 0 und 1 sowie eine Textanzeige neu:

```cpp
void UPlayerHealthBarWidget::RefreshHealth()
{
    const float MaxHealth = BoundASC->GetNumericAttribute(UOnsetAttributeSet::GetMaxHealthAttribute());
    const float Health = BoundASC->GetNumericAttribute(UOnsetAttributeSet::GetHealthAttribute());
    const float NewPercent = MaxHealth > 0.0f ? FMath::Clamp(Health / MaxHealth, 0.0f, 1.0f) : 0.0f;

    if (HealthPercent != NewPercent)
    {
        HealthPercent = NewPercent;
        OnHealthPercentChanged(HealthPercent);
    }

    if (HealthText)
    {
        HealthText->SetText(FText::Format(FText::FromString(TEXT("{0} / {1}")),
            FText::AsNumber(FMath::RoundToInt(Health)), FText::AsNumber(FMath::RoundToInt(MaxHealth))));
    }
}
```

`OnHealthPercentChanged` ist ein `BlueprintImplementableEvent` – der WBP animiert seinen Fortschrittsbalken (oder die Shader-Füllung) anhand dieses Werts. C++ liefert den Wert; der Designer sorgt für die Bewegung. Beachten Sie die Begrenzung: Attributänderungs-Delegaten können während eines Gameplay-Effekts Werte außerhalb des zulässigen Bereichs auslösen, und der Wert des Balkens darf niemals außerhalb des Bereichs [0,1] liegen.

### 3. Fähigkeitsleiste (`UAbilityBarWidget`)

Dies war das interessanteste Widget der Gruppe, da die Slots nicht fest codiert sind. `BuildSlots` erstellt vier Slot-Widgets, anschließend fragt `RebuildSlots` beim ASC ab, was für jede Eingabe-ID tatsächlich gewährt ist:

```cpp
void UAbilityBarWidget::RebuildSlots()
{
    UnregisterCooldownEvents();

    for (FSlotEntry& Entry : Slots)
    {
        Entry.CooldownTag = FGameplayTag();
        Entry.Widget->SetLocked(true);

        if (FGameplayAbilitySpec* Spec = BoundASC->FindAbilitySpecFromInputID(Entry.InputID))
        {
            if (UOnsetGameplayAbility* AbilityCDO = Cast<UOnsetGameplayAbility>(Spec->Ability))
            {
                Entry.Widget->SetAbility(AbilityCDO->AbilityIcon, AbilityCDO->GetPrimaryCooldownTag());
                Entry.CooldownTag = AbilityCDO->GetPrimaryCooldownTag();
            }
        }

        if (Entry.CooldownTag.IsValid())
        {
            CooldownTagHandles.Add(
                BoundASC->RegisterGameplayTagEvent(Entry.CooldownTag, EGameplayTagEventType::AnyCountChange)
                    .AddUObject(this, &UAbilityBarWidget::HandleCooldownTagChanged));
        }
    }
}
```

Hier kommt die Basisklasse für Fähigkeiten, die ich in Beitrag 16 hinzugefügt habe, zum Einsatz. `UOnsetGameplayAbility::GetPrimaryCooldownTag()` liest das Abklingzeit-Tag der Fähigkeit direkt aus ihrem Abklingzeit-GE aus, sodass die Leiste das Abklingzeit-Tag jeder Fähigkeit ohne Nachschlagetabelle ermitteln kann:

```cpp
FGameplayTag UOnsetGameplayAbility::GetPrimaryCooldownTag() const
{
    const FGameplayTagContainer* CooldownTags = GetCooldownTags();
    if (CooldownTags && CooldownTags->Num() > 0)
    {
        return CooldownTags->First();
    }
    return FGameplayTag();
}
```

Das Auffüllen der Abklingzeiten wird ausschließlich durch Änderungen der Tag-Anzahl gesteuert – wenn ein Abklingzeit-Tag aktiv wird, beginnt das Auffüllen des Slots; wenn es entfernt wird, endet das Auffüllen. Die Dauer wird in Echtzeit aus dem aktiven Abklingzeit-Effekt ausgelesen, sodass die Animation korrekt skaliert wird:

```cpp
void UAbilityBarWidget::SyncCooldownState(const FGameplayTag Tag, int32 NewCount)
{
    for (const FSlotEntry& Entry : Slots)
    {
        if (Entry.Widget && Entry.CooldownTag == Tag)
        {
            if (NewCount > 0)
                Entry.Widget->StartCooldown(GetCooldownDuration(Tag));
            else
                Entry.Widget->EndCooldown();
            break;
        }
    }
}
```

Slots sind ebenfalls anklickbar – `HandleSlotClicked` leitet den Klick zurück an `AbilityLocalInputPressed(InputID)` weiter, was bedeutet, dass die Slots auf dem Bildschirm einen vollwertigen Eingabepfad darstellen und nicht nur eine Anzeige sind.

### 4. Zielrahmen (`UTargetHUDWidget`)

Der Ziel-Frame verfolgt den Akteur, auf den die `UTargetingComponent` gerade ausgerichtet ist. Die Targeting-Komponente verfügt genau zu diesem Zweck über einen Multicast-Delegaten namens `OnTargetChanged` – dieser wird bei `SetTarget`, `ClearTarget` sowie bei `OnRep_CurrentTarget` ausgelöst, wenn ein neues Ziel nach unten repliziert wird:

```cpp
void UTargetingComponent::OnRep_CurrentTarget()
{
    OnTargetChanged.Broadcast(CurrentTarget);
}

void UTargetingComponent::SetTarget(AActor* NewTarget)
{
    if (!NewTarget) { ClearTarget(); return; }
    if (!IsActorTargetValid(NewTarget)) return;
    CurrentTarget = NewTarget;
    OnTargetChanged.Broadcast(CurrentTarget);
}
```

Die Methode `HandleTargetChanged` des HUDs führt den Wechsel durch: Sie hebt die Bindung des ASC des vorherigen Ziels auf, speichert das neue im Cache und bindet dessen Delegat für das Attribut „Health“. Sowohl der Ziel-Frame als auch die Ebene mit den Schadenswerten verarbeiten die daraus resultierenden Ereignisse zur Änderung der Lebenspunkte.

### 5. Gesamt-Schadenswerte (`UDamageNumberWidget`)

Am meisten Freude bereiten mir die Schadensanzeigen. `UHUDWidget::BuildDamageNumberPool` reserviert beim Erstellen 64 Widget-Instanzen in der Canvas-Ebene des Designers:

```cpp
for (int32 i = 0; i < MaxDamageNumbers; ++i)
{
    UDamageNumberWidget* DamageNumber = nullptr;
    if (DamageNumberWidgetClass)
    {
        DamageNumber = CreateWidget<UDamageNumberWidget>(OwningPC, DamageNumberWidgetClass);
    }
    if (!DamageNumber) continue;

    if (UCanvasPanelSlot* DamageNumberSlot = DamageNumberLayer->AddChildToCanvas(DamageNumber))
    {
        DamageNumberSlot->SetAnchors(FAnchors(0.0f, 0.0f));
        DamageNumberSlot->SetAlignment(FVector2D(0.5f, 0.5f));
        DamageNumberSlot->SetAutoSize(true);
    }
    DamageNumber->SetVisibility(ESlateVisibility::Collapsed);
    DamageNumberPool.Add(DamageNumber);
}
```

Die Erzeugung erfolgt nach dem Round-Robin-Prinzip: Der Index wird modulo 64 erhöht, wobei der älteste Eintrag wiederverwendet wird, wenn der Pool voll ist. Das Widget erstellt oder löscht sich niemals selbst – es startet eine Float-Animation, kehrt in den zusammengeklappten Zustand zurück und wartet darauf, wiederverwendet zu werden. Die Zuordnungskosten fallen einmalig im Voraus an:

```cpp
void UDamageNumberWidget::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
    Elapsed += InDeltaTime;
    const float Alpha = FMath::Clamp(Elapsed / Lifetime, 0.0f, 1.0f);

    FWidgetTransform Transform;
    Transform.Translation = StartPosition + FVector2D(0.0f, -FloatDistance * Alpha);
    SetRenderTransform(Transform);

    NumberText->SetColorAndOpacity(StartColor.CopyWithNewOpacity(1.0f - Alpha));

    if (Alpha >= 1.0f) Deactivate();
}
```

Die Schadenswerte stammen aus denselben Delegaten für Attributänderungen wie die Balken. Wenn die Gesundheit des *Spielers* sinkt, zeigt das HUD eine rote Zahl über dem Spieler an (erlittener Schaden); wenn die Gesundheit des *Ziels* sinkt, erscheint eine goldene Zahl über dem Ziel (verursachter Schaden). Beide werden über `SpawnDamageNumber` weitergeleitet, das die Position in der Spielwelt auf den Bildschirmraum projiziert.

### 6. Die DPI-Falle

Der Projektionscode verbirgt einen subtilen Fehler, auf den ich hinweisen möchte, da er früher oder später bei jedem UMG-HUD zu Problemen führen wird. `ProjectWorldLocationToScreen` gibt *Viewport-Pixel* zurück, UMG positioniert Widgets jedoch in *Layout-Einheiten*, die anhand des Geometrieskalenfaktors des Widgets (DPD-Skalierung) skaliert werden:

```cpp
FVector2D ViewportPixels;
const bool bProjected = PC->ProjectWorldLocationToScreen(WorldLocation, ViewportPixels, false);
if (bProjected)
{
    const float GeometryScale = GetCachedGeometry().Scale > 0.0f ? GetCachedGeometry().Scale : 1.0f;
    OutScreenPos = ViewportPixels / GeometryScale;
}
```

Wenn man diese Division überspringt, weichen die Schadenswerte bei Änderungen des DPI-Maßstabs von ihren Zielwerten ab – und auf einem Monitor mit hoher DPI-Auflösung können sie um eine ganze Zeichenbreite daneben liegen. Durch die Division durch den zwischengespeicherten Geometrie-Maßstab werden die beiden Koordinatensysteme miteinander abgeglichen.

---

## Ergebnisse und Validierung

- **HUD wird vom `OnRep_Pawn`** auf dem lokalen Client ausgegeben; Ladebildschirm entfällt + integriertes HUD in einem Arbeitsgang
- **Gesundheitsbalken des Spielers** — ASC-gesteuerte Füllung + numerische Anzeige, begrenzt auf [0,1]
- **Fähigkeitsleiste** — 4 Slots, die anhand der Eingabe-ID aus dem ASC ermittelt werden, Symbole aus Fähigkeits-CDOs, Abklingzeit-Füllung über Tag-Ereignisse, anklickbare Slots
- **Zielrahmen** — verfolgt `OnTargetChanged`, bindet die Gesundheit des Ziels an den ASC
- **Schadenszahlen** — Pool mit 64 Slots, Round-Robin-Wiederverwendung, Jitter pro Spawn, gold (verursacht) / rot (erlitten)
- **DPI-Korrektur** — Bildschirmprojektion geteilt durch den Geometrieskalierungsfaktor

Die Schleife zeigt nun endlich Informationen an: Du siehst deine Gesundheit, deine Abklingzeiten, wen du als Ziel ausgewählt hast und jeden Treffer, der landet.

---

## Herausforderungen und Lösungen

### Widgets sollten keine Abfragen durchführen

**Problem:** Der naive Ansatz bei einem HUD besteht darin, in jedem Frame die Attribute abzurufen. Das ist unnötiger Aufwand und eine Ursache für Bildflackern – die Widgets werden auch dann aktualisiert, wenn sich nichts geändert hat.

**Lösung:** Alles wird an ASC-Attributänderungs-Delegaten oder an der `OnTargetChanged`-Methode der Zielkomponente gebunden. Aktualisierungen werden nur ausgelöst, wenn sich der zugrunde liegende Wert tatsächlich ändert. Das Muster ist bei allen vier Widgets einheitlich, was das mentale Modell einfach hält.

### Die Fähigkeitsleiste sollte deine Fähigkeiten nicht kennen

**Problem:** Die feste Programmierung von „Slot 1 = AoE“ bindet die Benutzeroberfläche an die Fähigkeitenliste und führt zu Fehlern, sobald eine Klasse ein anderes Fähigkeiten-Set erhält.

**Lösung:** Die Leiste ruft die Funktion `FindAbilitySpecFromInputID` auf und liest das Cooldown-Tag aus dem CDO der jeweiligen Fähigkeit aus. Fügt man eine Fähigkeit mit einer Eingabe-ID hinzu, erscheint sie automatisch in der Leiste. Dies ist derselbe datengesteuerte Ansatz, der bereits in Beitrag 5 das Profilsystem geprägt hat – die Daten sollen der Benutzeroberfläche vorgeben, was angezeigt werden soll.

### Der Schadenspool darf nicht ruckeln

**Problem:** Das Erstellen und Löschen eines Widgets bei jedem Treffer würde bei einer rasanten Abfolge von Kills zu Verzögerungen durch die Garbage Collection führen – genau dann, wenn das HUD am stärksten ausgelastet ist.

**Lösung:** 64 zusammengeklappte Widgets einmalig vorab zuweisen; nach dem Round-Robin-Prinzip wiederverwenden. `SpawnDamageNumber` deaktiviert zwangsweise den ältesten Eintrag, wenn der Pool ausgelastet ist, sodass der neueste Treffer immer auf dem Bildschirm angezeigt wird.

---

## Reflexion und gewonnene Erkenntnisse

Die mit Abstand wichtigste Entscheidung war hier die Trennung zwischen C++ und Blueprint: **C++ ist für die Logik zuständig, WBP für die Optik**. Jedes Widget stellt „BlueprintImplementableEvents“ bereit (Prozentuale Änderung, Abklingzeit gestartet/beendet, Ziel erfasst), und der Designer animiert diese als Fortschrittsbalken, Shader-Füllungen und Farbwechsel. Deshalb erfordert eine zweizeilige Änderung an einem Material oder einem Slot-Layout niemals eine Neukompilierung des Codes – und deshalb konnte das HUD in Post 18 visuell weiterentwickelt werden, ohne den C++-Code anzutasten.

Die ereignisgesteuerte Architektur ist der stille Held. Das Delegaten-System des ASC ist genau dafür ausgelegt – dass UMG das Spielgeschehen verfolgt –, und durch dessen konsequente Nutzung weist das HUD praktisch keine Abfragen auf. Jedes Widget wird nur aktualisiert, wenn sich das zugrunde liegende Spielgeschehen geändert hat.

Der DPI-Fehler macht deutlich, dass UMG über zwei Koordinatenräume verfügt, die nicht identisch sind. Erst durch eine Debugging-Sitzung aus der Ego-Perspektive mit einem Monitor mit hoher DPI-Auflösung konnte der Fehler entdeckt werden – und es handelt sich um die Art von Fehler, die in jedem nachfolgenden Build unbemerkt „ein wenig daneben“ wirkt.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A4.6 – Fähigkeiten der Phase 1 | ✅ Festgelegt (Beitrag 16) |
| **A6.1 – Grundlagen des In-Game-HUD** | ✅ **Festgelegt** |

Das HUD ist vorhanden und mit GAS verbunden. Es muss jedoch noch überarbeitet werden: Das Zielbild ist ein statisches Element und kein Element, das der Spielwelt folgt, die Schadenswerte müssen geräteübergreifend auf DPI-Korrektur überprüft werden, und die Fähigkeitsleiste benötigt Symbole, die zu den Fähigkeiten passen. Das ist der Inhalt von Beitrag 18, der zudem die Spielinhalte in eine ordnungsgemäße Pipeline unter `Content/Maps` + `Content/Game/Combat` überführt.

---

*Arc-Commit: `5b59384`. Zugehörige Dokumente: `Docs/Gameplay/UI_System.md`, `Docs/Gameplay/Targeting_System.md`.*


