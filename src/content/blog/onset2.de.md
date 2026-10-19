---
id: "onset2"
title: "🎬 Entwickler-Tagebuch: Die Vorlage entfernen und einen eingabeunabhängigen Player-Kern erstellen"
seoTitle: "Entfernen der Vorlage und Erstellen eines eingabeunabhängigen Player-Kerns"
date: "2026-08-21"
category: "Game Dev"
summary: "Behandelt den Wechsel von der „TopDown“-Vorlage von Unreal zu einer benutzerdefinierten Eingabearchitektur für mehrere Geräte. Beschreibt detailliert die Cursor-Abstraktion, die Maus-, Touch- und Gamepad-Eingaben vereint, erweiterte Eingabezuordnungskontexte für WASD, Joystick und „Tap-to-Move“ sowie den einzigen Bestätigungshandler, der je nach Treffer-Kontext entweder zum Angreifen von Gegnern oder zum Bewegen auf den Boden verzweigt."
project: "Onset"
tags: ["Unreal Engine", "Enhanced Input", "Input Architecture", "Multi-Device Input", "Player Controller"]
status: "scheduled"
isAutoTranslated: true
---



*6 Commits · 24.–27. Mai 2026 · zu den Themen „Projekt-Neustart“, „Erweiterte Eingabe“ und den Spielersystemen A1.1–A1.4*

---

## Einleitung

Tag 1 war ein Tag, an dem ich ausschließlich die Grundlagen geschaffen habe – Ordner, Vorlagen, Pläne und eine Umbenennung. Die Dokumentation erklärte mir genau, was „Onset“ *sein sollte*: ein Top-Down-ARPG mit eingabegerätunabhängiger Bewegung (Touch, Maus, Tastatur, Gamepad), Zielauswahl und später GAS-Kämpfen. Doch am Morgen des 24. Mai enthielt das Repo immer noch eine unberührte Kopie der TopDown-Vorlage von Unreal mit dem Namen `MPTDARPG`.

Der Plan lautete: „Die TopDown-Basis beibehalten, die Demo-Varianten entfernen.“ Die Realität sah vier Commits später so aus, dass von Grund auf neu begonnen wurde – auf der Grundlage einer **Eingabearchitektur für mehrere Geräte**, die im ursprünglichen Plan nie beschrieben worden war. Dieser Beitrag befasst sich mit dieser Kursänderung – warum ich eine funktionierende Vorlage gelöscht habe, warum „Enhanced Input“ unverzichtbar wurde und wie die Systeme A1.1–A1.4 schließlich alle in einem einzigen riesigen Commit landeten, der die Dokumentation der Realität anglich.

---

## Technische Darstellung

### Der erste Fehlstart: „Click-to-Move“, veraltete Eingabemethode

Der allererste Code-Commit des Arcs (`219ff51`) war klein, und ehrlich gesagt war es mein früheres Ich, das diesen Code geschrieben hat. Ein `PlayerController` mit einer veralteten `InputComponent`-Bindung, ein Klick-Handler, der einen Raycast durchführt und `ActorHasTag("Enemy")` überprüft:

```cpp
void AOnsetPlayerController::OnClick()
{
	FHitResult HitResult;
	GetHitResultUnderCursor(ECollisionChannel::ECC_Visibility, false, HitResult);
	if (HitResult.bBlockingHit)
	{
		AActor* HitActor = HitResult.GetActor();
		if (HitActor && HitActor->ActorHasTag("Enemy"))
		{
			TargetingComponent->SetCurrentTarget(HitActor);
		}
		else
		{
			TargetingComponent->ClearCurrentTarget();
			UAIBlueprintHelperLibrary::SimpleMoveToLocation(this, HitResult.Location);
		}
	}
	else
	{
		TargetingComponent->ClearCurrentTarget();
	}
}
```

Das funktioniert. So macht es die Engine-Vorlage. Es ist zudem grundsätzlich **nur für die Maus** ausgelegt, und in der Dokumentation, die ich verfasst hatte, hieß es, der Sinn von Onset liege in einem *geräteübergreifenden* Steuerungsschema. Der Commit enthält sogar einen kleinen verbleibenden Fehler (Bewegung wird bei manchen Fehlschlägen ausgelöst), den ich im selben Commit behoben habe. Das eigentliche Problem lag jedoch in der Architektur: Ich beschäftigte mich mit der Frage „Wie bewege ich einen Charakter?“, während das eigentliche Problem lautete: „Wie steuern **fünf verschiedene Eingabegeräte** alle dieselben Aktionen?“

### Der Wendepunkt bei den Dokumenten, der alles verändert hat

Am nächsten Tag (`2ee2e7b`, nur in der Dokumentation) habe ich den Plan überarbeitet. Aus `Episode03_ClickToMove.md` wurde `Episode03_Movement_System.md`, in dem ein virtueller Joystick, „Tap-to-Move“, WASD, der linke Stick des Gamepads sowie ein Software-Cursor für den rechten Stick des Gamepads beschrieben wurden. Das war **„Document-First“-Entwicklung in der Praxis**: Die Dokumentation identifizierte die tatsächlichen Anforderungen *noch bevor* weiterer Code geschrieben wurde, und der Code musste dann nachziehen.

Das Design basierte im Wesentlichen auf drei Erkenntnissen:

1. **Eine gemeinsame 2D-Achsenaktion** (`IA_Move`) für Joystick / WASD / linken Stick. Geräteunterschiede spielen keine Rolle mehr – alle erzeugen `FVector2D`.
2. **Eine gemeinsame Bestätigungsaktion** (`IA_Primary`) für Tippen / Klicken / Gamepad-A-Taste. Der *Kontext* des Treffers entscheidet, was dadurch ausgelöst wird.
3. **Eine Cursor-Abstraktion** (`UCursorManager`), sodass jeder Raycast über eine zentrale Stelle läuft, die erkennt, ob es sich bei dem „Cursor“ um eine Maus, eine Berührung oder die Position eines emulierten Gamepads handelt.

### Die Vorlage wirklich ausblenden

`1d2baa8` hat im Wesentlichen alles aus dem Vorlagenimport von Beitrag 1 gelöscht – Mannequins, `Lvl_TopDown`, Cursor-Effekte, die alten Eingabeaktionen – und ein leeres `Onset`-Projekt neu initialisiert. Damit wurde die Entscheidung aus Beitrag 1, „die Vorlagenbasis beizubehalten“, rückgängig gemacht. Warum? Weil der Wert der Vorlage zwar in einem garantiert funktionierenden Ausgangspunkt liegt, ihr Nachteil jedoch in den **mitgeerbten Annahmen** besteht: ein „Click-to-Move“-Controller, Mauszeiger-Logik und überflüssiger Vorlagen-Ballast, der dem geräteübergreifenden Design entgegensteht. Sobald die Anforderungen klar waren, stellte die Vorlage eher ein Hindernis als eine Abkürzung dar. Ein leeres Projekt mit einer minimalen `Onset.Build.cs` war der ehrliche Ausgangspunkt.

---

## Details zur Umsetzung

### 1. Konfigurieren Sie die für das Design erforderlichen Module

`84a256d` stellt die Abhängigkeiten her, die die neue Eingabearchitektur benötigt. Beachten Sie die Reihenfolge – *zuerst die Module, dann der Code*:

```csharp
PublicDependencyModuleNames.AddRange(new string[] {
	"Core", "CoreUObject", "Engine", "InputCore",
	"EnhancedInput", "AIModule", "NavigationSystem", "UMG"
});
```

`EnhancedInput` für das neue Eingabesystem, `UMG` für die Joystick-/Cursor-Widgets, `AIModule` + `NavigationSystem` für die Bewegung und (später) die KI. Dies ist die Gewohnheit „Abhängigkeiten zuerst“, die auch in späteren Abschnitten wieder auftaucht – die Abhängigkeitsoberfläche vor dem Code zu deklarieren, der sie benötigt.

### 2. Die Cursor-Abstraktion erstellen

`UCursorManager` ist der stille Held der gesamten Architektur. Jeder Eingabe-Raycast läuft über `GetCursorPosition()` statt direkt über `GetHitResultUnderCursor`, sodass die Herkunft des „Cursors“ ein Detail ist, das der Rest des Codes nie zu Gesicht bekommt:

```cpp
bool UCursorManager::GetCursorPosition(FVector2D& OutPosition) const
{
	if (bUsingGamepadCursor)
	{
		OutPosition = GamepadCursorPosition;
		return true;
	}
	if (!LastTouchPosition.IsZero())
	{
		OutPosition = LastTouchPosition;
		return true;
	}
	APlayerController* Controller = CachedPlayerController.Get();
	if (!Controller)
	{
		Controller = Cast<APlayerController>(GetOwner());
		CachedPlayerController = Controller;
	}
	if (Controller)
	{
		return Controller->GetMousePosition(OutPosition.X, OutPosition.Y);
	}
	return false;
}
```

Das Gamepad-Widget bleibt bewusst „dumm“ – in der Kopfzeile heißt es wörtlich: „Der PlayerController gibt vor, wo es sich befinden soll – kein Tick, keine Timer.“ Die gesamte Kontrolle über die Position liegt beim Cursor-Manager.

### 3. Die Zuordnungskontexte registrieren und Aktionen zuweisen

Da drei Zuordnungskontexte (Tastatur/Maus, Touch, Gamepad) vorhanden sind, fügt der Controller diese beim Start alle hinzu:

```cpp
UEnhancedInputLocalPlayerSubsystem* Subsystem =
	ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer());
if (Subsystem)
{
	Subsystem->AddMappingContext(IMC_Touch, 0);
	Subsystem->AddMappingContext(IMC_KbMouse, 0);
	Subsystem->AddMappingContext(IMC_Gamepad, 0);
}
```

Die Aktionszuordnungen sind von ihrer Konzeption her geräteunabhängig:

```cpp
EnhancedInputComponent->BindAction(IA_Move, ETriggerEvent::Triggered, this, &AOnsetPlayerController::OnMove);
EnhancedInputComponent->BindAction(IA_Cursor, ETriggerEvent::Triggered, this, &AOnsetPlayerController::OnCursorMove);
EnhancedInputComponent->BindAction(IA_Primary, ETriggerEvent::Started, this, &AOnsetPlayerController::OnPrimaryInteraction);
```

`OnMove` liest einen `FVector2D`, unabhängig davon, ob dieser von WASD, einem Joystick oder einem Gamepad-Stick stammt:

```cpp
void AOnsetPlayerController::OnMove(const FInputActionValue& Value)
{
	FVector2D MovementVector = Value.Get<FVector2D>();
	if (MovementVector.IsZero()) return;
	StopMovement(); // direct input is a deliberate override of pathfinding
	if (APawn* ControlledPawn = GetPawn())
	{
		ControlledPawn->AddMovementInput(ControlledPawn->GetActorForwardVector(), MovementVector.Y);
		ControlledPawn->AddMovementInput(ControlledPawn->GetActorRightVector(), MovementVector.X);
	}
}
```

Der Aufruf von `StopMovement()` spiegelt eine bewusste Designentscheidung wider (festgehalten in der TODO-Liste zu A1.3): *Eine direkte Eingabe bedeutet, dass der Spieler die Wegfindung bewusst außer Kraft setzt; eine automatische Fortsetzung beim Loslassen würde der Absicht des Spielers zuwiderlaufen.* „Tippen zum Bewegen“ bleibt eine eigenständige Aktion.

### 4. Ein Bestätigungs-Handler, der je nach Treffer-Kontext verzweigt

`OnPrimaryInteraction` vereint die Aktionen „Gegner antippen → anvisieren“ und „Boden antippen → bewegen“. Anstatt dass separate Bewegungs- und Zielaktionen um denselben Tipp konkurrieren, liest ein Handler die Cursorposition aus, führt einen Raycast durch und verzweigt je nachdem, was getroffen wurde:

```cpp
void AOnsetPlayerController::OnPrimaryInteraction(const FInputActionValue& Value)
{
	FVector2D ScreenPos;
	if (!CursorManager->GetCursorPosition(ScreenPos)) return;

	FHitResult HitResult;
	if (!GetHitResultAtScreenPosition(ScreenPos, ECC_Visibility, false, HitResult)) return;

	AActor* HitActor = HitResult.GetActor();
	if (HitActor && HitActor->ActorHasTag("Enemy"))
	{
		TargetingComponent->SetTarget(HitActor);
	}
	else
	{
		UNavigationSystemV1* NavSys = FNavigationSystem::GetCurrent<UNavigationSystemV1>(GetWorld());
		FNavLocation NavLoc;
		if (NavSys && NavSys->ProjectPointToNavigation(HitResult.Location, NavLoc))
		{
			UAIBlueprintHelperLibrary::SimpleMoveToLocation(this, NavLoc.Location);
		}
		TargetingComponent->ClearTarget();
	}
}
```

Zwei Verbesserungen gegenüber dem ersten Versuch: Klickpositionen werden vor dem Aufruf von `SimpleMoveToLocation` **auf das Navmesh projiziert** (keine Wegberechnung mehr zu nicht navigierbaren Punkten), und der Cursor stammt aus der Abstraktion, nicht von der Betriebssystem-Maus. In der Dokumentation wurde genau dieses Design als Lösung für die klassische Falle „Tap-Register dienen sowohl als Bewegung als auch als Ziel“ bezeichnet.

### 5. Die Touch-Brücke: Widgets fügen Eingaben ein

Das `UJoystickWidget` ruft den Bewegungscode nicht direkt auf – es *fügt* der gleichen `IA_Move`-Aktion einen synthetischen Wert ein:

```cpp
void UJoystickWidget::InjectMovementInput()
{
	if (!IA_Move) return;
	UEnhancedInputLocalPlayerSubsystem* Subsystem =
		ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetOwningLocalPlayer());
	if (Subsystem)
	{
		Subsystem->InjectInputForAction(IA_Move, FInputActionValue(CurrentAxis), {}, {});
	}
}
```

Das ist elegant: Das Widget erzeugt denselben `FVector2D` wie die Tastatur, und jeder nachgeschaltete Verbraucher verhält sich identisch. Das Touch-Gerät wird zu einem „Joystick, der nur auf dem Bildschirm existiert“.

### 6. Kamera auf die Spielfigur gerichtet, Eingabe über den Controller

`AOnsetPlayerCharacter` verfügt über einen Federarm und eine Folgekamera (feste Top-Down-Perspektive, Glättung, Zurückdrängen bei Kollisionen), während die gesamte Eingabeverarbeitung auf dem Controller erfolgt. Diese Trennung der Zuständigkeiten – die in den Klassenheadern dokumentiert ist – ermöglicht es, dass später ein KI-Controller denselben Pawn übernehmen kann, ohne die Verarbeitung der Spielereingaben zu erben.

### 7. Den Kreis schließen: Die Dokumentation mit den Tatsachen in Einklang bringen

Der letzte Commit (`1419c39`) dient ausschließlich der Synchronisierung der Dokumentation: `Player_System.md`, `Architecture Overview.md`, `Targeting_System.md` und `UI_System.md` wurden alle aktualisiert, um die tatsächlich ausgelieferten Klassen zu benennen (`UCursorManager`, `UJoystickWidget`, `UGamepadCursorWidget`), und die Checkliste wurde korrigiert – A1 wurde von „geplant für den Zeitraum vom 27. Mai bis 1. Juni“ auf **72 % (26/36) in einem Tag erledigt** geändert.

---

## Ergebnisse und Validierung

- Leeres, vorlagenfreies `Onset`-Projekt unter UE 5.8 mit konfigurierter „Enhanced Input“-Funktion.
- Eingabeunabhängige Bewegung: WASD, Touch-Joystick und linker Gamepad-Stick steuern alle eine `FVector2D`-Aktion.
- Einheitlicher Bestätigungs-Handler: Tippen/Klicken/A-Taste führen je nach Treffer-Kontext zu einer Zielauswahl oder einer Bewegung.
- `UCursorManager`-Abstraktion, die Maus-, Touch- und emulierte Gamepad-Cursor abdeckt.
- Trennung von Kamera-Pawn und Eingabecontroller, vorbereitet für spätere KI-Steuerung.
- Aktions-Assets `IA_Ability1-4` und `IA_PvPToggle` erstellt – bewusst **ungebunden**, als Platzhalter für den nächsten Handlungsbogen.

**Bekannte Einschränkungen:** Die Bewegung war zu diesem Zeitpunkt charakterabhängig (das Verhalten, dass „W sich immer zum oberen Bildschirmrand bewegt“, kam erst viel später hinzu, und in der Dokumentation wurden PvP, Autoplay und Replikation als zukünftige Aufgaben gekennzeichnet).

---

## Herausforderungen und Lösungen

### Noch einmal die Vorlage

**Problem:** In Beitrag 1 hieß es ausdrücklich: „Behalte die TopDown-Basis bei.“ Innerhalb weniger Tage habe ich ihn komplett gelöscht.

**Lösung:** Die Überprüfung der Dokumentation zeigte, dass die Kernannahmen der Vorlage (mausbasierte Eingabe, „Click-to-Move“) in direktem Widerspruch zum geräteübergreifenden Design standen. Hätte ich sie beibehalten, hätte ich ein mentales Modell übernommen, gegen das ich für immer hätte ankämpfen müssen. Das Löschen kostete mich einen Tag, verschaffte mir aber eine saubere Grundlage. **Erkenntnis:** Pläne sind Hypothesen; wenn neue Anforderungen einer alten Entscheidung widersprechen, sollte der Plan geändert werden – und der gesamte Workflow dieses Repos basiert auf dieser Bereitschaft zur Überarbeitung.

### Doppelte Skalierung der Eingabe

**Problem:** Die Werte der erweiterten Eingabe wurden doppelt skaliert (einmal durch die alten, veralteten Eingabeskalierungen und einmal durch die erweiterte Eingabe).

**Lösung:** Die alten Eingabeskalierungen werden über die Datei `DefaultInput.ini` (`bEnableLegacyInputScales=False`) zurückgesetzt – eine einzeilige Konfigurationsänderung, die man leicht übersehen kann, wenn man mitten in der Migration steckt und verschiedene Eingabesysteme miteinander kombiniert.

### Fehlerbehebung bei „Component-null“

**Problem:** Unmittelbar nach dem großen Commit traten beim Controller Probleme mit `CursorManager`/`TargetingComponent` auf, die zu Null-Werten führten.

**Lösung:** Vorläufige Gültigkeitsprüfungen im Konstruktor `UE_LOG` sowie eine Schutzanweisung `if (!TargetingComponent) return;` im Interaktions-Handler. Die Prüfungen waren Debugging-Hilfsmittel (die in späteren Entwicklungsphasen entfernt wurden), doch die Schutzanweisung blieb bestehen – defensive Programmierung, die über die Debugging-Sitzung hinaus Bestand hatte.

---

## Reflexion und gewonnene Erkenntnisse

Die wichtigste Erkenntnis: **Die Dokumentation hat das Projekt vor meinem eigenen ersten Impuls bewahrt.** Der naive „Click-to-Move“-Controller funktionierte zwar, aber „funktionieren“ war nicht die Anforderung – *auf jedem Gerät funktionieren* war es. Das Verfassen der Dokumentation zum Bewegungssystem hat die Anforderung deutlich gemacht, bevor ich Zeit in die falsche Abstraktion investiert hatte.

Außerdem habe ich gelernt, dass die Methode `InjectInputForAction` von Enhanced Input die richtige Schnittstelle zwischen Widgets und Gameplay darstellt – sie ermöglicht es der Benutzeroberfläche, die Darstellung der Eingaben zu übernehmen, während das Gameplay für die Semantik zuständig ist. Dieses Muster (Widgets fügen Daten ein, Controller interpretieren sie) hat sich bis weit in die CommonUI-Ära hinein erhalten.

Was ich anders machen würde: Ich hätte die Dokumentation für mehrere Geräte *vor* dem ersten Code-Commit verfasst, statt erst einen Tag danach. Der Fehlstart war hier zwar nicht besonders kostspielig (ein Tag, ca. 100 Zeilen), aber genau die Gewohnheit, „zuerst zu programmieren und erst später das Design zu überdenken“, soll dieses Repository ja gerade vermeiden.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A1.1–A1.4 — Einrichtung, Kamera, Bewegung, Zielerfassung | ✅ Abgeschlossen (72 % von A1) |
| A1.4 — Pipeline für die Eingabe von Fähigkeiten (Bindung von `IA_Ability1-4`) | ⏭️ Weiter |
| A1.5 – Bibliothek für die Zielauswahl von Fähigkeiten (`FAbilityTargetData`) | Weiter |
| A1.6 – PvP-Umschaltung (`UOnsetStatics`) | Weiter |

**Was als Nächstes kommt:** Der Arc hat die Assets `IA_Ability1-4` ausgeliefert, sie jedoch *ungebunden* gelassen. Beitrag 3 verknüpft diese – bindet die vier Fähigkeitsaktionen, macht die Zielzuweisung von einer Validierung abhängig, erstellt eine statische `UAbilityTargetingLibrary`, die ein Ziel in strukturierte Daten für GAS umwandelt, und fügt den PvP-Schalter hinzu, damit Spieler wählen können, ob andere Spieler überhaupt als Ziele ausgewählt werden können. Damit ist Sprint A1 zu 100 % abgeschlossen.

> **Nächstes Mal in Beitrag 3:** Jetzt kannst du kämpfen – die Pipeline für die Eingabe von Fähigkeiten, die Ziel-Datenbibliothek und der PvP-Schalter, der in der Demo klar macht, wen du treffen kannst.

---

*Arc-Commits: `1d2baa8`, `219ff51`, `2ee2e7b`, `84a256d`, `266461c`, `1419c39`. Zugehörige Dokumente: `Docs/Player/Player_System.md`, `Docs/Gameplay/Targeting_System.md`, `Docs/Gameplay/UI_System.md`.*


