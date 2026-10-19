---
id: "onset21"
title: "🎬 Entwickler-Tagebuch: Lokale Cloud-Infrastruktur, Heilung und die Kampfformel-Engine"
seoTitle: "Wiederherstellung der lokalen Cloud-Infrastruktur und die „Combat Formula Engine“"
date: "2026-10-26"
category: "Game Dev"
summary: "Beseitigt die Latenz bei Remote-Cloud-Verbindungen, indem DynamoDB Local in Docker Compose integriert wird, um lokale Inner-Loop-Tests durchzuführen. Erweitert den Kampf um Zielauswahl für Verbündete und Heilung, periodische DoT-/HoT-Ticks, Crowd Control mit abnehmenden Erträgen sowie die vollständige Umsetzung einer 7-phasigen ARPG-Kampfformel."
project: "Onset"
tags: ["Unreal Engine", "DynamoDB", "Docker", "Combat Math", "Healing", "Gameplay Ability System", "Backend Architecture"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Als sich „Onset“ von einem Prototyp zu einem vollwertigen ARPG entwickelte, bremsten zwei ganz unterschiedliche Engpässe die Entwicklung genau zur gleichen Zeit stark aus.

Zunächst gab es das, was ich als **„Cloud-Dev-Steuer“** bezeichne. In Beitrag 14 hatte ich das Cloud-Kontosystem (`AccountApi`) auf Basis von AWS DynamoDB aufgebaut. In der Staging-Umgebung funktionierte es hervorragend, aber die tägliche lokale Entwicklung war mühsam. Jeder Integrationstest führte echte HTTPS-Aufrufe an AWS durch, erforderte gültige Cloud-Anmeldedaten auf jedem Entwicklungsarbeitsplatz und schlug sofort fehl, wenn meine Internetverbindung einmal ins Stocken geriet. Das Ausführen der Testsuiten dauerte Minuten statt Sekunden.

An zweiter Stelle stand die **Einfältigkeit der Kämpfe**. Unsere Charaktere konnten Schwerter schwingen und datengesteuerte Flächenangriffe (AoEs) wirken, aber die Mathematik dahinter war im Grunde genommen „Gesundheit –= Schaden“. Es gab keine kritischen Treffer, keine Rüstungsminderungskurven, keine Heilzauber, keine Schaden-über-Zeit-Effekte (DoTs) und keine Möglichkeit für einen Paladin oder Priester, einen verletzten Teamkameraden zu heilen, ohne dabei einen Gegner zu treffen.

In zwei intensiven Tagen und elf Commits habe ich beides umgesetzt: Ich habe die gesamte Cloud-Infrastruktur mit Docker Compose und DynamoDB Local lokal nachgebildet und die vollständige 7-Phasen-ARPG-Kampfformel-Engine implementiert – komplett mit Heilung von Verbündeten, periodischen Ticks, Crowd Control mit abnehmenden Erträgen und Skalierung der Ausrüstungswerte.

---

## Technische Erläuterung

### 1. Das „Local-First“-Cloud-Paradigma

Die Entwicklung unter Verwendung von Live-Cloud-Ressourcen für Inner-Loop-Tests ist ein Anti-Muster. Man stößt auf Ratenbeschränkungen, zahlt unnötige Kleinbeträge und muss bei jeder Assertion eine Latenz von 80 ms in Kauf nehmen.

```
Local Development Mode:
[ Unreal PIE / Test_All.ps1 ] 
         |
         v (HTTP / localhost:3000)
[ AccountApi Node Service ]
         |
         v (DynamoDB Protocol / localhost:8000)
[ Docker Container: amazon/dynamodb-local ]
```

Durch Einbinden von `amazon/dynamodb-local` in eine lokale `docker-compose.yml`-Datei wird der gesamte Account-Dienst in weniger als einer Sekunde gestartet. `AccountApi` erkennt die lokale Umgebung, wechselt die Endpunktziele, richtet Tabellen über ein idempotentes Einrichtungsskript ein und zeichnet Kapazitätsmetriken lokal auf. Der gesamte Test-Runner (`Test_All.ps1`) läuft nun **standardmäßig im lokalen Modus**, wobei der Schalter `-Cloud` ausschließlich für die Überprüfung in der Staging-Umgebung vor der Bereitstellung reserviert ist.

### 2. Zielumkehr: Freund oder Feind

Before this sprint, all targeting logic assumed hostility:
```cpp
// Old assumption: if you target it, you want to hurt it
if (TargetActor && TargetActor != GetAvatarActorFromActorInfo())
{
    ApplyDamage(TargetActor);
}
```

Unterstützungsfähigkeiten widerlegen diese Annahme vollständig. Ein „Geringer Heilzauber“ oder ein „Gebet der Heilung“ erfordert, dass man einen Verbündeten als Ziel auswählt – oder sogar das *Ziel des eigenen feindlichen Ziels* (sogenannte „Target-of-Target“-Heilung im MMO-Raid-Design).

Ich habe die Zielarchitektur um drei Kernprimitive erweitert:
1. **`EOnsetAbilityType::Self`:** Wird sofort auf den Zaubernden angewendet, ohne dass eine Zielauswahl erforderlich ist.
2. **`bFriendly`-Flag pro Effekt:** Ermöglicht es einzelnen Effekten innerhalb einer einzigen Fähigkeitsreihe, zwischen Zielen zu unterscheiden (z. B. eine „Heilige Nova“, die Gegnern Schaden zufügt und gleichzeitig Verbündete heilt).
3. **Einheitliches `ShouldAffectActor()`-Prädikat:** Eine zentralisierte, von der Klasse abgeleitete Team-Ermittlung, damit sich Gegner niemals gegenseitig angreifen und Spieler niemals versehentlich Gruppenmitglieder vernichten.

### 3. Die 7-Phasen-Kampfformel-Engine

Der Schaden ist keine magische Konstante mehr. Er wird durch eine spezielle Gameplay-Effekt-Ausführung (`UOnsetDamageExecution`) berechnet, die ein formales mathematisches ARPG-Modell umsetzt:

$$\text{Schaden} = (\text{Grundwert} + \text{Stärke} \times \text{Skalierung}) \times \text{Krit-Multiplikator} \times \left(1 - \frac{\text{Rüstung}}{\text{Rüstung} + 100 \times \text{Angreifer-Stufe}}\right) \times \text{Element-Multiplikator}$$

* **Attribute:** Aus den Primärattributen (STR, AGI, INT, VIT, LUK) leiten sich sekundäre Kampfwerte ab (physische Kraft, Tempo/Abklingzeit, Rüstung, magische Resistenz, kritische Trefferchance).
* **Elementetabelle:** Eine $5\times 5$-Matrix, die die Affinitäten zu physischen Angriffen, Feuer, Eis, Blitz und Heiligkeit/Schatten abbildet.
* **Abnehmende Wirkung bei Crowd Control:** Das aufeinanderfolgende Auslösen von Betäubungen oder Einfrierungen bei demselben Charakter verkürzt die Dauer nachfolgender CC-Effekte exponentiell über `UOnsetCCDiminishingComponent`.

---

## Details zur Umsetzung

### 1. Lokales DynamoDB-Client-Routing (`AccountApi/src/db/client.js`)

Im Node-Backend erfolgt eine dynamische Verzweigung des DynamoDB-Clients basierend auf der Umgebungskonfiguration, wodurch ohne Codeänderungen auf den lokalen Docker-Container verwiesen wird:

```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const config = require('../config');

const clientConfig = {
  region: config.region,
};

// Route to local DynamoDB container when running locally
if (config.isLocal) {
  clientConfig.endpoint = config.dynamoDbEndpoint || 'http://localhost:8000';
  clientConfig.credentials = {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  };
}

const rawClient = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

module.exports = { docClient, rawClient };
```

Ein zugehöriges Skript (`create-local-table.js`) richtet die Tabelle `Accounts` mit bedarfsorientierter Kapazität und lokalen Sekundärindizes in 120 Millisekunden ein.

### 2. Periodische Effekte: DoTs und HoTs (`UOnsetGA_Generic.cpp`)

Um Fähigkeiten wie *Corruption* (Schaden über Zeit) und *Renew* (Heilung über Zeit) zu unterstützen, habe ich `FOnsetAbilityEffect` um eine `Period`-Eigenschaft erweitert. Wenn `Period > 0.0f` ist, instanziiert `UOnsetGA_Generic` einen periodischen Gameplay-Effekt:

```cpp
if (EffectDef.Period > 0.0f && EffectDef.Duration > 0.0f)
{
    // Configure periodic GameplayEffect spec
    TSubclassOf<UGameplayEffect> PeriodicClass = (EffectDef.Type == EOnsetAbilityEffectType::Heal) 
        ? UOnsetGenericHealOverTimeEffect::StaticClass() 
        : UOnsetGenericDamageOverTimeEffect::StaticClass();

    FGameplayEffectSpecHandle SpecHandle = MakeOutgoingGameplayEffectSpec(PeriodicClass, GetAbilityLevel());
    if (SpecHandle.IsValid())
    {
        SpecHandle.Data->SetDuration(EffectDef.Duration, false);
        SpecHandle.Data->Period = EffectDef.Period;

        // Pass tick magnitude via SetByCaller
        FGameplayTag DataTag = (EffectDef.Type == EOnsetAbilityEffectType::Heal)
            ? TAG_Data_Heal
            : EffectDef.DamageTypeTag;
            
        SpecHandle.Data->SetSetByCallerMagnitude(DataTag, EffectDef.Magnitude);
        ApplyGameplayEffectSpecToTarget(CurrentSpecHandle, CurrentActorInfo, CurrentActivationInfo, SpecHandle, TargetHandle);
    }
}
```

Die periodischen Schadens-Ticks verwenden genau dieselbe `UOnsetDamageExecution`-Pipeline wie Sofortangriffe, wodurch sichergestellt wird, dass Rüstungsminderung und kritische Treffer bei jedem Tick einheitlich angewendet werden.

### 3. Autoritative Kampfausführung (`UOnsetDamageExecution.cpp`)

Im Rahmen der Schadensberechnung werden Primär- und Sekundärattribute sowohl der Quelle als auch des Ziels erfasst, um Schadensminderung und kritische Treffer zu berechnen:

```cpp
void UOnsetDamageExecution::Execute_Implementation(
    const FGameplayEffectCustomExecutionParameters& ExecutionParams,
    FGameplayEffectCustomExecutionOutput& OutExecutionOutput) const
{
    // 1. Capture Attacker and Defender attributes
    float AttackerPower = 0.0f;
    ExecutionParams.AttemptCalculateCapturedAttributeMagnitude(DamageStatics().AttackPowerDef, EvaluateArgs, AttackerPower);

    float DefenderArmor = 0.0f;
    ExecutionParams.AttemptCalculateCapturedAttributeMagnitude(DamageStatics().ArmorDef, EvaluateArgs, DefenderArmor);

    float AttackerLuck = 0.0f;
    ExecutionParams.AttemptCalculateCapturedAttributeMagnitude(DamageStatics().LuckDef, EvaluateArgs, AttackerLuck);

    // 2. Roll Critical Strike (LUK-based curve)
    const float CritChance = FMath::Clamp(AttackerLuck * 0.002f, 0.05f, 0.75f);
    const bool bIsCrit = FMath::FRand() < CritChance;
    const float CritMultiplier = bIsCrit ? 1.5f : 1.0f;

    // 3. Calculate Armor Mitigation (standard diminishing curve)
    const float Mitigation = DefenderArmor / (DefenderArmor + 400.0f);
    const float MitigatedDamage = RawBaseDamage * (1.0f - Mitigation) * CritMultiplier;

    // 4. Output final health delta
    OutExecutionOutput.AddOutputModifier(
        FGameplayModifierEvaluatedData(DamageStatics().HealthProperty, EGameplayModOp::Additive, -MitigatedDamage)
    );
}
```

---

## Ergebnisse und Validierung

1. **Sofortige Testsuite:**
   Durch Ausführen von `.\Test_All.ps1` wird Docker gestartet, der Zustand der Tabellen überprüft, Integrationstests für Konten durchgeführt und die Validierung des Speicherns und Ladens von Charakterdaten in weniger als 4 Sekunden ausgeführt. AWS-Anmeldedaten sind auf Entwicklungsrechnern nicht mehr erforderlich.
2. **Unterstützungs- und Heiler-Kit:**
   * **Heiliges Licht** erstellt: 2,0 s Zauberzeit, 600 Reichweite, Einzelziel-Heilung, die verbündeten Zielen 180 HP wiederherstellt.
   * **„Renew“** erstellt: Sofortiger Zauber, wendet einen HoT an, der 9 Sekunden lang alle 1,5 Sekunden 25 HP wiederherstellt.
   * Test des Zaubers „Holy Light“ auf einen Gegner: Der Zauber schlug mit der Meldung „Ungültiges Ziel“ klar fehl.
3. **Kampfberechnungen in der Praxis:**
   Das Anlegen eines Testrings (+40 Glück, +15 physische Kraft) erhöhte die kritische Trefferchance des Charakters von 5 % auf 13 %. Kritische Treffer wurden mit deutlich orangefarbenen Schadenszahlen und einem Schadenskoeffizienten von 1,5 angezeigt.

---

## Herausforderungen und Lösungen

### Herausforderung 1: Der Fehler mit den verschwindenden Gegnern (`bIsAlive`)

**Problem:** Unmittelbar nach dem Einbinden der Gegner-Statistiktabellen (`DT_EnemyStats`) wurden Gegner in der Arena generiert, waren jedoch auf Multiplayer-Clients unsichtbar und nicht kollidierbar.

**Lösung:** In `AOnsetEnemy::ResetStats()` setzte der Code die gesamte Struktur auf die Standardwerte zurück, wodurch versehentlich `bIsAlive = false` gesetzt wurde. Auf dem Client blendete der Replikations-Hook für `bIsAlive` das Mesh aus und deaktivierte die Kollision beim Spawn. Durch den Schutz von `bIsAlive` bei der Neuberechnung der Werte wurde der Fehler sofort behoben.

### Herausforderung 2: Zeitliche Abstimmung von DynamoDB Local und Docker in Skripten

**Problem:** In PowerShell-Skripten wurde der Aufruf von `docker compose up -d` sofort zurückgegeben, sobald der Container gestartet war, doch der Java-Prozess in DynamoDB Local benötigte etwa 800 ms, um Port 8000 zu öffnen. Nachfolgende Aufrufe zum Erstellen von Tabellen führten sofort zu Fehlern wegen einer abgelehnten Verbindung (`ECONNREFUSED`).

**Lösung:** Die Datei `create-local-table.js` wurde um eine Probe mit exponentiellem Backoff erweitert, die den Befehl `rawClient.send(new ListTablesCommand({}))` bis zu 10 Mal mit einer Verzögerung von jeweils 250 ms ausführt, bevor versucht wird, eine Tabelle anzulegen.

---

## Reflexion und gewonnene Erkenntnisse

Eine „Local-first“-Entwicklung ist kein Luxus, sondern der Grundstein für dynamische Entwicklungsarbeit. Sobald Tests einen externen Internetzugang oder Cloud-IAM-Berechtigungen erfordern, führen Entwickler sie nicht mehr durch. Durch die Integration von DynamoDB in Docker macht das Testen wieder Spaß.

Was das Gameplay angeht, hat sich die Vereinheitlichung der Kampfmechaniken in einer einheitlichen Ausführungs-Pipeline sofort bewährt. Da DoTs, AoEs und Basisangriffe alle über `UOnsetDamageExecution` ablaufen, werden Rüstungsabzug und Elementarresistenz einheitlich angewendet, ohne dass die Berechnungen in den einzelnen Fähigkeiten doppelt durchgeführt werden müssen.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| Datengesteuerte Fähigkeiten & Fähigkeits-Workbench | ✅ Festgelegt (Beitrag 20) |
| **Lokale Cloud-Infrastruktur & Kampfberechnungen** | ✅ **Festgelegt** |
| Rucksack-Inventar, „Click-to-Loot“ & Levelaufstieg | ⏳ Als Nächstes (Beitrag 22) |
| Quests, „Click-to-Move“ & Optimierung des Autoplay | ⏳ Geplant (Beitrag 23) |
| Die MH-Framework-Architektur | ⏳ Geplant (Beitrag 24) |

Da das Kampfsystem solide ist und die Fähigkeiten sowohl für Schaden als auch für Heilung funktionieren, brauchen die Spieler Gründe zum Kämpfen: Gegner müssen Beute fallen lassen, Gegenstände brauchen Platz in den Rucksäcken, und das Töten von Monstern muss mit Erfahrung und neuen Stufen belohnt werden.

---

*Arc-Commits: `0cd1ad6`, `b2c5d10`, `33a6b3d`. Zugehörige Dokumente: `Docs/combat-formulas.md`, `Docs/Server/Account_Api.md`.*
