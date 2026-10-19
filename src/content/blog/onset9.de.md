---
id: "onset9"
title: "🎬 Entwicklertagebuch: Dem Spieler beibringen, selbst zu spielen – Autoplay, Übergabe nach Ablauf des Inaktivitäts-Timers, Lebenszyklus von „bIsAlive“"
seoTitle: "Dem Spieler beibringen, sich selbst zu spielen: Autoplay, Idle-Timer, Übergabe und bIsAlive-Lebenszyklus"
date: "2026-09-14"
category: "Game Dev"
summary: "Implementiert die automatische Steuerung der Spieler-KI durch einen Besitzwechsel – die Spielfigur wird von einem KI-Controller übernommen, der dieselben StateTree-Aufgaben ausführt wie die NPCs. Fügt einen Fünf-Sekunden-Inaktivitäts-Timer hinzu, der die automatische Steuerung auslöst, eine Eingabe-Überschreibungsfunktion, die die Kontrolle sofort zurückgibt, sowie ein „bIsAlive“-Lebenszyklus-Flag, das tote/versteckte Gegner aus der Zielerfassung herausfiltert."
project: "Onset"
tags: ["Unreal Engine", "AI Controller", "StateTree", "Possession System", "Autoplay", "Gameplay Testing"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Seit Wochen verfügen die NPCs über ein „Gehirn“. Der Spielercharakter – der eigentliche Grund für die Existenz der Demo – hatte bisher nichts als Eingabebehandler. Dieser Handlungsbogen behebt diese Asymmetrie auf die buchstäblichste Art und Weise: **Der Spielercharakter wird von einem KI-Controller besessen und spielt sich selbst.**

Die vier Commits erfolgen innerhalb eines einzigen achtminütigen Zeitfensters und schließen gemeinsam A3.5 (Player AI Autoplay) ab. Dabei handelt es sich ebenso sehr um eine Testumgebung wie um eine Funktion: In der Dokumentation wird dies als *„Autoplay-/Testmodus … nützlich für Stresstests, Demos und die Fehlersuche“* beschrieben. Wenn der Spieler automatisch kämpfen kann, lässt sich ein KI-gegen-KI-Kampf demonstrieren, das Bedrohungssystem einem Stresstest unterziehen und das Spiel selbstständig laufen lassen, während man Spielmaterial aufzeichnet. Das technisch Interessante ist jedoch nicht der Teil „Schau mir beim Kämpfen zu“ – es ist die Übergabe des Ballbesitzes, das Lebenszyklus-Flag, das die KI dazu bringt, tote Gegner zu ignorieren, und die Eingabesteuerung, die die Kontrolle in dem Moment zurückgibt, in dem ein Mensch etwas berührt.

---

## Technische Erläuterung

### „Autoplay“ ist ein Ballbesitzwechsel, keine Simulation

Die im Sprintplan dokumentierte Designentscheidung lautet, dass die Autoplay-Funktion durch **tatsächliche Besitzübergabe** implementiert wird. `AutoCombatController->Possess(MyPawn)`, anschließend `UnPossess()`. Der Spielstein nimmt davon keine Notiz – `GrantDefaultAbilities` verfügt bereits über eine `bAbilitiesGranted`-Prüfung, sodass bei erneuter Ballbesitzübernahme keine erneute Vergabe erfolgt. Dies ist die Entscheidung zur „Durchführbarkeit des Controller-Wechsels“ und bedeutet, dass die Spieler-KI *genau dieselben StateTree-Aufgaben* verwendet wie die NPCs, ohne dass im Spielfigur-Objekt Sonderfälle berücksichtigt werden müssen.

### Das Lebenszyklus-Flag: `bIsAlive`

Bevor es die Autoplay-Funktion gab, wies die Zielerfassung eine Lücke in der Korrektheit auf: Aus dem Pool entnommene Gegner kehren *versteckt, aber lebendig* in den Pool zurück, und der Pool recycelt sie mit einem veralteten Status. Wenn die Spieler-KI mit `IsHidden()` oder `IsValid()` nach Zielen suchte, konnte sie eine Leiche oder einen versteckten, aber wieder erscheinenden NPC als Ziel auswählen. Die Lösung ist ein explizites Lebenszyklus-Flag, das bei jedem Pool-Wechsel synchron bleibt:

```cpp
void AOnsetBaseCharacter::ResetAttributes()
{
	if (!AbilitySystemComponent) return;
	AttributeSet->InitHealth(AttributeSet->GetMaxHealth());
	AttributeSet->InitMaxHealth(100.0f);
	MovementAttributes->InitMovementSpeed(600.0f);
	bIsAlive = false; // Pool return — OnRespawn() re-enables on retrieval
}

void AOnsetBaseCharacter::OnDeath(AActor* KillingActor)
{
	bIsAlive = false;
}

bool AOnsetBaseCharacter::IsAlive() const
{
	return bIsAlive && AttributeSet && AttributeSet->GetHealth() > 0.0f;
}

void AOnsetBaseCharacter::OnRespawn()
{
	bIsAlive = true;
	SetActorHiddenInGame(false);
	SetActorTickEnabled(true);
	SetActorEnableCollision(true);
}
```

Der Pool wird zum einzigen Aufhängepunkt: Beim Abrufen wird `OnRespawn()` aufgerufen, beim Verlassen wird das Flag auf „false“ gesetzt.

```cpp
for (AOnsetEnemy* Enemy : ObjectPool)
{
	if (Enemy && Enemy->IsHidden())
	{
		ActiveEnemies.Add(Enemy);
		Enemy->OnRespawn();
		return Enemy;
	}
}
```

---

## Details zur Umsetzung

### 1. Die „Ability“-Tag-Familie

Die Autoplay-Funktion muss wissen, *welche* Fähigkeiten sie auslösen darf – die Trefferreaktionsfähigkeit darf niemals KI-gesteuert sein. Eine neue Tag-Familie `Ability.Type.*` (`Attack`/`Buff`/`Debuff`/`Heal`) wird eingeführt, und `GA_BasicAttack` wird mit einem Tag versehen. Die Angriffslogik der KI filtert später nach `TAG_Ability_Attack`.

### 2. Der Leerlauf-Timer und die Übergabe

`AOnsetPlayerController` führt einen fünfsekündigen Leerlauf-Timer aus. Jede Eingabe setzt ihn zurück; wenn er abläuft, übernimmt die KI die Steuerung:

```cpp
void AOnsetPlayerController::EnableAutoCombat()
{
	if (!AutoCombatController || bAutoCombatEnabled) return;
	if (APawn* MyPawn = GetPawn())
	{
		AutoCombatController->Possess(MyPawn);
		UnPossess();
		GetWorldTimerManager().SetTimerForNextTick(this, &AOnsetPlayerController::DelayedSetViewTarget);
		bAutoCombatEnabled = true;
	}
}

void AOnsetPlayerController::ResetIdleTimer()
{
	GetWorldTimerManager().ClearTimer(IdleAutoCombatTimerHandle);
	if (IdleAutoCombatDelay > 0.0f)
	{
		GetWorldTimerManager().SetTimer(IdleAutoCombatTimerHandle, this,
			&AOnsetPlayerController::EnableAutoCombat, IdleAutoCombatDelay, false);
	}
}
```

Jeder Eingabe-Handler beginnt mit denselben zwei Zeilen – der Eingabe-Überschreibung, die das automatische Abspielen reibungslos ermöglicht:

```cpp
void AOnsetPlayerController::OnMove(const FInputActionValue& Value)
{
	if (bAutoCombatEnabled) DisableAutoCombat();
	ResetIdleTimer();
	FVector2D MovementVector = Value.Get<FVector2D>();
	if (MovementVector.IsZero()) return;
	StopMovement();
	// ...
}
```

### 3. AcquireTarget: Der beste lebende Feind

Die Aufgabe wählt den nächstgelegenen *lebenden* Gegner innerhalb einer Reichweite aus, die sich anhand der Einstellschieberegler des Controllers dynamisch anpasst, und überprüft anschließend, ob das Ziel über das Navmesh erreichbar ist:

```cpp
for (const TWeakObjectPtr<AOnsetEnemy>& Weak : Pool->GetActiveEnemies())
{
	AOnsetEnemy* Enemy = Weak.Get();
	if (!Enemy || !Enemy->IsAlive()) continue;
	float DistH = FVector::Dist(Enemy->GetActorLocation(), Home);
	if (DistH > Leash) continue;
	float DistS = FVector::Dist(Enemy->GetActorLocation(), SelfLoc);
	if (DistS > Range) continue;
	FNavLocation Projection;
	if (!NavSys->ProjectPointToNavigation(Enemy->GetActorLocation(), Projection, FVector(200.0f))) continue;
	if (DistS < BestDist) { BestDist = DistS; Best = Enemy; }
}
if (Best)
{
	FOnsetStateTreeTask::SetTarget(Context, Best);
	return true;
}
```

Der Filter `IsAlive()` ist der eigentliche Sinn des Lebenszyklus-Flags aus `b50004c`.

### 4. Angreifen: Annäherung, dann Angriff mit Vollgas

Die „engage“-Aufgabe kombiniert bewusst Bewegung und Angriff in einem Zustand – eine dokumentierte Entscheidung: *„Bewegung und Angriff sind in einer Aufgabe vereint, um die Zustandsverwaltung zu vereinfachen“* – anstatt separate „Chase“- und „Attack“-Zustände mit Übergangsflackern zu verwenden. Innerhalb der Reichweite hält sie an, konzentriert sich und feuert einsatzbereite Angriffsfähigkeiten im 0,25-Sekunden-Takt ab:

```cpp
if (DistanceSquared > Self->AttackRange * Self->AttackRange)
{
	Controller->MoveToActor(Target, InstanceData.AcceptanceRadius);
	return EStateTreeRunStatus::Running;
}
Controller->StopMovement();
Controller->SetFocus(Target);

if (Now - InstanceData.LastAttackTick < InstanceData.AttackTickInterval)
	return EStateTreeRunStatus::Running;
InstanceData.LastAttackTick = Now;

UAbilitySystemComponent* ASC = Self->AbilitySystemComponent;
TArray<FGameplayAbilitySpec> Abilities = ASC->GetActivatableAbilities();

for (auto& AbilitySpec : Abilities)
{
	if (!AbilitySpec.Ability
		|| !AbilitySpec.Ability->CheckCooldown(AbilitySpec.Handle, ASC->AbilityActorInfo.Get())
		|| !AbilitySpec.Ability->GetAssetTags().HasTag(TAG_Ability_Attack))
		continue;
	ReadyAbilities.Add(AbilitySpec.Handle);
}
```

Beachte den „Perf Guard“: Ein AoE-Überlappungsscan wird nur ausgeführt, wenn *zwei oder mehr* Fähigkeiten bereit sind. Die KI feuert nicht in jedem Frame alles ab; sie verhält sich wie ein vorsichtiger Spieler.

---

## Ergebnisse und Validierung

- Spielerfigur, die von einer KI-Steuerung gesteuert wird, die dieselben StateTree-Aufgaben ausführt wie die NPCs.
- Auslöser bei fünf Sekunden Inaktivität; jede Eingabe bricht die automatische Steuerung ab und setzt den Timer zurück.
- `bIsAlive`-Lebenszyklus-Flag, das tote/versteckte Gegner aus der Zielerfassung herausfiltert.
- „Ability“-Tag-Familie (`Ability.Type.*`), die steuert, welche Fähigkeiten die KI einsetzt.
- Auf dem Navmesh projizierte Zielauswahl mit Schiebereglern zur Anpassung von Leash und Zielerfassung.
- Kameraübergabe über verzögertes `SetViewTarget` (später entfernt, sobald die Engine dies auf natürliche Weise übernahm).
- Die Dokumentation wurde entsprechend überarbeitet – gemäß der wiederkehrenden Vorgabe „Die Dokumentation muss der Realität entsprechen“.

---

## Herausforderungen und Lösungen

### Das Kamera-Rennen

**Problem:** Beim Wechsel des Besitzers besteht die Gefahr eines schwarzen Bildes – die Bereinigung durch den `PlayerCameraManager` wartet nicht ab.

**Lösung:** `DelayedSetViewTarget` verzögerte einen Tick mittels `SetTimerForNextTick`. Später, als sich die Architektur vereinfachte, wurde die gesamte Umgehungslösung entfernt (`adc399b`, das Post-10-Audit), da die Kamera dem besessenen Spielfigur nun nativ folgte. Eine kurzlebige Korrektur, die ihren Zweck erfüllte und dann zu toten Code wurde.

### Das „StateTree“-Asset wurde nicht geladen

**Problem:** Der Konstruktor `FObjectFinder` verhielt sich beim Asset `PlayerAutoCombat` unzuverlässig.

**Lösung:** Umstellung auf `LoadObject` mit einem Fallback-Neuladevorgang innerhalb von `OnPossess` sowie einem Warnprotokoll. Der aktuelle Code fügt eine `WITH_EDITOR`-`CompileIfChanged()`-Abfrage hinzu – ein Hinweis darauf, dass der Baum eine Neukompilierung durch den Editor benötigte, um ausgeführt zu werden. Erkenntnis: StateTree-Assets sind editorabhängig; ihr Laden ist zur Laufzeit als fehleranfällig zu betrachten.

### Die Umbenennung von `PlayerAttackTask` in `PlayerEngageTask`

**Problem:** Im Plan hieß es „AttackTask“; im Entwurf einigte man sich schließlich auf eine kombinierte Einsatzaufgabe.

**Lösung:** Vor der Implementierung umbenannt. Die Abweichung zwischen Dokumentation und Code wurde im „doc-sync“-Commit korrigiert und nicht einfach sich anhäufen gelassen.

---

## Reflexion und gewonnene Erkenntnisse

Der Ansatz des Besitzwechsels war die richtige Entscheidung, und darin liegt die wichtigste Erkenntnis dieses Entwicklungszyklus: **Das Besitzmodell der Engine wiederverwenden, anstatt ein paralleles aufzubauen.** Der KI-Controller für den Spieler ist nur ein weiterer Controller. Die Spielfigur weiß nie, wer sie steuert. Das ist die Art von Design, die Bestand hat, weil sie Codepfade *entfernt*, anstatt sie hinzuzufügen.

Das `bIsAlive`-Flag hat mir die zweite Lektion vermittelt: **Wenn ein System (Pooling) zu Mehrdeutigkeiten beim Status führt, sollte man dem Status einen eindeutigen Namen geben.** `IsHidden()` ist ein Rendering-Konzept; `IsAlive()` ist ein Gameplay-Konzept. Die Autoplay-KI war der erste Anwendungsfall, der diese Unterscheidung *erforderte*, und das Flag machte das Ganze eindeutig.

Was ich anders machen würde: Ich hätte die Kamera-Umgehungslösung nur so lange beibehalten, wie sie nötig war, und sie noch im selben Sprint gelöscht. Sie hat es bis zur Überprüfung überstanden, weil sie tragend aussah, obwohl sie es nicht war. Toter Code, der wichtig *aussieht*, ist gefährlicher als toter Code, der tot aussieht.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A3.5 – Automatisches Spiel der Spieler-KI | ✅ Abgeschlossen |
| A3 — KI-Systeme | ✅ Abgeschlossen (91 %) |
| Bedrohungssystem (Aggro → Bedrohung) | ⏭️ Weiter |
| Sprint A5 — Multiplayer & Steam | Weiter |

**Was als Nächstes kommt:** Die Autoplay-Funktion wurde entwickelt, um Kämpfe zu *beobachten* – und diese Beobachtung deckte sofort die Schwäche des Kampfzyklus auf: Eine Menge von Gegnern drängt sich zu einem Klumpen zusammen, und die Frage „Wen soll ich angreifen?“ lässt sich nicht beantworten, wenn mehrere Spieler vorhanden sind. Im nächsten Abschnitt wird das Bedrohungssystem entwickelt: eine serverseitige Bedrohungstabelle, die durch die Schadenspipeline, die Bewertung von Bedrohung × Entfernung zum Ziel, die deterministische Winkelverteilung im Kampf und die KI-LOD gespeist wird – sowie die Überprüfung des Quellcodes, bei der der Kamera-Workaround entfernt und die gesamte Aufgabenfamilie umbenannt wird.

> **Nächstes Mal in Beitrag 10:** Von „Aggro“ zu „Threat“ – Aufbau einer serverseitigen Bedrohungstabelle, Vereinfachung des StateTree und Eindämmung von Tick-Spam.

---

*Arc-Commits: `b50004c`, `b4c820e`, `2a37283`, `f9f6edf`. Zugehörige Dokumente: `Docs/AI/Player_AI_System.md`, `Docs/AI/Pooling_System.md`, `Docs/GAS/GAS_System.md`.*


