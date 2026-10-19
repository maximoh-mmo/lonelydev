---
id: "onset11"
title: "🎬 Entwickler-Tagebuch: Das Wort des Servers ist Gesetz – „HasAuthority“-Wächter, Replikation, Steam-authentifizierter dedizierter Server"
seoTitle: "Server „Word Is Law“ mit Autoritätswächtern, Replikation und Steam-authentifiziertem dediziertem Server"
date: "2026-09-21"
category: "Game Dev"
summary: "Implementiert den Mehrspieler-Modus mit systematischen „HasAuthority“-Prüfungen für alle StateTree-Aufgaben und -Subsysteme, vollständiger Replikation für Charaktere und GAS sowie einer dedizierten Server-Version, die mithilfe des „Game“-Targets mit dem Flag „-server“ erstellt wurde, den Steam-Authentifizierungsticket-Ablauf sowie eine Zwei-Server-Architektur, die die Lobby (Port 7777) vom Gameplay (Port 7778) trennt und eine JWT-Token-Authentifizierung nutzt."
project: "Onset"
tags: ["Unreal Engine", "Multiplayer", "Steam Integration", "Dedicated Server", "Replication", "Gameplay Ability System"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Die Einzelspieler-Demo funktioniert. Die KI kämpft. Die Menüs lassen sich bedienen. Doch sobald zwei Spieler eine Verbindung herstellen, werden alle Probleme offengelegt, die auf der Annahme eines einzigen maßgeblichen Servers beruhen. Wem wird der Schaden zugerechnet? Wer entscheidet, wer stirbt? Werden NPCs repliziert? Sieht der Client das Gleiche wie der Server?

Sprint A5 beantwortet all diese Fragen in 2,5 Tagen intensiver Arbeit. Der Sprint beginnt mit einem Audit vor dem Sprint, das genau aufzeigt, was fehlt – eine Checkliste mit 35 Punkten, verteilt auf vier Phasen – und endet mit einem voll funktionsfähigen Authentifizierungsablauf über zwei Server sowie einem umfassenden Testskript. Der rote Faden ist **Autorität**: Jedes System, das den Status verändert, erhält eine `HasAuthority()`-Prüfung, jede replizierte Eigenschaft erhält einen `DOREPLIFETIME`-Eintrag, und der Spielserver lernt, dem Client nichts zu vertrauen, was er nicht ausdrücklich validiert hat.

---

## Technische Erläuterung

### Der Brute-Force-Zugangsnachweis

Im Sprint-Dokument wird zu Welle 1 ausdrücklich darauf hingewiesen:

> „Jede StateTree-Aufgabe enthält ganz am Anfang von `EnterState/Tick` den Befehl `if (!HasAuthority()) return Failed;`. Durch Brute-Force wird sichergestellt, dass keine KI-Logik an die Clients weitergegeben wird.“

21 Dateien erhalten Wächter. Alle 11 StateTree-Aufgaben geben auf dem Client `Failed` zurück. Nicht-Akteur-Subsysteme (`UWorldSubsystem`) können `HasAuthority()` nicht aufrufen, daher verwenden sie `GetWorld()->GetNetMode() == NM_Client` – ein bewusster Zwei-Muster-Ansatz, der in den Commit-Meldungen dokumentiert ist.

### Warum `OnRep_VisualProfile` statt einer direkten Replikation von Mesh und Animation?

Skelett-Mesh, Animations-Blueprint und Materialzuweisung sind ressourcenintensive, nicht serialisierbare Vorgänge. Der Server repliziert lediglich die ressourcenschonende `UVisualProfile`-DataAsset-Referenz; der Client wendet diese nach dem Empfang lokal über `ApplyProfile()` erneut an. Aus diesem Grund wurde die `HasAuthority()`-Prüfung aus `ApplyProfile` **entfernt** – OnRep wird auf den Clients ausgeführt.

Der Fallback für den Würfel (Laufzeit-`NewObject<UStaticMeshComponent>`) wurde entfernt, da die Erstellung von Komponenten zur Laufzeit nicht repliziert werden kann. Und `IsDataValid()` verhindert die Erstellung eines Profils ohne Mesh, sodass es keinen Fallback mehr gibt.

### Warum der DS das Ziel „Game“ + das Flag `-server` verwendet

Die Datei `OnsetServer.Target.cs` (Typ=Server) wurde erstellt, doch die Engine-Distribution unterstützt den Zieltyp „Server“ nicht. Der DS ist lediglich die normale `Onset.exe`, die mit dem Parameter `-server` gestartet wird. Diese eine Einschränkung war ausschlaggebend für den gesamten Wave-3-Ansatz und die Datei `RunDS.ps1`.

---

## Details zur Umsetzung

### 1. Grundlagen der Replikation

`AOnsetBaseCharacter` erhält `bReplicates = true`, `GetLifetimeReplicatedProps` mit `DOREPLIFETIME_CONDITION(bIsAlive, COND_None)` und einem `OnRep_bIsAlive()`, das den Charakter clientseitig ausblendet/deaktiviert, wenn er tot ist:

```cpp
void AOnsetBaseCharacter::OnRep_bIsAlive()
{
    SetActorHiddenInGame(!bIsAlive);
    SetActorEnableCollision(bIsAlive);
}
```

`AOnsetEnemy` fügt `SetReplicateMovement(true)` und `VisualProfile` als Eigenschaft mit dem Wert `ReplicatedUsing=OnRep_VisualProfile` hinzu. KI-Controller werden ausdrücklich *nicht* repliziert – sie sind von ihrer Konzeption her ausschließlich serverbasiert.

### 2. Der GAS-Replikationsfehler

Der Bewegungsgeschwindigkeitsmodifikator verwendete `NewObject<UGameplayEffect>`, um dynamisch unendlich viele GEs zu erstellen. Dies führte zu einem Client-Fehler: `„Received ReplicatedGameplayEffect with no UGameplayEffect def“` – da das Replikationssystem den CDO eines transienten Objekts nicht finden kann. Die Lösung ist eine echte `UOnsetMovementSpeedModifierEffect`-Klasse mit der Stärke `SetByCaller`:

```cpp
FGameplayEffectSpecHandle SpecHandle = ASC->MakeOutgoingSpec(
    UOnsetMovementSpeedModifierEffect::StaticClass(), 1.0f, ASC->MakeEffectContext());
FGameplayEffectSpec* Spec = SpecHandle.Data.Get();
Spec->SetSetByCallerMagnitude(FName("MoveSpeedMod"), Magnitude);
return ASC->ApplyGameplayEffectSpecToSelf(*Spec);
```

Dies ist dasselbe Muster, das sich bis in die aktuelle Codebasis fortgesetzt hat – eine ordnungsgemäße GE-Klasse mit „SetByCaller“ für den Laufzeitwert, die über eine Klassenreferenz und nicht über einen Objektzeiger repliziert wird.

### 3. Steam-Authentifizierungsablauf

Der Client fordert ein Ticket an, sendet es über zuverlässiges RPC an den Server, der Server validiert es mit Steams `BeginAuthSession`, und der Client erhält ein signiertes Sitzungstoken zurück:

```cpp
const FString AuthTicket = Identity->GetAuthToken(0);
Server_SendAuthTicket(AuthTicket);
GetWorldTimerManager().SetTimer(AuthTimeoutTimerHandle, this, &AOnsetPlayerController::OnAuthTimeout, 10.0f, false);
```

Der Server führt eine Validierung durch und ruft `Client_ClearAuthTimeout()` auf, um den clientseitigen Timer zu deaktivieren – ohne diese Maßnahme würde der Client selbst bei erfolgreicher Validierung die Meldung „Authentifizierung abgelaufen“ ausgeben.

### 4. Die Einrichtung des dedizierten Servers

Der DS wird als eigenständiger Prozess mit dem Flag `-server` und der Anmeldekarte gestartet:

```powershell
$dsArgs = "`"$ProjectPath`" $MapPath -server -log"
Start-Process -FilePath $DSBinary -ArgumentList $dsArgs -WindowStyle Normal
```

Der DS verfügt weder über ein Ansichtsfenster noch über einen lokalen Spieler oder ein HUD. Er läuft im Headless-Modus, authentifiziert sich über Steam-Tickets und verwaltet den Spielstatus für verbundene Clients.

### 5. Die Aufteilung auf zwei Server

Die Architektur trennt die Authentifizierung und Charakterauswahl (Anmeldeserver, Port 7777, Direktmodus) vom eigentlichen Spielgeschehen (Spielserver, Port 7778, Token-Modus). Das Token enthält den `SlotIndex`, damit der Spielserver weiß, welcher Charakter erstellt werden soll:

```cpp
FString URL = FString::Printf(TEXT("%s:%s/Game/Maps/DemoLevel?Token=%s"),
    *ServerIP, *ServerPort, *Token);
ClientTravel(URL, TRAVEL_Absolute);
```

---

## Ergebnisse und Validierung

- `HasAuthority()`-Prüfungen für alle 11 StateTree-Aufgaben sowie für die Subsysteme „Spawner“, „Pool“, „Threat“ und „Corpse“
- `bReplicates` bei `AOnsetBaseCharacter`, `DOREPLIFETIME_CONDITION(bIsAlive)`, `SetReplicateMovement(true)` bei Gegnern
- `VisualProfile` wird über `OnRep_VisualProfile` repliziert; Cube-Fallback entfernt
- GAS-Geschwindigkeitsmodifikator unter Verwendung der korrekten Klasse `UOnsetMovementSpeedModifierEffect` (kein Replikationsfehler mehr)
- Ablauf des Steam-Authentifizierungstickets: Anfrage → RPC → Validierung → Token → Kick-Timer
- DS-Build: Spielziel + `-server`-Flag, `RunDS.ps1` mit Pfaden für Editor und Standalone-Version
- Zwei-Server-Architektur: Lobby-DS (direkte Authentifizierung) + Spiel-DS (Token-Authentifizierung)
- `Test_All.ps1`: umfassende Testsuite (4 Phasen, 43 Checkpoints)
- A5 = 42/42 (100 %)

---

## Herausforderungen und Lösungen

### Der GE-Replikationsfehler zur Laufzeit

**Problem:** `NewObject<UGameplayEffect>` hat auf den Clients kein auffindbares CDO; die Replikation schlägt ohne Fehlermeldung fehl.

**Lösung:** Echte `UOnsetMovementSpeedModifierEffect`-Klasse mit `SetByCaller`-Größe. Der Wert wird über den Schlüssel „SetByCaller“ übertragen, nicht über den Objektzeiger.

### Der Cube-Fallback lässt sich nicht replizieren

**Problem:** Die Laufzeitfunktion `NewObject<UStaticMeshComponent>` erstellt Komponenten, die nicht repliziert werden.

**Lösung:** Löschen Sie den Cube-Fallback vollständig. Die `VisualProfile`-Replikation deckt alle visuellen Fälle ab; Profile ohne Mesh werden bereits bei der Erstellung durch `IsDataValid()` blockiert.

### Die Diskrepanz bei den Authentifizierungseinstellungen zwischen `GGameIni` und `GEngineIni`

**Problem:** Die Authentifizierungskonfiguration befand sich in der Datei `DefaultEngine.ini`, wurde jedoch über `GGameIni` eingelesen – die spielspezifische INI-Datei, die auf dem DS nicht vorhanden ist.

**Lösung:** Die Authentifizierungskonfiguration über `GEngineIni` einlesen (immer vorhanden), die `if (GConfig->GetString(...))`-Wrapper entfernen, die fehlende Schlüssel stillschweigend ignorierten.

### Die Token-Adresse stimmt nicht überein

**Problem:** `GetPlayerNetworkAddress()` gibt `IP:Port` zurück, aber `PendingTokenAuthMap` wurde anhand der reinen IP-Adresse indiziert.

**Lösung:** Den Port vor der Suche entfernen. Eine Korrektur von nur einem Zeichen, die dazu führte, dass die gesamte Token-Validierung nicht mehr funktionierte.

### Die Inkompatibilität der `steam://`-URL

**Problem:** `steam://`-Reise-URLs funktionieren nur, wenn Steam läuft; die Entwicklung mit `-NOSTEAM`/Null-OSS schlägt fehl.

**Lösung:** Wechseln Sie zu direkten URLs im Format `IP:Port/Path?Token=`. Das Flag `-NOSTEAM` in `Test_All.ps1` gewährleistet konsistente Null-OSS-Tests.

### Die Assertion `FGenericPlatformMisc::GetSHA256Signature`

**Problem:** Die SHA-256-API der Plattform löst auf Plattformen, die keine Hardware- oder Betriebssystemunterstützung für SHA-256 bieten, einen Fehler aus.

**Lösung:** Eigene, rein softwarebasierte `FSHA256`-Implementierung. Es handelt sich um denselben Code, der sowohl auf dem Login- als auch auf dem Spielserver für die HMAC-Signierung verwendet wird – ein identisches Verhalten ist garantiert, da beide denselben HMAC über dieselbe Nutzlast mit demselben Schlüssel berechnen.

---

## Reflexion und gewonnene Erkenntnisse

Die wichtigste Erkenntnis aus diesem Entwicklungsprozess ist, dass **Autorität eine Eigenschaft des Systems ist und kein Feature, das man einfach nachträglich hinzufügt.** Die `HasAuthority()`-Prüfungen mussten systematisch hinzugefügt werden – als grep-basierte Überprüfung und nicht als Check für jedes einzelne Feature. Eine einzige fehlende Überprüfung in einer StateTree-Aufgabe führt dazu, dass KI-Logik auf den Clients ausgeführt wird, was zu einer Desynchronisation führt, die in PIE unsichtbar ist, im Multiplayer-Modus jedoch katastrophale Folgen hat.

Die DS-Build-Einschränkung (Spielziel + `-server`-Flag, kein Serverziel) hat mir gezeigt, die Einschränkungen bei der Engine-Verteilung zu beachten. Der Zieltyp „Server“ ist zwar im Editor vorhanden, kommt aber in den endgültigen Builds nicht vor. Jede architektonische Entscheidung bezüglich des DS ergibt sich aus dieser einen Einschränkung.

Die Aufteilung auf zwei Server (Login + Spiel) ist die wichtigste architektonische Entscheidung des Projekts. Sie sorgt für eine klare Trennung der Aufgabenbereiche: Der Login-Server ist eine schlanke, austauschbare „Eingangstür“, die Tickets validiert und Tokens ausstellt; der Spielserver ist plattformunabhängig, validiert Tokens und lädt Kontodaten. Dies spiegelt die Architektur eines Live-Service-MMOs im Demo-Maßstab wider.

Was ich anders machen würde: Ich hätte die Datei `Test_All.ps1` vor dem Authentifizierungsablauf geschrieben, nicht danach. Das Testskript ist das Sicherheitsnetz, das belegt, dass der Multi-Server-Ablauf funktioniert; hätte es vom ersten Tag des Arc an vorhanden gewesen, wären die Diskrepanz bei der Token-Adresse und der Kick-Timer-Fehler früher aufgefallen.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A5 — Multiplayer + Steam | ✅ **100 % (42/42)** |
| A5b — Persistenz & Account-System | ⏭️ Weiter |
| A5c — Authentifizierungsdaten-Extraktion & Login-Server | Geplant |

**Was kommt als Nächstes:** Der Authentifizierungs-Kern ist fertig, aber ein Spiel braucht einen Helden. Im Sprint A5b wird die Persistenzschicht hinzugefügt – SQLite-Speicher, SteamID-Auflösung, Charakterauswahl und der Ablauf der Weltreise, der den Anmeldeserver mit dem Spielserver verbindet. Die Konto-API (Lambda + DynamoDB) ist für A5c geplant.

> **Nächstes Mal in Beitrag 12:** „Remember You“ – SQLite-Persistenz, SteamID-Auflösung und die Charakterauswahl mit drei Plätzen, die jeden Tod endlich sozusagen endgültig macht.

---

*Arc-Commits: `e854da8` → `91d709c`. Zugehörige Dokumente: `Docs/Multiplayer/Multiplayer_System.md`, `Docs/Steam/Steam_Integration_System.md`, `Docs/Architecture/Architecture Overview.md`, `Planning/Sprint_A5_Multiplayer.md`.*


