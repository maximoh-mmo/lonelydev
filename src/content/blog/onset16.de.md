---
id: "onset16"
title: "🎬 Entwickler-Tagebuch: Die Fähigkeiten sind da – AoE, Kegel, Schattenschritt und der Montage-Angriff"
seoTitle: "Die Fähigkeiten „Arrive“, „AoE Cone“, „Shadowstep“ und der „Montage-Angriff“"
date: "2026-10-09"
category: "Game Dev"
summary: "Kampffähigkeiten der Schiffe in Phase 1: ein zielzentrierter AoE-Burst, ein gerichteter Frontalkegel mittels „Sphere Sweep“ + „Dot Product Gate“, ein „Shadowstep“, der den Spieler hinter den nächsten Gegner blinken lässt und dabei ein Zeitfenster der Unverwundbarkeit bietet, sowie ein zeitlich auf eine Montage abgestimmter Basisangriff. Fügt eine „Stagger“-Ausführung hinzu, die globale Zeitdilatation für einen „Hitstop“ nutzt."
project: "Onset"
tags: ["Unreal Engine", "Gameplay Ability System", "Combat Abilities", "Montage", "Hitstop", "Overlap Queries"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Beitrag 15 bezeichnete die Serie als „abgeschlossen“. Ich wusste es besser. Die aufgeschobenen Arbeiten aus A4.6 – die Fähigkeiten, die ich zurückgestellt hatte, während sich das gesamte Kampfdesign noch in der Entwicklung befand – standen in den Planungsunterlagen mit einem riesigen ⏳ daneben. AoE. Kegel. Shadowstep. Ein montagebasierter Grundangriff. Das sind keine Feinheiten; sie machen den Unterschied zwischen „man kann ein Schwert schwingen“ und „man hat ein Fähigkeiten-Set“.

Dieser Beitrag befasst sich mit den beiden Commits, mit denen Phase 1 dieses Fähigkeitssatzes endlich veröffentlicht wurde. Im Mittelpunkt stehen die Fähigkeiten selbst – ein zielorientierter AoE-Burst, ein gerichteter Kegel nach vorne, ein Schatten-Sprung zur Neupositionierung und ein Basisangriff, dessen Schaden im Aufprallframe der Montage landet. Darüber hinaus gibt es eine Stagger-Ausführung, die das Spiel für eine Zehntelsekunde in Zeitlupe laufen lässt, sowie eine zweizeilige Korrektur, die dafür sorgt, dass die Namen der Charakterklassen nun korrekt aus der Datentabelle abgerufen werden.

Die Serie ist noch nicht abgeschlossen. Sie hat nur gelernt, nicht mehr so zu tun, als ob.

---

## Technische Erläuterung

### Warum überlappungsbasiertes Targeting statt Projektile?

Alle drei neuen Schadensfähigkeiten ermitteln ihre Ziele **zum Zeitpunkt der Aktivierung mittels Überlappungsabfragen** und nicht durch abgefeuerte Projektile. Das ist eine bewusste Entscheidung für diesen Kampfstil. Das Spiel ist ein Top-Down-ARPG, das mit dem Mauszeiger oder per Touch gesteuert wird, und seine Ziele stehen bereits fest – der Spieler fixiert ein Ziel über `UTargetingComponent`, und die Fähigkeiten verursachen den Schaden auf dem Server in dem Moment, in dem sie aktiviert werden.

Projektile würden dem Spieler Ausweichmöglichkeiten bieten und sich in einem anderen Spiel großartig anfühlen. Aber sie erhöhen die Komplexität der Replikation (vorausschauendes Erzeugen, Überprüfungen des Aufprallzeitpunkts), verfehlen den Sinn des sofortigen Feedbacks in diesem Kampf und hätten die gesamte Phase verzögert. Überlappungsabfragen liefern mir dieselbe Antwort auf die Frage „Habe ich etwas getroffen?“, ohne dass ich zwischendurch Akteure verwalten muss. Der Kompromiss, den ich eingegangen bin: Der Schaden erfolgt effektiv per Hitscan, sodass der Spieler bereits korrekt positioniert sein muss, wenn er den Knopf drückt. Das ist das richtige Spielgefühl für ein ARPG mit einem Zielkreuz.

### Das zweischichtige Zielmuster

Jede Fähigkeit führt nacheinander zwei Überprüfungen durch:

1. **Eine großflächige räumliche Abfrage** – eine Kugelüberlappung (AoE) oder ein Kugelsweep (Cone), der alles innerhalb der Reichweite erfasst.
2. **Ein Filter pro Akteur** – der Kegel schränkt die Ergebnisse der Kugelabfrage mithilfe eines Skalarprodukt-Filters ein; beide Fähigkeiten wenden dann eine PvP-Filterung pro Ziel an.

Das ist dasselbe Muster, das ich in `UTargetingComponent::IsActorTargetPVPValid` aus A5 verwendet habe – die Validierung erfolgt immer pro Ziel, es gibt niemals ein pauschales Flag, das besagt: „Diese Fähigkeit darf Spieler treffen“. Auch wenn PvP während der Ausführung der Fähigkeit deaktiviert wird, bleibt jedes einzelne Ziel weiterhin geschützt.

---

## Details zur Umsetzung

### 1. Der AoE – ein auf das Ziel zentrierter Kugelblitz

`UOnsetGA_AoE` erbt von `UOnsetGameplayAbility` (der Basisklasse, die ich für gemeinsame UI-Metadaten hinzugefügt habe und die von der Fähigkeitsleiste aus Beitrag 18 genutzt wird). Sie ist `InstancedPerActor`, ermittelt ihre Zielposition anhand der Zielkomponente und führt eine Kugelüberlappungsprüfung durch:

```cpp
AActor* TargetActor = Self->TargetingComponent->GetTarget();
FVector TargetLocation = Self->GetActorLocation();
if (IsValid(TargetActor))
{
    TargetLocation = TargetActor->GetActorLocation();
}

TArray<FOverlapResult> OverlapResults;
FCollisionShape Sphere = FCollisionShape::MakeSphere(AoERadius);
FCollisionQueryParams QueryParams;
QueryParams.AddIgnoredActor(Self);

World->OverlapMultiByChannel(OverlapResults, TargetLocation, FQuat::Identity,
                            OverlapChannel, Sphere, QueryParams);
```

Wenn der Spieler kein Ziel hat, wird der Burst standardmäßig auf ihn selbst zentriert – der AoE-Effekt wird weiterhin ausgelöst, nur dass er auf den Zaubernden zentriert ist. Diese Entscheidung ergab sich aus den Spieltests: Es ist ein schreckliches Gefühl, wenn eine in der Warteschlange stehende Fähigkeit verpufft, weil das Ziel zwischen dem Drücken der Taste und der Aktivierung gestorben ist. Durch die Zentrierung auf den Spieler selbst bleibt das Feedback konsistent.

Jeder getroffene Akteur erhält ein eigenes `FGameplayAbilityTargetData_ActorArray` und einen Schadenseffekt. Der PvP-Filter ist der bekannte:

```cpp
if (HitChar->IsA(AOnsetPlayerCharacter::StaticClass()))
{
    AOnsetPlayerState* SelfPS = Self->GetPlayerState<AOnsetPlayerState>();
    AOnsetPlayerState* TargetPS = HitChar->GetPlayerState<AOnsetPlayerState>();
    if (SelfPS && TargetPS && (!SelfPS->bIsPvPEnabled || !TargetPS->bIsPvPEnabled))
    {
        continue; // PvP disabled for either party
    }
}
```

### 2. Die Überlappung von Kegel und Kugel, gefolgt von einem Skalarprodukt-Gatter

Beim Kegel handelt es sich um dasselbe Prinzip, allerdings kann die „Broad Query“ einen Kegel nicht nativ verarbeiten. Ich führe einen Kugel-Sweep mit `ConeRange` als Radius durch und verwerfe anschließend alles, was außerhalb des Halbwinkels liegt, indem ich das Skalarprodukt mit dem abgeflachten Vorwärtsvektor des Charakters berechne:

```cpp
FVector Start = Self->GetActorLocation();
FVector FlatForward = Self->GetActorForwardVector();
FlatForward.Z = 0.f;
FlatForward.Normalize();

const float ConeDotThreshold = FMath::Cos(FMath::DegreesToRadians(ConeHalfAngle));
// ...
FVector ToTarget = HitChar->GetActorLocation() - Start;
ToTarget.Z = 0.f;
ToTarget.Normalize();

if (FVector::DotProduct(FlatForward, ToTarget) < ConeDotThreshold)
{
    continue; // Outside the cone
}
```

In einem Top-Down-Spiel ist es wichtig, beide Vektoren auf die Grundebene abzustrecken – eine Neigung unterhalb des Ziels sollte die Spieler nicht aus einer Fähigkeit herausdrücken, die visuell eindeutig auf sie gerichtet ist. Das Skalarprodukt wird mit `cos(halfAngle)` verglichen, sodass `ConeHalfAngle = 90°` einen vollständigen Frontalbogen von 180° ergibt.

### 3. Der „Shadowstep“ – Neupositionierung mit einem Zeitfenster der Unverwundbarkeit

„Schattenschritt“ ist die Fähigkeit, auf die ich am meisten stolz bin, denn sie entstand aus einem Designfehler heraus. Der ursprüngliche Plan sah eine „Sprint“-Fähigkeit vor – eine schnelle Vorwärtsbewegung, die sich in einem Action-Spiel gut anfühlt. Aber bei einer Top-Down-Kamera mit Zielfaden führt ein geradliniger Sprint meist nur dazu, dass man sich aus der Reichweite des Ziels bewegt, das man treffen will. Das wirkt wie ein Fehlklick.

Der Clou: Anstatt *auf* das Nichts zuzurennen, blinke dich *hinter* den nächsten Gegner innerhalb eines Abstandsbereichs:

```cpp
AActor* TargetEnemy = FindNearestEnemy(Self, DistanceGate);
if (!TargetEnemy)
{
    // No valid target - fizzle (no cooldown, no teleport)
    EndAbility(Handle, ActorInfo, ActivationInfo, false, true);
    return;
}

FVector BlinkLocation = TargetEnemy->GetActorLocation() + TargetEnemy->GetActorForwardVector() * -BehindOffset;

ACharacter* Char = Cast<ACharacter>(Self);
if (Char && Char->GetCharacterMovement())
{
    Char->SetActorLocation(BlinkLocation, false, nullptr, ETeleportType::TeleportPhysics);
}
```

Die Fähigkeit wendet dann einen Unverwundbarkeits-Effekt an, dessen Dauer durch den Wert „SetByCaller“ festgelegt wird:

```cpp
SpecHandle.Data->SetSetByCallerMagnitude(
    FGameplayTag::RequestGameplayTag(FName("Duration")), InvulnerabilityDuration);
Self->AbilitySystemComponent->ApplyGameplayEffectSpecToSelf(*SpecHandle.Data.Get());
```

Das Flag `ETeleportType::TeleportPhysics` ist der knifflige Teil – es weist die Bewegungskomponente an, keine Interpolation durchzuführen, damit der Charakter nicht sichtbar durch den Körper des Gegners gleitet. Und das Zeitfenster der Unverwundbarkeit (standardmäßig 0,5 s) verleiht der Neupositionierung Durchschlagskraft: Man gelangt bereits geschützt hinter den Gegner, während man sich ihm zuwendet. Das dadurch vergebene `TAG_State_Invulnerable`-Tag wird sowohl bei der Schadensvergabe in `PostGameplayEffectExecute` als auch bei der Ausführung des Stagger-Effekts (siehe unten) berücksichtigt.

### 4. Der zeitgesteuerte Grundangriff

Der Basisangriff wurde deutlich verbessert: Anstatt den Schaden bereits in dem Frame zu verursachen, in dem die Fähigkeit aktiviert wird, wird nun eine Montage abgespielt und der Schaden für den Aufprall-Frame geplant. Die alte, sofort wirkende Version war zum Testen der Pipeline völlig ausreichend; diese Version hat *Gewicht*:

```cpp
if (AttackMontage && Self->GetMesh() && Self->GetMesh()->GetAnimInstance())
{
    float MontageDuration = Self->PlayAnimMontage(AttackMontage);
    if (MontageDuration > 0.0f)
    {
        FTimerDelegate TimerDelegate;
        TimerDelegate.BindUObject(this, &UOnsetGA_BasicAttack::ApplyDamageAfterDelay, Handle, ActorInfo, ActivationInfo);
        World->GetTimerManager().SetTimer(MontageTimerHandle, TimerDelegate, DamageTime, false);
        return; // Don't end ability yet - wait for montage
    }
}

// No montage or failed to play - apply damage immediately
ApplyDamageAfterDelay(Handle, ActorInfo, ActivationInfo);
```

Die Fähigkeit bleibt aktiv, bis der verzögerte Schaden ausgelöst wird, und endet dann. Wenn die Animation nicht abgespielt werden kann (kein Anim-Asset, Mesh fehlt), wird stattdessen sofortiger Schaden verursacht, sodass die Fähigkeit niemals ins Leere läuft. Die Reichweitenprüfung erfolgt bei Aktivierung und erneut beim Auftreffen, sodass ein Ziel, das sich während des Schwungs aus der Reichweite bewegt, keinen Schaden erleidet.

### 5. Die gestaffelte Ausführung – Hitstop durch globale Zeitdilatation

`UExecCalc_Stagger` ist eine benutzerdefinierte `UGameplayEffectExecutionCalculation`. Sie sorgt dafür, dass sich ein Treffer auch wie ein Treffer anfühlt: Sie schleudert das Ziel durch einen Rückstoß zurück und senkt die globale Zeitdilatation für 0,1 Sekunden auf 10 %:

```cpp
TargetCharacter->LaunchCharacter(KnockbackDir * KnockbackMagnitude, true, true);

UGameplayStatics::SetGlobalTimeDilation(World, 0.1f);

FTimerHandle TimerHandle;
World->GetTimerManager().SetTimer(TimerHandle, [World]()
{
    UGameplayStatics::SetGlobalTimeDilation(World, 1.0f);
}, 0.1f, false);
```

Der lambda-basierte Timer ist besonders erwähnenswert – es bedarf keiner Member-Funktion oder eines speziellen Ticks, um die Dilation wiederherzustellen; der Timer übernimmt die Bereinigung selbst. Und die Unverwundbarkeitsprüfung am Anfang sorgt dafür, dass ein versetztes Ziel nicht erneut aus einem „Shadowstep“-Fenster heraus versetzt werden kann.

### 6. Anschluss an den Eingang

Die Fähigkeiten werden mit expliziten GAS-Eingabe-IDs in `GrantDefaultAbilities` zugewiesen – AoE auf Eingabe 1, Kegel auf Eingabe 2, „Shadowstep“ als passive Fähigkeit (kein Eingabe-Slot):

```cpp
AbilitySystemComponent->GiveAbility(FGameplayAbilitySpec(AoEAbility, 1, 1, this)); // Input ID 1
AbilitySystemComponent->GiveAbility(FGameplayAbilitySpec(ConeAbility, 1, 2, this)); // Input ID 2
AbilitySystemComponent->GiveAbility(FGameplayAbilitySpec(ShadowstepAbility, 1, INDEX_NONE, this)); // Passive
```

Der Controller leitet `IA_Ability1`/`IA_Ability2` über `AbilityLocalInputPressed` weiter, wodurch die Fähigkeit aktiviert wird, die dieser Eingabe-ID zugeordnet ist:

```cpp
void AOnsetPlayerController::OnAbility1(const FInputActionValue& Value)
{
    Server_DisableAutoCombat();
    ResetIdleTimer();
    if (AOnsetBaseCharacter* Self = GetPawn<AOnsetBaseCharacter>())
    {
        Self->AbilitySystemComponent->AbilityLocalInputPressed(1);
        Self->AbilitySystemComponent->AbilityLocalInputReleased(1);
    }
}
```

Jede neue Fähigkeit hat zudem ein eigenes Abklingzeit-Tag (`Cooldown.AoE`, `Cooldown.Cone`, `Cooldown.Shadowstep`) und ein Fähigkeitsart-Tag (`Ability.Type.AoE` usw.) – die Tags, die die Fähigkeitsleiste aus Post 17 abonniert.

### 7. Die Korrektur für die zweizeilige Klasse

`Server_CreateCharacter` hat die Zeile in der Datentabelle der Klasse mithilfe von `GetValueAsName` abgerufen, wodurch der *interne* Name der Enumeration (`EOnsetCharacterClass::Tank`) zurückgegeben wird. Die Zeilen der Datentabelle wurden anhand ihrer *Anzeige*-Werte – also der „schönen Namen“ – indiziert. Nicht-ASCII-Namen führten zu Fehlern bei der Suche, woraufhin stillschweigend auf die Standardwerte zurückgegriffen wurde:

```cpp
FName RowName = *UEnum::GetDisplayValueAsText(CharacterClass).ToString();
FOnsetCharacterClassInfo* Row = ClassTable->FindRow<FOnsetCharacterClassInfo>(RowName, nullptr);
```

Eine Zeile wurde geändert, und die Werte bei der Charaktererstellung stimmten nun mit der Klasse überein, die der Spieler tatsächlich ausgewählt hatte.

---

## Ergebnisse und Validierung

- **AoE** — auf das Ziel zentrierte Kugelexplosion (Radius 300u), PvP-gefiltert pro Ziel, auf den eigenen Charakter zentriert, wenn kein Ziel vorhanden ist
- **Kegel** — Frontalkegel durch Kugelabtastung + Skalarprodukt-Gate (Halbwinkel 90°, Reichweite 500u)
- **Schattenschritt** — Blinzeln hinter den nächsten Gegner innerhalb von 1500u, 200u Versatz nach hinten, 0,5s Unverwundbarkeit
- **Grundangriff** — zeitgesteuerter Schaden mit Fallback auf Sofortschaden
- **Stagger** — Rückstoß + 0,1 s globaler Hitstop, durch Unverwundbarkeits-Tag blockiert
- **Eingabe** — Fähigkeits-Eingabe-IDs 1/2 fest verdrahtet, „Shadowstep“ als passive Fähigkeit gewährt
- **Korrektur** — Klassenwerte werden anhand des angezeigten Werts statt anhand des internen Enum-Namens ermittelt

Die Fähigkeiten werden durch Eingaben ausgelöst, berücksichtigen das Zielsystem, filtern Spieler bei deaktiviertem PvP korrekt heraus, und die Neupositionierung durch „Schattenschritt“ macht wirklich Spaß – was ja der eigentliche Test ist.

---

## Herausforderungen und Lösungen

### Der Strich wurde zu einem Schattenschritt

**Problem:** Die geplante „Sprint“-Fähigkeit wirkte bei einer Top-Down-Kamera wie ein Fehler. Sich in die Richtung zu bewegen, in die man ohnehin schon blickt, bringt nichts, wenn sich das Ziel genau dort befindet, wohin man schaut.

**Lösung:** Wir haben überdacht, wozu die Fähigkeit eigentlich *dient* – nämlich zur Neupositionierung – und sie so überarbeitet, dass sie einen Blink hinter den nächsten Gegner innerhalb einer bestimmten Distanz ermöglicht. Durch das Zeitfenster der Unverwundbarkeit wurde daraus statt einer Positionsänderung ein defensives Kombinationswerkzeug. Das ist mein bestes Argument dafür, Fähigkeiten im Hinblick auf die Kamera zu entwerfen und nicht im Hinblick auf das Genre.

### Der Kegel benötigte zwei Durchgänge

**Problem:** Unreal verfügt über keine native Abfrage für Kegelüberlappungen, und ein einzelner Sphären-Sweep würde Gegner treffen, die *neben* dem Zaubernden stehen, aber nicht *vor* ihm.

**Lösung:** Führe eine Kugelabtastung durch und überprüfe anschließend jedes Ergebnis anhand des Skalarprodukts mit dem abgeflachten Vorwärtsvektor. Durch das Abflachen auf die Grundebene wird verhindert, dass Ziele aufgrund von Geländeneigungen fälschlicherweise ausgeschlossen werden. Der Rechenaufwand ist bei der geringen Anzahl von NPCs auf dem Bildschirm vernachlässigbar.

### Die globale Zeitdilatation ist global

**Problem:** `SetGlobalTimeDilation` wirkt sich auf *alles* aus – einschließlich des Timers, der die Zeitdilatation eigentlich wieder rückgängig machen soll, und der Eingaben des Spielers. Bei einer naiven Rückstellung kann es zu einer Unterversorgung kommen.

**Lösung:** Rüste die Wiederherstellungsfunktion mit einem `World`-erfassenden Timer-Lambda aus, bevor die Erweiterung wirksam wird, damit die Wiederherstellung unabhängig von der Erweiterung ausgelöst wird. Akzeptiere vorerst den globalen Geltungsbereich – es handelt sich um einen Effekt, der nur für den Spieler sichtbar ist, und 0,1 s sind bei anderen Akteuren nicht wahrnehmbar.

---

## Reflexion und gewonnene Erkenntnisse

Das zweistufige Zielmuster – zunächst eine breit angelegte räumliche Abfrage, anschließend eine Validierung pro Akteur – wies letztendlich bei allen drei Fähigkeiten dieselbe Struktur auf. Das ist kein Zufall; es ist die korrekte Aufgliederung für „Kandidaten finden“ im Gegensatz zu „Ist dieser Kandidat gültig?“, und es ist der Grund dafür, dass die PvP-Logik an einer einzigen, naheliegenden Stelle angesiedelt ist, anstatt durch Kopieren und Einfügen mit subtilen Abweichungen zu entstehen.

Am meisten habe ich aus dem „Shadowstep-Pivot“ gelernt. Eine Feature-Spezifikation („Dash-Fähigkeit“) ist eine Hypothese darüber, was Spaß macht – und in diesem Kamerakontext war sie falsch. In dem Moment, als ich das Design wieder an der Frage ausrichtete: „Was möchte der Spieler eigentlich erreichen?“, ergab sich das richtige Fähigkeitsdesign. Ich werde diesen Test künftig auf jede neue Fähigkeit anwenden: Benenne die *Absicht*, nicht das *Verb*.

Außerdem hatte ich unterschätzt, wie sehr es in dieser Phase um Tags ging. Jede Fähigkeit benötigte ein Abklingzeit-Tag, ein Typ-Tag und ein Asset-Tag – und sowohl die Fähigkeitsleiste (Beitrag 17) als auch die Eingabeverknüpfungen sind darauf angewiesen, dass diese Tags konsistent vorhanden sind. Die Tag-Registrierung ist insgeheim die wichtigste Datei in diesem Commit.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A5 – Multiplayer + Steam | ✅ 100 % (42/42) |
| A5b – Persistenz & Account-System | ✅ 100 % (30/30) |
| A5c – Authentifizierungsauswertung & Anmeldeserver | ✅ 100 % (38/38) |
| A6 – Charakterklassen + Feinschliff | ✅ 100 % (12/12) |
| **A4.6 – Fähigkeiten der Phase 1 (AoE, Kegel, Schatten Schritt, Montage, Taumeln)** | ✅ **Festgelegt** |

Da die Fähigkeiten nun in der Eingabeleiste angezeigt werden, besteht der nächste naheliegende Schritt darin, dem Spieler zu zeigen, was er gerade tut. In Beitrag 17 wird das HUD im Spiel erstellt – die Lebenspunkte des Spielers, die Fähigkeitsleiste mit realistischen Abklingzeiten, ein Zielrahmen und die gesammelten Schadenswerte, die über den Charakteren schweben.

---

*Arc-Commits: `1768497`, `ef77c2d`. Zugehörige Dokumente: `Docs/Gameplay/Ability_Targeting_System.md`, `Docs/GAS/GAS_System.md`.*


