---
id: "onset13"
title: "🎬 Entwickler-Tagebuch: Menüs, die sich tatsächlich stapeln lassen – CommonUI, Screen Stacks und die Migration von UMG zu CommonUI"
seoTitle: "Menüs, die sich tatsächlich stapeln: CommonUI-Bildschirmstapel und die Migration von UMG zu CommonUI"
date: "2026-09-28"
category: "Game Dev"
summary: "Migriert alle Menüs von auf der Leinwand gezeichneten HUDs in die Bildschirm-Stack-Architektur von CommonUI mit den Ebenen „Game“, „Menu“ und „Modal“. Implementiert einen zentralisierten Navigationsknoten „UOnsetUISubsystem“, „UCommonInputSubsystem“ für flimmerfreie Übergänge zwischen Eingabemodi sowie das Widget-Lebenszyklusmuster „NativeOnActivated/NativeOnDeactivated“. Behebt den Rendering-Fehler bei gepackten UMG-Builds."
project: "Onset"
tags: ["Unreal Engine", "CommonUI", "UI Architecture", "Screen Stack", "UMG", "GameInstanceSubsystem"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Sprint A5b hat die Persistenzschicht entwickelt. Das Spiel kann speichern, laden und zwischen Welten wechseln. Die Menüs jedoch – die Lobby, die Charakterauswahl, der Pausenbildschirm – sind auf Canvas gezeichnete HUDs, die in gepackten `-game`-Builds nicht gerendert werden. Sie funktionieren im Editor, sie funktionieren in PIE, und sie verschwinden in der veröffentlichten Version einfach spurlos.

CommonUI löst dieses Problem. Es handelt sich um das offizielle UI-Framework von Epic für UE 5, das auf einer Screen-Stack-Architektur basiert und mehrschichtige Navigation, modale Dialoge sowie plattformspezifische Eingaben unterstützt. Die Migration umfasst 4 Commits, hat jedoch strukturelle Auswirkungen: Jedes Menü im Spiel wird von `AHUD`-Unterklassen zu `UCommonActivatableWidget` verlagert, von der Canvas-Zeichnung zu UMG und von einer anfälligen Eingabeverarbeitung zu einem zentralisierten `UCommonInputSubsystem`.

Dieser Beitrag ist kurz – die Umstellung ist gering –, aber die dahinterstehende architektonische Entscheidung ist von großer Tragweite. CommonUI ist die Grundlage, die dafür sorgt, dass sich das Spiel wie ein Spiel anfühlt und nicht wie eine Tech-Demo.

---

## Technische Darstellung

Warum CommonUI?

Das Canvas-HUD-Fallback war schon immer nur eine Notlösung. UMG-Widgets lassen sich zwar kompilieren und funktionieren in PIE, schlagen jedoch in gepackten `-game`-Builds stillschweigend fehl – eine bekannte Eigenart der Engine, für die es außer einem anderen Rendering-Pfad keine Abhilfe gibt. Das `UCommonActivatableWidget` von CommonUI ist für den Einsatz in gepackten Builds konzipiert. Es ist das offizielle UE-5-UI-Framework und löst genau die Probleme, um die die Canvas-HUDs herumgewackelt sind.

### Die Screen-Stack-Architektur

CommonUI führt ein mehrschichtiges Navigationsmodell mit drei Stapeltypen ein:

| Typ | Zweck | Beispiele |
|---|---|---|
| Spiel | Benutzeroberfläche innerhalb der Spielwelt | HUD, Minikarte, Schadensanzeigen |
| Menü | Vollbild-Overlays | Pause, Einstellungen, Inventar |
| Modal | Blockierende Dialoge | Beenden bestätigen, Fehlermeldungen |

Das `UCommonInputSubsystem` ist für die Navigation zwischen den Stacks zuständig. Der Eingabemodus (GameOnly, UIOnly, GameAndUI) wird zentral verwaltet – es gibt keine über die Widgets verstreuten `SetInputMode`-Aufrufe mehr. Der Übergang `FInputModeGameAndUI`, der zuvor zu einem Flackern des Cursors führte, ist nicht mehr vorhanden.

### Der Lebenszyklus eines Widgets

`UCommonActivatableWidget` ersetzt `UUserWidget` für alle Bildschirme. Der Lebenszyklus ist explizit definiert: `OnActivated()` (wird aufgerufen, wenn das Widget aktiv wird), `OnDeactivated()` (wird aufgerufen, wenn es vom Stack entfernt wird) sowie `NativeOnActivated()`/`NativeOnDeactivated()` für Blueprint-Überschreibungen. Dies ersetzt das anfällige `Construct`/`Destruct`-Muster, das Initialisierungsfehler verursachte, wenn Widgets vorab geladen und ausgeblendet wurden.

---

## Details zur Umsetzung

### 1. Der Navigations-Hub „GameInstanceSubsystem“

`UOnsetUISubsystem` (GameInstanceSubsystem) verwaltet den Bildschirmstapel und steuert die Übergänge:

```cpp
UOnsetUISubsystem::OpenScreen(TSubclassOf<UCommonActivatableWidget> ScreenClass, FName LayerName)
{
    UCommonActivatableWidget* Widget = CreateWidget<UCommonActivatableWidget>(this, ScreenClass);
    Widget->SetOwningPlayer(LocalPlayer);
    Widget->AddToScreenStack(LayerName);
}
```

Das Subsystem ist der zentrale Knotenpunkt für die Navigation. Kein Widget öffnet ein anderes Widget direkt – die gesamte Navigation läuft über das Subsystem. Dadurch wird das Problem „Wer ist für den Stack verantwortlich?“ vermieden, das die Ad-hoc-UMG-Navigation oft beeinträchtigt.

### 2. Die Bildschirmklassen

Jeder Bildschirm wird zu einer Unterklasse von `UCommonActivatableWidget` mit einem entsprechenden UMG-Widget-Blueprint:

| Bildschirm | Klasse | Ebene |
|---|---|---|
| Hauptmenü | `UOnsetMainMenuWidget` | `Menü` |
| Charakterauswahl | `UOnsetCharacterSelectWidget` | `Menü` |
| Pause | `UOnsetPauseMenuWidget` | `Menu` |
| Einstellungen | `UOnsetSettingsWidget` | `Modal` |
| HUD | `UOnsetHUDWidget` | `Game` |

Das `UOnsetHUDWidget` ersetzt den `AHUD`-Fallback für das In-World-HUD. Es ist das einzige Widget der Spielebene; alle anderen sind Menü- oder Modal-Widgets.

### 3. Integration des Eingabesubsystems

`UCommonInputSubsystem` verwaltet die Eingabemodi. Der Übergang `FInputModeGameAndUI`, der in den Canvas-HUDs zu einem Flackern des Cursors führte, wird durch die in CommonUI integrierte Verwaltung der Eingabemodi ersetzt:

```cpp
void UOnsetUISubsystem::SetInputMode(ECommonInputType InputType)
{
    UCommonInputSubsystem* InputSub = UCommonInputSubsystem::Get(this);
    InputSub->SetInputType(InputType);
    InputSub->SetDefaultInputAction(nullptr); // clear any pending input
}
```

Der Eingabetyp lautet „UI“ für Menüs, „Game“ für das Gameplay und „GameAndUI“ für Hybridzustände. Das Subsystem wickelt den Übergang reibungslos ab – kein Flackern, keine hängenden Cursor.

### 4. Das Widget-Bindungsmuster

Jedes `UCommonActivatableWidget` bindet sich in `NativeOnActivated()` an seine Daten und löst diese Bindung in `NativeOnDeactivated()` wieder:

```cpp
void UOnsetCharacterSelectWidget::NativeOnActivated()
{
    Super::NativeOnActivated();
    UISubsystem = GetGameInstanceSubsystem<UOnsetUISubsystem>(this);
    UISubsystem->OnCharacterDataReceived.AddUObject(this, &ThisClass::HandleCharacterData);
    UISubsystem->RequestAccountData();
}

void UOnsetCharacterSelectWidget::NativeOnDeactivated()
{
    UISubsystem->OnCharacterDataReceived.RemoveAll(this);
    Super::NativeOnDeactivated();
}
```

Dies ersetzt die manuelle `Construct`/`Destruct`-Bindung, die zu Speicherlecks führte, wenn Widgets vorab geladen und ausgeblendet wurden.

### 5. Die UMG-Widget-Blueprints

Jeder Bildschirm verfügt über einen entsprechenden UMG-Widget-Blueprint. Die Blueprints werden im Editor erstellt, nicht in C++, und sind über die Eigenschaft `Widget Class` mit der C++-Widget-Klasse verknüpft. Die C++-Klasse übernimmt die Logik, der Blueprint das Layout. Diese Aufgabentrennung entspricht dem von CommonUI vorgesehenen Muster.

---

## Ergebnisse und Validierung

- Alle Canvas-HUD-Fallbacks wurden durch Unterklassen von `UCommonActivatableWidget` aus CommonUI ersetzt
- `UOnsetUISubsystem` (GameInstanceSubsystem) als zentraler Navigationsknoten
- Drei Bildschirmebenen: Spiel, Menü, Modal
- `UCommonInputSubsystem` zur Verwaltung der Eingabemodi – kein Flackern mehr
- Widget-Lebenszyklus über `NativeOnActivated`/`NativeOnDeactivated` – keine „Construct/Destruct“-Lecks mehr
- UMG-Widget-Blueprints für alle Bildschirme – Layout im Blueprint, Logik in C++
- Gepackte `-game`-Builds rendern Menüs erstmals korrekt

---

## Herausforderungen und Lösungen

### UMG wird in gepackten `-game`-Builds nicht gerendert

**Problem:** Unterklassen von `UUserWidget` werden in gepackten `-game`-Builds ohne Fehlermeldung nicht gerendert. Als Workaround diente das Canvas-HUD-Fallback.

**Lösung:** Das `UCommonActivatableWidget` von CommonUI wird in gepackten Builds korrekt dargestellt. Durch die Migration wird der Canvas-Fallback vollständig ersetzt.

### Wem gehört der Screen-Stack?

**Problem:** Ad-hoc-Navigation (Widget A öffnet Widget B direkt) führt zu unübersichtlichen Besitzverhältnissen und macht das Verhalten der Zurück-Schaltfläche inkonsistent.

**Lösung:** `UOnsetUISubsystem` ist für die gesamte Navigation zuständig. Kein Widget öffnet ein anderes Widget direkt – die gesamte Navigation läuft über die Methode `OpenScreen()` des Subsystems.

### Übergänge zwischen Eingabemodi verursachen ein Flackern des Cursors

**Problem:** Manuelle Aufrufe von `SetInputMode` in verschiedenen Widgets führten bei Übergängen zu einem Flackern des Cursors.

**Lösung:** `UCommonInputSubsystem` verwaltet die Eingabemodi zentral. Das Subsystem sorgt für reibungslose Übergänge – kein Flackern, keine hängenden Cursor.

### Trennung von Blueprint und C++-Widget-Logik

**Problem:** In frühen Widgets wurde Logik in Blueprint integriert, die eigentlich in C++ gehört hätte (Datenabruf, RPC-Aufrufe).

**Lösung:** C++ übernimmt die gesamte Logik (Datenabruf, RPC-Aufrufe, Navigation). Blueprint kümmert sich ausschließlich um das Layout. Das Muster `NativeOnActivated`/`NativeOnDeactivated` sorgt für eine übersichtliche Umsetzung: Blueprint überschreibt `NativeOnActivated` für die Einrichtung des Layouts, während C++ die Datenbindung übernimmt.

---

## Reflexion und gewonnene Erkenntnisse

Die Umstellung auf CommonUI ist gemessen an der Anzahl der Commits (4 Commits) der kleinste Beitrag in dieser Reihe, aber wohl die architektonisch bedeutendste Entscheidung. Das Canvas-HUD-Fallback war zwar eine funktionierende Lösung für PIE- und Editor-Tests, aber es war immer nur eine Notlösung. CommonUI ist das eigentliche UI-Framework, und es sorgt dafür, dass sich das Spiel wie ein Spiel anfühlt und nicht wie eine Tech-Demo.

Die zentralisierte Navigationszentrale (`UOnsetUISubsystem`) ist das Muster, das CommonUI erst funktionsfähig macht. Ohne sie würde der Bildschirmstapel zu einem wirren Gewirr aus Widget-zu-Widget-Verweisen werden. Das Subsystem ist der zentrale Navigationspunkt, und jedes Widget ordnet sich ihm unter. Dies ist dasselbe Muster wie bei `IPlayerDataStore` – eine Schnittstelle bzw. Abstraktion, die Verbraucher von Implementierungen entkoppelt.

Die Integration des Eingabesubsystems ist die unscheinbarste, aber wichtigste Änderung. Das Flackern des Cursors beim Wechsel zwischen den Eingabemodi gehört zu den Fehlern, die Spieler zwar nie bewusst wahrnehmen, aber immer spüren. Das `UCommonInputSubsystem` von CommonUI beseitigt dieses Problem vollständig.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A5 – Multiplayer + Steam | ✅ **100 % (42/42)** |
| A5b – Persistenz & Account-System | ✅ **100 % (30/30)** |
| CommonUI-UI-Migration | ✅ **100 % (4/4)** |
| A5c – Authentifizierungs-Extraktion & Login-Server | ⏭️ Weiter |
| Charakterklassen + Feinschliff | Geplant |

**Was als Nächstes kommt:** Die Benutzeroberfläche ist solide, aber das Spiel verfügt noch immer über kein Cloud-Kontosystem. In Beitrag 14 wird die Authentifizierungslogik aus dem Steam-SDK in einen eigenständigen Anmeldeserver ausgelagert, eine auf PostgreSQL basierende Kontospeicherung hinzugefügt und der zweiserverbasierte Token-Authentifizierungsablauf implementiert. Anschließend sorgt Beitrag 15 für den letzten Schliff: Charakterklassen, Ladebildschirme und die Absicherung der API-Zugriffskontrolle.

> **Nächstes Mal in Beitrag 14:** „The Cloud Spine“ – Auslagerung der Authentifizierung auf einen Anmeldeserver mit PostgreSQL, Lambda und DynamoDB.

---

*Arc-Commits: `f58c84b → 555e9ed`. Zugehörige Dokumente: `Docs/UI/CommonUI_Migration.md`, `Planning/Scripts/Episode40–43_*.md`.*


