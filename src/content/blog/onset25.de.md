---
id: "onset25"
title: "🎬 Entwickler-Tagebuch: Steam-Paket-Authentifizierung, Ticket-Lebenszyklen und Absicherung dedizierter Server"
seoTitle: "Lebenszyklen von Steam-Paket-Authentifizierungstickets und Absicherung dedizierter Server"
date: "2026-11-09"
category: "Game Dev"
summary: "Verbessert die Perimetersicherheit von dedizierten Servern durch anbieterunabhängige Identitätsverträge, native Steam-AuthTicket-Lebenszyklen und die Paketverschlüsselung über SteamNetSockets. Bietet eine automatisierte Testumgebung für Angriffe mit fehlerhaften Tickets sowie nahtloses Caching bei der Reisegültigkeitsprüfung."
project: "Onset"
tags: ["Unreal Engine", "Steamworks", "Networking", "Packet Authentication", "Dedicated Server", "Security", "Multiplayer"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Der Unterschied zwischen einer auf `localhost` laufenden Tech-Demo und einem echten Multiplayer-Spiel liegt in der **Perimetersicherheit**. In einer ungesicherten Umgebung können Clients Verbindungen mit gefälschten Spieler-IDs herstellen, gefälschte Kontodaten an die Datenbank senden oder den dedizierten Server mit speziell gestalteten UDP-Paketen überfluten, die Speicherfehler auslösen.

Nachdem wir datengesteuerte Funktionen, umfassende Inventarsysteme, eine clientseitige Wegfindung sowie unser modulares MH-Framework entwickelt hatten, standen wir vor der letzten Hürde vor der Produktionsfreigabe: **die autoritative Authentifizierung und die Absicherung dedizierter Server**.

In über einundzwanzig Commits habe ich die Netzwerkfunktionen von Onset auf Produktionssicherheitsstandards gebracht:
* Ich habe anbieterunabhängige Identitätskontrakte (`IMHIdentityProvider`, `FMHAuthTicket`) innerhalb unseres neuen `MHOnlineCore`-Plugins entworfen.
* Ich habe native Pipelines zur Erlangung, Stornierung und Validierung von Steam-`AuthTicket`s mithilfe des Steamworks-SDK implementiert.
* Ich habe die Authentifizierung und Verschlüsselung von Steam-Paketen für den gesamten Datenverkehr auf dedizierten Servern aktiviert.
* Ich habe ein eigenständiges Testskript für Sicherheitsregressionen (`Launch-MalformedTicketTest.ps1`) entwickelt, das den Server mit fehlerhaften Tickets überflutet, um die Ausfallsicherheit zu gewährleisten.
* Ich habe subtile Race-Conditions bei Weltwechseln und Inkompatibilitäten bei Cooker-Assets behoben, wodurch saubere, veröffentlichungsreife Cooker-Builds erstellt werden können.

---

## Technische Darstellung

### Anbieterunabhängige Identität vs. Herstellerabhängigkeit

Zwar ist Steam unsere wichtigste Vertriebsplattform für PC-Spiele, doch führt die feste Einbindung von `SteamUser()`- und `SteamGameServer()`-Aufrufen direkt in den Spiel- oder Account-Code zu erheblichen technischen Schulden. Sollte das Spiel später im Epic Games Store oder bei GOG veröffentlicht werden oder über einen eigenständigen Launcher des Entwicklers laufen, müsste jede Authentifizierungsprüfung neu geschrieben werden.

Um eine Anbieterabhängigkeit zu vermeiden, legt `MHOnlineCore` einen abstrakten Identitätsvertrag fest:

```
+-------------------------------------------------------------+
|                      Onset Game Mode                        |
|             (PreLogin & Account Association)                |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                    IMHIdentityProvider                      |
|  - GetProviderType()                                        |
|  - GetUniqueId()                                            |
|  - RequestAuthTicketAsync()                                 |
|  - CancelAuthTicket()                                       |
+-------------------------------------------------------------+
                              ^
                              | (Implements)
+-------------------------------------------------------------+
|                  FMHSteamIdentityProvider                   |
|         (Wraps Steamworks SDK: ISteamUser / SDR)            |
+-------------------------------------------------------------+
```

Das Gameplay und die Server-Anmeldesysteme kommunizieren ausschließlich mit `IMHIdentityProvider`. Die zugrunde liegende Implementierung verwaltet Steamworks-Handles, native Byte-Arrays und asynchrone Callbacks hinter einem undurchsichtigen Ticket-Vertrag (`FMHAuthTicket`).

### Steam-Paket-Authentifizierung und Valve-Datagramm-Relay (SDR)

Die Standard-Netzwerkfunktionen der Unreal Engine leiten unverschlüsselte UDP-Pakete weiter. Wenn ein böswilliger Akteur den Paketverkehr abfängt, kann er RPC-Anrufe fälschen oder reflektierte Denial-of-Service-Angriffe starten.

Indem Sie die Steam-Paketauthentifizierung in der Datei `DefaultEngine.ini` aktivieren:

```ini
[/Script/Engine.Engine]
!NetDriverDefinitions=ClearArray
+NetDriverDefinitions=(DefName="GameNetDriver",DriverClassName="/Script/SteamSockets.SteamSocketsNetDriver",DriverClassNameFallback="/Script/OnlineSubsystemUtils.IpNetDriver")

[OnlineSubsystemSteam]
bUseSteamNetworking=true
```

Jeder Verbindungs-Handshake basiert auf einer nativen Steam-Authentifizierungssitzung (`BeginAuthSession` / `ValidateAuthTicketResponse`). Die Pakete werden über das verschlüsselte Steam Datagram Relay (SDR) von Valve übertragen, wodurch das Ausspähen von IP-Adressen, das Manipulieren von Paketen und das unbefugte Übernehmen von Verbindungen unmöglich sind.

### Das „Malformed Ticket“-Regressions-Gate

Die Sicherheit wird niemals durch das Testen gültiger Anmeldungen überprüft. Die wahre Robustheit eines Servers zeigt sich darin, wie er mit Datenmüll umgeht.

Um den Sicherheitsperimeter zu überprüfen, habe ich ein automatisiertes Angriffstest-Tool erstellt: `Launch-MalformedTicketTest.ps1`. Das Skript startet testende Clients im Headless-Modus, die Verbindungsversuche mit folgenden Methoden unternehmen:
1. **Leere Tickets/Tickets mit der Länge Null**
2. **Abgeschnittene Payloads (vorzeitiges EOF)**
3. **Bit-vertauschte, beschädigte Tokens**
4. **Gültige Tickets, die nicht übereinstimmende Steam-IDs vortäuschen**
5. **Wiederverwendete, abgelaufene Tickets**

Der Server muss 100 % dieser Versuche mit `EOnsetAuthResult::InvalidTicket` zurückweisen, den Netzwerkkanal sofort beenden, Sicherheitsprotokolle zur Diagnose erstellen und darf keinesfalls eine Heap-Beschädigung oder Thread-Blockaden zulassen.

---

## Details zur Umsetzung

### 1. Lebenszyklus eines eigenen Tickets (`MHOnlineCore/Public/MHAuthTicket.h`)

Tickets sind Ressourcen, die nur bewegt werden können und im Steam-Backend automatisch gelöscht werden, wenn sie zerstört oder fallen gelassen werden:

```cpp
class MHONLINECORE_API FMHAuthTicket
{
public:
    FMHAuthTicket() = default;
    FMHAuthTicket(uint32 InHandle, TArray<uint8>&& InBytes)
        : TicketHandle(InHandle), TicketBytes(MoveTemp(InBytes)) {}

    ~FMHAuthTicket()
    {
        // Automatically release ticket handle on backend if still active
        Cancel();
    }

    // Move-only semantics prevent accidental double-cancellations
    FMHAuthTicket(FMHAuthTicket&& Other) noexcept
        : TicketHandle(Other.TicketHandle), TicketBytes(MoveTemp(Other.TicketBytes))
    {
        Other.TicketHandle = 0;
    }

    bool IsValid() const { return TicketHandle != 0 && TicketBytes.Num() > 0; }
    const TArray<uint8>& GetBytes() const { return TicketBytes; }
    uint32 GetHandle() const { return TicketHandle; }

    void Cancel();

private:
    uint32 TicketHandle = 0;
    TArray<uint8> TicketBytes;
};
```

### 2. Native Steam-Ticket-Generierung (`MHSteamIdentityProvider.cpp`)

Zum Abrufen eines Tickets wird die moderne `GetAuthSessionTicket`-Funktion von Steamworks mit Callback-Validierung verwendet:

```cpp
void FMHSteamIdentityProvider::RequestAuthTicketAsync(FMHOnTicketReady OnComplete)
{
    if (!SteamUser())
    {
        OnComplete.ExecuteIfBound(FMHResult<FMHAuthTicket>::Failure(TEXT("SteamUser unavailable")));
        return;
    }

    uint32 TicketBufferLength = 0;
    TArray<uint8> Buffer;
    Buffer.SetNumUninitialized(1024);

    HAuthTicket Handle = SteamUser()->GetAuthSessionTicket(
        Buffer.GetData(),
        Buffer.Num(),
        &TicketBufferLength
    );

    if (Handle == k_HAuthTicketInvalid)
    {
        OnComplete.ExecuteIfBound(FMHResult<FMHAuthTicket>::Failure(TEXT("GetAuthSessionTicket failed")));
        return;
    }

    Buffer.SetNum(TicketBufferLength);
    FMHAuthTicket Ticket(Handle, MoveTemp(Buffer));
    OnComplete.ExecuteIfBound(FMHResult<FMHAuthTicket>::Success(MoveTemp(Ticket)));
}
```

### 3. Validierung und Zwischenspeicherung vor der Anmeldung auf dem Server (`OnsetAuthSubsystem.cpp`)

In `AOnsetGameModeBase::PreLogin()` werden sich einloggende Spieler überprüft, bevor überhaupt ein Pawn oder ein PlayerController zugewiesen wird:

```cpp
void UOnsetAuthSubsystem::ValidateConnectingPlayer(
    const FString& Options,
    const FString& Address,
    FString& OutErrorMessage)
{
    const FString SteamIDStr = UGameplayStatics::ParseOption(Options, TEXT("SteamID"));
    const FString TicketHex = UGameplayStatics::ParseOption(Options, TEXT("AuthTicket"));

    TArray<uint8> TicketBytes;
    if (!HexToBytes(TicketHex, TicketBytes) || TicketBytes.Num() < 16)
    {
        OutErrorMessage = TEXT("Malformed or missing Steam authentication ticket.");
        LogSecurityEvent(Address, TEXT("MalformedTicketRejected"));
        return;
    }

    CSteamID SteamID(FCString::Atoi64(*SteamIDStr));
    EBeginAuthSessionResult Result = SteamGameServer()->BeginAuthSession(
        TicketBytes.GetData(),
        TicketBytes.Num(),
        SteamID
    );

    if (Result != k_EBeginAuthSessionResultOK)
    {
        OutErrorMessage = FString::Printf(TEXT("Steam authentication rejected: %d"), (int32)Result);
        return;
    }

    // Cache successful validation outcome across map transitions
    ResultCache.StoreResult(SteamIDStr, EOnsetAuthResult::Success);
}
```

### 4. Aufrechterhaltung der Gültigkeit bei nahtlosen Reisen

Zuvor gab es eine subtile Race Condition, bei der ein Spieler, der sich während `PreLogin` erfolgreich authentifiziert hatte, möglicherweise auf `OnPostLogin` stieß, nachdem sich die Weltinitialisierung geändert hatte.

Ich habe `FOnsetSteamAuthResultCache` entwickelt: einen schlanken, threadsicheren Cache mit einer gleitenden TTL von 30 Sekunden. Nach Abschluss des nahtlosen Wechsels überprüft `OnPostLogin` den Cache, um sicherzustellen, dass die eingehende Verbindung die kryptografische Validierung bereits bestanden hat, wodurch unerwünschte Verbindungsabbrüche bei Levelwechseln vermieden werden.

---

## Ergebnisse und Validierung

1. **Dedicated Server Connection Over Steam:**
   * Booted a headless Onset dedicated server on a test machine.
   * Launched packaged game client via Steam.
   * Server console confirmed connection:
     ```
     [LogSteamSockets] Connected to remote client [SteamID: 76561198000000000]
     [LogOnsetAuth] BeginAuthSession: Ticket validated successfully (k_EAuthSessionResponseOK)
     [LogOnsetAuth] Player authenticated. Permitting login.
     ```
2. **Malformed Ticket Attack Simulation:**
   Ran `.\Launch-MalformedTicketTest.ps1`:
   * 10 distinct malformed packet tests executed against the live server.
   * 10/10 attacks were cleanly rejected at the `PreLogin` boundary.
   * Zero server crashes, memory leaks, or unhandled exceptions.
3. **Cooker & Blueprint Hardening:**
   Cleaned and recompiled all affected UI blueprints and designated `AOnsetPlayerController` as the authoritative runtime class. Full package build completed with 0 errors.

---

## Herausforderungen und Lösungen

### Herausforderung 1: Das Wettrennen um die nahtlose Fahrtenvalidierung

**Problem:** Wenn ein Server einen nahtlosen Übergang zwischen Karten initiierte, lösten Spieler, die sich in der neuen Welt erneut einloggten, `OnPostLogin` aus, bevor sich die Steamworks-Spielserver-Callbacks erneut registriert hatten. Der Server interpretierte dies als nicht authentifizierte Verbindung und warf die Spieler zurück ins Hauptmenü.

**Lösung:** `FOnsetSteamAuthResultCache` wurde implementiert. Validierte Steam-Sitzungen werden mit einem kurzen Ablaufzeitgeber zwischengespeichert, der über die gesamte Lebensdauer der `UOnsetAuthSubsystem`-Instanz hinweg bestehen bleibt, sodass ein nahtloser Spielverlauf ohne erneute Ticketanforderung möglich ist.

### Herausforderung 2: Cooker-Assertions bei „Blueprint Connect“-Schaltflächen

**Problem:** Die Ausführung der Cook-Pipeline für einen gepackten Windows-Build schlug während der Erstellung des Hauptmenü-Widgets fehl, da eine veraltete Blueprint-Hilfsfunktion auf ein reines Editor-Modul verwies.

**Lösung:** Die UI-Blueprints wurden mithilfe des Standalone-Engine-Cookers neu gespeichert und bereinigt, die ausschließlich für den Editor bestimmten Hilfsfunktionen wurden in das Modul `OnsetEditor` verschoben und das einwandfreie Cooking in `UE 5.8.3` wurde überprüft.

---

## Reflexion und gewonnene Erkenntnisse

Die Sicherheit im Multiplayer-Modus ist kein nachträglicher Einfall, sondern ein grundlegender Bestandteil der Architektur. Durch die Einbindung von SDKs von Drittanbietern wie Steamworks hinter übersichtlichen, anbieterneutralen Schnittstellen (`IMHIdentityProvider`) bleibt Ihr Spielcode elegant und Sie behalten gleichzeitig die vollständige Kontrolle über den Authentifizierungszyklus.

Die Entwicklung des Test-Harnesses für fehlerhafte Tickets war einer der befriedigendsten Meilensteine dieses Sprints. Die empirische Gewissheit, dass unser Server beschädigte, verkürzte und bösartige Pakete zurückweist, gibt uns volles Vertrauen im Hinblick auf die öffentlichen Tests.

---

## Der bisherige Weg: Rückblick auf die Meilensteine

Mit der Fertigstellung von Post 25 hat sich Onset von einem leeren Git-Repository zu einem voll ausgestatteten, sicheren und datengesteuerten ARPG entwickelt:

| Meilenstein / Beitrag | Schwerpunkte & Kernsysteme |
|---|---|
| **Beiträge 01–05** | Repository-Bootstrap, Spieler-Kern, Zielerfassung, Pooling, Wahrnehmung, StateTrees |
| **Beiträge 06–10** | Trefferreaktionen, Leichen, Gruppenunterstützung, Bedrohungssysteme, automatisches Spielen der Spieler-KI |
| **Beiträge 11–15** | Grundlagen für den Multiplayer auf Steam, Persistenz, CommonUI, Charakterklassen |
| **Beiträge 16–19** | Fähigkeiten der Phase 1, In-Game-HUD v1/v2, Postmortem zur identitätssicheren Persistenz |
| **Beitrag 20** | **Die „Ability Workbench“:** Slate-Tabellen, datengesteuerter Kampf, Sprungbögen |
| **Beitrag 21** | **Lokale Infrastruktur & Kampfmathematik:** DynamoDB Local, Heilung, Formeln |
| **Beitrag 22** | **Inventar & Fortschritt:** Taschen, Leichen per Klick plündern, Levelaufstieg, Slate-Tools |
| **Beitrag 23** | **Steuerung & Quests:** Clientseitiges „Click-to-Move“, StateTree-Unterbrechungen, Quests |
| **Beitrag 24** | **Das MH-Framework:** Entkoppelte Plugins, asynchrone Abbruchmöglichkeiten, Multi-Store |
| **Beitrag 25** | **Optimierter Multiplayer:** Steam-Paket-Authentifizierung, Ticket-Lebenszyklen, Cooker-Bereitschaft |

---

## Zukunftsbezogene Aussagen

Die Kern-Engine, das Kampfsystem, das Inventar, die Persistenz und die Netzwerksicherheit sind nun fertiggestellt und absolut stabil. Im nächsten Kapitel von „Onset“ dreht sich alles um **Inhalte**: das Entwerfen abwechslungsreicher Dungeon-Zonen, die Feinabstimmung mehrstufiger Bosskämpfe, die Ausarbeitung von Quest-Handlungssträngen und die Einladung echter Spieler zum Alpha-Test.

---

*Arc-Commits: `ae132b1`, `c25bdb0`, `6e0336c`, `3ab8d2b`, `b26fafd`. Zugehörige Dokumente: `Docs/Framework/Identity.md`, `Docs/Framework/Steam.md`, `Docs/Steam/Steam_Integration_System.md`.*
