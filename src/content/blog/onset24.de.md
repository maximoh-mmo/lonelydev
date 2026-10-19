---
id: "onset24"
title: "🎬 Entwickler-Tagebuch: Das MH-Framework – Modulare asynchrone Architektur und Multi-Backend-Persistenz"
seoTitle: "Das MH-Framework: Modulare asynchrone Architektur und Persistenz über mehrere Backends hinweg"
date: "2026-11-06"
category: "Game Dev"
summary: "Entkoppelt monolithische Engine-Systeme in die modularen MH-Framework-Plugins (MHCore, MHPersistence, MHBackend). Implementiert abbrechbare asynchrone Anforderungsmuster mit „Move-only“-Eigentumsregelung für Ergebnisse, austauschbaren Speicheranbietern (Speicher, SQLite, PostgreSQL, HTTP) und Live-Docker-Testumgebungen in UE 5.8."
project: "Onset"
tags: ["Unreal Engine", "Plugin Architecture", "Async Programming", "PostgreSQL", "SQLite", "REST API", "Software Engineering"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Im Laufe der Weiterentwicklung eines Multiplayer-Spiels sammelt sich in der Grundstruktur immer mehr architektonischer Schulden an. In den Anfängen von Onset wurden Datenbankoperationen, HTTP-Anfragen und die Verbindung zur Engine direkt in das primäre `Onset`-Spielmodul integriert. Wenn das Spiel einen Charakter speichern musste, führte `AOnsetPlayerController` direkte Aufrufe an SQLite- oder PostgreSQL-Speicher durch.

Dies führte zu einer engen Kopplung:
* Das Spielmodul konnte ohne Datenbankbibliotheken von Drittanbietern (`libpq`, SQLite) nicht kompiliert werden.
* Zur Ausführung von Integrationstests musste die gesamte Spiel-Engine gestartet und die Spielkarten geladen werden.
* Der Wechsel von einer lokalen SQLite-Datenbank zu PostgreSQL auf einem dedizierten Server oder zu einem Web-Mikroservice erforderte Änderungen am Spielcode.
* Für laufende asynchrone Abfragen gab es keinen sauberen Abbruchmechanismus, was zu Abstürzen führen konnte, wenn Spieler die Verbindung trennten, bevor ein Datenbanklesevorgang abgeschlossen war.

Zwischen dem 30. September und dem 2. Oktober habe ich eine umfassende architektonische Überarbeitung durchgeführt: Ich habe das **MH Framework** aufgebaut – eine Familie unabhängiger, modularer Unreal-Engine-Plugins, die auf eine klare Trennung der Verantwortungsbereiche, abbrechbare asynchrone Vorgänge und austauschbare Persistenz-Backends ausgelegt sind.

---

## Technische Darstellung

### Plugin-Taxonomie und Abhängigkeitsmanagement

Die Kernregel des MH-Frameworks ist der **strikte unidirektionale Abhängigkeitsfluss**:

```
+-------------------------------------------------------------+
|                        Onset Game                           |
+-------------------------------------------------------------+
          |                                       |
          v                                       v
+-----------------------+               +---------------------+
|      MHPersistence    |               |    MHOnlineCore     |
+-----------------------+               +---------------------+
     |        |        |                           |
     v        v        v                           v
 [SQLite] [Postgres] [HTTP]                [MHOnlineSteam]
     |        |        |                           |
     +--------+--------+                           |
              |                                    |
              +-----------------+------------------+
                                |
                                v
                    +-----------------------+
                    |        MHCore         |
                    | (Results, Cancel, IO) |
                    +-----------------------+
```

1. **`MHCore`:** Hat über den grundlegenden `Core` von Unreal hinaus keinerlei Abhängigkeiten. Es definiert „Move-only“-Ergebnisse (`FMHResult<T>`), abbrechbare asynchrone Verträge und Session-Token-Primitive.
2. **`MHPersistence`:** Definiert die abstrakte Schnittstelle `IMHPersistenceStore`, ohne zu wissen, wie Daten physisch gespeichert werden.
3. **Anbieter-Module:** `MHPersistencePostgres`, `MHPersistenceSqlite` und `MHPersistenceHttp` implementieren den Speichervertrag unabhängig voneinander. Der Gameplay-Code verweist niemals auf `libpq` oder SQL-Header, sondern ausschließlich auf `IMHPersistenceStore`.

### Das „Cancellable Async“-Muster und die Übertragung der Eigentumsrechte

In Multiplayer-Spielen dauern Datenbankabfragen mehrere zehn Millisekunden. In diesem Zeitfenster kann es vorkommen, dass ein Spieler die Verbindung verliert, sein Spielfigur zerstört wird oder das Level geladen wird. Das Aufrufen eines Callbacks für ein Objekt, das der Garbage Collection unterliegt, führt garantiert zu einem Absturz.

Um dieses Problem zu lösen, führt `MHCore` `FMHCancellationToken` und ein für Move-Operationen geeignetes `FMHResult<T>` ein:

```
[ Game Thread: Actor ] ---- Issue Request ----> [ Background Worker Thread ]
          |                                                |
     (Actor Dies)                                     (Query Done)
          |                                                |
    Cancel Token                                     Check Token
          |                                                |
          x <------------------ Discard Payload <----------+
```

Wenn ein Akteur einen asynchronen Speichervorgang initiiert, übergibt er ein `FMHCancellationToken`. Beginnt der Akteur mit der Löschung, storniert er das Token. Sobald der Hintergrund-Thread seine SQL-Abfrage abgeschlossen hat, prüft er `Token.IsCancelled()`. Im Falle einer Stornierung wird die Ergebnis-Nutzlast sicher verworfen, ohne dass jemals versucht wird, den Delegaten des nicht mehr existierenden Akteurs aufzurufen.

Darüber hinaus unterstützt `FMHResult<T>` die Move-Semantik von C++ (`TakePayload()`), wodurch große Binärblobs oder geparste JSON-Bäume ohne Kopieren auf den Heap an ihren Bestimmungsort verschoben werden können.

### Live-Tests mit PostgreSQL in der Unreal Engine

Das Testen von Datenbankcode mit Mocks eignet sich zwar für einfache Logik, lässt jedoch Syntaxfehler, die Erschöpfung des Verbindungspools und echte Datenbankbeschränkungen außer Acht.

Ich habe eine **Live-Docker-Testumgebung** eingerichtet:
* Ein lokaler Docker-Compose-Container führt PostgreSQL 16 auf einem isolierten Testport aus.
* Unreal-Automatisierungsspezifikationen (`MHPostgresTests.cpp`) stellen eine direkte Verbindung zum Container her, erstellen ein dynamisches Testschema, führen parallele CRUD-Abfragen aus und bauen das Schema wieder ab.
* Vor der Ausführung der Tests unter Windows überprüft ein `libpq`-Smoke-Test auf dem Host die Socket-Konnektivität und das Laden der Bibliothek.

---

## Details zur Umsetzung

### 1. Die generische Persistenzschnittstelle (`IMHPersistenceStore.h`)

Alle Speicher-Engines halten sich an einen asynchronen Schlüssel-Wert-Dokumentenvertrag:

```cpp
class MHPERSISTENCE_API IMHPersistenceStore
{
public:
    virtual ~IMHPersistenceStore() = default;

    virtual void InitializeAsync(
        const FMHStoreConfig& Config,
        FMHStoreInitDelegate OnComplete,
        FMHCancellationToken Token = FMHCancellationToken::None
    ) = 0;

    virtual void SaveRecordAsync(
        const FString& PartitionKey,
        const FString& DocumentKey,
        const FString& JsonPayload,
        FMHStoreOperationDelegate OnComplete,
        FMHCancellationToken Token = FMHCancellationToken::None
    ) = 0;

    virtual void LoadRecordAsync(
        const FString& PartitionKey,
        const FString& DocumentKey,
        FMHStoreLoadDelegate OnComplete,
        FMHCancellationToken Token = FMHCancellationToken::None
    ) = 0;
};
```

### 2. Semantik in `FMHResult<T>` verschieben (`MHCore/Public/MHResult.h`)

Der Ergebniscontainer gewährleistet eine sichere Extraktion unter Einhaltung des Prinzips der einzigen Eigentümerschaft:

```cpp
template <typename TPayload>
class FMHResult
{
public:
    static FMHResult Success(TPayload&& InPayload)
    {
        return FMHResult(true, MoveTemp(InPayload), TEXT(""));
    }

    static FMHResult Failure(const FString& InError)
    {
        return FMHResult(false, TPayload(), InError);
    }

    bool IsSuccess() const { return bSuccess; }
    const FString& GetError() const { return ErrorMessage; }

    // Move-only payload extraction prevents redundant cloning of large payloads
    TPayload TakePayload()
    {
        checkf(bSuccess, TEXT("Cannot take payload from a failed result!"));
        return MoveTemp(Payload);
    }

private:
    bool bSuccess;
    TPayload Payload;
    FString ErrorMessage;
};
```

### 3. Ausführung im Hintergrund in `FMHPostgresStore.cpp`

PostgreSQL-Abfragen werden an den TaskGraph von Unreal ausgelagert, um sicherzustellen, dass der Spiel-Thread niemals ins Stocken gerät:

```cpp
void FMHPostgresStore::SaveRecordAsync(
    const FString& PartitionKey,
    const FString& DocumentKey,
    const FString& JsonPayload,
    FMHStoreOperationDelegate OnComplete,
    FMHCancellationToken Token)
{
    // Capture state for background execution
    FFunctionGraphTask::CreateAndDispatchWhenReady(
        [this, PartitionKey, DocumentKey, JsonPayload, OnComplete, Token]()
        {
            if (Token.IsCancelled()) return;

            // Execute SQL upsert via libpq
            const char* Query = 
                "INSERT INTO mh_records (partition_key, document_key, data, updated_at) "
                "VALUES ($1, $2, $3, NOW()) "
                "ON CONFLICT (partition_key, document_key) DO UPDATE SET data = $3, updated_at = NOW();";

            const char* Values[3] = { TCHAR_TO_UTF8(*PartitionKey), TCHAR_TO_UTF8(*DocumentKey), TCHAR_TO_UTF8(*JsonPayload) };
            PGresult* Res = PQexecParams(Connection, Query, 3, nullptr, Values, nullptr, nullptr, 0);

            const bool bSuccess = (PQresultStatus(Res) == PGRES_COMMAND_OK);
            PQclear(Res);

            // Return to Game Thread for delegate invocation
            AsyncTask(ENamedThreads::GameThread, [OnComplete, Token, bSuccess]()
            {
                if (!Token.IsCancelled())
                {
                    OnComplete.ExecuteIfBound(bSuccess ? FMHResult<void>::Success() : FMHResult<void>::Failure(TEXT("Upsert Failed")));
                }
            });
        },
        TStatId(),
        nullptr,
        ENamedThreads::AnyBackgroundThreadNormalTask
    );
}
```

---

## Ergebnisse und Validierung

1. **Automation Test Suite Passing:**
   Ran `Automation RunTests MH.` inside the Unreal Editor console:
   ```
   [PASSED] MHCore.Result.LifecycleAndOwnership
   [PASSED] MHCore.Async.CancellationHandles
   [PASSED] MHPersistence.MemoryStore.BasicCRUD
   [PASSED] MHPersistence.SQLiteStore.SchemaMigrationAndReadWrite
   [PASSED] MHPersistence.PostgresStore.LiveDockerCRUD
   [PASSED] MHPersistence.HttpRecordStore.LoopbackMock
   ```
   All 14 tests completed with 0 errors.
2. **Dedicated Server Cook Verification:**
   Built a full cooked dedicated server (`UE 5.8.3 Dedicated Server`). The server compiled and linked cleanly with no missing symbol errors or runtime DLL search path failures.
3. **Loopback HTTP Record Persistence:**
   Created a standalone Python test server (`server.py`) and verified that `MHPersistenceHttp` handles authentication headers, chunked transfer encoding, and proper JSON payload persistence over HTTP/1.1.

---

## Herausforderungen und Lösungen

### Herausforderung 1: Nicht übereinstimmende Importbibliotheken für `libpq.lib` unter Windows

**Problem:** Der Kompilierungsvorgang von `MHPersistencePostgres` unter Windows schlug mit Fehlern aufgrund ungelöster externer Symbole (`__imp_PQexecParams`, `__imp_PQconnectdb`) fehl. Das Standard-Installationsprogramm von PostgreSQL für Windows enthält Binärdateien, die mit anderen MSVC-Laufzeitoptionen kompiliert wurden als die, die von Unreal Engine 5.8 verwendet werden.

**Lösung:** Es wurde ein Import-Bibliotheks-Stub kompiliert, der genau auf das vom Unreal Build Tool (UBT) verwendete MSVC-CRT-Profil ausgerichtet ist. Dieser wurde im Verzeichnis `ThirdParty/PostgreSQL/lib/Win64` des Plugins abgelegt, und die Datei `MHPersistencePostgres.Build.cs` wurde so konfiguriert, dass `libpq.dll` verzögert geladen wird.

### Herausforderung 2: Die Bedeutung der Reihenfolge der HTTP-Header bei Reverse-Proxys

**Problem:** Der HTTP-Persistenzspeicher funktionierte lokal, schlug jedoch fehl, wenn der Datenverkehr über bestimmte Reverse-Proxys geleitet wurde, da der „Authorization“-Header erst nach den benutzerdefinierten Datensatz-Headern angehängt wurde.

**Lösung:** Standardisierte Header-Erstellung in `FMHHttpRecordStore`, um zunächst Standard-Header (`Content-Type`, `Accept`, `Authorization`) einzufügen, bevor benutzerdefinierte Metadaten-Header hinzugefügt werden.

---

## Reflexion und gewonnene Erkenntnisse

Die Aufteilung der Infrastruktur in eigenständige Plugins ist eine der Investitionen mit dem größten Hebeleffekt, die man in eine langfristig angelegte Codebasis tätigen kann. In dem Moment, als `MHPersistence` nicht mehr wusste, was ein `AOnsetPlayerCharacter` war, wurde die gesamte Datenbankebene zehnmal besser testbar, wiederverwendbar und robuster.

Abbrechbare asynchrone Operationen sollten für jedes Spiel, das auf das Netzwerk zugreift, obligatorisch sein. Threading-Fehler sind am schwierigsten zu beheben; die Sicherheit an der API-Grenze zum Standard zu machen, zahlt sich jeden Tag aus.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| Quests, „Click-to-Move“ und „Autoplay“ – Feinschliff | ✅ Festgelegt (Beitrag 23) |
| **Die Architektur des MH-Frameworks** | ✅ **Eingebaut** |
| Steam-Packet-Authentifizierung und Absicherung des dedizierten Servers | ⏳ Als Nächstes (Beitrag 25) |

Nachdem die modulare Persistenz und die asynchrone Architektur nun solide stehen, ist die letzte Herausforderung die Sicherheit der Authentifizierung: die Integration der nativen AuthTickets von Steam, die Absicherung der Paketkommunikation auf dedizierten Servern, die Diagnose von Callback-Lebenszyklen und die Absicherung des Spiels gegen fehlerhafte Anmeldeversuche.

---

*Arc-Commits: `30445cc`, `a33aebb`, `144060b`, `53d9d49`. Zugehörige Dokumente: `Docs/Framework/Architecture.md`, `Docs/Framework/Persistence.md`, `Docs/Framework/PostgreSQL.md`.*
