---
id: "onset8"
title: "🎬 Entwicklungs-Tagebuch: Die Verfolgungsjagd optimieren – GAS-Geschwindigkeitssynchronisation, Pool-Reset und Offsets zur Vermeidung von Gruppenbildung"
seoTitle: "Behebung des Problems mit dem Chase-GAS-Speed-Sync-Pool-Reset und den Anti-Bunching-Offsets"
date: "2026-09-11"
category: "Game Dev"
summary: "Behebt drei schwerwiegende Fehler im Bewegungsattribut-Set: „PostGameplayEffectExecute“ wurde bei unendlichen Effekten nie ausgelöst (behoben mit „PostAttributeChange“), aus dem Pool stammende Gegner tauchten mit null Lebenspunkten wieder auf (behoben mit „ResetAttributes“ bei Rückkehr aus dem Pool) und Gegner drängten sich während der Verfolgungsjagd zusammen (behoben mit Winkelversätzen pro Agent und einem Zeitlimit für die Verfolgungsjagd)."
project: "Onset"
tags: ["Unreal Engine", "Gameplay Ability System", "AI Movement", "Object Pooling", "Bug Fixes", "StateTree"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

In Beitrag 7 wurde der Bewegungsattributsatz veröffentlicht und der Sieg verkündet. Die nächsten zwei Tage zeigen, wie dieser Sieg in der Praxis aussieht: **Alles, was stillschweigend fehlerhaft veröffentlicht wurde, wird behoben.** Der GAS-Speed-Sync-Callback wurde bei unendlichen Effekten nie ausgelöst. Gegner aus dem Pool tauchten nach ihrem Tod mit `Health = 0` wieder auf. Und – was man *sehen* kann – Gegner, die den Spieler verfolgten, sammelten sich zu einem einzigen Klumpen, der aussah, als würden sie alle versuchen, dasselbe Pixel zu besetzen.

Dieser Entwicklungsabschnitt ist kurz (sieben Commits, zwei Tage) und dient fast ausschließlich der Fehlerbehebung. Er verdeutlicht den Unterschied zwischen „die Funktion funktioniert im Test“ und „die Funktion funktioniert im System“. Er endet mit einer strukturellen Umgestaltung, die den Weg für das nächste große Projekt ebnet: die automatische Wiedergabe der Spieler-KI.

---

## Technische Erläuterung

### Der heimliche Fehler: `PostGameplayEffectExecute` wird bei unendlichen Effekten nie ausgelöst

Das in Beitrag 7 festgelegte Bewegungsattribut synchronisierte `MaxWalkSpeed` in `PostGameplayEffectExecute`. Allerdings wird dieser Callback **nur für sofortige und periodische Effekte ausgelöst** – und die dynamischen Geschwindigkeitsmodifikatoren (Flee, Investigate, Search) waren allesamt GEs mit **unendlicher Dauer**. Daher wurde die Geschwindigkeitssynchronisierung stillschweigend nie ausgeführt.

Die Lösung ist `PostAttributeChange`, das bei jeder Attributänderung ausgelöst wird, unabhängig vom Effekttyp:

```cpp
void UOnsetMovementAttributeSet::PostAttributeChange(const FGameplayAttribute& Attribute, float OldValue,
	float NewValue)
{
	if (Attribute == GetMovementSpeedAttribute())
	{
		float ClampedSpeed = FMath::Max(NewValue, 0.0f);
		if (AOnsetBaseCharacter* Character = Cast<AOnsetBaseCharacter>(GetOwningActor()))
		{
			Character->GetCharacterMovement()->MaxWalkSpeed = ClampedSpeed;
		}
	}
}
```

Das ist ein klassischer Fehler vom Typ „Es lässt sich kompilieren, es läuft, aber es passiert nichts“. Die Lehre daraus betrifft nicht die Details der GAS-API – sondern die Tatsache, dass **ein Callback, der niemals ausgelöst wird, nicht von einem funktionierenden Callback zu unterscheiden ist**, es sei denn, man überprüft das tatsächliche Verhalten von Anfang bis Ende.

### Der durchgesickerte Todeszustand

Gezielte Gegner behalten ihren Aktorenzustand über mehrere Leben hinweg bei. Der Todesablauf in Beitrag 6 setzte `Health = 0`; ohne expliziten Reset wurde bei der nächsten Aktivierung dieses gezielten Spielfigurenpools ein Gegner mit **null Gesundheit** generiert. Die Korrektur platziert den Reset an dem einen Engpass, den jeder Gegner im Laufe seines Lebenszyklus durchläuft – der Rückkehr zum Pool:

```cpp
void AOnsetBaseCharacter::ResetAttributes()
{
	if (!AbilitySystemComponent) return;
	AttributeSet->InitHealth(AttributeSet->GetMaxHealth());
	AttributeSet->InitMaxHealth(100.0f);
	MovementAttributes->InitMovementSpeed(600.0f);
}
```

Wird von `UOnsetPoolSubsystem::ReturnToPool` aufgerufen, unmittelbar nachdem aktive Effekte entfernt wurden:

```cpp
if (Enemy->AbilitySystemComponent)
{
	Enemy->AbilitySystemComponent->RemoveActiveEffects(FGameplayEffectQuery(), -1);
}
Enemy->ResetAttributes();
```

Zurücksetzen bei Rückkehr, nicht beim Erscheinen – denn bei der Rückkehr „endet das Leben“ des aus dem Pool stammenden Spielfiguren, und wenn die Austrittsbedingung des Pools in einen makellosen Zustand versetzt wird, ist jeder Eintritt sicher.

### Der sichtbare Fehler: Verklumpung

Der Wert für die Abstandshaltung zur Menge wurde von `2,0` auf `8,0` erhöht – eine Notlösung. Die eigentliche Ursache war die Zielkonvergenz: `MoveToActor(TargetActor)` wies jedem Gegner den **genau gleichen Zielpunkt** zu. Die eigentliche Lösung besteht darin, jedem Agenten ein eindeutiges Ziel zuzuweisen, indem ein zufälliger seitlicher Versatz senkrecht zur Anflugrichtung verwendet wird:

```cpp
const FVector TargetLoc = TargetActor->GetActorLocation();
const FVector SelfLoc = AIController->GetPawn()->GetActorLocation();
const FVector ApproachDir = (SelfLoc - TargetLoc).GetSafeNormal2D();
const FVector Right = FVector::CrossProduct(ApproachDir, FVector::UpVector).GetSafeNormal();
const float Spread = FMath::RandRange(InstanceData.SpreadRadius * 0.5f, InstanceData.SpreadRadius);
const float LateralT = FMath::RandRange(-1.0f, 1.0f);
InstanceData.OffsetLocation = TargetLoc + Right * LateralT * Spread;
AIController->MoveToLocation(InstanceData.OffsetLocation, InstanceData.AcceptanceRadius);
```

Da der Offset bei jedem `EnterState` zufällig festgelegt wird, erzeugt die Wiederholungsschleife des StateTree (Chase-Failed → Selector) bei jedem Versuch eine *neue* Verteilung – eine ressourcenschonende, emergente Formation ohne Formations- oder Zuordnungssystem. Trennungsgewicht und Offset sind sich ergänzende Ebenen: Die eine sorgt während des Flusses für den Vortrieb, die andere für die Verteilung am Zielort.

### Das Zeitlimit für die Verfolgung

Das durch eine Menschenmenge simulierte Nachverfolgen von Pfaden kann zu einem Deadlock führen – ein Gegner, der dauerhaft von einem anderen NPC oder der Spielumgebung blockiert wird und endlos hinterherjagt. Ein Zeitlimit wandelt den endlosen Zustand „Running“ in „Failed“ um:

```cpp
InstanceData.ChaseStartTime = AIController->GetWorld()->GetTimeSeconds();
AIController->MoveToActor(TargetActor, InstanceData.AcceptanceRadius);
// ...
float Elapsed = AIController->GetWorld()->GetTimeSeconds() - InstanceData.ChaseStartTime;
if (Elapsed > InstanceData.MaxChaseDuration)
	return EStateTreeRunStatus::Failed;
```

Der StateTree durchläuft die Pfade `Failed → LostTarget → Selector`, wodurch der Gegner in eine Schleife aus Zurücksetzen und Erneutversuchen gerät, anstatt unendlich lange in der Wegfindung stecken zu bleiben.

### Das Profil wird an den Controller weitergeleitet

Im vorherigen Abschnitt wurden Verhaltensdaten auf den Spielstein übertragen; der Eigentümer des StateTree-Ausführungskontexts *ist* jedoch der Controller, und Bedingungen lesen Schwellenwerte zum Zeitpunkt der Auswertung aus. Das `UAIProfile` wird in den `AOnsetAIController` verschoben, wo der Kontext darauf zugreifen kann – visuelle Daten verbleiben auf dem Spielfigur, Verhaltensdaten befinden sich dort, wo das Verhalten ausgeführt wird:

```cpp
UFUNCTION(BlueprintCallable, Category = "AI")
const UAIProfile* GetAIProfile() const { return AIProfile; }
```

---

## Details zur Umsetzung

Die Korrekturen des Bogens in der Reihenfolge:

1. **`be9b07a`** — `AIProfile` in den Controller verschieben; Geschwindigkeitssynchronisierung von `PostAttributeChange`.
2. **`c172625`** — `ResetAttributes()` bei Rückkehr aus dem Pool (drei Stunden nach dem letzten Mal, nachdem die doppelten `AddSpawnedAttribute`-Aufrufe bereinigt wurden).
3. **`fa17a74`** – Zeitlimit für die Verfolgung bei festgefahrenem Pfad.
4. **`4af0c64`** – Abstand zwischen den Figuren `2,0 → 8,0` (Notlösung).
5. **`6d8b663`** — Lint-Prüfung auf Leerzeichen (ein Disziplinierungsdurchlauf während der Fehlerbehebung).
6. **`14d99fe`** — Verfolgungs-Offset pro Agent (die eigentliche Korrektur) + Kamera-Reichweite `1000 → 2000`.
7. **`6f1db6c`** — AI-Quellcode in `Enemy/` + `StateTree/` neu organisieren, die Aufgabenbasis umbenennen und das Autoplay-System der Spieler-AI als Stub implementieren.

Die Kameraänderung in `14d99fe` verdient eine Anmerkung: Arm `1000 → 2000` für ein breiteres Sichtfeld. Da der Spieler bald KI-gesteuert sein wird und sich die Zuschauer ausbreiten, muss die Testkamera das gesamte Spielfeld erfassen – eine Telemetrie-Entscheidung, die im Hinblick auf die nächste Funktion getroffen wurde.

### Die Entwürfe für die Spieler-KI (die heimliche Sensation)

Der letzte Commit hinterlässt drei Stubs und eine Oberfläche für den Besitzwechsel:

- `AOnsetPlayerAIController` – verfügt über eine `UStateTreeAIComponent` und steuert die Spielerfigur.
- `FPlayerAcquireTargetTask` / `FPlayerAttackTask` – Skizzen, die nur aus Header-Dateien bestehen.
- Verfolgung von `ActiveEnemies` im Pool + `EnableAutoCombat`/`DisableAutoCombat` im PlayerController:

```cpp
void AOnsetPlayerController::EnableAutoCombat()
{
	if (!AutoCombatController || bAutoCombatEnabled) return;
	if (APawn* MyPawn = GetPawn())
	{
		AutoCombatController->Possess(MyPawn);
		UnPossess();
		bAutoCombatEnabled = true;
	}
}
```

Die Umstrukturierung war kein reiner Kosmetik-Eingriff – sie war eine **Voraussetzung**. Zwei Nutzer derselben StateTree-Infrastruktur (NPC-KI + Spieler-KI) sollten künftig nebeneinander existieren, weshalb zunächst eine klare Trennung erforderlich war. `FOnsetStateTreeTaskBase` wird zu `FOnsetStateTreeTask`, und die gemeinsam genutzten Primitive werden in den Ordner `StateTree/` verschoben, in dem sowohl NPC- als auch Spieler-Tasks untergebracht werden.

---

## Ergebnisse und Validierung

- Geschwindigkeitsmodifikatoren synchronisieren nun tatsächlich `MaxWalkSpeed` (über `PostAttributeChange`).
- Wiederverwendete Gegner erscheinen nicht mehr mit null Lebenspunkten.
- Verfolgende Gruppen verteilen sich in natürlichen Bögen, anstatt sich zu ballen.
- Festgefahrene Verfolgungsjagden werden nach einer bestimmten Zeit abgebrochen und mit einer neuen Formation erneut versucht.
- Die Verhaltensdaten des `AIProfile` werden vom Controller verwaltet; visuelle Daten befinden sich auf dem Pawn.
- AI-Quellen wurden in `Enemy/` und `StateTree/` aufgeteilt; die Autoplay-Funktion der Spieler-KI wurde mit Hooks für den Ballbesitzwechsel versehen.

---

## Herausforderungen und Lösungen

### Attributregistrierung nach dem Prinzip „Versuch und Irrtum“

**Problem:** `be9b07a` hat sowohl im Konstruktor als auch in `PossessedBy` Aufrufe von `AddSpawnedAttribute` hinzugefügt. Drei Stunden später hat `c172625` beide entfernt – der Aufruf im Konstruktor ist wirkungslos (generierte Attribute sind vorübergehend), und `PossessedBy` duplizierte bereits vorhandene Logik.

**Lösung:** Ein sichtbares Hin und Her. Die Lektion: **Wenn du dir nicht sicher bist, wo eine GAS-Initialisierung hingehört, rechne damit, dass du sie beim ersten Mal falsch einfügst** – und bereinige die falsche Version noch in derselben Sitzung, nicht erst sechs Commits später.

### Das klumpende Pflaster vs. die echte Lösung

**Problem:** Die Trennung `2,0 → 8,0` hat während des Durchflusses geholfen, aber am Zielort bildete sich erneut ein Klumpen.

**Lösung:** Der Offset pro Agent. Dieses Beispiel verdeutlicht den Wert einer mehrstufigen Diagnose: Passen Sie den Parameter an, suchen Sie aber weiterhin nach der *eigentlichen* Ursache. Eine erfolgreiche Fehlerbehebung endet mit der Änderung des Parameters *und* der strukturellen Korrektur.

### „Tote“ Callbacks und der Wert der Überprüfung

Der Fehler, bei dem `PostGameplayEffectExecute` nicht ausgelöst wurde, und der Lebenspunktverlust haben eines gemeinsam: **beide waren im Smoke-Test nicht erkennbar.** Um sie aufzudecken, war eine systemische Betrachtung erforderlich – „Was passiert eigentlich über den gesamten Lebenszyklus hinweg?“ –. Beide wurden innerhalb eines Tages nach der Veröffentlichung entdeckt, da der nächste Integrationsschritt (das Respawnen aus einem Pool) den gesamten Zyklus durchlief.

---

## Reflexion und gewonnene Erkenntnisse

Dieser Abschnitt verdeutlicht am deutlichsten den Rhythmus des Projekts: **erst aufbauen, dann stabilisieren.** Jedes „fertiggestellte“ System musste nach der Einbindung in das Gesamtsystem noch einmal überarbeitet werden – um aufgedeckte Lebenszyklus-Lecks, von GAS aufgedeckte Callback-Semantik und von der Community aufgedeckte Zielkonvergenz zu beheben. Indem wir diese Probleme als normal betrachteten (und nicht als persönliches Versagen), konnten sie jeweils innerhalb eines Tages behoben werden.

Der Engpass bei der Rückgabe an den Pool verdient besondere Beachtung: **Wenn der Lebenszyklus jedes Akteurs über eine einzige Funktion verläuft, sollte der Reset dort platziert werden.** `ResetAttributes` + `RemoveActiveEffects` in `ReturnToPool` ist die einzige Verteidigungslinie gegen eine ganze Klasse von Fehlern im Zusammenhang mit wiederverwendeten Zuständen, und sie bleibt korrekt, da nichts den Pool mehr umgehen kann (in Beitrag 4 wurde der `SpawnActor`-Fallback genau deshalb entfernt, damit diese Invariante gilt).

Der Instinkt, erst eine Umstrukturierung vorzunehmen und dann erst die neue Funktion zu entwickeln, ist nachahmenswert: Bevor die Funktion „Player-KI“ einen zweiten Nutzer der StateTree-Infrastruktur hinzufügte, wurden die Quelldateien aufgeteilt und so benannt, dass sie nebeneinander bestehen konnten. Das ist der Schritt, der die „nächste Funktion kostengünstig macht“, und im Nachhinein betrachtet ist dies der Commit, der wie eine reine Aufräumaktion aussieht, aber tatsächlich eine tragende Rolle spielt.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| E22-Korrektheit – Geschwindigkeitssynchronisation, Pool-Reset | ✅ Abgeschlossen |
| Korrekturen bei der Verfolgung – Timeout, Abstand, Offsets | ✅ Abgeschlossen |
| Quellcode-Reorganisation – `Enemy/` + `StateTree/` | ✅ Abgeschlossen |
| A3.5 – Autoplay der Spieler-KI | ⏭️ Weiter |

**Was als Nächstes ansteht:** Drei Stubs warten darauf, umgesetzt zu werden – `AOnsetPlayerAIController`, `PlayerAcquireTargetTask`, `PlayerAttackTask` – sowie die Verfolgung von `ActiveEnemies` und ein Hook zum Kontrollwechsel, der die Spielfigur an einen StateTree übergibt, sobald der Spieler inaktiv wird. Beitrag 9 verwandelt diese Stubs in einen vollständigen Autoplay-Modus: Der Spielercharakter wird KI-gesteuert, wählt Ziele aus dem Pool aus, nutzt dieselben StateTree-Primitive wie die NPCs und gibt die Kontrolle in dem Moment zurück, in dem der Spieler eine Eingabe vornimmt.

> **Nächstes Mal in Beitrag 9:** Die Kontrolle abgeben – Automatisches Spielen, automatisches Sammeln, automatischer Angriff der Spieler-KI und die Übergabe nach Ablauf des Inaktivitäts-Timers.

---

*Arc-Commits: `be9b07a` → `6f1db6c`. Zugehörige Dokumente: `Docs/GAS/GAS_System.md`, `Docs/GAS/Episode22_MovementSpeedAttribute.md`, `Docs/AI/Pooling_System.md`, `Docs/AI/NPC_AI_System.md`, `Docs/AI/Player_AI_System.md`.*


