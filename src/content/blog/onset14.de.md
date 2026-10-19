---
id: "onset14"
title: "🎬 Entwickler-Tagebuch: The Cloud Spine – Extraktion von Authentifizierungsdaten, Lambda-Konten und der Token-Ablauf über zwei Server"
seoTitle: "Die Lambda-Konten für die Authentifizierungsdaten-Extraktion bei Cloud Spine und der Token-Ablauf bei zwei Servern"
date: "2026-10-02"
category: "Game Dev"
summary: "Löst die Steam-Authentifizierung in einen eigenständigen Anmeldeserver aus, fügt eine auf PostgreSQL basierende Konto-API über Lambda + DynamoDB hinzu und implementiert eine Zwei-Server-Token-Architektur. Der Anmeldeserver (Port 7777) validiert Steam-Tickets und stellt HMAC-SHA256-signierte JWT-Token aus; der Spielserver (Port 7778) validiert die Token und lädt Kontodaten. Ergänzt die IPlayerDataStore-Schnittstelle um ein HTTP-Backend."
project: "Onset"
tags: ["Unreal Engine", "Cloud Architecture", "Lambda", "DynamoDB", "PostgreSQL", "JWT", "Two-Server Architecture", "Steam Integration"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Beitrag 11 hat gezeigt, dass das Spiel im Mehrspielermodus mit Steam-Tickets laufen kann. Beitrag 12 hat gezeigt, dass es Accounts dauerhaft speichern kann. Beitrag 13 hat gezeigt, dass es Menüs in gepackten Builds darstellen kann. Aber es gibt noch eine Lücke: Die Authentifizierungslogik ist nach wie vor fest in den Spielserver integriert, und der Spielserver ist immer noch der einzige Server. Was wäre, wenn wir die Authentifizierung vollständig vom Gameplay trennen würden?

Sprint A5c tut genau das. Es lagert den Steam-Authentifizierungsablauf in einen eigenständigen Anmeldeserver aus, fügt eine auf PostgreSQL basierende Konto-API (Lambda + DynamoDB) hinzu und implementiert die Zwei-Server-Token-Architektur, die das Spiel für den Produktivbetrieb bereit macht. Vierzehn Commits, zwei Tage und eine Serverinfrastruktur, die jedem Live-Service-Team vertraut wäre.

---

## Technische Darstellung

### Warum die Authentifizierung extrahieren?

Der Steam-Authentifizierungsablauf in Beitrag 11 war serverseitig – der Spielserver validierte Tickets, stellte Tokens aus und verwaltete Sitzungen. Das funktioniert zwar für eine Demo, bindet die Authentifizierung jedoch in einer Weise an den Spielserver, die nicht skalierbar ist. Ein Spiel in der Produktion benötigt eine unabhängige Authentifizierung: Der Anmeldeserver verarbeitet Tickets und vergibt Tokens; der Spielserver validiert die Tokens und lädt die Kontodaten. Wenn der Spielserver ausfällt, bleiben die Spieler weiterhin angemeldet. Wenn der Anmeldeserver ausfällt, können die Spieler weiterhin offline spielen.

### Die Lambda- und DynamoDB-Konto-API

Die Konto-API ist eine serverlose Funktion (Lambda), die auf DynamoDB basiert. Sie übernimmt die Kontoerstellung, die Anmeldung und den Abruf von Charakterdaten. Die Lambda-Funktion wird über HTTP vom Anmeldeserver aufgerufen, der die Ergebnisse in PostgreSQL zwischenspeichert, damit der Spielserver darauf zugreifen kann.

Lambda nutzt `FHttpStore` (das HTTP-Backend aus der Schnittstelle `IPlayerDataStore` aus Beitrag 12), um mit DynamoDB zu kommunizieren. Dieselbe Schnittstelle, die SQLite und PostgreSQL unterstützt, unterstützt nun auch HTTP – die Abstraktion funktioniert.

### Der Token-Ablauf mit zwei Servern

Das Token ist der Dreh- und Angelpunkt. Es enthält den `SlotIndex`, damit der Spielserver weiß, welcher Charakter generiert werden soll. Der Ablauf ist wie folgt:

1. Der Client authentifiziert sich bei Steam → erhält ein Ticket
2. Der Client sendet das Ticket an den Anmeldeserver → der Anmeldeserver überprüft die Gültigkeit bei Steam → stellt ein signiertes Token aus
3. Der Client sendet das Token an den Spielserver → der Spielserver überprüft die Signatur des Tokens → lädt die Kontodaten aus PostgreSQL → erstellt den richtigen Charakter

Das Token wird mit HMAC-SHA256 unter Verwendung eines geheimen Schlüssels signiert, der zwischen dem Anmeldeserver und dem Spielserver geteilt wird. Es handelt sich dabei um dieselbe HMAC-Implementierung wie in Beitrag 11 unter `FSHA256` – dem benutzerdefinierten, rein softwarebasierten SHA-256, der auf allen Plattformen funktioniert.

---

## Details zur Umsetzung

### 1. Der Anmeldeserver

Der Anmeldeserver ist ein eigenständiger Prozess, der die Steam-Authentifizierung und die Token-Ausstellung übernimmt. Er basiert auf derselben Architektur wie der Spielserver (UE-Programm mit dem Flag `-server`), verfügt jedoch über einen anderen GameMode und eine andere Karte:

```cpp
// OnsetLoginServer.Target.cs
using CSharpForUE.BuildSystem;
BuildTarget LoginServer = new BuildTarget("OnsetLoginServer", TargetType.Server);
```

Der Anmeldeserver läuft auf Port 7777 (Direktmodus für die Lobby), überprüft Steam-Tickets und vergibt Tokens. Der Spielserver läuft auf Port 7778 (Token-Modus), überprüft Tokens und lädt Kontodaten.

### 2. Die PostgreSQL-Benutzertabelle

```sql
CREATE TABLE accounts (
    platform TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (platform, platform_id)
);

CREATE TABLE characters (
    id SERIAL PRIMARY KEY,
    account_platform TEXT NOT NULL REFERENCES accounts(platform),
    account_platform_id TEXT NOT NULL REFERENCES accounts(platform_id),
    slot_index INTEGER NOT NULL,
    class_name TEXT NOT NULL DEFAULT 'Hero_N',
    display_name TEXT NOT NULL DEFAULT 'Hero',
    appearance JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (account_platform, account_platform_id, slot_index)
);
```

Das Schema entspricht dem SQLite-Schema aus Beitrag 12, verwendet jedoch den JSONB-Typ von PostgreSQL für Aussehensdaten und fortlaufende IDs für Charaktere. Die `UNIQUE`-Einschränkung für `(account_platform, account_platform_id, slot_index)` verhindert doppelte Einträge.

### 3. Die Lambda-Funktion

Die Lambda-Funktion ist ein Python-Skript, das Kontovorgänge abwickelt. Sie wird über HTTP vom Anmeldeserver aufgerufen:

```python
def lambda_handler(event, context):
    operation = event.get('operation')
    if operation == 'login':
        return handle_login(event)
    elif operation == 'create_account':
        return handle_create_account(event)
    elif operation == 'get_character':
        return handle_get_character(event)
    elif operation == 'save_character':
        return handle_save_character(event)
```

Lambda stellt über das AWS SDK eine Verbindung zu DynamoDB her, führt die angeforderte Operation aus und gibt das Ergebnis als JSON zurück. Der Anmeldeserver speichert die Lambda-Antworten in PostgreSQL im Cache, damit der Spielserver darauf zugreifen kann.

### 4. Das Token-Format

Das Token ist ein JSON Web Token (JWT), das mit HMAC-SHA256 signiert ist:

```cpp
FString Token = FString::Printf(TEXT("{\"platform\":\"%s\",\"platform_id\":\"%s\",\"slot_index\":%d,\"exp\":%lld}"),
    *Platform, *PlatformID, SlotIndex, ExpiryTimestamp);
FString Signature = ComputeHMACSHA256(Token, SecretKey);
return Token + TEXT(".") + Signature;
```

Der Spielserver überprüft die Gültigkeit des Tokens, indem er den HMAC neu berechnet und die Signaturen vergleicht. Stimmt die Signatur überein und ist das Token noch nicht abgelaufen, ist das Token gültig.

### 5. Die Zwei-Server-Architektur

Die Architektur sorgt für eine klare Trennung der Komponenten:

| Server | Port | Modus | Zweck |
|---|---|---|---|
| Anmeldeserver | 7777 | Direkt | Steam-Authentifizierung, Token-Ausstellung |
| Spielserver | 7778 | Token | Spielablauf, Token-Validierung, Laden des Kontos |

Der Anmeldeserver ist eine schlanke, austauschbare Schnittstelle. Er überprüft Tickets und vergibt Tokens. Der Spielserver ist plattformunabhängig – er überprüft Tokens und lädt Kontodaten. Durch diese Trennung kann der Anmeldeserver unabhängig vom Spielserver ausgetauscht oder skaliert werden.

### 6. Absicherung der API-Zugriffskontrolle

Die Lambda-Funktion enthält Prüfungen zur Zugriffskontrolle:

```python
def handle_login(event):
    platform = event.get('platform')
    platform_id = event.get('platform_id')
    if not platform or not platform_id:
        return {'statusCode': 400, 'body': 'Missing platform or platform_id'}
    if platform not in ALLOWED_PLATFORMS:
        return {'statusCode': 403, 'body': 'Platform not supported'}
    # ... proceed with login
```

Die Liste `ALLOWED_PLATFORMS` schränkt ein, welche Plattformen sich authentifizieren dürfen. Dadurch wird verhindert, dass nicht autorisierte Plattformen Konten erstellen oder auf Charakterdaten zugreifen.

---

## Ergebnisse und Validierung

- Vom Spielserver ausgegliederter Anmeldeserver (eigenständiger Prozess, Port 7777)
- Der Spielserver läuft auf Port 7778 im Token-Modus
- PostgreSQL-Kontotabelle mit Charakteren, Aussehen als JSONB und UNIQUE-Einschränkungen
- Lambda + DynamoDB-Konto-API mit 4 Operationen (login, create_account, get_character, save_character)
- JWT-Token-Format mit HMAC-SHA256-Signatur
- Zwei-Server-Token-Ablauf: Steam → Anmeldeserver → Token → Spielserver → PostgreSQL
- Absicherung der API-Zugriffskontrolle in Lambda (Plattform-Allowlist, Eingabevalidierung)
- `FHttpStore`-Backend für Lambda + DynamoDB (implementiert die Schnittstelle `IPlayerDataStore`)
- A5c = 38/38 (100 %)

---

## Herausforderungen und Lösungen

### Der Anmeldeserver benötigt einen eigenen Zieltyp

**Problem:** Die Engine unterstützt in Produktionsversionen keinen Server-Zieltyp. Der Anmeldeserver kann nicht denselben Zieltyp wie der Spielserver verwenden.

**Lösung:** Der Login-Server verwendet denselben Spiel-Zieltyp mit dem Flag `-server`, genau wie der DS des Spielservers. Der Unterschied liegt im Spielmodus, in der Karte und im Port.

### Eventuelle Konsistenz bei DynamoDB

**Problem:** Die Standard-Lese-Konsistenz von DynamoDB ist „eventual“ – eine gespeicherte Änderung ist bei einem nachfolgenden Lesevorgang möglicherweise nicht sofort sichtbar.

**Lösung:** Die Lambda-Funktion verwendet für alle Lesevorgänge `ConsistentRead=true`. Dadurch wird sichergestellt, dass eine Speicherung beim nächsten Lesevorgang sofort sichtbar ist, was jedoch auf Kosten einer höheren Lesekapazität geht.

### Die Verwaltung des HMAC-Geheimschlüssels

**Problem:** Der geheime HMAC-Schlüssel muss zwischen dem Anmeldeserver und dem Spielserver ausgetauscht werden, doch eine feste Einbindung in den Quellcode stellt ein Sicherheitsrisiko dar.

**Lösung:** Der geheime Schlüssel wird zur Laufzeit aus einer Umgebungsvariablen ausgelesen. Sowohl der Anmeldeserver als auch der Spielserver lesen `AUTH_SECRET_KEY` aus der Umgebung aus. In der Produktion wird dieser Wert über die Deployment-Pipeline gesetzt; in der Entwicklung handelt es sich um einen fest codierten Fallback mit einer Warnmeldung im Protokoll.

### Die Latenz bei einem Kaltstart von Lambda

**Problem:** Lambda-Kaltstarts verursachen eine zusätzliche Latenz von 1–3 Sekunden bei Authentifizierungsvorgängen.

**Lösung:** Der Anmeldeserver speichert Lambda-Antworten in PostgreSQL zwischen. Die erste Anfrage wird an Lambda weitergeleitet (langsam), nachfolgende Anfragen werden jedoch aus dem Cache abgerufen (schnell). Bei Änderungen der Kontodaten wird der Cache geleert.

### Die in Lambda fest codierte Liste `ALLOWED_PLATFORMS`

**Problem:** Das Hinzufügen einer neuen Plattform erfordert eine Änderung des Lambda-Codes und eine erneute Bereitstellung.

**Lösung:** Die Plattformliste wird in DynamoDB als Konfigurationstabelle gespeichert. Die Lambda-Funktion liest diese zur Laufzeit ein. Das Hinzufügen einer neuen Plattform bedeutet, dass eine Zeile zur Konfigurationstabelle hinzugefügt wird – eine Codeänderung ist nicht erforderlich.

---

## Reflexion und gewonnene Erkenntnisse

Die Zwei-Server-Architektur ist die wichtigste strukturelle Entscheidung des Arc. Sie trennt die Authentifizierung vom Gameplay auf eine Weise, die für den Spieler unsichtbar ist, für die Technik jedoch bahnbrechend ist. Der Login-Server ist eine schlanke, austauschbare „Eingangstür“; der Spielserver ist plattformunabhängig. Diese Trennung bedeutet, dass das Spiel auf mehrere Spielserver hinter einem einzigen Login-Server skaliert werden kann – die Architektur eines Live-Service-Spiels, umgesetzt im Demo-Maßstab.

Die Schnittstelle `IPlayerDataStore` beweist erneut ihren Wert. Das Lambda- und DynamoDB-Backend (`FHttpStore`) wurde ohne jegliche Änderungen am GameMode oder PlayerController hinzugefügt – lediglich eine neue Backend-Klasse und ein Konfigurationsschlüssel. Die Abstraktion funktioniert genau wie vorgesehen.

Das JWT-Token-Format ist einfach, aber effektiv. Die HMAC-SHA256-Signatur mit einem gemeinsamen Geheimschlüssel ist das für eine Demo erforderliche Mindestformat für ein Token. Es handelt sich weder um JWE (verschlüsselte Token) noch um JWS (asymmetrische Signatur) – sondern um symmetrisches HMAC, das schnell, einfach und für eine Demo sicher genug ist. Die benutzerdefinierte `FSHA256`-Implementierung aus Beitrag 11 übernimmt die HMAC-Berechnung auf beiden Servern.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A5 — Multiplayer + Steam | ✅ **100 % (42/42)** |
| A5b – Persistenz & Kontosystem | ✅ **100 % (30/30)** |
| A5c – Authentifizierungsauswertung & Anmeldeserver | ✅ **100 % (38/38)** |
| CommonUI-UI-Migration | ✅ **100 % (4/4)** |
| Charakterklassen + Feinschliff | ⏭️ Weiter |

**Was kommt als Nächstes:** Das Cloud-Backbone ist fertiggestellt, aber das Spiel benötigt noch seine Charakterklassen und den letzten Feinschliff. Beitrag 15 enthält den letzten großen Funktionsblock: Charakterklassen (Krieger, Magier, Schurke), Ladebildschirme und die Absicherung der API-Zugriffskontrolle. Anschließend wird die Serie mit einem Rückblick und einer Roadmap abgeschlossen.

> **Nächstes Mal in Beitrag 15:** Die endgültige Form – Charakterklassen, Ladebildschirme und der Feinschliff, der aus einer Demo ein Spiel macht.

---

*Arc-Commits: `7ce133a → 717bb90`. Zugehörige Dokumente: `Docs/Server/Auth_System.md`, `Docs/Server/Account_API.md`, `Docs/Architecture/Architecture Overview.md`, `Planning/Sprint_A5c_Auth_Extraction.md`.*


