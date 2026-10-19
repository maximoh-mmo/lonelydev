---
id: "onset12"
title: "🎬 Entwicklertagebuch: Remember You – SQLite-Speicherung, SteamID-Auflösung und die „ServerTravel“-Herausforderung"
seoTitle: "Denken Sie daran: SQLite-Persistenz, SteamID-Auflösung und der „ServerTravel Gauntlet“"
date: "2026-09-25"
category: "Game Dev"
summary: "Erstellt die Persistenzschicht mit einer IPlayerDataStore-Schnittstelle, die SQLite-, PostgreSQL- und HTTP-Backends unterstützt. Behandelt die Extraktion von SteamIDs aus eindeutigen Netz-IDs, den vollständigen RPC-Ablauf von der Anmeldung über die Charakterauswahl bis hin zu „ServerTravel“, Canvas-HUD-Fallbacks für gepackte Builds, die Modul-Extraktion mit dem Factory-Muster sowie ein plattformübergreifendes PostgreSQL-Backend mit libpq."
project: "Onset"
tags: ["Unreal Engine", "Persistence", "SQLite", "PostgreSQL", "ServerTravel", "Module Architecture", "Steam Integration"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Sprint A5 hat bewiesen, dass das Spiel im Mehrspielermodus läuft. Doch wenn die Verbindung des Spielers unterbrochen wird, geht alles verloren – kein Spielstand, keine Charakterauswahl, kein Konto. Sprint A5b entwickelt die Persistenzschicht, die den Tod sinnvoll macht und den Spielfortschritt real werden lässt.

Fünfundzwanzig Commits in etwa 38 Stunden. Der Prozess beginnt mit dem Daten-Backbone (SQLite-Speicher, Datenstrukturen, Spielerdaten-Subsystem), fügt die Authentifizierungsschnittstelle und die SteamID-Extraktion hinzu, verbindet den gesamten RPC-Ablauf von der Anmeldung über die Charakterauswahl bis zum Betreten der Welt und verbringt dann einen ganzen Tag damit, die Kaskade von Packaging- und ServerTravel-Fehlern zu beheben, die auftauchen, wenn man versucht, das Ganze tatsächlich zu veröffentlichen. Er endet mit der Ausgliederung des OnsetDataStore-Moduls (Factory-Muster, Client/Server-Trennung) und dem PostgreSQL-Backend – denn eine Demo, die nur mit SQLite funktioniert, ist keine skalierbare Demo.

---

## Technische Darstellung

### Zunächst die Shop-Oberfläche

Die Schnittstelle `IPlayerDataStore` ist die Vorgabe, an die sich alles andere hält. Das Gameplay kommuniziert niemals direkt mit einer DB-Klasse; das Subsystem konfiguriert das Backend beim Start:

```cpp
struct IPlayerDataStore
{
    virtual ~IPlayerDataStore() = default;
    virtual bool Initialize(const FString& ConnectionString) = 0;
    virtual bool LoadAccount(const FString& Platform, const FString& PlatformID, FOnsetAccountData& OutAccount) = 0;
    virtual bool CreateAccount(const FString& Platform, const FString& PlatformID) = 0;
    virtual bool LoadCharacter(const FString& Platform, const FString& PlatformID, int32 SlotIndex, FOnsetFullCharacterData& OutData) = 0;
    virtual bool SaveCharacter(const FString& Platform, const FString& PlatformID, const FOnsetFullCharacterData& Data) = 0;
    virtual bool DeleteCharacter(const FString& Platform, const FString& PlatformID, int32 SlotIndex) = 0;
    virtual void SaveAll() = 0;
};
```

Drei Backends setzen dies um: SQLite (dev), PostgreSQL (selbst gehostet) und FHttpStore (Lambda + DynamoDB, in A5c hinzugefügt). Die Schnittstelle ist die Abstraktion, die alle drei austauschbar macht.

### Datenzugriff ausschließlich über den Server

`UOnsetPlayerDataSubsystem` gibt bei Clients für `ShouldCreateSubsystem()` den Wert `false` zurück. Kontodaten werden niemals repliziert – sie werden ausschließlich über zuverlässige RPCs übertragen. Dies ist eine serverbasierte Speicherung mit integrierter Anti-Cheat-Funktion – und das kostenlos.

### Der Fluss der Weltreisen

Die Charakterauswahl löst einen `ServerTravel` zur Spielkarte aus. Doch ServerTravel ist ein Minenfeld aus Problemen mit dem URL-Format, GameMode-Überschreibungen und Eigenheiten bei den Kartenpfaden. Der Arc dokumentiert jede einzelne Falle:

1. Der vollständige Pfad `/Game/DemoLevel.DemoLevel` enthält ein `.`, das die Engine bei `LongPackageNames` in ServerTravel ablehnt → Kurzname `DemoLevel`
2. Der `GameModeOverride` (Blueprint) der Karte umgeht die Lobby → explizite `?game=`-Überschreibung in der URL
3. `CharacterSelectWidgetClass` wurde in C++ nie festgelegt → RPC konnte das Widget daher nie instanziieren
4. `PlayerStateClass` wurde im GameMode nie festgelegt → `GetPlayerState<AOnsetPlayerState>()` gab nullptr zurück → `Client_AccountData` wurde nie gesendet

Jede Korrektur besteht aus einer einzigen Zeile Code, deren Fehlerbehebung ohne den systematischen Ansatz des Sprints Stunden gedauert hätte.

---

## Details zur Umsetzung

### 1. Der SQLite-Speicher mit versionierten Migrationen

```cpp
bool FSQLiteStore::EnsureSchema()
{
    Exec("CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));");
    int32 Version = GetSchemaVersion();
    const int32 LatestVersion = 3;
    while (Version < LatestVersion)
    {
        RunMigration(Version);
        Version = GetSchemaVersion();
    }
    return true;
}
```

Der Migrations-Runner durchläuft in einer Schleife von der aktuellen bis zur neuesten Migration und wendet jede Migration der Reihe nach an. Das bedeutet, dass bestehende Entwicklerkonten Schemaänderungen überstehen – die in Migration 3 hinzugefügten Spalten „Charakterklasse“ und „Aussehen“ beeinträchtigen die vorhandenen Daten nicht.

### 2. Nach der Anmeldung: Steam-ID-Ermittlung + Konto laden oder erstellen

```cpp
FString Platform = TEXT("Steam");
FString PlatformID = TEXT("");
FUniqueNetIdRepl UniqueId = PS->GetUniqueId();
if (UniqueId.IsValid()) PlatformID = UniqueId->ToString();

PS->PlayerPlatform = Platform;
PS->PlayerPlatformID = PlatformID;

FOnsetAccountData AccountData;
if (!DataSubsystem->LoadAccount(Platform, PlatformID, AccountData))
{
    if (DataSubsystem->CreateAccount(Platform, PlatformID))
        DataSubsystem->LoadAccount(Platform, PlatformID, AccountData);
}
PC->Client_AccountData(AccountData);
```

Die Plattform-ID wird aus der eindeutigen Netz-ID der Verbindung abgeleitet – auf dieser Ebene ist kein Aufruf des Steam-SDK erforderlich. Der `FSteamAuth`-Wrapper (der in einem parallelen Commit hinzugefügt wurde) ist bewusst *noch nicht integriert* – die Schnittstelle ist für zukünftige Plattformen vorgesehen.

### 3. Die RPC-Suite

Sechs RPCs bilden den gesamten Lebenszyklus eines Kontos:

| RPC | Richtung | Zweck |
|---|---|---|
| `Client_AccountData` | Server → Client | Konto + dessen Slots (leeres Array für neue Konten; Client füllt auf 3 auf) |
| `Client_CharacterData` | Server → Client | Vollständige Charakterdaten nach der Auswahl |
| `Client_SaveComplete` | Server → Client | Bestätigt, dass das Speichern erfolgreich war |
| `Server_SelectCharacter` | Client → Server | Lädt den Charakter, löst die Reise aus |
| `Server_CreateCharacter` | Client → Server | Erstellt einen neuen Charakter im Slot |
| `Server_SaveCharacter` | Client → Server | Löst manuelles Speichern aus |

### 4. Der Canvas-HUD-Fallback

UMG-Widgets werden in gepackten `-game`-Builds stillschweigend nicht gerendert. Die pragmatische Lösung von arc bestand in canvas-basierten `AHUD`-Fallbacks:

```cpp
// OnsetLobbyHUD.cpp — keys 1/2/3 select slot, Enter confirms
if (PC->WasInputKeyJustPressed(EKeys::One))   SelectedSlot = 0;
if (PC->WasInputKeyJustPressed(EKeys::Two))   SelectedSlot = 1;
if (PC->WasInputKeyJustPressed(EKeys::Three)) SelectedSlot = 2;
if (SelectedSlot >= 0 && PC->WasInputKeyJustPressed(EKeys::Enter))
    PC->Server_SelectCharacter(SelectedSlot);
```

Wenn man nun auf einen leeren Platz eine Zahl eingibt, wird `Server_CreateCharacter(i, "Hero_N")` aufgerufen – der Ablauf „Erstellen und Eingeben“, der der Demo den letzten Schliff verleiht.

### 5. Extraktion des OnsetDataStore-Moduls

Der gesamte Speicher-Code wird in ein neues Modul `Source/OnsetDataStore/` verschoben. Das Factory-Muster entkoppelt das Subsystem von konkreten Speichern:

```cpp
TUniquePtr<IPlayerDataStore> CreateDataStore(const FString& Type, const FString& ConnectionString, bool& bOutSuccess)
{
    bOutSuccess = false;
#ifndef ONSETDATASTORE_CLIENT_ONLY
    if (Type.Equals(TEXT("SQLite"), ESearchCase::IgnoreCase))
    {
        TUniquePtr<FSQLiteStore> Store = MakeUnique<FSQLiteStore>();
        bOutSuccess = Store->Initialize(ConnectionString);
        if (bOutSuccess) return Store;
    }
    // ... PgSQL, HttpApi branches
#endif
    return nullptr;
}
```

Bei Client-Builds wird `ONSETDATASTORE_CLIENT_ONLY` definiert, und es wird niemals eine Verknüpfung mit SQLiteCore oder libpq hergestellt – es werden keine Datenbank-DLLs oder Anmeldedaten an die Spieler übermittelt.

### 6. Das PostgreSQL-Backend

`FPgSQLStore` bindet libpq 17.10 (EDB) in `ThirdParty/PostgreSQL/` ein, implementiert alle 7 Schnittstellenmethoden mit PG-Parametern `$1` und `INSERT ... ON CONFLICT DO UPDATE`-Upserts und verwendet dasselbe Migrationssystem wie SQLite. Die Datei `Build.cs` ist plattformabhängig: Win64 → mitgelieferte DLLs, Linux → System-libpq (`/usr/include/postgresql`, `-lpq`).

---

## Ergebnisse und Validierung

- `IPlayerDataStore`-Schnittstelle mit SQLite-, PostgreSQL- und HTTP-Backends
- `UOnsetPlayerDataSubsystem` – nur für DS, über Konfiguration ausgewählter Speicher, servergesteuert
- Vollständige RPC-Suite: Konto laden, Charakter-CRUD, automatisches Speichern, Speichern bei Verbindungsabbruch
- `ServerTravel`-Ablauf für Weltreisen mit Zonen-Gates und `CurrentZone`
- Canvas-HUD-Fallback für gepackte Builds (stiller Fehler bei UMG)
- `OnsetDataStore`-Modul mit Factory-Muster + `ONSETDATASTORE_CLIENT_ONLY`
- `FPgSQLStore` mit libpq 17.10, plattformübergreifende `Build.cs`
- A5b = 30/30 (100 %)

---

## Herausforderungen und Lösungen

### Fehler beim Öffnen von SQLite führt zum Abbruch des Kochvorgangs

**Problem:** Ein über `UE_LOG(Error)` protokollierter Fehler bei `sqlite3_open` führt zum Abbruch des „cook“-Commandlets.

**Lösung:** Herabstufen auf `Warning`. Anschließend `IsRunningCommandlet()`-Prüfungen hinzufügen. Dann feststellen, dass `UnrealEditor-Cmd.exe` *tatsächlich* als Commandlet erkannt wird, sodass die Prüfungen die DS-Laufzeit blockieren. Die Prüfungen entfernen. Endzustand: Protokollierung auf Warnungsstufe ohne Commandlet-Prüfungen – „cook“ ist sicher, da DS in „cook“ niemals ausgeführt wird.

### `CharacterSelectWidgetClass` wurde nie initialisiert

**Problem:** `EditDefaultsOnly TSubclassOf` wurde in C++ nirgendwo festgelegt, sodass `Client_AccountData` das Widget niemals instanziieren konnte.

**Lösung:** Initialisierung im Konstruktor von „GameMode“ + Hinzufügen einer Laufzeitprüfung, um zu verhindern, dass BP CDO den Wert auf „None“ überschreibt.

### `ServerTravel` – Der Streit um das URL-Format

**Problem:** Die URL durchlief über fünf Commits hinweg vier Änderungen – veralteter Blueprint-Pfad → C++-Pfad → Kurzname → Korrektur der GameMode-Überschreibung. Jede Änderung umfasste zwar nur eine Zeile, doch ohne einen systematischen Ansatz hätte die gesamte Fehlersuche Stunden gedauert.

**Lösung:** Das endgültige URL-Format lautet `DemoLevel` (Kurzname) mit einer expliziten Überschreibung durch `?game=/Script/Onset.OnsetGameModeBase`. Der Kurzname verhindert, dass die URL aufgrund von `.` in `LongPackageNames` abgelehnt wird; das explizite `?game=` überschreibt die Blueprint-GameMode-Überschreibung der Karte.

### UMG wird in gepackten `-game`-Builds nicht gerendert

**Problem:** Unterklassen von `UUserWidget` werden in gepackten `-game`-Builds stillschweigend nicht gerendert. Die pragmatische Lösung von Arc bestand in canvas-basierten `AHUD`-Fallbacks.

**Lösung:** `AOnsetLobbyHUD` und `AOnsetMenuHUD` mit Canvas-Zeichnung im Sofortmodus + `WasInputKeyJustPressed`. Dies ist dokumentiert als „HUD über UMG für Menüs (VERALTET)“ – CommonUIs `UCommonActivatableWidget` (hinzugefügt in Beitrag 13) löst endlich das Problem der Darstellung von gepackten `-game`-UMG-Elementen.

### Abhängigkeitskette der libpq-DLL

**Problem:** `FPgSQLStore` hat 5 DLLs bereitgestellt, aber `libwinpthread-1.dll` (eine Abhängigkeit von `libintl-9`) fehlte.

**Lösung:** Die fehlende DLL wurde hinzugefügt und die Datei „Build.cs“ wurde plattformabhängig angepasst (Win64 im Lieferumfang enthalten vs. Linux-System-libpq).

---

## Reflexion und gewonnene Erkenntnisse

Die Schnittstelle `IPlayerDataStore` ist die beständigste Idee des Projekts. Durch die Abstraktion des Speicher-Backends hinter einer rein virtuellen Schnittstelle wird das gesamte Kontosystem von der Persistenz-Implementierung entkoppelt. Wenn A5c `FHttpStore` (Lambda + DynamoDB) hinzufügt, sind keinerlei Änderungen am Code von `GameMode` oder `PlayerController` erforderlich – lediglich ein neues Backend und ein Konfigurationsschlüssel. Die Schnittstelle macht das System zukunftssicher.

Die Fehlerbehebung bei der ServerTravel-URL ist das abschreckende Beispiel für den Arc. Jede einzelne Einzeiler-Korrektur war zum Zeitpunkt ihrer Erstellung korrekt, doch in der Summe führte dies zu einem URL-Format, dessen Stabilisierung fünf Commits erforderte. Aus diesem Grund enthielt der Sprintplan einen Checklistenpunkt „ServerTravel-Pfad“ – eine Sache, deren Überprüfung trivial ist, deren Übersehen jedoch katastrophale Folgen haben kann.

Der Fallback mit dem Canvas-HUD hat mir gezeigt, dass das im UMG-Paket enthaltene `-game`-Rendering eine plattformspezifische Eigenart ist, die sich nicht einfach mit guten Absichten umgehen lässt. Wenn die Toolchain stillschweigend versagt (Widgets werden kompiliert, sehen in PIE gut aus, werden im Paket aber nicht gerendert), ist die pragmatische Lösung ein völlig anderer Rendering-Pfad.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A5b – Persistenz & Account-System | ✅ **100 % (30/30)** |
| A5c – Authentifizierungsdaten-Extraktion & Anmeldeserver | ⏭️ Weiter |
| CommonUI-UI-Migration | Geplant |
| Charakterklassen + Feinschliff | Geplant |

**Was als Nächstes kommt:** Das Persistenz-Backbone ist solide, aber die Menüs sind immer noch auf Canvas gezeichnete HUDs. In Beitrag 13 werden diese entfernt und alles auf CommonUI umgestellt – einen Bildschirm-Stack mit Game-/Menu-/Modal-Ebenen, per Blueprint erstellten Bildschirmen und einem GameInstanceSubsystem, das die Navigation übernimmt. Anschließend fügt Post 14 die Cloud-Konto-API und die Token-Authentifizierung für zwei Server hinzu. Und Post 15 sorgt für den letzten Schliff: Charakterklassen, Ladebildschirme und eine verstärkte Zugriffskontrolle für die API.

> **Nächstes Mal in Beitrag 13:** Menüs, die sich tatsächlich stapeln lassen – Neugestaltung der Onset-Benutzeroberfläche auf Basis eines CommonUI-Bildschirmstapel-Subsystems.

---

*Arc-Commits: `c7e4327` → `2d583b2`. Zugehörige Dokumente: `Docs/Server/Persistence_Data_Store.md`, `Docs/Player/Account_System.md`, `Docs/Multiplayer/Multiplayer_System.md`, `Planning/Scripts/Episode40–43_*.md`.*


