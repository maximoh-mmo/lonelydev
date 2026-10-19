---
id: "onset19"
title: "🎬 Entwickler-Tagebuch: Der Fehler, der die Charakternamen verschlang – Eine Nachbetrachtung"
seoTitle: "Der Fehler, der die Charakternamen verschlang – Eine Nachbetrachtung"
date: "2026-10-19"
category: "Game Dev"
summary: "Nachanalyse eines Fehlers, der zu Datenverlusten führte: Die „INSERT OR REPLACE“-Semantik in SQLite und PostgreSQL löschte bei Teil-Speicherungen unbemerkt Charakternamen, Klassen und Stufen. Behebung durch Hinzufügen von „SaveCharacterPreservingIdentity“ in der Subsystemebene, wodurch vorhandene Identitätsfelder vor dem Speichern des Laufzeitzustands geladen werden; dabei wurden alle fünf Aufrufstellen für Teil-Speicherungen angepasst."
project: "Onset"
tags: ["Unreal Engine", "Persistence", "SQLite", "PostgreSQL", "Bug Postmortem", "Data Integrity", "Database Design"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Jedes Persistenzsystem hat einen Moment, in dem die Daten des Spielers verschwinden, und man muss herausfinden, wie das passiert. Bei mir passierte das zwischen zwei Anmeldesitzungen: Ich habe einen Charakter erstellt, gespielt, mich abgemeldet, wieder angemeldet – und auf dem Charakterauswahlbildschirm wurde ein *belegter* Platz mit einem leeren Namen und einem auf Null zurückgesetzten Level angezeigt. Der Charakter existierte noch. Er hatte lediglich seine Identität verloren. Sein Name, seine Klasse und sein Level waren still und leise verschwunden und durch Standardwerte ersetzt worden.

Dieser Beitrag ist eine Nachbetrachtung zu diesem Fehler. Es handelt sich nicht um einen glamourösen Beitrag zu neuen Funktionen – vielmehr ist es eine eingehende Betrachtung der Semantik von `INSERT OR REPLACE`, einer Speicherabstraktion, durch die sich eine ganze Klasse von Fehlern, die zu Datenverlusten führen, vor aller Augen verstecken konnte, sowie der kleinen Korrektur, die dafür sorgt, dass der Speicherpfad ehrlich angibt, was er weiß und was nicht.

---

## Technische Erläuterung

### Wie das Speichersystem eigentlich funktionieren sollte

Die Persistenzschicht (Beitrag 12, A5b) basiert auf einer `IPlayerDataStore`-Schnittstelle mit drei Implementierungen: SQLite, PostgreSQL und einem HTTP-Stub. Der Schreibpfad lautet `SaveCharacter(Platform, PlatformID, CharData)` – ein Aufruf, eine Struktur, „diesen Charakter speichern“. Das Schema besteht aus einer einzigen `characters`-Zeile pro Plattform+Slot:

| Spalte | Zweck |
|---|---|
| `character_name`, `level`, `experience` | Identität + Fortschritt |
| `character_class`, `appearance_json` | Klasse & Optik |
| `saved_max_health`, `saved_position_x/y/z`, `saved_rotation_yaw`, `current_zone` | Laufzeitzustand |
| `inventory_json`, `equipment_json`, `quests_json` | Spieler-Datenblobs |

Beim Erstellen eines Charakters hat `Server_CreateCharacter` ein vollständiges `FOnsetFullCharacterData` mit Name, Klasse, Stufe 1 und Aussehen erstellt und gespeichert. Die Zeile war vollständig.

### Die Falle: `INSERT OR REPLACE`

Der SQLite-Speicher führt „Upserts“ mit `INSERT OR REPLACE` durch:

```sql
INSERT OR REPLACE INTO characters
  (platform, platform_id, slot_index, character_name, level, experience,
   saved_max_health, saved_position_x, saved_position_y, saved_position_z, saved_rotation_yaw,
   inventory_json, equipment_json, quests_json, current_zone, character_class, appearance_json, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
```

Hier liegt die semantische Falle: **`INSERT OR REPLACE` löscht die vorhandene Zeile und fügt eine neue mit den von Ihnen angegebenen Spalten ein.** Jede Spalte, die Sie *nicht* angeben, wird auf ihren Standardwert zurückgesetzt – `character_name` → `''`, `level` → `1`, `experience` → `0`. Es handelt sich nicht um eine teilweise Aktualisierung, sondern um einen vollständigen Zeilenersatz, der nur einen freundlichen Namen trägt.

Der PostgreSQL-Speicher wies dasselbe Problem in anderer Form auf – sein „Upsert“-Befehl setzte jede Spalte auf den angegebenen Wert:

```sql
INSERT INTO characters (platform, platform_id, slot_index, character_name, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (platform, platform_id, slot_index) DO UPDATE SET
  character_name = EXCLUDED.character_name,
  level = EXCLUDED.level,
  ...
```

Der Effekt ist derselbe: Was auch immer der Aufrufer übergibt, wird übernommen, und ein leerer Name in der Struktur bedeutet einen leeren Namen in der Datenbank.

### Woher die leeren Strukturen stammen

`SaveCharacter` wurde an fünf Stellen aufgerufen, wobei es sich in den meisten Fällen um **Teil-Speicherungen** handelte – also nur den Laufzeitzustand. Dabei wurde ein neues `FOnsetFullCharacterData` erstellt, Position, Rotation, Zone und Gesundheit wurden eingetragen, während alle anderen Werte auf ihren Standardwerten belassen wurden:

```cpp
FOnsetFullCharacterData CharData;
CharData.SlotIndex = PS->SelectedCharacterSlot;
CharData.SavedPosition = PlayerChar->GetActorLocation();
CharData.SavedRotationYaw = PlayerChar->GetActorRotation().Yaw;
CharData.CurrentZone = GetWorld()->GetMapName();
CharData.SavedMaxHealth = ...;
CharData.InventoryJSON = TEXT("{}");
CharData.EquipmentJSON = TEXT("{}");
CharData.QuestsJSON = TEXT("{}");
```

Jeder dieser Befehle, der nach der Charaktererstellung ausgeführt wurde, hat den Namen gelöscht. Die Liste der Verursacher:

- `SaveCurrentCharacter` – wird von `EndPlay` und `PawnLeavingGame` (Verbindungsabbruch) aufgerufen
- `HandleLogout` im Authentifizierungs-Subsystem
- `TravelToZone` im Spielmodus (Zonenwechsel!)
- `OnAbandonedTimeout` im Spieler-KI-Controller (Entfernen im Autoplay-Modus)
- `Server_SaveCharacter` – das zusätzlich den Namen mit `PS->GetPlayerName()` überschrieb und `Level = 1` erzwang

Der Fehler bestand also nicht in einem einzelnen fehlerhaften Speichervorgang. Es handelte sich um eine **systemische Diskrepanz**: Die Store-API tat so, als sei ein teilweiser Speichervorgang ein vollständiger Speichervorgang, und die Store-Implementierungen löschten munter die Spalten, die die Aufrufer gar nicht erst gelesen hatten.

---

## Details zur Umsetzung

### 1. Die Lösung: Die Zusammenführung explizit vornehmen

Die Korrektur befindet sich in `UOnsetPlayerDataSubsystem` – der Ebene, die zwischen den aufrufenden Funktionen und dem Speicher liegt. Ich habe `SaveCharacterPreservingIdentity` hinzugefügt, das *zunächst* die vorhandene Zeile liest und die Identitätsfelder vor dem Speichern übernimmt:

```cpp
bool UOnsetPlayerDataSubsystem::SaveCharacterPreservingIdentity(
    const FString& Platform, const FString& PlatformID, FOnsetFullCharacterData& Data)
{
    FOnsetFullCharacterData Existing;
    if (LoadCharacter(Platform, PlatformID, Data.SlotIndex, Existing))
    {
        Data.CharacterName = Existing.CharacterName;
        Data.Level = Existing.Level;
        Data.Experience = Existing.Experience;
        Data.CharacterClass = Existing.CharacterClass;
        Data.AppearanceJSON = Existing.AppearanceJSON;
    }
    return SaveCharacter(Platform, PlatformID, Data);
}
```

Der Name ist entscheidend. `SaveCharacterPreservingIdentity` ist nicht einfach `SaveCharacter` mit zusätzlichen Schritten – es handelt sich um einen **anderen Vertrag**: „Speichere den Laufzeitzustand, den ich dir übergebe, aber überschreibe niemals die Identität, für die ich nicht verantwortlich bin.“ Die Identitätsspalten werden aus dem Speicher geladen, in die Daten zusammengeführt und erst dann geschrieben.

Der Aufruf von `LoadCharacter` verfügt über einen eleganten Fallback: Wenn noch keine Zeile vorhanden ist (erstes Speichern eines brandneuen Charakters), bleiben die Identitätsfelder so, wie sie vom Aufrufer festgelegt wurden – was korrekt ist, da der Aufrufer `Server_CreateCharacter` ist und sie bewusst festgelegt hat.

### 2. Umwandlung der Aufrufstellen

Bei allen fünf Stellen, an denen ein Teil-Save-Vorgang stattfand, wurde von `SaveCharacter(...)` auf `SaveCharacterPreservingIdentity(...)` umgestellt. Das Argument wurde von `const` auf nicht-const geändert, da die Methode die Struktur verändert – ein gutes Zeichen dafür, dass sie echte Arbeit leistet und nicht nur als Wrapper fungiert.

`Server_SaveCharacter` wurde zusätzlich korrigiert. Es war die einzige Stelle, die *versuchte*, die Identität zu schreiben, dies jedoch falsch tat – sie übernahm den Namen aus `PS->GetPlayerName()` (der häufig leer ist oder einen generischen Anmeldenamen enthält, nicht den Charakternamen) und setzte bei jedem Speichern zwangsweise `Level = 1`. Mit dem neuen Hilfsfunktion wurden diese Zeilen vollständig entfernt: Der tatsächliche Name und das Level des Charakters stammen aus dem Speicher, und der manuelle Speichervorgang meldet lediglich Position und Gesundheit. Der manuelle Speichervorgang kann nun nicht mehr im Widerspruch zur Identität des Charakters stehen, da er nicht mehr vorgibt, diese zu kennen.

### 3. Warum diese Lösung besser ist als ein Wechsel des Shops

Die verlockende Lösung wäre, die Speicherebene anzupassen – SQLite dazu zu bringen, ein partielles `UPDATE` durchzuführen, das nur Spalten betrifft, die nicht zum Standard gehören, oder die Schnittstelle so zu gestalten, dass sie eine Maske dafür akzeptiert, „welche Felder gültig sind“. Ich habe dies aus drei Gründen abgelehnt:

1. **Es betrifft drei Backends.** SQLite, Postgres und der HTTP-Stub müssten jeweils dieselbe Semantik für Teilaktualisierungen verwenden, was die Anfälligkeit für Fehler und Abweichungen verdreifachen würde.
2. **„Nicht standardmäßig“ ist mehrdeutig.** `Level = 1` ist ein gültiger Wert, der zufällig dem Standardwert entspricht. Eine Heuristik für Teilaktualisierungen kann nicht zwischen „der Aufrufer hat den Wert nicht gesetzt“ und „der Aufrufer hat tatsächlich Level 1 gespeichert“ unterscheiden.
3. **Der eigentliche Fehler lag bei den Aufrufern.** Sie verfügten über Daten, die sie hätten laden können, haben dies aber nicht getan. Die Korrektur der Ebene oberhalb des Speichers, wo das Laden bereits erfolgt ist, erfordert nur eine Funktion statt drei Backends.

Der „Merge-in-the-Subsystem“-Ansatz funktioniert bei jeder Store-Implementierung auf identische Weise, da die Daten zum Zeitpunkt ihres Eintreffens im Store bereits eine vollständige Zeile darstellen.

---

## Ergebnisse und Validierung

- **Erstellen → Abmelden → Anmelden:** Das Feld zeigt den eingegebenen Namen, das Level und die Klasse an
- **Das Reisen zwischen Zonen löscht die Identität nicht mehr** (`TravelToZone` war der heimtückischste Übeltäter – eine normale Spielaktion, nicht nur das Abmelden)
- **Manuelles Speichern behält den gespeicherten Namen/das Level bei**, anstatt die Daten aus `PlayerState` zu überschreiben
- **Autoplay-Despawn** (`OnAbandonedTimeout`) speichert den Endzustand, ohne die Identität zu verändern
- **Neue Charaktere funktionieren weiterhin:** Der erste Speichervorgang ohne vorhandene Zeile behält die vollständigen Daten des Aufrufers bei
- Der Editor-Build lässt sich sowohl im Onset- als auch im OnsetDataStore-Modul fehlerfrei kompilieren

Der nachgestellte Fall – derjenige, der diese Untersuchung ausgelöst hat – tritt nun auf: Man erstellt einen Charakter mit einem Namen, meldet sich ab, meldet sich wieder an, und der Name ist immer noch da.

---

## Herausforderungen und Lösungen

### Die Benutzeroberfläche des Shops hat hinsichtlich ihrer Semantik falsche Angaben gemacht

**Problem:** `SaveCharacter(const Data&)` lässt sich so interpretieren wie „diesen Charakter speichern“, sodass jeder Aufrufer davon ausging, es sei unbedenklich, eine unvollständige Struktur zu übergeben. Die Implementierungen ersetzten jedoch stillschweigend die gesamte Zeile.

**Lösung:** Der Schnittstellenvertrag verfügt nun über zwei explizite Varianten – das vollständige Speichern (`SaveCharacter`) und das Speichern unter Beibehaltung des Zustands (`SaveCharacterPreservingIdentity`). Aufrufer treffen ihre Wahl auf der Grundlage dessen, was sie tatsächlich wissen. Ein Methodenname, der seine Garantien dokumentiert, ist mehr wert als hundert Kommentare.

### Der Fehler war ohne einen vollständigen Anmeldezyklus nicht erkennbar

**Problem:** In einer einzelnen Sitzung *schien* alles in Ordnung zu sein. Der Name wurde bei der Erstellung festgelegt, das Speichern beim Abmelden „gelang“ (der Speicher gab „true“ zurück), und bis zum nächsten `LoadAccount` trat kein Fehler auf. Fehler, die erst über Prozessgrenzen hinweg auftreten, sind am schwersten zu finden, da kein einzelner Frame offensichtlich fehlerhaft ist.

**Lösung:** Der Test musste ein echter Hin- und Rücklauf in zwei Schritten sein: Erstellen → Verbindung trennen → erneut verbinden → auslesen. Das ist nun die Standard-Regressionsprüfung für diese Korrektur, und es handelt sich um die Art von Test, die für die Persistenzschicht automatisiert werden sollte – ein Hinweis, den ich weiterverfolge.

### `Server_SaveCharacter` hat die Situation noch verschlimmert

**Problem:** Die einzige Speicher-Site, die die Identität *tatsächlich* gespeichert hat, hat falsche Werte geschrieben – den Anmeldenamen von „PlayerState“ anstelle des Charakternamens und eine fest programmierte Stufe.

**Lösung:** Diese Zeilen löschen, statt sie zu korrigieren. Die manuelle Speicherung ist nicht für die Identität des Charakters verantwortlich; dafür ist der Speicher zuständig. Das Entfernen des falschen Codes war eindeutig besser, als zu versuchen, ihn zu korrigieren.

---

## Reflexion und gewonnene Erkenntnisse

Dieser Fehler war auf die bestmögliche Art peinlich. Er deckte einen Konstruktionsfehler auf, von dem ich geschworen hätte, dass ich ihn niemals begehen würde: **eine API, deren Name zu viel versprach und deren Implementierungen still und leise Daten zerstörten.** Diese ganze Fehlerklasse wurde durch eine Entscheidung in Beitrag 12 ermöglicht – einen einzigen Einstiegspunkt `SaveCharacter` – und blieb genau so lange verborgen, wie sich niemand aus- und wieder einloggte.

Diese Korrektur verändert meine Sichtweise auf Speicher-APIs. Eine Speicherfunktion sollte entweder:
1. eine **vollständige** Darstellung dessen erhalten, was sie schreibt, oder
2. explizit angeben, wofür sie *nicht* verantwortlich ist.

`SaveCharacterPreservingIdentity` ist Option 2, die im Namen deutlich zum Ausdruck kommt. Das gleiche Prinzip lässt sich über Datenbanken hinaus verallgemeinern – jede „Mengen“-Operation, die ein Teilobjekt als Argument nimmt, sollte angeben, was sie beibehält.

In der zweiten Lektion geht es um „Load-before-Save“. Die Lösung ist kinderleicht – Vorhandenes lesen, zusammenführen, schreiben – und dennoch war dies die richtige Entscheidung gegenüber einer partiellen Aktualisierung auf Datenbankebene. Befindet sich ein Fehler an der Grenze zwischen zwei Schichten, ist es fast immer weniger riskant, ihn in der Schicht zu beheben, die bereits über beide Zugriffsarten (Laden *und* Speichern) verfügt, als neue Semantiken durch den gesamten Stack zu ziehen.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A4.6 — Fähigkeiten der Phase 1 | ✅ Festgelegt (Beitrag 16) |
| A6.1 – HUD-Grundlagen + v2 | ✅ Festgeschrieben (Beiträge 17–18) |
| **Persistenz – identitätssichere Speicherung** | ✅ **Festgeschrieben** |

Dank der identitätserhaltenden Speicherung verhält sich die Persistenzschicht nun endlich so, wie es die Benutzeroberfläche stets vorausgesetzt hat. Der logische nächste Schritt ist das, worum sich das gesamte Projekt bisher gedreht hat: eine richtige Demo-Schleife – Wellen, Respawn und ein vollständiger Kampfablauf, der aus allen bisher entwickelten Systemen zusammengesetzt ist, sowie der datengesteuerte Fähigkeitseditor, der in `Docs/EditorToolPlan.md` beschrieben ist.

---

*Arc-Commit: `627e564`. Zugehörige Dokumente: `Docs/Server/Persistence_Data_Store.md`, `Docs/Player/Account_System.md`.*


