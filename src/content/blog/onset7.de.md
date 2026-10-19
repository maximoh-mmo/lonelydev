---
id: "onset7"
title: "🎬 Entwicklertagebuch: Gegner, die hören, jagen und schnell sind – Gruppenunterstützung, Kampfablauf, GAS-Bewegung"
seoTitle: "Feinde, die hören, „Hunt and Hustle“-Gruppe, Unterstützung des Kampfzyklus und GAS-Bewegung"
date: "2026-09-07"
category: "Game Dev"
summary: "Implementiert Gruppenunterstützung durch KI-Wahrnehmung, bei der Schaden Geräusche auslöst, die Gegner in der Nähe anlocken. Fügt Schwellenwerte für Kampfabläufe aus Profilen hinzu, eine auf einen Kegel beschränkte Suchaufgabe, teilt das monolithische UAIProfile in fokussierte KI-/Visuelle-/Wahrnehmungs-Assets auf und führt einen GAS-gesteuerten Bewegungsattributsatz mit stapelbaren Geschwindigkeitsmodifikatoren ein."
project: "Onset"
tags: ["Unreal Engine", "AI Perception", "StateTree", "Gameplay Ability System", "Data-Driven Design", "Movement System"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Post 6 sorgte dafür, dass Treffer realistisch wirkten – Taumeln, Leichen, Respawn –, aber die *Entscheidungsfindung* der Gegner war noch immer nur ein Rohentwurf. Die Angriffsaufgabe bestand aus einer einzeiligen Abfrage der Abklingzeit. Eine Gruppe von Gegnern ignorierte ihren sterbenden Nachbarn fröhlich. Und das Daten-Asset `UAIProfile` war still und leise zu einem „God-Objekt“ geworden, das Mesh, Animation, Verhalten und Wahrnehmung gleichzeitig enthielt.

In diesem Handlungsbogen geht es darum, Gegner *sozial* und *entschlossen* zu gestalten. Er beginnt mit der Arbeit an A3.4, die endlich den in Beitrag 4 geplanten und in Beitrag 5 vereinfachten Ablauf der Gruppenunterstützung umsetzt: Schaden löst ein Geräuschereignis aus, und Gegner in der Nähe – insbesondere das Rudel des Opfers – eilen herbei, um nachzuschauen, was los ist. Anschließend erhält die Kampfschleife echte Schwellenwerte (`ChaseRange`/`AttackRange` im Profil, die von den Übergangsbedingungen ausgelesen werden), gefolgt von einer ordentlichen Suchaufgabe und der seit langem geplanten Überarbeitung aus Episode 21, die `UAIProfile` in drei fokussierte Assets aufteilt. Den Abschluss bildet der GAS-Bewegungsattributsatz, der einen tatsächlichen Geschwindigkeitsverlust-Fehler behebt.

Der rote Faden ist die **Zerlegung**: Jeder Commit zerlegt ein „Gott-Objekt“ oder einen unscharfen Zuständigkeitsbereich in etwas Konkretes, und jede Aufteilung ist durch einen echten Fehler begründet, nicht durch ästhetische Gründe.

---

## Technische Darstellung

### Unterstützung über die „Ohren“ des Motors

Die Designentscheidung A3.4 (die bereits am 30. Mai getroffen und in den TODOs festgehalten wurde) zahlt sich nun aus: Die Gruppenunterstützung läuft über die **AI-Wahrnehmung** und nicht über das Gruppensystem. Das Gruppensystem liefert lediglich die Identität – „Gehört dieser NPC zur Gruppe des Opfers?“ –, während sich die *Reichweite* der Unterstützung ganz natürlich aus dem Hörradius jedes einzelnen Spielers ergibt.

Bei einem Schaden wird ein Geräusch ausgelöst, dessen Lautstärke proportional zum Schaden ist:

```cpp
if (AActor* OwningActor = GetOwningActor())
{
	UAISense_Hearing::ReportNoiseEvent(
		OwningActor->GetWorld(),
		OwningActor->GetActorLocation(),
		FMath::Abs(Data.EvaluatedData.Magnitude),  // Loudness = damage amount
		OwningActor,                                // Instigator
		0.0f                                       // Max range 0 = unlimited
		);
}
```

Jeder Controller innerhalb der Hörreichweite speichert das Ereignis; eine `HearingCondition` steuert den Übergang, um dies zu untersuchen:

```cpp
bool FOnsetStateTreeHearingCondition::TestCondition(FStateTreeExecutionContext& Context) const
{
	const FOnsetStateTreeHearingConditionInstanceData& InstanceData = Context.GetInstanceData(*this);

	AOnsetAIController* Controller = FOnsetStateTreeTaskBase::GetController(Context);
	if (!Controller || !Controller->bHasPendingNoise) return false;

	// Noise expired? (No new noise within MaxTimeSinceLastNoise seconds)
	float TimeSinceLastHeardNoise = Controller->GetWorld()->GetTimeSeconds() - Controller->LastNoiseHeardTime;
	if (TimeSinceLastHeardNoise > InstanceData.MaxTimeSinceLastNoise) return false;
	return true;
}
```

Die `InvestigateTask` bewegt den NPC dann zum Ort des Lärms – mit einer sozialen Feinheit: **Gruppenmitglieder rennen, Außenstehende gehen** (ein Geschwindigkeitsmultiplikator). Die Gruppe des Opfers reagiert schnell; zufällige Passanten kommen herbei. Emergent, datengesteuert und nutzt genau denselben Wahrnehmungspfad wie die Zielerfassung.

### Schwellenwerte gehören zum Profil, nicht zum Knoten

Vor diesem Handlungsbogen las `DistanceCondition` einen fest programmierten `DistanceThreshold` pro Knoten aus. Jetzt wird der Wert aus dem Profil ausgelesen – eine einzige zuverlässige Quelle pro Gegnervariante:

```cpp
if (InstanceData.DistanceSource == EOnsetStateTreeDistanceSource::AttackRange ||
    InstanceData.DistanceSource == EOnsetStateTreeDistanceSource::ChaseRange)
{
	AOnsetEnemy* Self = FOnsetStateTreeTaskBase::GetSelfEnemyCharacter(Context);
	if (!Self || !Self->Profile) return false;
	float Threshold = InstanceData.DistanceSource == EOnsetStateTreeDistanceSource::AttackRange
						  ? Self->Profile->AttackRange
						  : Self->Profile->ChaseRange;
	DistanceThresholdSquared = Threshold * Threshold;
}
```

Ändert man die Verfolgungsreichweite einer Gegnervariante an einer Stelle, werden alle Übergänge in jedem Baum, der diese Variante verwendet, entsprechend aktualisiert. Dies entspricht dem Prinzip der „einzigen Quelle der Wahrheit“, wie es auch beim GAS-Abklingzeit-Tag aus Beitrag 6 zum Tragen kommt.

---

## Details zur Umsetzung

### 1. Die Suchaufgabe: kegelförmig begrenzt, navigationsbasiert

Nach einer Erkundung sucht ein Gegner, der die Spur verloren hat, weiter. `SearchTask` wählt Punkte innerhalb eines Kegels vor dem NPC aus (damit dieser tatsächlich *schaut* und sich nicht teleportiert), projiziert diese auf das Navmesh und verfügt über zwei Ausgänge – minimale Zyklen *oder* minimale Dauer:

```cpp
FVector2D RandomOffset2D = FMath::RandPointInCircle(InstanceData.SearchRadius);
FVector RandomPoint = InstanceData.SearchCenter + FVector(RandomOffset2D.X, RandomOffset2D.Y, 0.0f);

FVector DirToPoint = (RandomPoint - InstanceData.SearchCenter).GetSafeNormal();
float Dot = FVector::DotProduct(InstanceData.InitialForward, DirToPoint);
float CosHalfAngle = FMath::Cos(FMath::DegreesToRadians(InstanceData.ConeHalfAngle));

if (Dot >= CosHalfAngle)
{
	FNavLocation Projected;
	if (NavSystem->ProjectPointToNavigation(RandomPoint, Projected, FVector(InstanceData.SearchRadius * 0.5f)))
	{
		return Projected.Location;
	}
}
```

Eine Schwenkbewegung sorgt dafür, dass sich der NPC zwischen den Zügen umschaut. Diese Aufgabe wird vollständig in C++ umgesetzt – das Muster der „kleinen, deterministischen Entscheidungsprimitiven“ setzt sich fort.

### 2. Die Aufspaltung des Profils (Folge 21)

Das monolithische `UAIProfile` (Verhalten + Mesh + Animation + Material + Wahrnehmung) wird in drei spezialisierte Datenelemente aufgeteilt:

| Asset | Zuständigkeit |
|---|---|
| `UAIProfile` | Verhalten: Zustandsbaum, Angriffs-/Verfolgungsreichweiten, Fluchtschwelle, Unterstützungsradius |
| `UVisualProfile` | Aussehen: Skelett-Mesh, Animations-Blueprint, Material |
| `UPerceptionProfile` | Sinne: Sichtradius/-winkel, Hörreichweite |

Dies ist eine Aufteilung nach dem Prinzip der einzigen Verantwortung, deren konkrete Vorteile bereits im Code erkennbar sind: `ApplyProfile(UVisualProfile*)` kümmert sich um die visuelle Darstellung, `ApplyPerceptionProfile` konfiguriert die Sinne und `UAIProfile` steuert StateTree sowie den Kampf. Ein „God-Objekt“-Daten-Asset weist dieselben Anzeichen auf wie eine „God-Klasse“ – das datenorientierte Design empfiehlt, auch diese aufzuteilen.

### 3. Die Interaktionskomponente

`UInteractionComponent` wurde aus dem PlayerController herausgelöst – die Logik zur Klickauswertung (Raycast → Gegner? Ziel: bewegen), die in Beitrag 2 inline implementiert wurde, wird nun zu einer eigenständigen Komponente. Da sie ihren Eigentümer als `AOnsetPlayerController` umwandelt, hat sie unter KI-Steuerung natürlich keine Auswirkung. Wieder das Prinzip der einzigen Verantwortung: Der Controller koordiniert, die Komponente führt aus.

### 4. GAS-getriebene Bewegung (Folge 22)

Das am besten zu rechtfertigende Merkmal des Arcs. Direkte `MaxWalkSpeed`-Schreibzugriffe waren eine wahre Fehlerquelle: Sie sind nicht kumulierbar, es kommt zu Lecks über gepoolte Pawns hinweg (UE verfügt über keinen „Re-Run-Konstruktor“ für wiederverwertete Akteure) und sie umgehen GAS vollständig. Die Lösung besteht aus einem speziellen Attributsatz sowie dynamischen Gameplay-Effekten:

```cpp
void UOnsetMovementAttributeSet::PostGameplayEffectExecute(const struct FGameplayEffectModCallbackData& Data)
{
	if (Data.EvaluatedData.Attribute == GetMovementSpeedAttribute())
	{
		float ClampedSpeed = FMath::Max(GetMovementSpeed(), 0.0f);
		SetMovementSpeed(ClampedSpeed);
		if (AOnsetBaseCharacter* Character = Cast<AOnsetBaseCharacter>(GetOwningActor()))
		{
			Character->GetCharacterMovement()->MaxWalkSpeed = ClampedSpeed;
		}
	}
}
```

Geschwindigkeitsmodifikatoren werden zu `MultiplyCompound`-GEs, die sich **multiplikativ addieren** (Flucht × Suche × Versatz), und die `ReturnToPool`-Funktion des Pools entfernt aktive Effekte am Bereinigungspunkt:

```cpp
struct FActiveGameplayEffectHandle FOnsetStateTreeTaskBase::ApplyMovementSpeedModifier(
	const AOnsetBaseCharacter* Self, const float Magnitude)
{
	if (!Self || !Self->AbilitySystemComponent) return FActiveGameplayEffectHandle();

	UGameplayEffect* SpeedGE = NewObject<UGameplayEffect>(GetTransientPackageAsObject(), FName("DynamicSpeedModifier"));
	SpeedGE->DurationPolicy = EGameplayEffectDurationType::Infinite;
	FGameplayModifierInfo ModifierInfo;
	ModifierInfo.Attribute = UOnsetMovementAttributeSet::GetMovementSpeedAttribute();
	ModifierInfo.ModifierOp = EGameplayModOp::MultiplyCompound;
	ModifierInfo.ModifierMagnitude = FScalableFloat(Magnitude);
	SpeedGE->Modifiers.Add(ModifierInfo);

	return Self->AbilitySystemComponent->ApplyGameplayEffectToSelf(
		SpeedGE, 1.0f, Self->AbilitySystemComponent->MakeEffectContext());
}
```

Das dynamische GE wird im Code mit `NewObject` erstellt – keine Abhängigkeit von BP-Assets, ein einziger Helper, der drei Aufgaben erfüllt (Fliehen, Untersuchen, Suchen). Die Commit-Meldung gibt offen den Auslöser an: „Behebt den Geschwindigkeitsverlust bei SearchTask.“

---

## Ergebnisse und Validierung

- Schaden → Geräusch → Gehör → untersuchen, wobei Gruppenmitglieder schneller reagieren als Außenstehende.
- `ChaseRange`/`AttackRange` im Profil, ausgelesen durch Übergangsbedingungen (einzige zuverlässige Informationsquelle).
- `HasTarget`/`HasNoTarget`-Bedingungen extrahiert und wiederverwendet.
- `SearchTask`: kegelförmig begrenzt, navigationsbasiert, mit zwei Ausgängen.
- `UAIProfile` in AI/Visual/Perception aufgeteilt; `UInteractionComponent` extrahiert.
- `UOnsetMovementAttributeSet`: Stapelung, GE-gesteuerte Geschwindigkeitsmodifikatoren; der Pool löscht GEs bei Rückkehr.
- Verzeichnisumstellung von `Combat/` → `GAS/`; Sprint-Plan (`Sprint_A3_A4.md`) erstellt.

---

## Herausforderungen und Lösungen

### Die umgekehrte Nullprüfung

**Problem:** `DistanceCondition` enthielt `if (!AIController || AIController->GetPawn()) return false;` – die Funktion wurde vorzeitig beendet, sobald ein Spielfigur *vorhanden war*.

**Lösung:** Umgekehrt auf `!AIController->GetPawn()`. Die invertierte Boolesche Logik ist für das Auge nicht erkennbar, bis eine Bedingung einfach … nie ausgelöst wird.

### Der flüchtende NPC, der seinen Verfolger anstarrte

**Problem:** FleeTask hat den Fokus nie freigegeben, sodass die Gegner buchstäblich *rückwärts* rannten, während sie die Bedrohung anstarrten.

**Lösung:** `ClearFocus(EAIFocusPriority::Gameplay)` in `EnterState`. Richte dich in die Richtung, in die du gehen möchtest.

### Das Geschwindigkeitsleck bei SearchTask

**Problem:** `ExitState` rief die Basismethode auf, die nichts bewirkte, sodass der Spielstein dauerhaft verlangsamt blieb.

**Lösung:** Wurde bewusst zurückgestellt (in den Anmerkungen vermerkt) und anschließend im selben Handlungsbogen durch die Festlegung des Bewegungsattributs sowie die Entfernung von GE bei der Rückkehr in den Pool behoben. Ein echter Fehler, der direkt *Anlass* für die Überarbeitung der GAS-Bewegung gab.

### Der Spawner hat die Wahrnehmung nie angewendet

**Problem:** „Das Targeting funktionierte überhaupt nicht“ – `ApplyPerceptionProfile` wurde vom Spawner nie aufgerufen.

**Lösung:** Im Rahmen des E22-Durchlaufs behoben. Bei einer Klasse, die Systeme *konfiguriert*, müssen alle Konfigurationspfade durchgespielt werden.

### UE 5.8 UHT error

**Problem:** Die Daten der neuen Suchinstanz haben die UHT-Prüfung mit `USTRUCT(BlueprintType)`/`BlueprintReadOnly` nicht bestanden.

**Lösung:** `BlueprintReadOnly` wurde entfernt, um es an das bestehende Muster anzupassen. Eine enginespezifische, einfache Korrektur.

---

## Reflexion und gewonnene Erkenntnisse

Die wichtigste Erkenntnis aus diesem Handlungsbogen ist, dass **emergentes Verhalten maßgeschneidertes Verhalten übertrifft.** Die Gruppenunterstützung wurde nicht als System implementiert – sie ergab sich aus den bestehenden Komponenten „Schaden“ → „Geräusch“ → „Hören“ → „Untersuchen“. Die Reichweite der Unterstützung „funktioniert einfach“, weil sie der Hörreichweite entspricht; die Dringlichkeit der Gruppe „funktioniert einfach“ aufgrund eines Multiplikators für die Gruppenmitgliedschaft. Je weniger Code man für eine Funktion schreibt, desto weniger Fehler kann sie enthalten.

Ich habe außerdem gelernt, dass **Refactorings durch Fehler motiviert sein sollten und dass das Refactoring diese beheben sollte.** Die Einführung des „movement“-Attributsatzes war keine Laune nach dem Motto „Lasst uns mehr wie GAS arbeiten“ – es war die Lösung für das Geschwindigkeitsleck bei „SearchTask“ und das Geschwindigkeitsleck bei den gepoolten Spielfiguren. Das Gleiche gilt für die Aufteilung des Profils und die `InteractionComponent`: Beides war durch Probleme im bestehenden Code gerechtfertigt. „Refactoring als Fehlerbehebung“ ist die Art und Weise, wie man sich selbst eine Bereinigung rechtfertigt, wenn man bereits sechs Commits tief in einem Sprint steckt.

Die Umbenennung von `Combat/` in `GAS/`, die als reine Umbenennung vor dem Hinzufügen des neuen Attributsatzes erfolgte, entspricht der richtigen Reihenfolge: erst ordnen, dann den organisierten Raum ausbauen.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A3.4 – Gruppenunterstützung, Untersuchung, Suche | ✅ Abgeschlossen |
| E21 – Profilaufteilung, Interaktionskomponente | ✅ Abgeschlossen |
| E22 – GAS-Bewegungsattributsatz | ✅ Abgeschlossen |
| E22-Korrektheitsprüfung (PostAttributeChange, Pool-Reset) | ⏭️ Weiter |
| A3.5 – Spieler-KI-Autoplay | Weiter |

**Was als Nächstes kommt:** Der neue Bewegungsattributsatz enthält zwei versteckte Fehler – der „speed-sync“-Callback wird bei unendlichen GEs nie ausgelöst, und wiederverwendete Gegner behalten ihre Lebenspunkte aus dem Todeszustand bei. Beitrag 8 behebt beides und widmet sich anschließend einem visuellen Problem: Gegner, die in einer perfekten Gruppe hinter einem herlaufen. Es sind eine Erhöhung des Gewichts für die Trennung von Gruppen, ein Verfolgungszeitlimit und die eigentliche Lösung – agentenspezifische Offset-Ziele – zu erwarten, sowie eine Umstrukturierung des Quellcodes, die Platz für das in Post 9 kommende Spieler-KI-System schafft.

> **Nächstes Mal in Beitrag 8:** Die Chase-Korrektur – GAS-Geschwindigkeitssynchronisation, Pool-Reset, Offsets zur Vermeidung von Ansammlungen und die Überarbeitung vor dem Autoplay.

---

*Arc-Commits: `c5ae6db` → `f467770`. Zugehörige Dokumente: `Docs/AI/NPC_AI_System.md`, `Docs/AI/Group_System.md`, `Docs/GAS/GAS_System.md`, `Docs/GAS/Episode22_MovementSpeedAttribute.md`, `Docs/Architecture/Architecture Overview.md`.*


