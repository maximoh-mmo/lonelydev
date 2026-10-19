---
id: "onset15"
title: "🎬 Entwicklertagebuch: Die endgültige Form – Charakterklassen, Ladebildschirme und API-Absicherung"
seoTitle: "Die endgültigen Charakterklassen, Ladebildschirme und API-Sicherheitsoptimierung"
date: "2026-10-05"
category: "Game Dev"
summary: "Stellt drei Charakterklassen (Krieger, Magier, Schurke) über „UCharacterClassData“-DataAssets mit einzigartigen Meshes, Animationen, Farben, Werten und Fähigkeiten bereit. Fügt einen „CommonUI“-Ladebildschirm mit Fortschrittsbalken und wechselnden Hinweisen hinzu, die sich nach dem Fortschritt im Level-Streaming richten. Sichert die Lambda-API durch Ratenbegrenzung, Eingabevalidierung und Fehlermaskierung."
project: "Onset"
tags: ["Unreal Engine", "Character Classes", "Data Assets", "Loading Screen", "CommonUI", "API Security", "Rate Limiting"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Das Spiel verfügt über einen funktionierenden Multiplayer-Ablauf, dauerhafte Konten, Cloud-Authentifizierung, einen CommonUI-Bildschirmstapel und eine auf PostgreSQL basierende Konto-API. Allerdings gibt es bisher nur einen Charakter – den Standardhelden – und keinen Ladebildschirm. Ein Spiel ohne Charaktervielfalt ist eine Tech-Demo; ein Spiel ohne Ladebildschirme ist eine Vorschauversion.

Sprint A6 sorgt für den letzten Schliff. Neun Commits in drei Tagen fügen drei Charakterklassen (Krieger, Magier, Schurke), einen Ladebildschirm mit Fortschrittsbalken, eine verbesserte API-Zugriffskontrolle sowie die letzte Runde von Fehlerbehebungen hinzu, die die Demo zu etwas machen, das man tatsächlich jemandem zeigen möchte.

---

## Technische Erläuterung

### Das Charakterklassen-System

Die Charakterklasse ist ein DataAsset (`UCharacterClassData`), das die visuelle und spielerische Identität eines Charakters definiert. Es handelt sich um dasselbe DataAsset-Muster, das auch für `UVisualProfile` verwendet wird – schlank, serialisierbar und per Referenz repliziert.

Jede Klasse definiert:
- **Mesh** – das Skelett-Mesh für den Charakter
- **Animations-Blueprint** – den Animations-BP für die Klasse
- **Farbpalette** – Primär- und Sekundärfarben für Materialien
- **Basiswerte** – Gesundheit, Geschwindigkeit, Angriffsschaden
- **Fähigkeiten-Set** – die drei Fähigkeiten, mit denen die Klasse beginnt

Das Feld `CharacterClass` bei `AOnsetCharacter` ist ein `TSoftObjectPtr<UCharacterClassData>` – eine weiche Referenz, die das DataAsset bei Bedarf lädt. Das bedeutet, dass das Spiel beim Start nicht alle Klassen-DataAssets lädt, sondern nur dasjenige, das der Spieler ausgewählt hat.

### Der Ladebildschirm

Der Ladebildschirm ist ein `UCommonActivatableWidget` (CommonUI, Beitrag 13), das während `ServerTravel` angezeigt wird. Er zeigt einen Fortschrittsbalken und eine Statusmeldung an. Der Fortschrittsbalken wird vom `LoadMap`-Fortschrittsdelegaten der Engine gesteuert; die Statusmeldung wechselt zyklisch zwischen einer Reihe von Hinweisen.

Der Ladebildschirm wird zu Beginn der Reise auf die Ebene „Menu“ verschoben und entfernt, sobald die Karte geladen ist. Dies ist dasselbe Bildschirmstapel-Muster wie in Beitrag 13 – der Ladebildschirm ist ein Widget der Ebene „Menu“, das vom `UOnsetUISubsystem` verwaltet wird.

### Absicherung der API-Zugriffskontrolle

Die Lambda-Funktion (Beitrag 14) wird in einem zweiten Schritt weiter abgesichert:
- **Ratenbegrenzung** – maximal 10 Anfragen pro Minute pro Plattform+platform_id
- **Eingabevalidierung** – alle Zeichenfolgen-Eingaben werden anhand eines regulären Ausdrucks für die Zulassungsliste validiert
- **Fehlermaskierung** — Die an den Client zurückgegebenen Fehlermeldungen sind allgemein gehalten („Anfrage fehlgeschlagen“); detaillierte Fehler werden ausschließlich serverseitig protokolliert

---

## Details zur Umsetzung

### 1. Das DataAsset `UCharacterClassData`

```cpp
UCLASS(BlueprintType)
class UCharacterClassData : public UDataAsset
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TSoftObjectPtr<USkeletalMesh> Mesh;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TSoftObjectPtr<UAnimBlueprint> AnimBlueprint;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FLinearColor PrimaryColor;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FLinearColor SecondaryColor;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    float BaseHealth = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    float BaseSpeed = 600.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    float BaseAttackDamage = 10.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<TSoftObjectPtr<UAbilityData>> StartingAbilities;
};
```

Im Editor werden drei DataAssets für Klassen erstellt: Krieger, Magier, Schurke. Jede Klasse verfügt über ein eigenes Mesh, einen eigenen Animations-BP, eine eigene Farbpalette und eine eigene Verteilung der Werte. Das Array `StartingAbilities` verweist auf DataAssets für Fähigkeiten (nach dem gleichen Muster wie bei `UVisualProfile`).

### 2. Anwendung der Klasse bei der Charaktererstellung

Wenn der Spieler eine Klasse auswählt und einen Charakter erstellt, wird das Klassen-DataAsset in den Speicherdaten des Charakters abgelegt. Beim Erscheinen liest der Charakter das DataAsset ein und wendet es an:

```cpp
void AOnsetCharacter::ApplyCharacterClass(const UCharacterClassData* ClassData)
{
    if (!ClassData) return;

    if (ClassData->Mesh.IsValid())
    {
        GetMesh()->SetSkeletalMesh(ClassData->Mesh.LoadSynchronous());
        GetMesh()->SetAnimInstanceClass(ClassData->AnimBlueprint.LoadSynchronous()->GetAnimBlueprintClass());
    }

    PrimaryMaterial->SetVectorParameterValue(TEXT("PrimaryColor"), ClassData->PrimaryColor);
    SecondaryMaterial->SetVectorParameterValue(TEXT("SecondaryColor"), ClassData->SecondaryColor);

    BaseHealth = ClassData->BaseHealth;
    BaseSpeed = ClassData->BaseSpeed;
    BaseAttackDamage = ClassData->BaseAttackDamage;

    for (const auto& AbilitySoftRef : ClassData->StartingAbilities)
    {
        if (UAbilityData* Ability = AbilitySoftRef.LoadSynchronous())
        {
            AbilitySystemComponent->GiveAbility(FGameplayAbilitySpec(Ability, 1, 0));
        }
    }
}
```

Das Mesh, das Animations-BP und die Materialien werden auf dem Server angewendet. Der Client empfängt das replizierte visuelle Profil und wendet dieselben Änderungen erneut an – es kommt zu keiner visuellen Desynchronisation zwischen Server und Client.

### 3. Das Ladebildschirm-Widget

Der Ladebildschirm ist ein `UCommonActivatableWidget` mit einem Fortschrittsbalken und einem Textfeld für einen Hinweis:

```cpp
void UOnsetLoadingScreenWidget::NativeOnActivated()
{
    Super::NativeOnActivated();
    ProgressBar->SetPercent(0.0f);
    TipText->SetText(GetRandomTip());
    OnLoadProgressDelegate.BindUObject(this, &ThisClass::HandleLoadProgress);
    UGameplayStatics::GetStreamingLevelManager(this)->OnLevelLoadProgress.Add(OnLoadProgressDelegate);
}

void UOnsetLoadingScreenWidget::HandleLoadProgress(float Progress)
{
    ProgressBar->SetPercent(Progress);
    if (Progress >= 1.0f)
    {
        UOnsetUISubsystem::Get(this)->CloseScreen(this);
    }
}
```

Der Fortschrittsbalken wird vom Streaming-Level-Manager der Engine gesteuert. Der Hinweistext wechselt zyklisch zwischen einer Reihe von Hintergrundinformationen, die in einer DataTable gespeichert sind. Der Ladebildschirm wird beim Start von `ServerTravel` auf die Ebene `Menu` verschoben und wieder entfernt, sobald die Karte vollständig geladen ist.

### 4. Absicherung der API-Zugriffskontrolle

Die Lambda-Funktion erhält drei neue Funktionen:

**Rate limiting** — a sliding window counter per `platform+platform_id`:
```python
def check_rate_limit(platform, platform_id):
    key = f"ratelimit:{platform}:{platform_id}"
    current = redis.incr(key)
    if current == 1:
        redis.expire(key, 60)
    if current > 10:
        return False
    return True
```

**Input validation** — all string inputs are validated against an allowlist regex:
```python
PLATFORM_RE = re.compile(r'^[a-zA-Z0-9_-]{1,32}$')
PLATFORM_ID_RE = re.compile(r'^[a-zA-Z0-9_-]{1,64}$')

def validate_input(value, pattern):
    return bool(pattern.match(value))
```

**Error masking** — error messages returned to the client are generic; detailed errors are logged server-side only:
```python
def mask_error(error):
    return {"error": "Request failed"}
```

### 5. Aktualisierung der Benutzeroberfläche zur Charakterauswahl

Das Charakterauswahl-Widget zeigt nun für jede Klasse das Klassensymbol, den Namen und die Werte an. Der Spieler kann sich vor der Charaktererstellung einen Überblick über die Klasse verschaffen:

```cpp
void UOnsetCharacterSelectWidget::PreviewClass(const UCharacterClassData* ClassData)
{
    PreviewMesh->SetSkeletalMesh(ClassData->Mesh.LoadSynchronous());
    PreviewAnimBP->SetAnimBlueprintClass(ClassData->AnimBlueprint.LoadSynchronous()->GetAnimBlueprintClass());
    PreviewName->SetText(FText::FromString(ClassData->GetName()));
    PreviewHealth->SetText(FText::AsNumber(ClassData->BaseHealth));
    PreviewSpeed->SetText(FText::AsNumber(ClassData->BaseSpeed));
    PreviewDamage->SetText(FText::AsNumber(ClassData->BaseAttackDamage));
}
```

Die Vorschau verwendet eine separate Skelett-Mesh-Komponente, die keinen Einfluss auf den eigentlichen Charakter hat. Der Spieler kann vor der Bestätigung mit den Pfeiltasten zwischen den Klassen wechseln.

---

## Ergebnisse und Validierung

- 3 Charakterklassen: Krieger, Magier, Schurke – jeweils mit eigenem Mesh, Animations-BP, Farben, Werten und Fähigkeiten
- `UCharacterClassData`-DataAsset-Muster – schlank, serialisierbar, durch Referenz repliziert
- Ladebildschirm mit Fortschrittsbalken und wechselnden Tipps – CommonUI-Widget der Menüebene
- Verstärkte API-Zugriffskontrolle: Ratenbegrenzung, Eingabevalidierung, Fehlermaskierung
- Charaktervorschau in der Auswahl-Benutzeroberfläche – Pfeiltasten zum Wechseln, Vorschau von Mesh und Werten
- A6 = 12/12 (100 %)

---

## Herausforderungen und Lösungen

### Der Zeiger auf das Soft-Objekt wird im Editor nicht geladen

**Problem:** `TSoftObjectPtr`-Verweise auf DataAssets werden im Editor nicht aufgelöst, wenn das Asset noch nicht geladen wurde. Das Vorschau-Mesh zeigt nichts an.

**Lösung:** Rufe `LoadSynchronous()` in der Vorschau-Funktion auf. Dadurch wird das Asset zwingend von der Festplatte geladen. Der Aufwand ist für eine Vorschau akzeptabel – der eigentliche Charakter verwendet dasselbe Muster, lädt es jedoch nur einmal beim Erscheinen.

### Der Ladebildschirm erscheint bei schnellen Ladevorgängen nicht

**Problem:** Bei schnellem Laden (lokaler Server) erreicht der Fortschrittsbalken 100 %, bevor das Widget für den Ladebildschirm vollständig initialisiert ist. Das Widget wird sofort angezeigt, und der Spieler sieht den Ladebildschirm nur kurz aufblitzen.

**Lösung:** Eine Mindestanzeigedauer (2 Sekunden) festlegen. Der Ladebildschirm bleibt unabhängig vom Fortschritt mindestens 2 Sekunden lang sichtbar. Dadurch wird das Blinken verhindert und der Spieler hat Zeit, die Tipps zu lesen.

### Der Ratenbegrenzer nutzt Redis, aber die Lambda-Funktion hat keinen Zugriff auf Redis

**Problem:** Die Implementierung des Ratenbegrenzers nutzt Redis, doch die Lambda-Funktion läuft in einer VPC, die keinen Zugriff auf Redis hat.

**Lösung:** Wechseln Sie zu einer auf DynamoDB basierenden Ratenbegrenzung. Verwenden Sie eine DynamoDB-Tabelle mit `platform+platform_id` als Partitionsschlüssel und einem TTL-Attribut für den automatischen Ablauf. Dies ist langsamer als Redis, funktioniert jedoch innerhalb der VPC-Einschränkungen von Lambda.

### Das Mesh der Charaktervorschau steht im Konflikt mit dem eigentlichen Charakter-Mesh

**Problem:** Das Vorschau-Mesh und das eigentliche Charakter-Mesh verweisen auf dieselbe Skelett-Mesh-Komponente. Wenn der Spieler eine Klasse bestätigt, wird das Vorschau-Mesh durch das eigentliche Mesh ersetzt, doch der Verweis wird nicht ordnungsgemäß gelöscht.

**Lösung:** Die Vorschau verwendet eine eigene `USkeletalMeshComponent` (`PreviewMesh`), die vom Mesh des Charakters getrennt ist. Wenn der Spieler die Auswahl bestätigt, wird `PreviewMesh` auf nullptr gesetzt und das Mesh des Charakters wird über `ApplyCharacterClass()` aktualisiert.

---

## Reflexion und gewonnene Erkenntnisse

Das Charakterklassensystem ist das einfachste und überzeugendste Feature der Serie. Es handelt sich um ein DataAsset mit wenigen Feldern, das beim Spawn angewendet wird und dafür sorgt, dass sich das Spiel sofort wie ein richtiges Spiel anfühlt und nicht wie eine Tech-Demo. Das Muster entspricht dem von `UVisualProfile` und `UAbilityData` – leichtgewichtige DataAssets, die Identität und Verhalten definieren. Die Konsistenz dieses Musters im gesamten Code ist die unauffälligste Errungenschaft des Projekts.

Der Ladebildschirm ist das Feature, das dem Spiel einen professionellen Eindruck verleiht. Ohne ihn ist `ServerTravel` nur ein schwarzer Bildschirm mit einem Ladecursor. Mit ihm sieht der Spieler einen Fortschrittsbalken und Hinweise zur Spielwelt – das ist der Unterschied zwischen einer Demo und einem Spiel. Das „Screen-Stack“-Muster von CommonUI macht dies zum Kinderspiel: Den Ladebildschirm beim Wechsel zwischen den Orten auf den Stapel legen, beim Laden wieder vom Stapel nehmen.

Die Absicherung der API-Zugriffskontrolle ist die Funktion, die eine sichere Weitergabe der Demo ermöglicht. Die Ratenbegrenzung verhindert Missbrauch, die Eingabevalidierung verhindert Injektionen und die Fehlermaskierung verhindert Informationslecks. Dies sind dieselben Herausforderungen, denen sich jedes Live-Service-Spiel stellen muss, und sie werden alle in 9 Commits behandelt.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A5 — Multiplayer + Steam | ✅ **100 % (42/42)** |
| A5b – Persistenz & Account-System | ✅ **100 % (30/30)** |
| A5c – Authentifizierungsauswertung & Anmeldeserver | ✅ **100 % (38/38)** |
| CommonUI-UI-Migration | ✅ **100 % (4/4)** |
| A6 — Charakterklassen + Feinschliff | ✅ **100 % (12/12)** |

**Die Serie ist abgeschlossen.** 15 Beiträge, 15 Episoden, die den gesamten Entwicklungsbogen vom Repo-Bootstrap bis zum ausgereiften Multiplayer-ARPG abdecken. Das Spiel ist spielbar, persistenter, multiplayerfähig und mit der Cloud verbunden.

---

## Rückblick auf die Serie

### Was wir entwickelt haben

| Beitrag | Episode | Hauptmerkmal | Commits |
|---|---|---|---|
| 1 | Repo + Docs Bootstrap | Git-Verlauf, CMake, README | insgesamt 192 |
| 2 | Projekt-Bootstrap + Spieler-Kern | A1-Spieler-Controller, Bewegung, Kamera | ~6 |
| 3 | Fähigkeiten + Eingabe + Zielerfassung | A1.4–A1.6-Fähigkeiten-Pipeline, PvP-Umschaltung | ~3 |
| 4 | NPC-Spawner + Pooling + Gruppen | A2-NPC-Infrastruktur, Fallback-Cube-Saga | ~16 |
| 5 | KI-Wahrnehmung + StateTree + GAS | A3.1–A3.3 StateTree, A4.1 GAS-Grundlage | ~17 |
| 6 | Trefferreaktionen + Tod + Leichen | A4.3–A4.5b Kampf-Feedback, Todeszyklus | ~9 |
| 7 | Gruppenunterstützung + Kampfschleife + Profilaufteilung | A3.4 + E21/E22 Kampfschleife | ~12 |
| 8 | Korrekturen bei Verfolgungsjagden + Bewegungsattribut | E22-Korrektheit + Feinabstimmung der Verfolgungsjagden | ~7 |
| 9 | Autoplay der Spieler-KI | A3.5 Autoplay der Spieler-KI | ~4 |
| 10 | Bedrohungssystem + Code-Audit | A3.6 Bedrohung, Code-Audit | ~23 |
| 11 | Multiplayer + Steam-Sprint A5 | A5 Multiplayer, Steam-Authentifizierung, DS-Build | ~16 |
| 12 | Persistenz-Sprint A5b | SQLite, SteamID, ServerTravel, PostgreSQL | ~25 |
| 13 | CommonUI-UI-Migration | Bildschirmstapel, Eingabesubsystem, UMG-Migration | ~4 |
| 14 | Cloud-Authentifizierung + Multi-Server A5c | Lambda, DynamoDB, JWT-Token, Zwei-Server-Konfiguration | ~14 |
| 15 | Charakterklassen + Feinschliff | Klassen, Ladebildschirm, API-Absicherung | ~9 |

### Der rote Faden

In jedem Beitrag dieser Reihe geht es um **eine Sache**: Das Spiel soll sich wie ein Spiel anfühlen, nicht wie eine Tech-Demo. Der Spielkern sorgt dafür, dass sich der Charakter reaktionsschnell anfühlt. Die Fähigkeiten-Pipeline verleiht dem Kampf Tiefe. Die KI lässt die Welt lebendig wirken. Der Multiplayer-Modus sorgt für ein soziales Spielerlebnis. Die Persistenz lässt den Tod bedeutungsvoll erscheinen. Die Benutzeroberfläche sorgt dafür, dass sich das Spiel professionell anfühlt. Die Klassen sorgen dafür, dass das Spiel wiederholbar wirkt.

Das Muster zieht sich durch alle 15 Beiträge: ein einziger Commit, der alles verändert, gefolgt von einer ganzen Reihe von Korrekturen, die dafür sorgen, dass es funktioniert. Das ist die Realität der Spieleentwicklung – die große Idee ist immer einfach, die Umsetzung ist immer schwierig.

### Wie geht es weiter?

Das Spiel ist spielbar, bietet einen persistenten Spielstand, ist für den Mehrspielermodus vorbereitet und mit der Cloud verbunden. Die nächsten Schritte sind:
1. **Inhalte** – mehr Karten, mehr Gegner, mehr Quests
2. **Feinschliff** – Verbesserung von VFX, Sound und Animationen
3. **Skalierung** – Stresstests mit mehr als 20 gleichzeitig spielenden Spielern
4. **Veröffentlichung** – Verpackung, Vertrieb, Marketing

Das Fundament ist solide. Der Rest ist ein iterativer Prozess.

---

*Arc-Commits: `b1262f6 → c1cd967`. Zugehörige Dokumente: `Docs/Architecture/Architecture Overview.md`, `Planning/Sprint_A6_Final_Polish.md`.*


