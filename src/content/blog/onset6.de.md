---
id: "onset6"
title: "🎬 Entwickler-Tagebuch: Der Tod ist eine Verzweigung, kein Endzustand – Reaktionen auf Treffer, Leichen-Darsteller, Migration in den Pool"
seoTitle: "„Der Tod ist eine Weggabelung, kein Zustand“ – Reaktionen auf „Corpse Actors“ und „Pool Migration“"
date: "2026-09-04"
category: "Game Dev"
summary: "Erstellt ereignisgesteuerte Trefferreaktionen über GAS-Gameplay-Ereignisse, NPC-Angriffe, die GAS-Abklingzeit-Tags berücksichtigen, und einen vollständigen Todeszyklus, in dem sich Gegner in Leichen verwandeln, in den Pool zurückkehren und nach slotabhängigen Timern wieder erscheinen. Migriert den Pool-Manager in ein UWorldSubsystem."
project: "Onset"
tags: ["Unreal Engine", "Gameplay Ability System", "Combat Systems", "Object Pooling", "World Subsystem", "Corpse System"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Am Ende von Beitrag 5 *verursachte* der Basisangriff Schaden – eine Zahl ging zurück. Aber nichts in der Welt reagierte darauf: kein Zurückzucken, kein Feedback, keine Konsequenz, als die Lebenspunkte auf null sanken. Der Kampf besteht zu 90 % aus Rückmeldung, und dieser Handlungsbogen bildet die Grundlage dafür: ereignisgesteuerte Trefferreaktionen, NPC-Angriffe, die die Abklingzeiten von GAS berücksichtigen, und ein vollständiger Todeszyklus, bei dem sich ein Gegner in eine Leiche verwandelt, in den Pool zurückkehrt und nach einem eigenen Timer wieder erscheint.

Zwei architektonische Leitmotive ziehen sich durch diese vier Tage. Erstens: **Der Tod ist eine Verzweigung, kein Zustand** – ein einzelner Erkennungspunkt, der sich zu einem Ereignis, einem direkten Aufruf und einer Bereinigungskette verzweigt, anstatt ein Tag zu sein, das das gesamte System abfragen muss. Zweitens **werden Lebenszyklen voneinander getrennt**: Das Timing von Treffer-Reaktionen verlässt den StateTree und wird in GAS verlagert; visuelle Überreste von Leichen werden von den ressourcenintensiven, gepoolten KI-Akteuren entkoppelt; der Pool selbst entwickelt sich von einem auf einer Ebene platzierten Akteur zu einem `UWorldSubsystem` weiter.

---

## Technische Darstellung

### Wer erkennt Schäden? Das AttributeSet.

`PostGameplayEffectExecute` ist der einzige Punkt, an dem jeder Schadenswert eintrifft. Indem es zum *einzigen* Detektor für Schaden – und später auch für den Tod – gemacht wird, muss der Rest des Systems die Veränderungen der Lebenspunkte nie selbst verfolgen. Wenn ein Treffer landet, aktualisiert das Attribut-Set nicht nur einen Zahlenwert, sondern löst ein **Gameplay-Ereignis** aus, auf das GAS-Fähigkeiten reagieren können:

```cpp
if (Data.EvaluatedData.Magnitude < 0.0f)
{
	FGameplayEventData Payload;
	Payload.EventTag = TAG_Event_HitReaction;
	Payload.Instigator = Data.EffectSpec.GetContext().GetInstigator();
	Payload.Target = GetOwningActor();
	Payload.EventMagnitude = FMath::Abs(Data.EvaluatedData.Magnitude);

	if (UAbilitySystemComponent* ASC = GetOwningAbilitySystemComponent())
	{
		ASC->HandleGameplayEvent(TAG_Event_HitReaction, &Payload);
	}
}
```

Dies ist ereignisgesteuerter Kampf: **Schaden ist Daten, das Ereignis ist die Ankündigung und Fähigkeiten sind die Abonnenten.** Kein Teilsystem verfügt über eine Abfrageschleife für die Lebensbalken.

### Warum der StateTree keine eigene Abklingzeit mehr hat

Die `AttackTask` von Post 5 führte einen eigenen Abklingzeit-Timer aus – einen Float-Wert, den sie herunterzählte. Dieser Arc entfernt dies: GAS verwaltet nun das Kampftiming über das Tag `Cooldown.BasicAttack`, und die Task wird zu einem passiven Beobachter, der das Tag vor der Aktivierung *abfragt*. Eine einzige Quelle der Wahrheit für die Kampfabläufe, auf Kosten dessen, dass der StateTree zu einem „dummen“ Beobachter wird. Für ein System, das Fähigkeiten, Effekte und Tags koordinieren muss, ist es der richtige Kompromiss, die Zeitsteuerung an GAS zu übertragen.

---

## Details zur Umsetzung

### 1. Die Fähigkeit, auf Angriffe zu reagieren (A4.3)

`UOnsetGA_HitReaction` ist eine instanzierte Fähigkeit, die durch das Gameplay-Ereignis `Event.HitReaction` ausgelöst wird. Bei der Aktivierung wird sie ausgeführt, es wird eine Abklingzeit-GE angewendet (damit sie nicht sofort erneut ausgelöst werden kann) und es wird eine Taumel-GE angewendet:

```cpp
if (!CommitAbility(Handle, ActorInfo, ActivationInfo))
{
	EndAbility(Handle, ActorInfo, ActivationInfo, false, true);
	return;
}

// Apply cooldown GE (blocks re-triggering)
if (CooldownGameplayEffectClass)
{
	(void)ApplyGameplayEffectToOwner(Handle, ActorInfo, ActivationInfo, CooldownGameplayEffectClass, GetAbilityLevel());
	if (StaggerEffectClass)
	{
		(void)ApplyGameplayEffectToOwner(Handle, ActorInfo, ActivationInfo, StaggerEffectClass, GetAbilityLevel());
	}
}
EndAbility(Handle, ActorInfo, ActivationInfo, true, false);
```

Der Treffer hat nun eine sichtbare Auswirkung (Taumeln) und eine Kadenz (Abklingzeit) – und beide werden über GAS verwaltet, sind stapelbar und können später durch echte Animations- bzw. Rückzucklogik ersetzt werden.

### 2. Die „Death Fork“ (A4.5a)

Wenn die Gesundheit genau null erreicht, verzweigt sich das Attribut *sowohl* zu einem GAS-Ereignis als auch zu einem direkten virtuellen Aufruf:

```cpp
if (GetHealth() == 0.0f)
{
	if (OldHealth != GetHealth())
	{
		FGameplayEventData Payload;
		Payload.EventTag = TAG_Event_Death;
		Payload.Instigator = Data.EffectSpec.GetContext().GetInstigator();
		Payload.Target = GetOwningActor();

		if (UAbilitySystemComponent* ASC = GetOwningAbilitySystemComponent())
		{
			ASC->HandleGameplayEvent(TAG_Event_Death, &Payload);
		}

		if (AOnsetBaseCharacter* Character = Cast<AOnsetBaseCharacter>(GetOwningActor()))
		{
			Character->OnDeath(Data.EffectSpec.GetContext().GetInstigator());
		}
	}
}
```

Das Ereignis hält die Tür für GAS-reaktive Systeme offen (in der Dokumentation wird ausdrücklich auf „für ein zukünftiges Corpse-System“ hingewiesen); der direkte Aufruf von `OnDeath()` ist der unmittelbare Aktionspfad. Bemerkenswert ist, dass in der Tag-Datei zwar ein `State.Dead`-Tag vorhanden war, dieses jedoch nie für den Todespfad verwendet wurde – der Tod ist hier **Ereignis + Aufruf**, kein zu abfragender Zustand.

Die raffinierte Wahl: **Die Bereinigung auf den nächsten Tick verschieben.** Man möchte den Spielstein nicht *innerhalb* eines aktiven GE-Callbacks an den Pool zurückgeben. Mit `SetTimerForNextTick` wird der „Leichnam“ synchron erzeugt (solange die Transformation noch gültig ist) und die Rückgabe an den Pool verschoben.

### 3. Das Leichensystem (A4.5b)

Der Tod eines Gegners löst nun zwei parallele Vorgänge aus: Es wird eine „Lightweight“-Leiche generiert und (im nächsten Tick) die Bereinigung des Pool-Returns ausgeführt:

```cpp
void AOnsetEnemy::OnDeath(AActor* KillingActor)
{
	if (UOnsetCorpseSubsystem* CorpseSub = GetWorld()->GetSubsystem<UOnsetCorpseSubsystem>())
	{
		UStaticMesh* CorpseMesh = Profile->CorpseMesh.IsNull() ? nullptr : Profile->CorpseMesh.LoadSynchronous();
		CorpseSub->SpawnCorpse(GetActorTransform(), CorpseMesh);
	}

	GetWorldTimerManager().SetTimerForNextTick(this, &AOnsetEnemy::DeferredDeathCleanup);
}
```

Die Leiche ist ein bewusst *nicht* im Pool befindlicher Akteur: repliziert, kein Tick, `SetLifeSpan` zur Bereinigung, mit einer festen Obergrenze und „Oldest-Eviction“:

```cpp
AOnsetCorpse* UOnsetCorpseSubsystem::SpawnCorpse(const FTransform& Transform, UStaticMesh* CorpseMesh)
{
	SweepDeadCorpses();

	while (ActiveCorpses.Num() >= MaxActiveCorpses && ActiveCorpses.Num() > 0)
	{
		if (AOnsetCorpse* Oldest = ActiveCorpses[0].Get())
		{
			Oldest->Destroy();
		}
		ActiveCorpses.RemoveAt(0);
	}
	// ...spawn, SetLifeSpan(CorpseLifespan), add to ActiveCorpses
}
```

Die Begründung (aus `Docs/AI/Corpse_System.md`, verfasst am Tag vor der Code-Erstellung): *Entkopplung von Welt-Trümmern von ressourcenintensiven KI-/ASC-Akteuren.* Leichen benötigen weder ein Fähigkeitssystem noch eine Wahrnehmungskomponente oder einen StateTree – sie sind ein statisches Mesh mit einer bestimmten Lebensdauer. Sie zusammenzufassen wäre übertrieben; eine Obergrenze + Entfernung ist die richtige, kostengünstige Lösung.

### 4. Der Spawner koordiniert das Respawnen

Der Spawner ist für das Respawnen zuständig, nicht der Gegner oder der Pool. Beim Tod eines NPCs wird der Slot geleert, ein **slot-spezifischer** Timer gestartet und der NPC freigegeben:

```cpp
void AOnsetSpawner::OnNPCDeath(AOnsetEnemy* Enemy)
{
	if (!Enemy || !PoolManager) return;

	for (int32 i = 0; i < Slots.Num(); ++i)
	{
		if (Slots[i].Occupant == Enemy)
		{
			Slots[i].Occupant = nullptr;
			GetWorldTimerManager().SetTimer(
				Slots[i].RespawnTimerHandle,
				FTimerDelegate::CreateUObject(this, &AOnsetSpawner::RespawnNPC, i),
				Config.RespawnDelay,
				false);
			break;
		}
	}

	PoolManager->ReleasePooledEnemy(Enemy);
}
```

Zeitgeber pro Slot bedeuten, dass die Respawns einer Kaskade von 10 getöteten NPCs *unabhängig voneinander* erfolgen und niemals im Gleichschritt – das ist der Unterschied zwischen einem „lebendigen“ Spawner und einem wellensynchronisierten.

### 5. PoolManager → PoolSubsystem

Der auf der Ebene platzierte `AOnsetPoolManager`-Akteur wird zu einem `UOnsetPoolSubsystem` (einem `UWorldSubsystem`). Keine Abhängigkeit mehr von platzierten Akteuren, keine manuelle Verknüpfung von Referenzen – jeder ruft `GetWorld()->GetSubsystem<UOnsetPoolSubsystem>()` auf. Der Preis dafür ist die Einhaltung des Lebenszyklus: Das Subsystem muss `OnWorldBeginPlay` anstelle von `BeginPlay` implementieren. Und genau hier schlägt der einzeilige Fehler des Bogens zu:

```cpp
void UOnsetPoolSubsystem::OnWorldBeginPlay(UWorld& InWorld)
{
	Super::OnWorldBeginPlay(InWorld);
	InitializePool();
}
```

---

## Ergebnisse und Validierung

- Trefferreaktion: Schadensereignis → instanzierte Trefferreaktionsfähigkeit → Abklingzeit + Stagger-GE.
- NPC-Angriffe fragen GAS-Abklingzeit-Tags ab, anstatt eigene Timer zu verwenden.
- Todesverzweigung: `Event.Death` + direktes `OnDeath()`, verzögerte Bereinigung, Respawn pro Slot.
- Tod des Spielers: Heilung + Teleport nach Hause (ein Platzhalter, der in späteren Abschnitten verfeinert wird).
- Leichensystem: repliziert, Obergrenze + Entfernung, von KI-Akteuren entkoppelt.
- Pool wurde mit korrektem Lebenszyklus in `UWorldSubsystem` migriert.
- `UOnsetCheatManager` mit `God`/`Heal` – Schadensprüfung ohne Gesundheitsbalken.

---

## Herausforderungen und Lösungen

### Das fehlende `Super::OnWorldBeginPlay` (die Einzeiler-Lösung)

**Problem:** Das frisch migrierte `UOnsetPoolSubsystem` rief `InitializePool()` ohne den Aufruf von `super` auf – wodurch der Lebenszyklus des Subsystems unterbrochen wurde. Und es wurde ausgeliefert, während anderer Code das Subsystem bereits nutzte.

**Lösung:** Ein Satz. Die Lektion ist nicht die Lösung, sondern das Muster: **Jede Klasse, die einen Hook des Engine-Lebenszyklus überschreibt, muss `Super` aufrufen, es sei denn, es gibt einen dokumentierten Grund, dies nicht zu tun.** Eine Überprüfung mit regulären Ausdrücken auf überschriebene Hooks würde eine ganze Klasse solcher Fälle aufdecken.

### Der invertierte Debug-Guard

**Problem:** Die `AttackTask` enthielt eine übrig gebliebene invertierte Bedingung, die den Basisangriff *innerhalb des Fehlerzweigs* auslöste – wodurch die Fähigkeit genau dann aktiviert wurde, als der Zustand ungültig war.

**Lösung:** Bei der Migration der Aufgabe in die gemeinsame Aufgabenbasis wurde eine Bereinigung vorgenommen. Der Nachweis, dass „es kompiliert“ ≠ „es ist keine Falle“.

### Die Platzierung der Wachen im „Gott-Modus“

**Problem:** Die Überprüfung der Unverwundbarkeit befand sich ursprünglich innerhalb des Blocks zur Todesüberprüfung, sodass der „Gott-Modus“ nur *tödliche* Treffer rückgängig machte.

**Lösung:** Außerhalb der Todesprüfung verschoben, sodass **der gesamte** Schaden rückgängig gemacht wird. Ein subtiler Fehler in der Reihenfolge, der sich erst zeigt, wenn man tatsächlich versucht, den Cheat zu verwenden.

### Der Sonderfall „Leichenkappe“

**Problem:** In der Räumungsschleife fehlte die Bedingung `MaxActiveCorpses > 0` – eine auf 0 festgelegte Obergrenze führt zu einer Endlosschleife.

**Lösung:** Schutzmaßnahme nachträglich hinzugefügt. Randfälle ergeben sich aus der Konfiguration, nicht aus dem Code.

### EU 5.8 API-Änderung

**Problem:** Die Klasse `CooldownGameplayEffectClass` hat ihre Struktur geändert; `FClassFinder` findet keine Übereinstimmung mehr.

**Lösung:** Umstellung auf `FObjectFinder` und `.Object`. Dass sich die API der Tracking-Engine zwischen den verschiedenen UE-Versionen ständig ändert, ist hier eine Tatsache.

---

## Reflexion und gewonnene Erkenntnisse

Die zentrale Erkenntnis dieses Bogens ist der Titel: **Der Tod ist ein Fluss, kein Zustand.** Eine einzige Instanz (der Attributsatz) erkennt den Übergang und leitet die Information an die betroffenen Systeme weiter, anstatt dass jedes Teilsystem abfragt: „Bin ich tot?“ Diese Umkehrung – *die Erkennung erfolgt zentral, die Reaktion dezentral* – ist das Muster, auf das ich in jedem Spiel mit einer gemeinsamen Schadenspipeline als Erstes zurückgreifen würde.

Die Migration des PoolSubsystems hat mich gelehrt, **Lebenszyklus-Hooks als Verträge** zu respektieren. `BeginPlay` vs. `OnWorldBeginPlay`, `Super`-Aufrufe, Aufschub außerhalb von Callbacks – das sind die Schwachstellen, an denen gepoolte/wiederverwertete Systeme versagen. Dieser Prozess hat mir zudem noch einmal verdeutlicht, dass **Cheats ein Testwerkzeug sind, das man frühzeitig entwickeln sollte**: `God`/`Heal` haben jede nachfolgende Kampfiteration beschleunigt.

Was ich anders machen würde: Das Tag `State.Dead`, das deklariert, aber nie verwendet wurde, ist ein kleines Anzeichen von Unentschlossenheit – ich würde es entweder verwenden oder gar nicht erst deklarieren. Und ich hätte die Bedingung `MaxActiveCorpses > 0` gleich beim ersten Mal einfügen sollen, da mir klar war, dass die Obergrenze konfigurierbar ist.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A4.3/A4.4 – Trefferreaktionen, Integration von NPC-Angriffen | ✅ Abgeschlossen |
| A4.5a – Tod, Rückkehr in den Pool, Respawn | ✅ Abgeschlossen |
| A4.5b – Leichensystem | ✅ Abgeschlossen |
| A3.4 — Gruppenunterstützung (Geräusch → Hören), untersuchen | ⏭️ Weiter |
| E21/E22 — Profilaufteilung, Bewegungsattribut | Weiter |

**Was kommt als Nächstes:** Der Tod funktioniert, aber die *Entscheidungsfindung* im Kampf ist noch dürftig – die Angriffsaufgabe ist eine einzeilige Abfrage der Abklingzeit. Beitrag 7 verwandelt dies in eine echte Kampfschleife: Schaden löst nun Geräuschereignisse aus, die nahegelegene Gegner anlocken, um nachzuschauen, `ChaseRange`/`AttackRange` werden in Profile integriert, und das monolithische `UAIProfile` wird in fokussierte KI-/Visuelle- und Wahrnehmungs-Assets aufgeteilt. Hinzu kommt das `UOnsetMovementAttributeSet`, das die Bewegungsgeschwindigkeit endlich GAS-gesteuert macht.

> **Nächstes Mal in Beitrag 7:** Gegner, die hören, jagen und schnell sind – Gruppenunterstützung, der StateTree-Kampfzyklus und GAS-gesteuerte Bewegungsgeschwindigkeit.

---

*Arc-Commits: `b1c850f` → `f4bbf25`. Zugehörige Dokumente: `Docs/AI/Corpse_System.md`, `Docs/AI/Pooling_System.md`, `Docs/AI/Spawner_System.md`, `Docs/GAS/GAS_System.md`.*


