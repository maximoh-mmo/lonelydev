---
id: "onset5"
title: "🎬 Entwickler-Tagebuch: Von Stubs zu StateTrees – NPC-Gehirn und Speicherleck beim Pooled-AI-Controller"
seoTitle: "Von Stubs zu StateTrees – NPC-Brain und Pooled-AIController-Leck"
date: "2026-08-31"
category: "Game Dev"
summary: "Erstellt das NPC-Gehirn mit UE 5.8 StateTree und AI Perception. Behandelt werden das StateTree-Schema, die wahrnehmungsgesteuerte Zielerfassung, das kritische Speicherleck im gepoolten AIController und dessen Behebung, Verhaltenszustände als kleine C++-Aufgaben sowie die ersten Grundlagen von GAS mit Attributsatz und grundlegendem Angriff."
project: "Onset"
tags: ["Unreal Engine", "StateTree", "AI Perception", "Gameplay Ability System", "Object Pooling", "Behavior Tree"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

In Beitrag 4 erhielten die NPCs Körper, Spawner, Pools und eine Gruppenidentität. Was ihnen jedoch fehlte, war ein Gehirn. Ein Gegner konnte stehen, getroffen werden und wiederverwendet werden – aber er konnte den Spieler nicht wahrnehmen, sich nicht entschließen, ihn zu verfolgen, und auch nicht angreifen. Dieser Handlungsbogen verleiht diesem Gehirn Leben.

Innerhalb von fünf Tagen verwandelt der A3-Sprint die zusammengefassten Gegner in wahrnehmungsgesteuerte Kreaturen mit einem vollständigen StateTree-Verhaltenszyklus: Ruhezustand → Umherstreifen → Aggression → Verfolgung → Angriff. Er beginnt mit einer wirklich gelungenen Vereinfachung – dem Wegfall eines manuell programmierten Group-Assist-Ereignisses zugunsten der engine-eigenen AI-Perception-Hörpipeline – und endet mit der Schaffung der GAS-Grundlage, auf der die Kampfbögen aufbauen werden. Dazwischen liegt der schwerwiegendste Fehler des Handlungsbogens: ein Controller-Leck, das nur durch das Pooling hätte entstehen können.

---

## Technische Erläuterung

### Warum StateTree statt Behavior Tree?

Die Dokumentation und der Commit-Verlauf stimmen überein: StateTree wurde aufgrund seines datengesteuerten, schlanken Designs ausgewählt. Aufgaben und Bedingungen sind einfache C++-Strukturen – ohne Overhead durch Akteure/Komponenten pro Knoten –, die sich eine Basis aus statischen Helpern teilen. Sie sind deterministisch, ressourcenschonend und serverseicher. Die *Topologie* (welche Zustände mit welchen verbunden sind und unter welchen Übergangsbedingungen) ist in einer `.uasset`-Datei gespeichert, sodass Designer das Verhalten ohne Neukompilierung neu verknüpfen können, während die Logik im Code verbleibt.

### Die Vereinfachung, mit der alles begann

Der erste Commit des Arcs löscht eine noch nicht fertig entwickelte Funktion. Das Gruppensystem aus Beitrag 4 lieferte einen `NotifyMemberAttacked()`-Stub sowie einen `AssistRadius` – der Plan lautete: „Wenn ein Gruppenmitglied getroffen wird, reagiert die Gruppe.“ Die Commit-Meldung ist unverblümt: **Entfernen, stattdessen die Hörfunktion von „AI Perception“ für die Unterstützung übernehmen.**

Warum? UE bietet bereits entitätsübergreifende Kommunikation (`UAISense_Hearing::ReportNoiseEvent`), eine entitätsspezifische Reichweite (Hörradius) und gruppenübergreifende Filterung. Der Aufbau eines maßgeschneiderten Ereignissystems auf Basis des Gruppensystems hätte bedeutet, alle drei Funktionen neu zu implementieren – oder sogar noch schlimmer. Stattdessen:

- Bei einem Schaden wird ein Geräuschereignis ausgelöst.
- Der Hörradius jedes in der Nähe befindlichen Controllers bestimmt, wer es „hört“.
- Die Hör-Pipeline verläuft über denselben `OnPerceptionUpdated`-Zielerfassungspfad wie das Sehen.

Die Gruppenmitgliedschaft ist nicht mehr der entscheidende Faktor, sondern wird zu dem, was sie eigentlich sein sollte: ein Identitätsanbieter. Das Gruppensystem wurde herabgestuft, nicht gelöscht – und der Code ist einfacher geworden.

---

## Details zur Umsetzung

### 1. Das StateTree-Schema und die Kontextaufgabe (A3.1)

Ein benutzerdefiniertes Schema + eine globale Aufgabe, die bei jedem Tick den aktuellen Status in den Baum einspeist. Die Kontextaufgabe bildet die Brücke zwischen der `TargetingComponent` des KI-Controllers und den Instanzdaten des StateTree:

```cpp
EStateTreeRunStatus FOnsetStateTreeContextTask::EnterState(FStateTreeExecutionContext& Context,
                                                           const FStateTreeTransitionResult& TransitionResult) const
{
	FInstanceDataType& InstanceData = Context.GetInstanceData(*this);

	const AOnsetAIController* AIController = Cast<AOnsetAIController>(Context.GetOwner());
	if (!AIController) return EStateTreeRunStatus::Failed;

	if (AIController->TargetingComponent)
	{
		InstanceData.Target = AIController->TargetingComponent->GetTarget();
	}

	return EStateTreeRunStatus::Running;
}

EStateTreeRunStatus FOnsetStateTreeContextTask::Tick(FStateTreeExecutionContext& Context, const float DeltaTime) const
{
	return EnterState(Context, FStateTreeTransitionResult());
}
```

Globale Aufgaben werden bei jedem Tick erneut aufgerufen, sodass `Target` in den Instanzdaten stets auf dem neuesten Stand bleibt, ohne dass eine zustandsbezogene Verwaltung erforderlich ist. Auf diesem Muster bauen alle nachfolgenden Aufgaben auf.

### 2. Wahrnehmung → Zielerfassung (A3.2)

`OnPerceptionUpdated` führt Seh- und Hördaten zusammen und wählt dann den nächstgelegenen Akteur aus, der nicht freundlich gesinnt ist:

```cpp
TArray<AActor*> PerceivedActors;
PerceptionComp->GetCurrentlyPerceivedActors(UAISense_Sight::StaticClass(), PerceivedActors);
PerceptionComp->GetCurrentlyPerceivedActors(UAISense_Hearing::StaticClass(), PerceivedActors);

AActor* BestTarget = nullptr;
float BestDist = FLT_MAX;
FVector MyLocation = GetPawn()->GetActorLocation();

for (AActor* Actor : PerceivedActors)
{
	if (Actor == nullptr) continue;

	if (Actor->ActorHasTag(FName("Player")) == GetPawn()->ActorHasTag(FName("Player")))
	{
		continue; // same team
	}
	float Dist = FVector::DistSquared(MyLocation, Actor->GetActorLocation());
	if (Dist < BestDist)
	{
		BestDist = Dist;
		BestTarget = Actor;
	}
}
if (BestTarget == nullptr)
{
	TargetingComponent->ClearTarget();
	return;
}
TargetingComponent->SetTarget(BestTarget);
```

Die Freund-Feind-Prüfung erfolgt auf Basis von Tags (gleiches `Player`-Tag → überspringen). Es handelt sich um dieselbe `TargetingComponent`, die auch der Spieler verwendet, mit derselben Validierung – eine einzige Zielerfassungsabstraktion, die sowohl für die Eingabe als auch für die Wahrnehmung zuständig ist.

### 3. Das Leck im gepoolten AIController (der schwer zu behebende Fehler im Arc)

Der schlimmste Fehler in diesem Handlungsbogen entstand durch das Zusammenspiel von „Pooling“ und der automatischen KI-Besetzung der Engine. Bei `AutoPossessAI=Spawned` + `AIControllerClass` für den Gegner:

- Die Engine hat bei **jedem** `SpawnActor` automatisch einen neuen Controller generiert – einschließlich der Vorabzuweisung des Pools.
- Die Methode `UnPossess()` von `ReturnToPool` ließ diese Controller **verwaist** zurück – ein Aktor mit Speicherleck pro Pool-Zyklus.
- Durch doppelten Besitz wurde `OnPossess` unterdrückt, sodass `StartLogic()` nie ausgeführt wurde.

Die Lösung war struktureller Natur: **Pool-Controller neben Pawns**, wobei der Spawner der alleinige Besitzer ist:

```cpp
AOnsetAIController* AOnsetPoolManager::GetPooledController()
{
	if (!bPoolInitialized) InitializePool();
	for (AOnsetAIController* Controller : ControllerPool)
	{
		if (Controller && Controller->IsHidden())
		{
			Controller->SetActorHiddenInGame(false);
			Controller->SetActorTickEnabled(true);
			Controller->StateTreeComponent->SetComponentTickEnabled(true);
			Controller->PerceptionComponent->SetComponentTickEnabled(true);
			return Controller;
		}
	}
	// Pool exhausted — fallback SpawnActor
	UE_LOG(LogPooling, Warning, TEXT("OnsetPoolManager: Controller Pool exhausted — spawning new Controllers as fallback."));
	FActorSpawnParameters Params;
	Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	if (AOnsetAIController* Controller = GetWorld()->SpawnActor<AOnsetAIController>(
		AOnsetAIController::StaticClass(), FTransform::Identity, Params))
	{
		ReleasePooledController(Controller);
		return Controller;
	}
	return nullptr;
}
```

Zwei parallele Pools (`ObjectPool` für Spielfiguren, `ControllerPool` für Controller), ein Besitzer, ein Rücksetzpfad (`ResetForPool()`). Etwas mehr Verwaltungsaufwand, aber die Invariante – *genau ein Controller pro NPC, keine verwaisten Akteure* – ist gewährleistet. Dieses Design findet im Wesentlichen unverändert Eingang in das `UOnsetPoolSubsystem` der aktuellen Codebasis.

### 4. Verhaltenszustände als kleine C++-Aufgaben (A3.3)

Jeder Zustand ist eine von `FStateTreeTaskCommonBase` abgeleitete Struktur, die später unter einer gemeinsamen `FOnsetStateTreeTaskBase` zusammengefasst wird. Die Roam-Aufgabe veranschaulicht die Struktur – ein über die Navigation erreichbarer Punkt, der am Heimatpunkt des Gegners verankert ist:

```cpp
EStateTreeRunStatus FOnsetStateTreeRoamTask::EnterState(FStateTreeExecutionContext& Context,
                                                        const FStateTreeTransitionResult& Transition) const
{
	FInstanceDataType& InstanceData = Context.GetInstanceData(*this);
	InstanceData.bHasArrived = false;
	InstanceData.PauseTimer = 0.0f;

	AOnsetAIController* AIController = Cast<AOnsetAIController>(Context.GetOwner());
	if (!AIController) return EStateTreeRunStatus::Failed;
	AOnsetEnemy* Enemy = Cast<AOnsetEnemy>(AIController->GetPawn());
	if (!Enemy) return EStateTreeRunStatus::Failed;
	UNavigationSystemV1* NavSys = FNavigationSystem::GetCurrent<UNavigationSystemV1>(AIController->GetWorld());
	if (!NavSys) return EStateTreeRunStatus::Failed;

	FVector Home = Enemy->HomeLocation;
	FNavLocation RandomPoint;
	if (NavSys->GetRandomReachablePointInRadius(Home, InstanceData.RoamRadius, RandomPoint))
	{
		InstanceData.Destination = RandomPoint.Location;
		AIController->MoveToLocation(InstanceData.Destination, InstanceData.AcceptanceRadius);
		return EStateTreeRunStatus::Running;
	}
	return EStateTreeRunStatus::Failed;
}
```

Übergänge werden durch wiederverwendbare Bedingungen gesteuert. Die `DistanceCondition` ist das Herzstück – ein Vergleich der quadrierten Entfernung mit konfigurierbaren Operatoren:

```cpp
float Distance = FVector::DistSquared(SourceLocation, TargetLocation);
float DistanceThresholdSquared = InstanceData.DistanceThreshold * InstanceData.DistanceThreshold;

switch (InstanceData.Comparison)
{
case UE::StateTree::EComparisonOperator::Less:
	return Distance < DistanceThresholdSquared;
case UE::StateTree::EComparisonOperator::LessOrEqual:
	return Distance <= DistanceThresholdSquared;
case UE::StateTree::EComparisonOperator::Greater:
	return Distance > DistanceThresholdSquared;
case UE::StateTree::EComparisonOperator::GreaterOrEqual:
	return Distance >= DistanceThresholdSquared;
default:
	return false;
}
```

### 5. GAS-Stiftung (A4.1/A4.2)

Der Bogen schließt sich mit dem ersten GAS-Code: `UOnsetAttributeSet` (Health/MaxHealth), native Gameplay-Tags, ein ASC für den Basis-Charakter und – sobald der Kampf ernst wird – `UOnsetGA_BasicAttack`. Das Attribut-Set zeigt die GAS-Konstrukte, die sich über das gesamte Projekt hinweg durchziehen:

```cpp
void UOnsetAttributeSet::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)
{
	if (Data.EvaluatedData.Attribute == GetHealthAttribute())
	{
		// Clamp Health to [0, MaxHealth]
		SetHealth(FMath::Clamp(GetHealth(), 0.0f, GetMaxHealth()));
	}
}

void UOnsetAttributeSet::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME_CONDITION_NOTIFY(UOnsetAttributeSet, Health, COND_None, REPNOTIFY_Always);
	DOREPLIFETIME_CONDITION_NOTIFY(UOnsetAttributeSet, MaxHealth, COND_None, REPNOTIFY_Always);
}
```

Zwei Anmerkungen zur Namensgebung, die es zu beachten gilt: `FAbilityTargetData` aus Beitrag 3 wurde in `FOnsetTargetData` umbenannt, da es **zu einer Namensüberschneidung mit einem Engine-Typ in UE 5.8 kam**, und `TAG_Cooldown_Melee` wurde im Zuge der Erweiterung der Fähigkeitsoberfläche zu `TAG_Cooldown_BasicAttack`.

---

## Ergebnisse und Validierung

- Gruppenunterstützungsereignis gelöscht; KI-Wahrnehmung „Hören“ übernommen (das richtige Engine-Tool).
- C++-StateTree-Schema + Kontextaufgabe, die bei jedem Tick den aktuellen Zielzustand liefert.
- Sicht- und Hörwahrnehmung mit Erkennung des nächstgelegenen nicht-freundlichen Ziels.
- **Controller wurden zusammen mit Spielfiguren gebündelt** – Speicherleck bei verwaisten Controllern behoben.
- Zustände „Idle“ → „Roam“ → „Agro“ → „LostTarget“ → „Chase“ → „Marooned“ als wiederverwendbare C++-Aufgaben/Bedingungen.
- Erstes GAS: Attributsatz, Tags, ASC und ein funktionierendes `GA_BasicAttack` mit einem Timer für den automatischen Angriff des Spielers.

---

## Herausforderungen und Lösungen

### Das Controller-Leck (siehe oben)

Die eigentliche Ursache lag darin, dass man sich beim Pooling auf die `AutoPossessAI`-Funktion der Engine verlassen hatte. Die Erkenntnis: **Pooling verändert die Annahmen zum Lebenszyklus aller betroffenen Komponenten.** Jedes System, das davon ausgeht, dass „ein Akteur entsteht, existiert und vergeht“, versagt auf subtile Weise, wenn „ein Akteur wiederverwendet wird“. Die Lösung – explizites Controller-Pooling und ein einziger Besitzer – ist das bewährte Muster.

### Der heimtückische GE-Schadensfehler

**Problem:** `GE_BasicAttackDamage` hat tatsächlich nie Schaden verursacht.

**Lösung (im täglichen TODO festgehalten):** Für den Effekt waren **erforderliche Tags festgelegt**, wodurch die Ausführung stillschweigend blockiert wurde. Durch deren Entfernung konnte der Schaden nun durchgehend fließen. Die Tag-Filterfunktionen von GAS sind leistungsstark und *arbeiten im Hintergrund* – das sollte man im Hinterkopf behalten, wenn der Schaden auf mysteriöse Weise ausbleibt.

### Die Namenskonflikte bei `FAbilityTargetData`

**Problem:** Die Kompilierung ist aufgrund eines Namens fehlgeschlagen, der bereits in der Engine vorhanden war.

**Lösung:** In `FOnsetTargetData` umbenannt. Eine Erinnerung daran, benutzerdefinierten Typen in UE konsequent ein Präfix voranzustellen.

### Verstöße gegen die Hygienevorschriften

Zwei spezielle Commits (`f9ef619`, `5dd86b7`) haben fehlende UE-Copyright-Header zu neuen Dateien hinzugefügt – der klassische Fehlerfall, wenn viele Dateien in Eile erstellt werden. Außerdem: Während der Inbetriebnahme von StateTree haben sich etwa 20 Debug-Aufrufe von `UE_LOG` angesammelt, die alle im letzten Commit entfernt wurden. Debug-Protokollierung hat eine Halbwertszeit; sie muss bereinigt werden, bevor sie zu Störsignalen wird.

---

## Reflexion und gewonnene Erkenntnisse

Die beste Entscheidung in diesem Handlungsbogen war, **die Engine wiederzuverwenden, anstatt eine maßgeschneiderte zu entwickeln.** `NotifyMemberAttacked` wurde gelöscht, nicht repariert – eine schwierige, aber richtige Entscheidung. Wenn die in der Engine integrierte Pipeline (Geräusch → Hören → Wahrnehmung) genau das tut, was man braucht, ist der eigene Code eher eine Belastung als ein Gewinn. Es ist verlockend, das eigene System beizubehalten, weil man bereits die Hälfte davon geschrieben hat; dieser Handlungsbogen zeigt jedoch, wie wertvoll es ist, es trotzdem aufzugeben.

Das Controller-Pooling war die am schwersten gewonnene Erkenntnis. Es hat meine Sichtweise auf gepoolte Akteure grundlegend verändert: **Ein gepoolter Akteur ist eine Ressource, keine Entität.** Sein Lebenszyklus liegt in der Verantwortung des Pools, und jedes Subsystem, das mit ihm in Berührung kommt (possess, unpossess, reset, re-activate), muss in einem einzigen Reset-Pfad zentralisiert werden.

Außerdem habe ich gelernt, wie eine gute GAS-Grundlage aussieht: minimalistisch (zwei Attribute, eine Fähigkeit, native Tags), aber mit den richtigen Idiomen – Clamping in `PostGameplayEffectExecute`, `DOREPLIFETIME_CONDITION_NOTIFY`, Tags als erstklassige Oberfläche. Alles in späteren Kampfsequenzen hängt an diesen Haken.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A3.1–A3.3 — StateTree-Schema, Wahrnehmung, Verhaltenszustände | ✅ Abgeschlossen |
| A4.1/A4.2 — GAS-Grundlagen, Grundangriff | ✅ Abgeschlossen |
| A4.3 — Trefferreaktionen (ereignisgesteuert) | ⏭️ Weiter |
| A4.4 — Integration von NPC-Angriffen in GAS | Weiter |
| A4.5 — Tod, Rückkehr zum Pool, Respawn, Leichen | Weiter |

**Was als Nächstes passiert:** Die Gegner *nehmen* den Spieler nun wahr, aber wenn der Basisangriff trifft, fühlt es sich so an, als wäre nichts passiert. Beitrag 6 sorgt dafür, dass der Treffer sitzt: Das GAS-Ereignis `Event.HitReaction` löst eine korrekte Trefferreaktion aus, NPC-Angriffe haben keine eigenen Abklingzeiten mehr und fragen stattdessen GAS-Tags ab, und der Tod wird zu einer Verzweigung – `Event.Death` + ein direkter Aufruf von `OnDeath()` –, der eine Leiche erzeugt, den NPC in den Pool zurückbringt und einen Respawn-Timer startet. Außerdem: Der `PoolManager`-Akteur wird zu einem `UWorldSubsystem`.

> **Nächstes Mal in Beitrag 6:** Der Tod ist eine Weggabelung, kein Zustand – Reaktionen auf den „Hit“, Leichendarsteller und die Migration vom Pool-Manager zum Pool-Subsystem.

---

*Arc-Commits: `ab36977` → `47076ad`. Zugehörige Dokumente: `Docs/AI/NPC_AI_System.md`, `Docs/AI/Group_System.md`, `Docs/AI/Pooling_System.md`, `Docs/GAS/GAS_System.md`.*


