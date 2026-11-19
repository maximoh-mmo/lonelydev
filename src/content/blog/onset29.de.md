---
id: "onset29"
title: "🎬 Entwickler-Tagebuch: MHAudio, Lebenszyklen von Geräten, Automatisierung der Benutzeroberfläche über MCP – und warum ich mich von Onset abwende"
seoTitle: "MHAudio – Lebenszyklen von Geräten, Automatisierung der Benutzeroberfläche über MCP und warum ich mich von Onset abwende"
date: "2026-11-23"
category: "Game Dev"
summary: "Abschluss des „Onset“-Entwicklungszyklus mit dem anbieterunabhängigen MHAudio-Framework, einer dauerhaften Gerätebeständigkeit und einer kosteneffizienten Duplizierung sowie 12 über Unreal MCP automatisierten Widget-Blueprints – gefolgt von einem offenen Rückblick auf den „Scope Creep“ bei MMOs und den Gründen, warum ich mich nun auf fokussierte, visuell greifbare Projekte verlagere."
project: "Onset"
tags: ["Unreal Engine", "C++", "Audio Architecture", "Game Economy", "CommonUI", "MCP", "Project Retrospective"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Nachdem ich in **Beitrag 28** die Authoring-Suite von Onset, den Academy Hub und die Kampfausgleichsmechanismen für das Live-Viewport fertiggestellt hatte, habe ich am **25. Oktober 2026** einen letzten Sprint mit grundlegenden Systemen über 7 Commits (von `6938836` bis `4c3df24`) veröffentlicht:

* **`MHAudio`-Framework-Plugin (`6938836`):** Eine anbieterunabhängige Audio-Abstraktion, die Gameplay, Fähigkeiten, Türen und Animationssequenzen von konkreten Audio-Backends entkoppelt.
* **Ausrüstungslebenszyklus & Wirtschaft (`5e2f876`):** Zwei Qualitätsstufen (`Grade D` bis `Grade S`), nicht-destruktiver Verschleiß, Materialrückgewinnung und Infusion doppelter Gegenstände.
* **Taktisches HUD & automatisierte Widget-Blueprints (`2fd0ee4`..`4c3df24`):** 9 C++-`CommonUI`-Widget-Controller, Python-generierte Layout-Wireframes und 12 `WBP_*`-Assets, die direkt im Unreal Editor über MCP erstellt und verfeinert wurden.

Dieser Beitrag dokumentiert diesen letzten Entwicklungssprint – und dient gleichzeitig als **Serienfinale von „Onset“**, in dem ich offen erkläre, warum ich mich von einem Solo-MMO-Projekt abwende, um mein Portfolio besser auf die Anforderungen des Arbeitsmarktes abzustimmen.

---

## Teil 1: Der letzte technische Sprint

### 1. Entkoppelte Audioarchitektur (`MHAudio`-Plugin)

Im Commit `6938836` habe ich **`MHAudio`** als eigenständiges Framework-Plugin erstellt, sodass Gameplay-Systeme, `FOnsetAbilityDefinition`-Datentabellen, `AOnsetDoor` und Editor-Vorschau-Ansichtsfenster niemals direkt an `USoundBase*`-Assets oder Anbieter-Middleware wie Wwise oder FMOD gebunden werden:

```text
+-------------------------------------------------------------+
|                        Gameplay Code                        |
|   (Abilities, Enemies, Doors, AnimNotifies, Settings UI)    |
+-------------------------------------------------------------+
                              |
                              | Speaks to UMHAudioSubsystem
                              v
+-------------------------------------------------------------+
|                           MHAudio                           |
|  - IMHAudioProvider (Interface)                             |
|  - UMHAudioCatalog (DataAsset Mapping)                      |
|  - UMHAudioSubsystem (GameInstance Subsystem)               |
|  - UMHAnimNotify_AudioEvent (Montage Animation Notify)      |
+-------------------------------------------------------------+
                              |
        +---------------------+---------------------+
        |                                           |
        v                                           v
+-------------------------+             +-------------------------+
| FMHUnrealAudioProvider  |             | FMHWwiseProvider (Drop-in|
| (Native UE / MetaSound) |             |  / FMHFMODProvider)     |
+-------------------------+             +-------------------------+
```

Jedes Signal wird durch `FGameplayTag` (`PostEvent`, `PostEventAttached`) ausgelöst und innerhalb von `UMHAudioCatalog` nativen Sound-Assets, Lautstärke-/Tonhöhenmultiplikatoren, Dämpfungsregeln und normalisierten Submix-Bussen zugeordnet (`Master`, `Music`, `SFX`, `Ambience`, `Voice`, `UI`).

Zur Unterstützung reaktiver Klanglandschaften verfolgt `FMHUnrealAudioProvider` diskrete `CombatState`-Übergänge (`Exploration` → `Combat` → `Boss`), um Crossfades bei zweispuriger Musik neben einer kontinuierlichen RTPC-Modulation zu ermöglichen (Ducking der Musik bei `PlayerHealthPercent` und Anwendung einer gedämpften Tiefpassfilterung unterhalb von 25 % HP). Der Austausch des nativen Unreal-Audios gegen Wwise oder FMOD erfordert die Implementierung von `IMHAudioProvider` in einer Brückenklasse, ohne dass Änderungen an Fähigkeiten oder Blueprints erforderlich sind.

---

### 2. Lebenszyklen von Evergreen-Ausrüstung: Qualitätsstufen, Verwertung und Zuführung von Duplikaten

Im Commit `5e2f876` habe ich die Wegwerf-Beute von Anbietern durch ein dauerhaftes Gegenstandssystem ersetzt, das auf `FOnsetEquipmentInstanceData`, `UOnsetEquipmentLibrary` und `UOnsetInventoryComponent` basiert:

#### Zwei Qualitätsstufen
Jede Waffe oder Rüstung, die als Beute fällt, weist unabhängige Stufen für `PrimaryStatGrade` (Schaden/Verteidigung) und `SecondaryStatGrade` (`Stärke`, `Intelligenz`, `Vitalität`, `Beweglichkeit`, `Glück`) auf, die durch das `Glück`-Attribut des Killers und die Seltenheit des Gegenstands beeinflusst werden:

| Qualitätsklasse | Bezeichnung | Stat-Multiplikator | Basis-Fallgewicht |
| :--- | :--- | :---: | :---: |
| **Klasse D** | Überschussware / defekt | `0,85×` | 25,0 % |
| **Klasse C** | Standardausführung | `1,00×` | 50,0 % |
| **Klasse B** | Verfeinert / Mil-Spec | `1,15×` | 20,0 % |
| **Klasse A** | Übertaktet | `1,30×` | 4,5 % |
| **Klasse S** | Apex / Meisterwerk | `1,50×` | 0,5 % |

#### „Fehlfunktion“ bei der Haltbarkeit ohne Zerstörung
Anstatt hart erarbeitete Ausrüstung bei einer Haltbarkeit von `0,0` zu löschen, verringert sich die Haltbarkeit von Waffen um `0,05` pro versetztem Treffer, die von Rüstungen um `0,10` pro absorbiertem Treffer, und der Tod des Spielers führt zu einem Haltbarkeitsmalus von `-15 %` für die gesamte ausgerüstete Ausrüstung. Bei `0,0` wechselt ein Gegenstand in den Zustand **`Fehlfunktion`** – wodurch die primären Kampfwerte, sekundären Attributboni und Schildblockraten um die Hälfte (`-50 %`) reduziert werden, bis er mit Credits und `CompositeScrap` repariert wird.

#### Verwertung und Duplizierung von Infusionen
Unerwünschte Ausrüstung wird über `UOnsetInventoryComponent::SalvageItem` in 6 Materialstufen zerlegt (`CompositeScrap`, `ReinforcedAlloy`, `NaniteFilament`, `QuantumCore`, `WeaponChassis`, `ArmorPlating`) zerlegt, wodurch sichergestellt wird, dass gewöhnliche Beute auch im Endgame weiterhin als wertvoller Reparaturrohstoff dient.

Doppelte Kopien derselben Artikelzeile können stattdessen über 'InfuseItem' geopfert werden, um ein Zielstück in Richtung **Grade S** zu schieben:

| Übergang | Duplikate erforderlich | Fortschritt pro Katalysator |
| :--- | :---: | :---: |
| **Note D → Note C** | 1 Duplikat | '+100,0%' |
| **Grade C → Grade B** | 2 Duplikate | '+50,0%' |
| **Grade B → Grade A** | 3 Duplikate | '+33,4 %' |
| **Grade A → Note S** | 5 Duplikate | '+20,0 %' |

Jede Infusionsrolle bietet zudem eine Wahrscheinlichkeit von `15 %` für **Kritische Resonanz**, wodurch der Gegenstand sofort auf die nächste Stufe angehoben wird und eine kostenlose Wiederherstellung der Haltbarkeit um `100 %` gewährt wird.

---

### 3. Taktisches HUD & automatisierte Widget-Blueprints über Unreal MCP

Über '2fd0ee4', 'fb6b41a', '0450b08', '2b860fc' und '4c3df24' habe ich das komplette HUD und die Bildschirmschicht von Onset auf **CommonUI** ('Game', 'Menu', 'Modal' und 'Viewport / HUD' Layer) gebaut:

* **Continuous Dedicated-Server-Semantics ('fb6b41a'):** Da Onset auf einem autoritativen dedizierten Server läuft, schaltet das Öffnen von 'WBP_PauseMenu' die lokale Eingabe auf 'ECommonInputMode::Menu' um, ohne die Live-Simulation um den Player herum zu pausieren. 
* **9 C++ Widget-Controller:** 'UOnsetDeathScreen', 'UOnsetPauseMenuScreen', 'UOnsetSettingsScreen', 'UOnsetItemTooltipWidget', 'UOnsetItemActionMenuWidget', 'UOnsetBuffBarWidget', 'UOnsetCastBarWidget', 'UOnsetDurabilityWarningWidget' und 'UOnsetQuestTrackerWidget'. 
* **Spec-gesteuerte UI-Erstellung über MCP:** Anstatt UMG-Hierarchien blind von Hand zu verkabeln, habe ich [generate_mockups.py](https://github.com/maximoh-mmo/PortfolioTutorial) ('0450b08') geschrieben, um pixelgenaue Wireframe-Spezifikationen zu rendern, und dann alle 12 'WBP_*' Widget-Blueprints direkt im Unreal Editor über MCP generiert und gestylt ('2b860fc', '4c3df24').

! [Onset Tactical HUD Wireframe] (/images/onset/layout_hud.png)

! [Onset Inventar und Ausrüstungsbildschirm-Drahtgitter] (/images/onset/layout_inventory_screen.png)

! [Onset Death und Respawn Modal Wireframe] (/images/onset/layout_death_screen.png)

---

## Teil 2: Zurücktreten – Warum ich mich vom Beginn entfernt

Mit 'MHAudio', dem Ausrüstungslebenszyklus und der vollständigen UI-Shell im Einsatz, markierte der 25. Oktober einen natürlichen Checkpoint – und zwang eine ehrliche Bewertung des Projekts als Ganzes.

**Ich mache offiziell eine Pause und orientiere mich von Onset als Herzstück meines Portfolios und dieser Blogreihe ab.**

### Was ich am Bau geliebt habe
Ich genieße den enormen technischen Umfang eines MMOs wirklich. Die Bewältigung von Netzwerkverkehrsbudgets, Autorität für dedizierte Server, Konto- und Charakterpersistenz, Kampfmathematik im Gameplay-Fähigkeitssystem, KI-Zustandsbäumen und benutzerdefinierten Editor-Authoring-Tools war zutiefst erfüllend. Das Schreiben von 29 Engineering-Tagebüchern rund um Onset hat meine Unreal C++- und architektonischen Instinkte stärker gefordert, als es ein kleinerer Prototyp hätte tun können.

### Wo die Solo-MMO-Mathematik zusammenbricht
Die ständige Realität von Onset war jedoch **unerbittlicher Scope Creep**. Jedes Mal, wenn ein zentrales Backend-System solide wurde – Paketframing, Inventarreplikation, StateTree-Lenken, Wirtschaftsschleifen – offenbarten es sofort drei weitere Abhängigkeiten, die ein echtes Action-RPG braucht, bevor es kohärent wirkt.

Noch wichtiger ist, dass es eine harte Wahrheit darüber gibt, wie technische Arbeit von außen bewertet wird: **Für einen einzelnen Entwickler ist es sehr, sehr lang, ein MMO-großes 3D-Projekt auf einen Punkt zu bringen, an dem es wirklich präsentabel ist und unmittelbares Interesse weckt – denn das anfängliche Interesse hängt fast immer an die Visualisierung ab.**

Du kannst eine klare Grenze zwischen Client und dediziertem Server oder eine Null-Allokation-Fähigkeitspipeline gestalten, und trotzdem wirkt es auf dem Bildschirm wie Greyboxes, Platzhalter-Schaufenster und Entwickler-Wireframes – es sei denn, du investierst Monate oder Jahre in maßgeschneiderte 3D-Umgebungen, Charakter-Rigging, Animationen und VFX.

### Mein Portfolio an den Arbeitsmarkt anpassen
Ein zentrales Ziel dieser Blogreihe – und meiner aktuellen Portfolioarbeit – ist es, **Recruiter, technische Führungskräfte und Studios anzusprechen und meine Fähigkeiten klar auf dem Arbeitsmarkt zu demonstrieren.**

So stolz ich auch auf die Architektur von Onset bin, ein endloses Solo-MMO versagt letztlich es, meine Fähigkeiten so effektiv zu verkaufen, wie es sie herausfordert. In einer 30-sekündigen Portfolio-Rezension vermittelt ein fertiges, visuell überzeugendes Tool oder ein ausgeliefertes kompaktes Spiel die technische Disziplin weitaus klarer als ein ehrgeiziger, unfertiger vertikaler Schnitt.

---

## Blick nach vorn: Wohin der Blog als Nächstes geht

Sich von Onset zurückzuziehen bedeutet nicht, sich von Hard Systems Engineering zurückzuziehen – es ist ein bewusster Wandel hin zu **eng begrenzten, abschlussfähigen, visuell untermauerten Projekten**, bei denen der Code für sich selbst spricht:

1. **Tooling & Security Architecture für einen 3D-Künstler ('JTS3D'):** Aufbau eines Zero-Code-Portfolio-Studios, einer Medienvalidierungspipeline ('ffprobe', WebP, PDF-Inspektion) und eines Zero-Trust-Split-Repo-Publishing-Systems für einen 3D-Umgebungskünstler. 
2. **Neugestaltung von 'maxheinze.com':** Umwandlung der unsichtbaren Backend-Architektur von C++ und Blueprint in eine interaktive **"Player View vs. System View"** X-Ray-Portfolio-Erfahrung. 
3. **Ein vollständiges, visuell zuerstes Strategiespiel (*Achi*):** Anwendung von Bitboards, Negamax-KI ohne Zuteilung, farbenblindsicherem Vektorrendering und null-Asset-basierter 16-Bit-PCM-Prozedurale Audiosynthese innerhalb eines plattformübergreifenden Projekts. 
4. **C++17 Prozedurale Systeme ('Ivy Sim'):** Prozedurales botanisches Wachstum in eine eigenständige, einheitsgetestete C++17 Godot GDExtension ('godot-cpp') mit deterministischer 'PCG32'-Simulation und räumlicher Anziehungsmathematik extrahieren.

Vielen Dank an alle, die der 29-Posts umfassenden Reise von *Onset* gefolgt sind. Der Code bleibt in ['maximoh-mmo/PortfolioTutorial'](https://github.com/maximoh-mmo/PortfolioTutorial) als offene Unreal C++-Architekturreferenz öffentlich – und jetzt ist es Zeit, Werke zu veröffentlichen, die man sehen und spielen kann.

---

*ArcCommits: '6938836', '5E2F876', '2FD0E4', 'FB6B41A', '0450B08', '2B860FC', '4C3DF24'.*
