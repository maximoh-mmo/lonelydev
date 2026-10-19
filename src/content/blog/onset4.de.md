---
id: "onset4"
title: "🎬 Entwickler-Tagebuch: NPC-Infrastruktur – Spawner, Pool, Gruppen und datengesteuerte Profile"
seoTitle: "NPC-Infrastruktur: Spawner-Pool-Gruppen und datengesteuerte Profile"
date: "2026-08-28"
category: "Game Dev"
summary: "Behandelt einen 16-Commit-Marathon zum Aufbau der kompletten NPC-Pipeline: Gegner-Pawn, slotbasierter Spawner, Objektpool mit aggressiven Recycling-Verträgen, Gruppensystem unter Verwendung von Komponenten anstelle von Manager-Akteuren sowie UAIProfile-Daten-Assets für Variationen. Enthält die Geschichte um das Fallback-Cube-Mesh, bei der ein Kollisions-/Zielbestimmungsfehler aufgedeckt wurde."
project: "Onset"
tags: ["Unreal Engine", "Object Pooling", "Spawner System", "Group System", "Data-Driven Design", "AI Profiles"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Beitrag 3 endete mit genau einem Gegner in der Welt, der manuell im Editor platziert wurde. Das ist ein guter Zustand, um das Zielen zu testen, aber es ist noch kein Spiel. Im nächsten Sprint – sechzehn Commits, alle an einem einzigen Marathon-Tag – wird die gesamte NPC-Pipeline aufgebaut, auf der der Rest des Projekts aufbauen wird: ein Gegner-Pawn, ein Spawner, ein Objektpool, ein Gruppensystem und die datengesteuerten Profile, durch die diese gepoolten Gegner unterschiedlich aussehen und sich unterschiedlich verhalten.

In diesen sechzehn Commits verbirgt sich eine echte Nebenhandlung. Ein „Fallback-Cube-Mesh“ – eine Notlösung für Gegner, für die noch keine Grafikelemente vorliegen – wird hinzugefügt, dann **drei Minuten später rückgängig gemacht**, anschließend anders neu erstellt, mit Kollisionsdaten versehen und deckt schließlich einen Zielausrichtungsfehler auf. Es ist die ehrlichste Abfolge im gesamten Repository: Ein aktiver Entwickler, der in Echtzeit eine Entscheidung trifft und wieder rückgängig macht. Dieser Beitrag verfolgt den gesamten Verlauf, einschließlich dieser Geschichte, denn gerade die Fehler sind es, die es wert sind, gelesen zu werden.

---

## Technische Darstellung

### Infrastruktur vor Intelligenz

Die Reihenfolge ist hier bewusst gewählt und wird in den Commits selbst angegeben: **Das Gerüst muss vorhanden sein, bevor KI-Arbeit reines Verhalten sein kann.** Man kann einem Gegner nicht beibringen, sich zu bewegen oder zu kämpfen, wenn es keinen Gegner gibt, keine Möglichkeit, einen zu generieren, und keine Möglichkeit, ihn wiederzuverwenden. Daher werden in A2 folgende Komponenten in der Reihenfolge ihrer Abhängigkeiten erstellt:

1. **`AOnsetEnemy`** – die erste tatsächliche Gegnerfigur (eine schlanke Unterklasse des Basis-Spielercharakters, gekennzeichnet mit `„Enemy“`).
2. **`AOnsetSpawner`** – erzeugt Gruppen von Gegnern.
3. **`AOnsetPoolManager`** – weist Gegnern im Voraus Speicherplatz zu und recycelt sie, damit das ständige Erzeugen und Zerstören während des Spiels die Leistung nicht beeinträchtigt.
4. **Gruppensystem** – verfolgt die Gruppenzugehörigkeit und aggregiert Daten.
5. **`UAIProfile`-Daten-Assets** – damit alle Variationen (Mesh, Werte, Verhalten) in den Daten gespeichert sind und keine neuen Klassen erforderlich sind.

Die zentrale architektonische Entscheidung: **Alle Gegnervarianten sind in den `UAIProfile`-Datenassets hinterlegt, nicht in Unterklassen.** Diese eine Entscheidung macht den Pool kinderleicht – es kann eine einzige Klasse fest codiert werden (`AOnsetEnemy::StaticClass()`) und dennoch vielfältige Gegner bereitgestellt werden.

---

## Details zur Umsetzung

### 1. Der Spawner: slotbasiert, poolgestützt

Der erste Spawner verteilte Gegner ringförmig um die Spawn-Punkte; mittlerweile basiert das System auf Slots und *erfordert* einen Pool. Ein Slot enthält eine Transformation und einen Inhaber; der Pool stellt die eigentliche Instanz bereit:

```cpp
AOnsetEnemy* AOnsetSpawner::SpawnEnemyAtSlot(int32 SlotIndex)
{
	if (!Slots.IsValidIndex(SlotIndex)) return nullptr;
	FSpawnerSlot& Slot = Slots[SlotIndex];
	if (Slot.Occupant && IsValid(Slot.Occupant)) return nullptr; // already occupied

	AOnsetEnemy* Spawned = nullptr;
	if (PoolManager)
	{
		Spawned = PoolManager->GetPooledEnemy();
		if (Spawned) Spawned->SetActorTransform(Slot.SpawnTransform);
	}
	else
	{
		UE_LOG(LogSpawner, Warning, TEXT("SpawnEnemyAtSlot: PoolManager is null — cannot spawn NPC."));
	}
	if (Spawned)
	{
		Spawned->ApplyProfile(Config.EnemyProfile);
		Slot.Occupant = Spawned;
		if (GroupManager) GroupManager->RegisterMember(Spawned);
	}
	return Spawned;
}
```

Beachten Sie das Verhalten im Fehlerfall: Wenn kein Pool vorhanden ist, wird eine Warnung protokolliert und *der Slot bleibt leer*, anstatt auf `SpawnActor` zurückzugreifen. Das Weglassen des Fallbacks war ein bewusster Kompromiss – der Pool ist der einzige Weg, sodass seine Invarianten niemals umgangen werden.

### 2. Der Pool: ausblenden, deaktivieren, wiederverwenden

Der Recycle-Vertrag ist aggressiv. Ein zurückgekehrter Gegner wird ausgeblendet, an seinen Ursprungsort verschoben, seine Ticks werden deaktiviert, die Eingabe wird deaktiviert und Kollisionen werden deaktiviert:

```cpp
void AOnsetPoolManager::ReturnToPool(AOnsetEnemy* Enemy)
{
	if (!Enemy) return;
	if (!ObjectPool.Contains(Enemy)) ObjectPool.Add(Enemy);
	Enemy->SetActorLocation(FVector::ZeroVector);
	Enemy->SetActorHiddenInGame(true);
	Enemy->SetActorTickEnabled(false);
	Enemy->DisableInput(nullptr);
	Enemy->SetActorEnableCollision(false);
}
```

Und durch die Aktivierung wird dies rückgängig gemacht. Der Schalter „Verborgen/Sichtbar“ dient späteren Pool-Nutzern (Gruppendaten, Leichensystem) als Anhaltspunkt – und genau hier schlägt der Polaritätsfehler des Tages zu.

### 3. Das Gruppensystem: Komponenten, kein Manager-Akteur

Bei der Gruppenverfolgung wird bewusst auf einen platzierten `AGroupManager`-Akteur verzichtet – im Commit wird diese Entscheidung wie folgt begründet: *„Vermeidung einer Abhängigkeit von platzierten Akteuren in jedem Level.“* Stattdessen verfolgen `UGroupComponent` (pro NPC) und `UGroupManagerComponent` (auf dem Spawner) die Gruppenzugehörigkeit, und `GetGroupData()` wird bei Bedarf berechnet, anstatt bei jedem Tick zwischengespeichert zu werden.

Die On-Demand-Berechnung birgt eine Falle, die sich erst ganz am Ende des Tages bemerkbar macht. Die Gruppendaten wurden anhand von NPCs berechnet, die **nicht versteckt** waren – was in einem Pool die *falsche* Menge ist:

```cpp
for (const AOnsetEnemy* Enemy : Members)
{
	if (Enemy && !Enemy->IsPendingKillPending() && !Enemy->IsHidden())
	{
		AccumulatedLocation += Enemy->GetActorLocation();
		ValidCount++;
	}
}
```

Der Fehler liegt in der Polarität: `!IsHidden()` zählt *aktive* NPCs, aber der ursprüngliche Code filterte nach `IsHidden()` – und zählte stattdessen **im Pool befindliche, versteckte** NPCs. Die Gruppenmitte und die Anzahl der lebenden NPCs wurden anhand genau der falschen Menge berechnet. Behebung mit einem einzigen Commit, aber es handelt sich um die Art von Fehler, die in einer kleinen Demo unsichtbar ist, bei einem voll ausgelasteten Spawner jedoch katastrophale Folgen hat. (Die Schwesterfunktion `GetNearbyAllies` wies diesen Fehler noch einen weiteren Tag lang auf.)

### 4. `ApplyProfile`: Der Gegner wird datengesteuert

Das Daten-Asset `UAIProfile` enthält Mesh, Animations-Blueprint, Material und Verhaltenskonfiguration. `AOnsetEnemy::ApplyProfile()` verwandelt diese Elemente in einen lebendigen Gegner:

```cpp
void AOnsetEnemy::ApplyProfile(UAIProfile* InProfile)
{
	Profile = InProfile;
	USkeletalMeshComponent* MeshComp = GetMesh();
	if (!MeshComp) return;

	if (Profile)
	{
		if (!Profile->SkeletalMesh.IsNull())
		{
			USkeletalMesh* Mesh = Profile->SkeletalMesh.LoadSynchronous();
			if (Mesh) MeshComp->SetSkeletalMesh(Mesh);
		}
		if (Profile->AnimBlueprintClass)
		{
			MeshComp->SetAnimInstanceClass(Profile->AnimBlueprintClass);
		}
		if (Profile->OverrideMaterial)
		{
			MeshComp->SetMaterial(0, Profile->OverrideMaterial);
		}
		else
		{
			MeshComp->SetMaterial(0, nullptr);
		}
	}
	else
	{
		MeshComp->SetSkeletalMesh(nullptr);
		MeshComp->SetAnimInstanceClass(nullptr);
		MeshComp->SetMaterial(0, nullptr);
	}
}
```

Der entscheidende Aufruf: **`ApplyProfile(nullptr)` dient zum Zurücksetzen.** Der Pool ruft diese Funktion bei der Rückgabe auf; der Spawner ruft sie beim Abrufen mit dem tatsächlichen Profil auf. Eine einzige Funktion dient sowohl zur Konfiguration als auch zum Löschen – elegant, und der in `fc2d352` hinzugefügte defensive Kommentar macht die Absicht deutlich.

### 5. Die Geschichte vom Fallback-Würfel

Das ist der Kern des Handlungsbogens. Wenn ein Profil kein Skelettgitter hat, ist der Gegner **unsichtbar** – für ein fertiges Spiel ist das in Ordnung, während der Entwicklung jedoch verwirrend. Drei Versuche:

1. **`59231da`: ein permanentes `FallbackMeshComp`-Unterobjekt** bei jedem Gegner. **3 Minuten später** rückgängig gemacht (`a199ad9`). Warum? Jeder Gegner im Pool würde dauerhaft eine ungenutzte `UStaticMeshComponent` mit sich führen – das verursacht Speicher- und Renderkosten in einem Pool, der eine Klasse für viele Varianten wiederverwendet. Ein permanentes Fallback-Objekt ist für das Pooling ungeeignet.

2. **`4bc06c2`: Dynamisches Erstellen/Löschen.** Ein `NewObject<UStaticMeshComponent>("CubeVis")` existiert nur so lange, wie es benötigt wird:

```cpp
UStaticMeshComponent* CubeVis = NewObject<UStaticMeshComponent>(this, TEXT("CubeVis"));
CubeVis->SetupAttachment(RootComponent);
CubeVis->RegisterComponent();
CubeVis->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
CubeVis->SetCollisionObjectType(ECC_WorldDynamic);
CubeVis->SetCollisionResponseToAllChannels(ECR_Block);
if (UStaticMesh* CubeMesh = LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cube.Cube")))
	CubeVis->SetStaticMesh(CubeMesh);
CubeVis->SetHiddenInGame(false);
```

Und sie wird bei jedem Aufruf von `ApplyProfile` ganz *am Anfang* zerstört – was bedeutet, dass das Zurücksetzen nach der Rückgabe aus dem Pool gleichzeitig als Bereinigung des Cubes dient. Die Komponente existiert nur so lange, wie sie tatsächlich benötigt wird.

3. **`4b059ce`: Die Kollisionsanzeige.** Die Standard-Einstellung `NoCollision` des Würfels führte dazu, dass die **`ECC_Visibility`-Zielverfolgung direkt durch den Würfel hindurchging** – Würfel-NPCs konnten nicht als Ziel ausgewählt werden. Behebung: Echte Kollisionsreaktionen sowie automatische Anpassung der Kapselgröße an die Mesh-Grenzen (meshbasierte NPCs verfügen oft über kein Physik-Asset, sodass die Kapsel die einzige nachverfolgbare Oberfläche ist):

```cpp
if (USkeletalMesh* SkeletalMesh = Profile->SkeletalMesh.LoadSynchronous())
{
	SkeletalComp->SetSkeletalMesh(SkeletalMesh);
	FBoxSphereBounds Bounds = SkeletalMesh->GetImportedBounds();
	float Radius = FMath::Max(Bounds.BoxExtent.X, Bounds.BoxExtent.Y);
	float HalfHeight = FMath::Max(Radius, Bounds.BoxExtent.Z);
	GetCapsuleComponent()->SetCapsuleSize(Radius, HalfHeight);
}
```

Der Ablauf ist ein Lehrbuchbeispiel: **Die erste Korrektur betraf das Symptom (Unsichtbarkeit), die zweite die Form (Kompatibilität mit dem Pool) und erst die dritte deckte die tatsächlichen Kosten auf (Kollision/Zielerfassung).** Jede Überarbeitung war zum Zeitpunkt ihrer Durchführung richtig.

---

## Ergebnisse und Validierung

- Feind-Pion, Spawner, Pool und Gruppensystem wurden alle an einem Tag fertiggestellt.
- Ein-Klassen-Pool (`AOnsetEnemy`) mit datengesteuerter Variation – die Grundlage, die alles Folgende erst möglich macht.
- `ApplyProfile`-Kontrakt zum Konfigurieren/Zurücksetzen, der später vom Respawn- und Leichensystem wiederverwendet wurde.
- Gruppendaten werden bei Bedarf berechnet; der Polaritätsfehler bei `IsHidden()` wurde noch am selben Tag entdeckt und behoben.
- Dokumentation und To-Do-Listen wurden an den tatsächlichen Stand angepasst (mit einer ehrlichen Korrektur des Fortschritts: 100 % wurden auf 92 % zurückgesetzt, nachdem nicht verifizierte Einträge entdeckt wurden).

---

## Herausforderungen und Lösungen

### Unsichtbare Feinde – drei Ansätze

Oben bereits behandelt – die Geschichte um den Fallback-Cube. Die daraus zu ziehende allgemeine Lehre lautet: **In einem gepoolten, datengesteuerten System muss „keine Daten“ dennoch zu einem sichtbaren, zielgerichteten Ergebnis führen.** Der `ApplyProfile(nullptr)`-Vertrag und der On-the-Fly-Cube sind die dauerhaften Lösungen.

### Die Falle der Fortschrittsberichterstattung

**Problem:** Der mittags durchgeführte Commit wies den Status „A2 100 % (31/31), insgesamt 69/69“ auf – obwohl mehrere Punkte (Überprüfung der Gruppenzentrale, Verknüpfung von `NotifyMemberAttacked`) noch nicht tatsächlich erledigt waren.

**Lösung:** Ein späterer Commit hat den Wert ehrlich gesagt wieder auf 92 % zurückgesetzt, wobei die noch nicht abgehakten Punkte aufgeführt wurden. In diesem Repo wird die Fortschrittsverfolgung als Disziplin betrachtet und nicht als Punktestand – und dass eine übertriebene Angabe noch am selben Tag, an dem sie gemacht wurde, entdeckt wird, ist der Grund dafür, dass die Checklisten vertrauenswürdig bleiben.

### Kompilierungsfehler in UE 5.8

**Problem:** `ApplyProfile(const UAIProfile*)` konnte nicht kompiliert werden – für `TObjectPtr<UAIProfile>` gibt es keine implizite Konvertierung von `const UAIProfile*`.

**Lösung:** Das `const` wurde entfernt. Zur Erinnerung: Die Zeigertypen in UE verhalten sich in Bezug auf die `const`-Korrektheit nicht immer so, wie es C++-Kenner erwarten würden.

---

## Reflexion und gewonnene Erkenntnisse

Der Pool mit einer einzigen Klasse ist die beste Entscheidung des Arc-Entwicklungsteams. Durch die Ausrichtung auf den Grundsatz „Variation liegt in den Daten, nicht in den Klassen“ bleiben der Pool, der Spawner und das Gruppensystem einfach gehalten, und jedes nachfolgende System übernimmt diese Einfachheit. Das Gegenteil – eine Klasse pro Gegnertyp – hätte die gesamte Architektur untergraben.

Das „ApplyProfile(nullptr)“-Reset-Muster ist das zweite tragfähige Konzept: eine Funktion, die sowohl als Setter als auch als Löschfunktion dient und auf „null“ basiert. Es taucht später überall wieder auf (Rückgabe aus dem Pool, Respawn, Bereinigung von Leichen), da es dem Recycling einen einzigen Engpasspunkt bietet, um „diese Instanz in einen makellosen Zustand zu versetzen“.

Die Fehler des Tages hatten alle dieselbe Ursache: **das schnelle Handeln angesichts unsichtbarer Fehlerquellen.** Der Würfel sah unsichtbar aus (in Ordnung), ließ sich aber nicht anvisieren (nicht in Ordnung); bei den Gruppendaten wurde die falsche Polarität verwendet (niemand konnte das Zentrum der Gruppe erkennen); im Fortschrittsbericht wurde die Fertigstellung voreilig gemeldet. Alle drei Fehler wurden durch Überprüfung aufgedeckt, nicht durch blindes Vertrauen in den Code.

Was ich anders machen würde: Ich hätte die „Voraussetzungen für Kollisionen“ *vor* der Erstellung des Fallback-Würfels in die Datei `Targeting_System.md` geschrieben, denn die eigentliche Erkenntnis – „Wenn es unsichtbar ist, Kollision prüfen“ – habe ich zufällig im Editor entdeckt.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| A2 — NPC-Charakter, Spawner, Pooling, Gruppen | ✅ Abgeschlossen |
| A3 — KI: StateTrees, Wahrnehmung, Verhalten | ⏭️ Weiter |
| A4 — Kampf: GAS, Tod, Leichen | Geplant |

**Was kommt als Nächstes:** Die Infrastruktur ist fertig, also bekommen die NPCs nun ein „Gehirn“. Mit Beitrag 5 beginnt der A3-Sprint: KI-Wahrnehmung (Sehen + Hören), die ein in C++ definiertes StateTree-Schema speist, Korrekturen am Lebenszyklus der Pool-Besitzrechte (das „Orphaned-Controller“-Leck), die Zustandsmaschine „Idle → Roam → Agro → Chase“ – und die ersten Grundlagen für GAS, denn der Kampf steht bevor.

> **Nächstes Mal in Beitrag 5:** Von Stubs zu StateTrees – Aufbau des NPC-Gehirns von Onset mit UE 5.8 StateTree + AI Perception (und warum wir die AIController gebündelt haben).

---

*Arc-Commits: `2e5c772` → `b74e899`. Zugehörige Dokumente: `Docs/AI/Spawner_System.md`, `Docs/AI/Pooling_System.md`, `Docs/AI/Group_System.md`, `Docs/Gameplay/Targeting_System.md`.*


