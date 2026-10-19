---
id: "onset3"
title: "🎬 Entwickler-Tagebuch: Pipeline für die Eingabe von Fähigkeiten, Zieldaten und PvP-Schalter"
seoTitle: "Fähigkeiten-Eingabe-Pipeline, Zieldaten und PvP-Umschaltung"
date: "2026-08-24"
category: "Game Dev"
summary: "Schließt Sprint A1 zu 100 % ab, indem vier Fähigkeitsaktionen über eine validierungsgesteuerte Zielauswahl-Pipeline verknüpft werden. Führt die statische „UAbilityTargetingLibrary“ zur Erstellung strukturierter Zieldaten ein und implementiert einen replizierten PvP-Schalter im „PlayerState“, der die Spieler-gegen-Spieler-Zielauswahl über servergesteuerte RPCs regelt."
project: "Onset"
tags: ["Unreal Engine", "Gameplay Ability System", "Targeting", "PvP", "Enhanced Input", "Static Library Pattern"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Am Ende von Beitrag 2 verfügte „Onset“ über alles, was ein Spieler braucht, um in dieser Welt zu *existieren*: Kamera, Bewegung, Zielauswahl – sogar einen manuell platzierten Testgegner. Die Aktionsknöpfe waren jedoch nur Dekoration. Die Aktionen `IA_Ability1-4` existierten als Assets ohne Tastenbelegung, ohne Handler und ohne Möglichkeit, „Ich habe auf einen Gegner geklickt“ in „Mein Charakter hat diesen Gegner getroffen“ umzuwandeln.

Dieser Abschnitt, ein einziger achtstündiger Arbeitstag, schließt den Kreis. Drei Commits führen das Spiel vom „Klick-zum-Ziel“ hin zu „Ziel durch Validierung gesperrt → strukturierte Zieldaten → Entscheidung, ob Spieler überhaupt als Ziel ausgewählt werden können“. Außerdem wird damit Sprint A1 mit **38/38 (100 %)** abgeschlossen – der erste vollständig abgeschlossene Meilenstein des Projekts. Dabei werden zwei Muster eingeführt, die den Rest der Codebasis prägen: eine **Validierungssperre** bei der Zielauswahl und eine **statische Bibliothek** zur Datenerstellung.

---

## Technische Darstellung

### Das Problem: Fähigkeiten brauchen Ziele, Ziele müssen überprüft werden

Die Funktion `UTargetingComponent::SetTarget()` aus Beitrag 2 akzeptierte fröhlich alles. Da es damals noch keine Fähigkeiten gab, störte das niemanden. Doch sobald man vier Fähigkeitsknöpfe miteinander verknüpft, wird „alles als Ziel auswählen“ zu einer echten Gefahr: Was, wenn es kein Ziel gibt? Was, wenn man sich selbst als Ziel auswählt? Was, wenn man – sobald der Mehrspielermodus verfügbar ist – einen anderen Spieler als Ziel auswählt, der sich nicht für PvP entschieden hat?

Die Lösung bestand darin, die **Validierung zu einer Eigenschaft der Zielfestlegung** zu machen und nicht zu einer vereinzelten Überprüfung bei jeder einzelnen Fähigkeit. Wenn ungültige Ziele nicht in `CurrentTarget` aufgenommen werden können, ist jede Funktion, die das Ziel verwendet, automatisch sicher.

### Warum eine statische Bibliothek für Zieldaten?

Der erste Entwurf (aus den täglichen TODOs) sah eine vollständige `UAbilityTargetingComponent` mit Cursor-Raycasts, Abfragen zur Bodenposition und Richtungsberechnungen vor. Der Commit, mit dem dies umgesetzt wurde, hat dies bewusst reduziert: *„Keine Komponente, keine Änderungen am PlayerController – Fähigkeiten rufen die Bibliothek direkt auf.“*

Der Grund dafür war die Einhaltung des Umfangs. Eine Komponente ist ein zustandsbehafteter Mechanismus; was die Fähigkeits-Stubs tatsächlich benötigten, war eine reine Funktion: *„Gib mir, ausgehend von meinem aktuellen Ziel und meiner Position, den Akteur, den Ort und die Richtung.“* Eine statische Bibliotheksfunktion, die eine einfache Struktur zurückgibt, ist das Minimum, das diese Anforderung erfüllt. Die ausgefeilteren Zielmodi (Einzelziel / Flächenangriff / gerichtet) wurden im Sprint A4 auf das GAS-System verlagert und sind hier als drei Felder in einer Struktur statt als drei Methoden dargestellt.

---

## Details zur Umsetzung

### 1. Die Fähigkeitsaktionen zuweisen und das Ziel sperren (A1.4)

Die vier Aktionen werden in `SetupInputComponent` jeweils an einen Stub-Handler gebunden. Die wesentliche Änderung findet sich weiter oben in `UTargetingComponent::SetTarget`:

```cpp
void UTargetingComponent::SetTarget(AActor* NewTarget)
{
	if (!IsActorTargetValid(NewTarget)) return;
	CurrentTarget = NewTarget;
	UE_LOG(LogTemp, Warning, TEXT("Setting target to %s"), *NewTarget->GetName());
}

bool UTargetingComponent::IsActorTargetValid(AActor* Actor)
{
	return Actor != nullptr && Actor != GetOwner();
}
```

Ein Null-Ziel oder ein Selbstziel wird schlichtweg nie zum aktuellen Ziel. Das ist einfach, und es bedeutet, dass jeder nachgelagerte Aufrufer von `GetTarget()` sich auf das Ergebnis verlassen kann.

Auch die Touch-Geräte werden verkabelt. Mit `InjectAbilityInput()` können Blueprint-Widgets das Drücken von Fähigkeiten über denselben „Enhanced Input“-Pfad weiterleiten, den auch die Tastatur nutzt – das Muster, das im zweiten Beitrag für den Joystick vorgestellt wurde, wird nun auf den Kampf angewendet:

```cpp
void AOnsetPlayerController::InjectAbilityInput(int32 AbilityIndex, bool bPressed)
{
	UEnhancedInputLocalPlayerSubsystem* Subsystem =
		ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer());
	if (!Subsystem) return;

	UInputAction* Action = nullptr;
	switch (AbilityIndex)
	{
	case 1: Action = IA_Ability1; break;
	case 2: Action = IA_Ability2; break;
	case 3: Action = IA_Ability3; break;
	case 4: Action = IA_Ability4; break;
	default: return;
	}
	Subsystem->InjectInputForAction(Action, FInputActionValue(bPressed), {}, {});
}
```

### 2. Strukturierte Zieldaten erstellen (A1.5)

Die Targeting-Bibliothek definiert den Datenvertrag zwischen Targeting und Fähigkeiten:

```cpp
USTRUCT(BlueprintType)
struct FAbilityTargetData
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Ability Targeting")
	AActor* TargetActor = nullptr;

	UPROPERTY(BlueprintReadWrite, Category = "Ability Targeting")
	FVector TargetLocation = FVector::ZeroVector;

	UPROPERTY(BlueprintReadWrite, Category = "Ability Targeting")
	FVector TargetDirection = FVector::ZeroVector;
};
```

Und die statische Funktion, die sie füllt:

```cpp
FAbilityTargetData UAbilityTargetingLibrary::GetTargetData(
	UTargetingComponent* TargetingComponent, AActor* SourceActor)
{
	FAbilityTargetData Data;

	if (!TargetingComponent) return Data;

	Data.TargetActor = TargetingComponent->GetTarget();
	if (!Data.TargetActor) return Data;

	Data.TargetLocation = Data.TargetActor->GetActorLocation();

	if (SourceActor)
	{
		Data.TargetDirection = (Data.TargetLocation - SourceActor->GetActorLocation()).GetSafeNormal();
	}

	return Data;
}
```

Die Ability-Stubs wurden von Inline-Protokollierung auf den Aufruf dieser Bibliothek umgeschrieben – die Protokollmeldung lautete nun wörtlich „Ability %d — no target“, wenn die zurückgegebene Struktur leer war. Diese Struktur wird später zu `FOnsetTargetData` (es gibt eine Namenskollision mit einem Engine-Typ aus UE 5.8, ein lustiger Fehler, der in Beitrag 5 entdeckt wurde) und speist GAS direkt.

### 3. Der PvP-Schalter (A1.6)

Dies ist der umfangreichste der drei Commits. Das PvP-Flag wird im **replizierten `AOnsetPlayerState`** verwaltet und über einen Server-RPC umgeschaltet – der Server ist maßgebend, die Clients reagieren lediglich:

```cpp
// AOnsetPlayerState.h
UPROPERTY(ReplicatedUsing = OnRep_PvPEnabled)
bool bIsPvPEnabled;

// Server RPC on the controller
UFUNCTION(Server, Reliable)
void Server_SetPvPEnabled(bool bEnabled);
```

Ein zweites Validierungsprädikat macht die Regel explizit: **Spieler gelten nur dann als gültige Ziele, wenn bei der Quelle PvP aktiviert ist.**

```cpp
bool UTargetingComponent::IsActorTargetPVPValid(AActor* TargetActor, AActor* SourceActor)
{
	if (const AOnsetPlayerCharacter* TargetCharacter = Cast<AOnsetPlayerCharacter>(TargetActor); !TargetCharacter) return false;
	if (const AOnsetPlayerController* SourceController = Cast<AOnsetPlayerController>(SourceActor->GetInstigatorController()))
	{
		AOnsetPlayerState* SourcePlayerState = SourceController->GetPlayerState<AOnsetPlayerState>();
		if (SourcePlayerState && !SourcePlayerState->bIsPvPEnabled) return false;
	}
	return true;
}
```

Wenn ein Spieler das PvP deaktiviert, bereinigt der Client seine eigenen Zielauswahlen sofort über den Replikations-Callback:

```cpp
void AOnsetPlayerState::OnRep_PvPEnabled()
{
	UE_LOG(LogNet, Log, TEXT("AOnsetPlayerState::OnRep_PvPEnabled()"));
	if (bIsPvPEnabled) return;
	AOnsetPlayerController* Controller = Cast<AOnsetPlayerController>(GetPlayerController());
	if (Controller)
	{
		UTargetingComponent* TargetingComponent = Cast<UTargetingComponent>(
			Controller->GetComponentByClass(UTargetingComponent::StaticClass()));
		if (TargetingComponent)
		{
			AActor* Target = TargetingComponent->GetTarget();
			if (Target && Target->ActorHasTag("Player"))
			{
				TargetingComponent->ClearTarget();
			}
		}
	}
}
```

Schließlich zentralisiert eine neue Blueprint-Funktionsbibliothek namens `UOnsetStatics` die umständlichen `Cast`-Verbindungen, mit denen Blueprint-Widgets sonst zu kämpfen haben – ein kleines, aber immer wiederkehrendes Muster, um Blueprint-Graphen übersichtlich zu halten.

---

## Ergebnisse und Validierung

- Vier Fähigkeiten-Aktionen, die über eine validierungsgesteuerte Zielauswahl-Pipeline gebunden und ausgelöst werden.
- `UAbilityTargetingLibrary` erzeugt Ziel-Daten (Akteur/Ort/Richtung) für GAS.
- Replizierter PvP-Schalter: servergesteuert, clientseitig bereinigt, Spieler-gegen-Spieler-Zielauswahl mit Validierung.
- Die Touch-Brücke (`InjectAbilityInput`) entspricht exakt dem Tastaturpfad.
- **Sprint A1: 38 von 38 Aufgaben abgeschlossen – der erste 100-Prozent-Meilenstein.**
- Das Demo-Level erhält seinen ersten manuell platzierten Gegner (`BP_OnsetBaseEnemy`) – und macht sofort deutlich, dass die Welt keine Möglichkeit hat, Gegner in großem Maßstab zu generieren.

---

## Herausforderungen und Lösungen

### Suche nach Komponenten mit dem Wert „null“

**Problem:** Post-2-Symptome von Null-Komponenten im Interaktions-Handler.

**Lösung:** Vorübergehende Gültigkeitsprüfungen für `UE_LOG` im Konstruktor sowie eine permanente Null-Prüfung in `OnPrimaryInteraction`. Die Null-Prüfung ist defensiver Code, der seinen Platz verdient hat.

### Eingabe mit doppelter Skalierung

**Problem:** Die Fähigkeitswerte wurden doppelt skaliert (Legacy + Enhanced Input).

**Lösung:** `DefaultInput.ini` — `bEnableLegacyInputScales=False`. Eine Korrektur auf Konfigurationsebene, die man sich merken sollte, wenn man verschiedene Eingabesysteme kombiniert.

### Der versteckte Fehler, der später zutage treten würde

**Problem:** `OnRep_PvPEnabled()` ruft über `GetComponentByClass` die `UTargetingComponent` vom Controller ab.

**Lösung (später):** Die Zielzuordnung erfolgt tatsächlich auf dem **Pawn**, nicht auf dem Controller – der Controller löst sie in `OnPossess` auf. Dies wurde „ausreichend korrekt“ ausgeliefert (die Abfrage schlägt stillschweigend fehl, im PvP wird das Ziel auf dem besitzenden Client einfach nicht gelöscht) und in einem späteren Arc korrigiert. Ein gutes Beispiel für Code, der *richtig aussieht*, in PIE funktioniert und einen subtilen Fehler bei der Besitzzuordnung verbirgt, der erst bei Multiplayer-Tests zutage tritt.

### Doc-Betrieb

**Problem:** In der Datei `PVP_System.md` wird die Funktion `IsActorValidTarget()` genannt, während im ausgelieferten Code die Funktion `IsActorTargetPVPValid()` verwendet wird.

**Lösung:** Die Dokumentation beschreibt die Absicht; der Code ist um einen Commit voraus. Zur Kenntnis genommen, aber nicht behoben – ein wiederkehrendes Muster in diesem Projekt, bei dem sich der Code schneller entwickelt als die Dokumentation und spätere „Make-the-docs-true“-Durchläufe den Rückstand aufholen.

---

## Reflexion und gewonnene Erkenntnisse

Dieser Entwicklungsabschnitt hat mir gezeigt, wie wichtig es ist, **ungültige Zustände nicht darstellbar zu machen**. Durch die Sperrung von `SetTarget` muss die gesamte nachgelagerte Oberfläche (Fähigkeiten, HUD, später GAS) niemals prüfen: „Ist dies ein zulässiges Ziel?“, da die Antwort strukturell garantiert ist. Die PvP-Regel hat denselben Gedanken weitergeführt: Ein Spieler, der sich nicht für PvP entschieden hat, kann gar nicht erst ausgewählt werden, sodass später kein Randfall zur Schadensfilterung programmiert werden muss.

Auch die Entscheidung für eine statische Bibliothek hat sich bewährt. Eine reine Funktion in Kombination mit einer einfachen Struktur ist trivial zu testen, trivial wiederverwendbar (NPCs werden in späteren Handlungsbögen dieselbe Bibliothek verwenden) und birgt keinerlei Lebenszyklus-Belastungen, wie sie bei einer Komponente auftreten würden. Durch die Verschiebung der Ausrichtung auf *Modi* auf GAS blieb dieser Handlungsbogen klein, während gleichzeitig die von GAS benötigte Datenstruktur aufgebaut wurde.

Was ich anders machen würde: Ich hätte `OnRep_PvPEnabled` so geschrieben, dass das Targeting vom Pawn bereits vom ersten Tag an funktioniert. Diese Art von subtilen Fehlern – die „in PIE funktionieren, im Multiplayer aber nicht“ – sind am kostspieligsten, da sie bei Tests im Editor nicht auftauchen.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A1 — Zentrale Spielersysteme (Einrichtung → PvP-Umschaltung) | ✅ **100 % (38/38)** |
| A2 — NPC-Lebenszyklus: Charakter, Spawner, Pooling, Gruppen | ⏭️ Weiter |
| A3 — KI: StateTrees, Wahrnehmung, Verhalten | Geplant |
| A4 — Kampf: GAS, Tod, Leichen | Geplant |

**Was kommt als Nächstes:** Da bisher nur ein Gegner manuell platziert wurde und es keine Möglichkeit gibt, die Spielwelt zu bevölkern, wird im nächsten Abschnitt die NPC-Pipeline aufgebaut: den `AOnsetEnemy`-Pawn, einen slotbasierten Spawner, Object Pooling zur Leistungsoptimierung und ein Gruppensystem – alles datengesteuert über `UAIProfile`-Assets, sodass Gegner ohne neue Klassen variiert werden können. Freut euch auf eine einprägsame Nebenhandlung: das Fallback-Cube-Mesh, das hinzugefügt, drei Minuten später wieder rückgängig gemacht und anschließend anders neu aufgebaut wird.

> **Nächstes Mal in Beitrag 4:** NPC-Infrastruktur an einem Tag – Spawner → Pool → Gruppen → KI-Profile und die Saga um das Fallback-Cube-Mesh.

---

*Arc-Commits: `eff5f48`, `5dff7ed`, `f433986`. Zugehörige Dokumente: `Docs/Gameplay/Ability_Targeting_System.md`, `Docs/Gameplay/Targeting_System.md`, `Docs/Gameplay/PVP_System.md`.*


