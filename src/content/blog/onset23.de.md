---
id: "onset23"
title: "🎬 Entwickler-Tagebuch: Quests, clientseitiges „Click-to-Move“ und die Bewältigung des Player-StateTree"
seoTitle: "Quests auf der Client-Seite: „Klicken zum Bewegen“ und „Zähmen“ im Player-StateTree"
date: "2026-11-02"
category: "Game Dev"
summary: "Beseitigt Verzögerungen bei der Bewegungssteuerung durch die Implementierung einer clientseitigen „Click-to-Move“-Wegfindung mit der UPathFollowingComponent. Behebt Konflikte im Lebenszyklus von StateTree durch sofortige Unterbrechungen bei beliebigen Eingaben, fügt zielorientierte Quests (Töten, Sammeln, Erkunden) hinzu und führt ein Prestige-Fortschrittssystem ein."
project: "Onset"
tags: ["Unreal Engine", "Navigation", "Pathfinding", "StateTree", "AI", "Quest System", "Input Handling"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

In einem Action-RPG entscheiden zwei Dinge über das Spielerlebnis von Moment zu Moment: **wie sich die Bewegung unter der Maus anfühlt** und **klare Ziele, die den Spielfortschritt leiten**.

Bis zu diesem Meilenstein litt „Onset“ unter einer subtilen, aber ärgerlichen Trägheit der Steuerung: Jeder Klick auf den Boden wurde über einen Server-RPC geleitet. Wenn man zum Bewegen klickte, hielt der Charakter so lange inne, bis die Netzwerkverbindung den Hin- und Rückweg absolviert hatte, bevor er seinen ersten Schritt machte. Zudem arbeitete der Autoplay-Modus des Spiels (basierend auf Unreals StateTree) dem Spieler entgegen: Das Ein- und Ausschalten des Autokampfs führte dazu, dass sich der StateTree aufhängte, manuelle WASD-Eingaben ignoriert wurden und der Charakter an Ort und Stelle erstarrte.

In fünfzehn Commits über vier Tage hinweg habe ich das Steuerungsgefühl optimiert und dem Spiel eine klare Zielsetzung gegeben:
* Ich habe die „Click-to-Move“-Wegfindung mithilfe von `UPathFollowingComponent` direkt auf den Client verlagert und so Netzwerkverzögerungen bei der Bewegung des Spielers beseitigt.
* Den Lebenszyklus des Player StateTree optimiert: Sofortige „Any-Input“-Unterbrechungen und nahtlose Übergänge zwischen manuellem und autonomem Kampf implementiert.
* Ich habe das datengesteuerte **Quest-System** (`UOnsetQuestComponent`) entwickelt und dabei Ziele wie „Töten“, „Sammeln“ und „Erkunden“ mit einer dauerhaften Speicherung in der Datenbank integriert.
* Ich habe eine grundlegende Mechanik für den Prestige-Fortschritt hinzugefügt.

---

## Technische Erläuterung

### Clientseitige Navigation: Warum Server-RPC-Bewegungsmechanismen in ARPGs versagen

In MMOs mit gemächlicherem Spieltempo oder rundenbasierten Spielen ist es akzeptabel, die Zielkoordinaten per RPC an den Server zu senden und die Bewegung vom Server simulieren zu lassen. In einem rasanten ARPG fühlt sich das jedoch furchtbar an. Selbst bei einem Ping von 40 ms sorgt die Verzögerung zwischen dem Klick und der Drehung des Charakters für das unverkennbare Gefühl, als würde man durch Melasse schwimmen.

```
Old Flow (Server-RPC):
[ Client Click ] ---> [ Server RPC: MoveTo ] ---> [ Server NavMesh Pathfind ] ---> [ Character Moves ]
                       (Lag: 1 Full RTT)

New Flow (Client-Side Path Following):
[ Client Click ] ---> [ Client Local NavMesh ] ---> [ UPathFollowingComponent Drives Locomotion ]
         |
         +----------> [ Replicate Destination to Server ] (Validation Only)
```

Die `UPathFollowingComponent` von Unreal wird fast ausnahmslos an KI-Controller (`AAIController`) angehängt. Um dem Spieler eine sofortige Reaktionsfähigkeit zu ermöglichen, habe ich den Pfadfolger in den `AOnsetPlayerController` auf dem zuständigen Client integriert:
1. Ich habe in den Engine-Einstellungen `bAllowClientSideNavigation = true` aktiviert.
2. Der Client führt einen Raycast des Cursors gegen das Terrain durch und projiziert den Treffpunkt auf das lokale Navigationsmesh.
3. `FindPathForMoveRequest()` berechnet die Wegpunkte lokal und übergibt die Daten bei jedem Tick an `AddMovementInput()`.
4. Feindliche Klicks außerhalb der Wirkreichweite des Charakters führen automatisch zu einer Wegberechnung, bis die Wirkreichweite erreicht ist; anschließend erfolgt ein nahtloser Übergang zur Aktivierung der Fähigkeit.

### Den Lebenszyklus des Player-StateTree in den Griff bekommen

Das StateTree der Unreal Engine 5 stellt eine enorme Verbesserung gegenüber den bisherigen Verhaltensbäumen dar, doch die Steuerung dynamischer Übergänge zwischen einem menschlichen Spieler und einer autonomen KI birgt zahlreiche Tücken.

Zuvor verfügte `AOnsetPlayerAIController` über `SetStartLogicAutomatically(true)`. Sobald er den Pawn übernahm, startete er einen Ausführungskontext. Wenn ein Spieler die automatische Wiedergabe deaktivierte, lief der Baum intern weiterhin; beim erneuten Aktivieren wurde `SetStateTree()` abgelehnt, da Unreal das erneute Binden eines aktiven StateTree verhindert.

Um dies zu beheben, habe ich strenge **Lebenszyklus-Verantwortlichkeiten** festgelegt:
* **Expliziter Start/Stopp:** Der StateTree startet niemals automatisch. Er wird nur dann explizit gestartet, wenn der automatische Kampf aktiviert ist, und explizit gestoppt (`StopLogic()`), wenn er deaktiviert ist.
* **Unterbrechung bei jeder Eingabe:** Sobald der Spieler eine Taste berührt – WASD, Fähigkeits-Tasten 1–4, Klicks auf den Boden – unterbricht `EnsurePlayerControl()` sofort den StateTree, hebt den KI-Fokus auf und übergibt die Kontrolle wieder an den Spieler-Controller.
* **Zusammengefasste Wegberechnung:** Durch wiederholtes Klicken auf den Boden werden Wege nicht mehr bei jedem Frame abgebrochen und neu berechnet. Ein Mindestintervall und ein Schwellenwert für die Entfernung zum Ziel verhindern Ruckeln bei der Neuberechnung der Wege.

### Die zielorientierte Quest-Pipeline

Das Quest-System wird von `DT_QuestDefinition` gesteuert und von `UOnsetQuestComponent` auf `AOnsetBaseCharacter` verfolgt:

```
+--------------------------------------------------------------+
|                     DT_QuestDefinition                       |
|   (Stages -> Objectives: Kill, CollectItem, ReachLocation)   |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                     UOnsetQuestComponent                     |
|  - Server Authoritative                                      |
|  - Replicates Active Quest State to Owning Client            |
|  - JSON Serialization for DB Persistence                     |
+--------------------------------------------------------------+
        ^                      ^                      ^
        |                      |                      |
[ Enemy OnDeath ]     [ Inventory OnItemAdded ] [ Checkpoint Volume ]
```

Da die Ziele an bestehende Engine-Delegaten angehängt werden (`AOnsetEnemy::OnDeath`, `UOnsetInventoryComponent::OnItemAdded`), erfordern Quests keinerlei maßgeschneidertes Scripting. Das Erlegen eines Wolfes aktualisiert „5 Wölfe töten“, das Sammeln von Kräutern aktualisiert „10 Sonnenblumen sammeln“ und das Betreten eines Dungeon-Eingangs löst „Die Ruinen erkunden“ aus.

---

## Details zur Umsetzung

### 1. Clientseitiges „Click-to-Move“ (`AOnsetPlayerController.cpp`)

Der Spieler-Controller erstellt lokale Navigationspfade und folgt diesen direkt:

```cpp
void AOnsetPlayerController::PlayerTick(float DeltaTime)
{
    Super::PlayerTick(DeltaTime);

    if (bIsMoveActive && PathFollowingComponent)
    {
        // Follow local navmesh waypoints via AddMovementInput
        UpdatePathFollowing(DeltaTime);
    }
}

bool AOnsetPlayerController::MoveToLocation(const FVector& Dest, float AcceptanceRadius)
{
    UNavigationSystemV1* NavSys = FNavigationSystem::GetCurrent<UNavigationSystemV1>(GetWorld());
    if (!NavSys || !GetPawn()) return false;

    FPathFindingQuery Query;
    const FVector StartLocation = GetPawn()->GetActorLocation();
    Query.StartLocation = StartLocation;
    Query.EndLocation = Dest;
    Query.NavAgentProperties = GetPawn()->GetNavAgentPropertiesRef();

    FPathFindingResult PathResult = NavSys->FindPathSync(Query);
    if (PathResult.IsSuccessful() && PathResult.Path.IsValid())
    {
        CurrentPath = PathResult.Path;
        CurrentWaypointIndex = 1;
        bIsMoveActive = true;
        return true;
    }

    return false;
}
```

### 2. Der Interrupt für die automatische Wiedergabe bei beliebiger Eingabe (`OnsetPlayerController.cpp`)

Jede Spielaktion führt dazu, dass die Autoplay-Steuerung sofort wieder an den menschlichen Spieler zurückgegeben wird:

```cpp
void AOnsetPlayerController::EnsurePlayerControl()
{
    if (bIsAutoCombatActive)
    {
        bIsAutoCombatActive = false;

        // Notify AI controller to stop StateTree execution
        if (AutoCombatAIController)
        {
            AutoCombatAIController->StopAutoCombatLogic();
        }

        // Reclaim input focus and update UI
        OnAutoCombatToggled.Broadcast(false);
    }
}

void AOnsetPlayerController::Input_AbilitySlot1()
{
    EnsurePlayerControl();
    ExecuteAbility(1);
}

void AOnsetPlayerController::Input_MoveForward(float Value)
{
    if (FMath::Abs(Value) > 0.1f)
    {
        EnsurePlayerControl();
        AddMovementInput(GetActorForwardVector(), Value);
    }
}
```

### 3. Verfolgung von Questzielen (`UOnsetQuestComponent.cpp`)

Ziele werden allgemein über `ReportObjectiveProgress` vorangetrieben:

```cpp
void UOnsetQuestComponent::ReportObjectiveProgress(EOnsetObjectiveType Type, FName TargetID, int32 Amount)
{
    if (!GetOwner()->HasAuthority()) return;

    for (FOnsetActiveQuest& ActiveQuest : ActiveQuests)
    {
        const FOnsetQuestDefinition* Def = GetQuestDefinition(ActiveQuest.QuestID);
        if (!Def || !Def->Stages.IsValidIndex(ActiveQuest.CurrentStageIndex)) continue;

        const FOnsetQuestStage& CurrentStage = Def->Stages[ActiveQuest.CurrentStageIndex];

        for (int32 ObjIdx = 0; ObjIdx < CurrentStage.Objectives.Num(); ++ObjIdx)
        {
            const FOnsetQuestObjective& Obj = CurrentStage.Objectives[ObjIdx];
            if (Obj.Type == Type && Obj.TargetID == TargetID)
            {
                ActiveQuest.ObjectiveProgress[ObjIdx] = FMath::Min(
                    ActiveQuest.ObjectiveProgress[ObjIdx] + Amount,
                    Obj.RequiredCount
                );
            }
        }

        CheckStageCompletion(ActiveQuest);
    }

    OnRep_ActiveQuests();
}
```

---

## Ergebnisse und Validierung

1. **Reaktionsschnelle Steuerung:**
   Ein Klick auf das Gelände führt nun zu einer sofortigen Beschleunigung. Der Charakter dreht sich und umgeht Hindernisse ohne wahrnehmbare Verzögerung.
2. **Flüssige Übergänge im Autoplay-Modus:**
   * Autoplay aktiviert: Der Charakter richtete sich automatisch auf den nächstgelegenen Trainingsdummy aus, führte Drehungen aus, setzte Basisangriffe ein und feuerte Fähigkeiten ab, sobald deren Abklingzeit abgelaufen war.
   * Durch Drücken der Taste `S` wurde die Autoplay-Funktion sofort deaktiviert, der Charakter trat einen Schritt zurück und die Umschalt-Schaltfläche in der Benutzeroberfläche erlosch ohne Störungen.
   * Beim erneuten Aktivieren der Autoplay-Funktion wurde der StateTree reibungslos neu initialisiert und der Kampf fortgesetzt.
3. **Questabwicklung:**
   * Die Quest *Goblin-Befall* wurde angenommen (Ziel: 3 Goblins töten).
   * Das Töten von Goblins löste `ReportObjectiveProgress(EOnsetObjectiveType::Kill, "Goblin", 1)` aus.
   * Beim dritten Kill wurde die Queststufe automatisch fortgesetzt, 150 EP gewährt und 50 Gold in den Inventarsack eingezahlt.
   * Verbindung getrennt, wiederhergestellt: Der Questfortschritt wurde originalgetreu aus `characters.quests_json` wiederhergestellt.

---

## Herausforderungen und Lösungen

### Herausforderung 1: Der „Micro-Stutter“-Spam-Klick-Fehler

**Problem:** Spieler in ARPGs klicken während der Bewegung ständig mit der rechten Maustaste. Da jeder Klick die Funktion `FindPathSync` auslöste, führten schnelle Klicks dazu, dass der Pfadfolger seine aktuelle Geschwindigkeit abbrach, einen neuen Pfad zu fast derselben Stelle berechnete und die Beschleunigung neu startete, was zu spürbaren visuellen Rucklern führte.

**Lösung:** In `AOnsetPlayerController::IssueClickMove` wurde eine Zielzusammenführung hinzugefügt. Befindet sich ein neuer Klick innerhalb von 60 Einheiten vom vorherigen Ziel und sind weniger als 150 ms vergangen, ignoriert der Controller die überflüssige Wegfindung und lässt den aktuellen Bewegungsimpuls weiterlaufen.

### Herausforderung 2: StateTree-Instanz – Datenveralterung und Blockierung

**Problem:** Wenn `AOnsetPlayerAIController` die Kontrolle über den Spielfigur-Akteur aufgab, enthielten die Daten der StateTree-Instanz ungültige Zeiger auf den vorherigen Charakter-Akteur, was beim erneuten Übernehmen der Kontrolle zu Abstürzen führte.

**Lösung:** `OnUnPossess()` so angepasst, dass `StopLogic(TEXT("Unpossess"))` aufgerufen und alle zwischengespeicherten Akteur-Parameter gelöscht werden, bevor die Steuerung freigegeben wird.

---

## Reflexion und gewonnene Erkenntnisse

Die Reaktionsfähigkeit der Steuerung ist in Action-Spielen von entscheidender Bedeutung. Der Drang, aus „Sicherheitsgründen“ alles über den Server zu leiten, darf niemals die direkte, taktile Verbindung zwischen den Eingaben des Spielers und den Bewegungen der Spielfigur beeinträchtigen. Indem wir die Wegfindung auf den Client verlagert haben, während die Überprüfung der tatsächlichen Ausführung von Fähigkeiten und Kollisionen weiterhin auf dem Server erfolgt, haben wir eine präzise Steuerung erreicht, ohne dabei die Maßnahmen zur Betrugsbekämpfung zu vernachlässigen.

Darüber hinaus hat sich gezeigt, dass sich Quests, die auf entkoppelten Ereignissen (`OnItemAdded`, `OnDeath`) statt auf fest programmierten Quest-Auslösern basieren, sehr gut skalieren lassen, wenn die Systeme über Message Contracts miteinander kommunizieren.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| Rucksack-Inventar, „Click-to-Loot“ und Leveln | ✅ Festgelegt (Beitrag 22) |
| **Quests, „Click-to-Move“ und Feinschliff der Autoplay-Funktion** | ✅ **Festgelegt** |
| Das MH-Framework & asynchrone Multi-Store-Persistenz | ⏳ Als Nächstes (Beitrag 24) |
| Steam-Packet-Authentifizierung & Absicherung dedizierter Server | ⏳ Geplant (Beitrag 25) |

Da Gameplay, Inventar, Kampf und Quests auf Hochtouren laufen, richtet sich unser Fokus nun auf eine Infrastruktur auf Unternehmensniveau. Es ist an der Zeit, das **MH Framework** aufzubauen: eine modulare Architektur aus unabhängigen Unreal-Plugins, die abbrechbare asynchrone Verträge und eine einheitliche Multi-Backend-Persistenz über SQLite, PostgreSQL und HTTP hinweg bietet.

---

*Arc-Commits: `b0f2051`, `0de2b4a`, `279ef74`. Zugehörige Dokumente: `Docs/AI/Player_AI_System.md`, `Docs/Gameplay/Targeting_System.md`.*
