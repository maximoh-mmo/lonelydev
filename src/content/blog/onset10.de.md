---
id: "onset10"
title: "🎬 Entwickler-Tagebuch: Von „Aggro“ zu „Threat“ – serverseitige Bedrohungstabelle und Überprüfung des Quellcodes"
seoTitle: "Von „Aggro“ bis „Threat“: Überprüfung der serverseitigen Bedrohungstabelle und des Quellcodes"
date: "2026-09-18"
category: "Game Dev"
summary: "Erstellt ein serverseitiges Bedrohungssystem mit schadensabhängigen Bedrohungstabellen, einer Bewertung nach „Bedrohung × Entfernung“, deterministischer Positionierung anhand der Winkelverteilung und einer dreistufigen KI-LOD. Beinhaltet eine umfassende Überprüfung der Codebasis: Umstrukturierung der KI-Quelldateien, Zusammenführung von vier StateTree-Aufgaben zu einer einzigen „EngageTask“, Umbenennung von „Aggro“ in „Threat“ sowie Bereinigung von über 48 Dateien hinsichtlich technischer Schulden."
project: "Onset"
tags: ["Unreal Engine", "Threat System", "AI Systems", "StateTree", "Codebase Audit", "Multiplayer Architecture"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Am Ende von Post 9 konnte der Spieler zusehen, wie KI gegen KI auf unbestimmte Zeit kämpfte. Die Entscheidungsfindung im Kampf war jedoch noch unausgereift – Gegner verfolgten das nächstgelegene Ziel in einer geraden Linie, drängten sich zusammen und blieben gelegentlich stecken. Die A3.6-Welle (die bereits in der Vorproduktionsüberprüfung von Post 1 geplant war) sollte all das mit einem ordentlichen Bedrohungssystem, einer winkelförmigen Kampfverteilung und einer KI-LOD beheben.

Dieser Handlungsbogen bietet all das – und noch einiges mehr. Außerdem wird im Rahmen dieses Handlungsbogens die bislang umfangreichste Überprüfung des Quellcodes des Projekts durchgeführt: Das System wird von „Aggro“ in „Threat“ umbenannt, die Umstrukturierung der KI-Quellen in die Verzeichnisse `Enemy/` und `StateTree/`, die Zusammenführung von vier separaten StateTree-Aufgaben zu einer einzigen `EnemyEngageTask` sowie die Bereinigung aller veralteten APIs und übrig gebliebenen Debug-Protokolle. Der Arc endet mit der Planung von Sprint A5 (Multiplayer & Steam) und dem Abschluss des Bedrohungssystems mit dem Status „DONE“ – 75/75 bei A3, der ersten vollständig abgeschlossenen KI-Phase.

---

## Technische Erläuterung

### Warum „Threat“ und nicht „Aggro“?

Im ursprünglichen Design-Dokument wurde der Begriff „Aggro“ verwendet – ein Begriff, der die *Mechanik* (wer angegriffen wird) beschreibt, nicht jedoch die *Daten* (den kumulierten numerischen Wert, der bestimmt, wer angegriffen wird). Die Umbenennung in „Threat“ erfolgte bereits in der Planungsphase, noch vor jeglicher Implementierung, und der Quellcode enthielt zu keinem Zeitpunkt eine Klasse namens `UOnsetAggroSubsystem`. Die Umbenennung war eine terminologische Entscheidung, die sich in puncto Klarheit ausgezahlt hat: Der Begriff „Threat-Tabelle“ macht sofort deutlich, dass es sich um eine Datenstruktur handelt und nicht um ein Verhalten.

### Welt-Subsystem über Komponenten pro NPC

Das Bedrohungssubsystem ist ein `UWorldSubsystem` – ausschließlich serverbasiert, ohne Overhead pro NPC, mit einmaliger Bereinigung der Karte bei Rückkehr in den Pool oder beim Tod des Spielers. Im Design-Dokument wurde dies ausdrücklich gegenüber Aggro-Komponenten pro NPC bevorzugt:

> „Kein Overhead pro NPC, einmalige Bereinigung der Karte bei Rückgabe an den Pool bzw. beim Tod eines Spielers, ausschließlich serverseitige Daten – keine Replikation erforderlich.“

„Taunt“ wird zu einem einzeiligen Aufruf: `AddThreat(Taunter, Enemy, TauntAmount)`. Es muss keine Aggro-Komponente pro NPC eingerichtet werden, und es gibt keinen replizierten Status, der synchronisiert werden muss.

### Bewertung von Bedrohung × Entfernung

Eine reine „höchste Bedrohung“ würde jeden Nahkampf-NPC quer über die halbe Karte auf einen weit entfernten Waldläufer zulaufen lassen. Die Wertung gewichtet die Bedrohung nach Entfernung mit einem sanften Abfall:

```cpp
const float DistWeight = (DistSq <= AttackRangeSq) ? 1.0f
                         : (DistSq <= ChaseRangeSq)  ? 0.5f
                         : 0.1f;
const float Score = ThreatVal * DistWeight;
```

`GetPrimaryTarget` wird für Abfragen mit Rohwerten beibehalten (für zukünftige Test- und Debugging-Zwecke), während `GetBestTarget` das Arbeitspferd für tatsächliche Einsatzentscheidungen ist.

---

## Details zur Umsetzung

### 1. Das Bedrohungssubsystem

`UOnsetThreatSubsystem` speichert zwei Tabellen, deren Schlüssel die gegnerischen Spielfiguren sind:

- `ThreatTable`: Gegner → Karte des Spielers → Bedrohungswert
- `EngagementTable`: Gegner → Gruppe der derzeit im Kampf befindlichen Spieler

Der Schaden wird über `PostGameplayEffectExecute` im Attributsatz in die Bedrohungstabelle übernommen:

```cpp
if (UOnsetThreatSubsystem* ThreatSub = GetWorld()->GetSubsystem<UOnsetThreatSubsystem>())
{
    AOnsetEnemy* TargetEnemy = Cast<AOnsetEnemy>(Data.Target.GetOwnerActor());
    AOnsetBaseCharacter* Instigator = Cast<AOnsetBaseCharacter>(Data.EffectSpec.GetContext().GetInstigator());
    if (TargetEnemy && Instigator)
        ThreatSub->AddThreat(Instigator, TargetEnemy, FMath::Abs(Data.EvaluatedData.Magnitude));
}
```

Die auf Sicht basierende Grundbedrohung von 1,0 initialisiert die Tabelle, wenn ein NPC einen Spieler *sieht*, dieser aber noch nicht getroffen wurde – ohne diese Wert würde `GetBestTarget` für noch nicht angreifende Gegner null zurückgeben und die Kampfschleife würde niemals starten.

### 2. Eine einzige EngageTask ersetzt vier Aufgaben

Der ursprüngliche Plan sah separate Aufgaben für „Agro“, „Chase“, „Attack“ und „AttackPosition“ vor. Bei der Umsetzung wurden diese zu einer einzigen `FEnemyEngageTask` mit zwei Neubewertungsintervallen zusammengefasst:

- **Neubewertung des Ziels:** alle 1 Sekunde (die Bedrohung kann sich ändern)
- **Neubewertung der Position:** alle 3 Sekunden oder wenn sich das Ziel um mehr als 200 Einheiten bewegt (die Position ist möglicherweise nicht mehr aktuell)

```cpp
if (Best && Best != CurrentTargetPtr)
{
    Subsystem->SwitchTarget(SelfEnemy, Best);
    SetTarget(Context, Best);
    AIController->SetFocus(Best);
    Inst.CurrentTarget = Best;
    Inst.LastTargetLocation = Best->GetActorLocation();
    Inst.NextPositionReevaluateTime = 0.0f;
}
```

Das `SwitchTarget` wird nur aufgerufen, wenn sich das beste Ziel *tatsächlich geändert hat* – nicht bei jedem Tick. Damit wurde das Problem des frameweisen Spams bei der Zielauswahl behoben, das das frühere Multitasking-Design beeinträchtigte.

### 3. Positionierung anhand der Winkelausbreitung

Anstelle von zufälligen seitlichen Versätzen (Beitrag 8) nutzt das Bedrohungssystem eine deterministische Winkelstreuung:

```cpp
FVector FOnsetStateTreeTask::GetThreatAngularOffset(int32 Count, int32 Rank, float Radius)
{
    if (Count <= 0 || Rank < 0 || Rank >= Count) return FVector::ZeroVector;
    float Angle = Rank / static_cast<float>(Count) * 360.0f;
    float Rad = FMath::DegreesToRadians(Angle);
    return FVector(FMath::Cos(Rad) * Radius, FMath::Sin(Rad) * Radius, 0);
}
```

Rang 0 befindet sich direkt vor dem Ziel (Winkel 0°); wenn ein NPC stirbt, passen die Überlebenden ihre Rangfolge und ihren Abstand automatisch an. So entsteht eine natürliche Tankformation ohne Formationssystem.

### 4. AI-LOD: drei Entfernungsstufen

Weit entfernte Gegner benötigen keine Aktualisierungen bei jedem Tick. Der Controller berechnet die LOD alle 30 Ticks:

```cpp
if (NearestDist < CachedSightRange)
{
    SetActorTickInterval(0.0f);
    StateTreeComponent->SetComponentTickEnabled(true);
}
else if (NearestDist < CachedHearingRange)
{
    SetActorTickInterval(0.2f);
    StateTreeComponent->SetComponentTickEnabled(true);
}
else
{
    SetActorTickInterval(0.5f);
    StateTreeComponent->SetComponentTickEnabled(false);
}
```

### 5. Die Überprüfung des Quellcodes

Die weniger glamouröse, aber ebenso wichtige Arbeit des Bogens:

- **`48c98af`:** C++-Quelldateien neu strukturiert — `OnsetAIController` → `AI/`, `OnsetBaseCharacter` + `TargetingComponent` → `Core/`, flacher Ordner `Combat/` → `Combat/` (beibehalten). 31 Include-Pfade aktualisiert.
- **`696bf55`:** Der CheatManager funktioniert nun auch, wenn der KI-Controller die Kontrolle hat – `GetActiveController()` gibt den KI-Controller zurück, wenn der Spieler-Pawn von diesem kontrolliert wird, sodass `CheatManager->God()` im Autoplay weiterhin funktioniert.
- **`6f5bdf5`:** Alle StateTree-Aufgaben für Gegner wurden in „Enemy*Task“ umbenannt, um die Konsistenz mit „Player*Task“ zu gewährleisten und Namenskonflikte bei der Reflection zu vermeiden.
- **`adc399b` + `e225051`:** Zwei umfangreiche Batch-Prüfungen – veraltetes `CastChecked` → `Cast`, Korrektheit von Konstanten, ungenutzte Includes, DRY-Extraktion (Template `GetSelfPawn<T>`, Makro `ATTRIBUTE_ACCESSORS_BASIC`), Initialisierung von Mitgliedern, Null-Prüfungen. Über 48 Dateien bereinigt.
- **`0a9bf52`:** Verifizierungsdurchlauf der vierten Welle, StateTree-Debug-Anzeige (`DrawDebugString` im Editor) und – ganz entscheidend – Rückstellung der Episodenanzahl von 46 auf 43, nachdem die doppelten Episoden 26–28 entfernt wurden.

### 6. Die Umbenennung von „Aggro“ in „Threat“ (vor der Umsetzung)

`78efaef` hat das gesamte System in 14 Dateien umbenannt, *noch bevor es überhaupt einen Bedrohungscode gab* – zuerst wurde das Planungsdokument verfasst, dann folgte die Umsetzung. Die Umbenennung betraf `AGGRO_CURRENT.md` → `THREAT_CURRENT.md`, `Aggro_System.md` → `Threat_System.md` sowie alle Verweise auf `UOnsetAggroSubsystem`/`GetAggro*` → `Threat*`.

---

## Ergebnisse und Validierung

- Bedrohungstabelle mit Schadens-Feed, sichtbasierter Basisbedrohung und Verfolgungs-Tracking
- Ein einziges `EnemyEngageTask`, das Agro/Chase/Attack/AttackPosition ersetzt – weniger Zustandsübergänge, weniger Fehlerquellen
- Deterministische Positionierung der Winkelverteilung mit automatischer Neugewichtung
- 3-stufige KI-LOD (voller Tick / 0,2-s-Tick / pausiert)
- Überprüfung des Quellcodes: veraltete APIs entfernt, Korrektheit der Konstanten durchgesetzt, DRY-Extraktion, Umbenennung von Aufgaben
- Anzahl der Episoden korrigiert (46 → 43 nach Duplikatsbereinigung)
- A3 = 75/75 (100 %) – erste vollständig abgeschlossene KI-Phase
- Sprint A5 geplant mit 4 Wellen, 10 täglichen TODOs, Risiken R46–R49

---

## Herausforderungen und Lösungen

### Bei jedem Tick „SwitchTarget“-Spam

**Problem:** `TWeakObjectPtr<AOnsetBaseCharacter> CurrentTarget` in den Instanzdaten hat die Grenze zwischen EnterState und Tick nicht überstanden – schwache Zeiger werden nicht fixiert, sodass `Best != CurrentTargetPtr` praktisch immer wahr war, wodurch `SwitchTarget` bei jedem Tick erneut ausgelöst wurde und die `RegisterEngaged`-Protokolle mit Einträgen überflutet wurden.

**Lösung:** `TObjectPtr` für das zwischengespeicherte aktuelle Ziel + `RegisterEngaged` (nicht `SwitchTarget`) beim ersten Aufruf. Ein subtiler Fehler bezüglich der Lebensdauer von Zeigern, der nur in einem laufenden StateTree auftrat.

### Zustandsschwankung (Engage ↔ Selektor flackert)

**Problem:** Wenn `EnterState` sofort den Wert `Succeeded` zurückgab, obwohl kein Ziel vorhanden war, wechselte der Selektor im nächsten Frame erneut in den Zustand „Engage“ – eine frameweise Schwankung, die zu einer Flut von `RegisterEngaged`-Aufrufen führte und die NPCs sichtbar zittern ließ.

**Lösung:** Immer „Running“, erst nach einem 2 Sekunden langen, anhaltenden Zeitfenster ohne Ziel („TimeWithoutTarget“) „Succeeded“. Die Hysterese verhindert ein unkontrolliertes Hin- und Herwechseln.

### Der Fehler „AI_Profile.uasset“ mit `AttackRange = 10000`

**Problem:** Ein Fehler im Datenbestand, der mit `AttackRange = 10000` ausgeliefert wurde (im Finalize-Commit wurde der Wert auf 100 korrigiert). NPCs standen etwa 10 km entfernt.

**Lösung:** Das Asset wurde korrigiert UND es wurde in `EnterState` eine Laufzeit-Überschreibung für AIProfile hinzugefügt, damit die Standardeinstellung des Assets den Kampf nicht erneut unbemerkt unterbricht. Zweistufige Abwehr: Zuerst die Daten korrigieren, dann den Code robust gegen fehlerhafte Daten machen.

### Der Identitätsfehler bei `TWeakObjectPtr`

**Problem:** `TWeakObjectPtr::Find` hat Duplikate nicht korrekt erkannt – neue schwache Zeiger auf denselben Akteur werden beim Identitätsvergleich nicht als gleich erkannt.

**Lösung:** Durch eine Schleife mit `HasSameIndexAndSerialNumber` ersetzt. Eine kleine Tücken der UE-Container-API.

### Die überlange Commit-Meldung `f7ab81e`

**Problem:** In der Commit-Meldung heißt es, dass `GetBestTarget`/`SwitchTarget`/`ClearAll` „hinzugefügt“ wurden, doch diese wurden bereits in einem früheren Commit (`4288d2e`) integriert. Der Diff besteht lediglich aus einer einzigen Änderung des Rückgabetyps.

**Lösung:** Als Artefakt im Zusammenhang mit Squash/Commit-Hygiene anerkannt. Die eigentliche Codeänderung war korrekt; die Meldung war irreführend.

---

## Reflexion und gewonnene Erkenntnisse

Die Umbenennung von „Aggro“ in „Threat“ *vor der Implementierung* ist die beste strukturelle Entscheidung dieses Handlungsbogens. Wenn die Begriffswahl stimmt, ist jeder nachfolgende Commit klar verständlich. „Threat-Tabelle“ vermittelt sofort, wozu die Datenstruktur dient; „Aggro“ hätte eine ständige Klarstellung zwischen der Mechanik und den Daten erfordert.

Die Zusammenfassung von vier StateTree-Aufgaben zu einer einzigen `EngageTask` ist die zweite wichtige Erkenntnis: **weniger Zustände = weniger Übergänge = weniger Fehlerquellen.** Der ursprüngliche Plan sah die Zustände „Agro“ → „Chase“ → „Attack“ → „AttackPosition“ mit Übergängen zwischen den einzelnen Zuständen vor. Das endgültige Design umfasst einen einzigen Zustand mit zwei Neubewertungsintervallen. Der StateTree-Graph ist einfacher, der C++-Code ist einfacher und die Fehler sind einfacher.

Die Überprüfung des Quellcodes war der stille Held dieses Zyklus. Zwei Commits (`adc399b`, `e225051`) bereinigten mehr als 48 Dateien von angesammelten technischen Schulden – veraltete APIs, Verstöße gegen die `const`-Regel, ungenutzte `include`-Anweisungen und Verstöße gegen das DRY-Prinzip. Das ist die Art von Arbeit, die zwar keine neuen Funktionen liefert, aber die Implementierung jeder nachfolgenden Funktion kostengünstiger macht. Allein die Vorlage `GetSelfPawn<T>` machte zwei konkrete Hilfsfunktionen und deren Duplikate überflüssig.

Was ich anders machen würde: Die Datei `EnemyChaseTask.h` existiert nach der Konsolidierung von EngageTask immer noch ungenutzt – ich hätte sie im selben Commit gelöscht, anstatt toten Code zu belassen. Außerdem hätte ich `Docs/AI/NPC_AI_System.md` und `Architecture Overview.md` im selben Durchgang vollständig an den endgültigen 6-Zustands-Ablauf angepasst, anstatt sie veraltet zu lassen.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A3 – KI-Systeme (StateTree + Bedrohung) | ✅ **100 % (75/75)** |
| Sprint A5 – Multiplayer & Steam | ⏭️ Weiter |
| A5b – Persistenz & Account-System | Geplant |
| A5c – Authentifizierungsdaten-Extraktion & Login-Server | Geplant |

**Was als Nächstes ansteht:** A3 ist vollständig abgeschlossen. Die Bedrohungstabelle wird unter „DONE“ archiviert. Der nächste Abschnitt beginnt mit Sprint A5 – dabei wird der Demo-Server autoritativ und multiplayer-sicher gemacht. Das bedeutet `HasAuthority()`-Prüfungen für jedes rein serverseitige System, einen vollständigen Replikationsdurchlauf für NPCs und GAS, einen Build für dedizierte Server sowie Steam-Authentifizierungstickets, damit sich die Spieler tatsächlich gemeinsam einloggen können. Das Bedrohungssubsystem wird seinem ersten echten Stresstest unterzogen: zwei Spieler, eine `ThreatTable` und NPCs, die entscheiden müssen, wer sie wirklich am härtesten getroffen hat.

> **Nächstes Mal in Beitrag 11:** Das Wort des Servers ist Gesetz – HasAuthority()-Prüfungen, Replikation und der Steam-authentifizierte dedizierte Server.

---

*Arc-Commits: `8d38b8f` → `e854da8`. Zugehörige Dokumente: `Docs/AI/Threat_System.md`, `Docs/AI/NPC_AI_System.md`, `Docs/Architecture/Architecture Overview.md`, `Planning/Sprint_A5_Multiplayer.md`, `Planning/Outlines/Episode_List.md`.*


