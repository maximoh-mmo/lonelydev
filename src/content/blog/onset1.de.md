---
id: "onset1"
title: "🎬 Entwickler-Tagebuch: Aufbau eines Produktions-Repositorys für ein Unreal-ARPG"
seoTitle: "Aufbau eines Produktions-Repositorys für ein Unreal-ARPG"
date: "2026-08-17"
category: "Game Dev"
summary: "Dieser Beitrag beschreibt die ersten 25 Commits des Onset-Projekts und behandelt dabei die Repository-Struktur, Dokumentationsvorlagen, eine Zwei-Repository-Strategie zur Trennung von Entwicklung und sauberen Snapshots sowie die Planung vor der Produktion, einschließlich Risikominimierung und eines 12-monatigen Zeitplans. Der Autor erläutert die Entscheidungen zur Ordnerstruktur, die Sicherheitsmaßnahmen in der `.gitignore`-Datei sowie den „Document-First“-Entwicklungsansatz, der die gesamte Codebasis geprägt hat."
project: "Onset"
tags: ["Unreal Engine", "Repository Architecture", "Documentation", "Project Planning", "Pre-Production"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Jedes Projekt, das ich in der Vergangenheit begonnen habe, folgte demselben zum Scheitern verurteilten Muster: Ich habe ein neues Unreal-Projekt angelegt, angefangen, einen Charakter zu bewegen, und dann langsam erkannt, dass ich etwas entwickelt habe, das drei Monate später weder veröffentlicht, vermittelt noch überhaupt verstanden werden kann. Die Systeme wachsen organisch heran, die Namensgebung ist uneinheitlich, und die Frage „Wie erkläre ich das jemandem?“ wird auf unbestimmte Zeit aufgeschoben.

Dieses Mal habe ich beschlossen, das umzukehren. Bevor ich auch nur eine einzige Gameplay-Klasse geschrieben habe, habe ich einen Tag damit verbracht, den **Container** zu erstellen, in dem das gesamte Projekt untergebracht werden sollte: ein Ordnergerüst, das den Entwicklungsplan widerspiegelt, ein Dokumentationssystem mit Vorlagen, eine vollständige Episodengliederung für eine Tutorial-Reihe und – ganz entscheidend – eine **Zwei-Repository-Strategie**, die die chaotische Realität der Entwicklung von den übersichtlichen, lehrreichen Momentaufnahmen trennt, die die Leser zu sehen bekommen. Dieser Beitrag führt durch diese ersten 25 Commits und die Entscheidungen, die dahinter stehen.

---

## Technische Erläuterung

### Das Problem, das ich gelöst habe

Ich wollte einen Prototyp für ein Top-Down-ARPG-Kampfspiel in der Unreal Engine **5.8** entwickeln und gleichzeitig eine Tutorial-Reihe mit 36 Folgen dazu produzieren. Zwei Zielgruppen ziehen in entgegengesetzte Richtungen:

- **Die Demo selbst** benötigt Raum zum Experimentieren, zum Ausprobieren und zum Speichern von Zwischenergebnissen (Steam-SDK, Serverkonfigurationen, Wegwerf-Prototypen).
- **Das Tutorial** benötigt übersichtliche, minimalistische und *erklärbare* Momentaufnahmen bei jedem Schritt – eine Funktion pro Episode, keine überflüssigen Systeme.

Die naheliegende Antwort lautet **zwei Repos**: ein privates als „Master-Quelle der Wahrheit“ und ein öffentliches, das ausschließlich ausgefeilte Episoden-Snapshots enthält. Diese Entscheidung hat die gesamte Struktur des Repositorys geprägt und lässt sich bereits an der Ordnerstruktur des allerersten Commits erkennen.

### Warum die Ordnerstruktur *die* Architektur ist

Der erste Commit (`88359a6`) enthält überhaupt keinen Code – es handelt sich um eine `.gitignore`-Datei, eine `README`-Datei und über 80 leere `.gitkeep`-Verzeichnisse. Betrachtet man die Verzeichnisnamen jedoch als Liste, lässt sich die gesamte Produktionspipeline erkennen:

```
Assets/          Non-Unreal assets (diagrams, images, audio, video)
Design/          Game design documentation
Docs/            Technical system documentation (AI, GAS, Steam, ...)
Experiments/     Throwaway prototypes and tests
Planning/        Episode outlines, scripts, release plan
Project/         THE actual Unreal project (the real game)
Scripts/         Automation
Series/          Clean episode snapshots for the public repo (01-36)
Server/          Dedicated server configs
Steam/           Steam integration
Tools/           Episode exporter, build scripts, profiling
```

Im Nachhinein fallen mir zwei Details besonders auf:

1. **`Project/` vs. `Series/`.** Das Unreal-Projekt befindet sich in einem Unterordner und nicht im Stammverzeichnis des Repos. Das ist ungewöhnlich – in den meisten UE-Repos liegt die Datei `.uproject` im Stammverzeichnis. Aber dadurch wird das mentale Modell bekräftigt, dass das Projekt nur *eine Komponente* einer größeren Produktionsmaschine ist. `Series/Episode01` bis `Episode36` sind bereits als Platzhalter angelegt und signalisieren vom ersten Tag an: „Das Tutorial ist das Endprodukt.“

2. **Die Sicherheitsvorkehrungen waren von Anfang an vorhanden.** Die Datei `.gitignore` schloss bereits das Steam-SDK, Server-Builds und geheime Konfigurationsdateien aus:

```
# Private / Sensitive
Steam/SDK/
Steam/*.sdk
Server/Builds/
Server/Config/*.secret.*
Tools/EpisodeExporter/config.local.*
```

Es mussten später nie Geheimnisse beseitigt werden, da es strukturell unmöglich war, sie zu verbergen.

---

## Details zur Umsetzung

### 1. Definieren Sie zunächst die „Quelle der Wahrheit“ in der README-Datei

Die ursprüngliche README-Datei wurde verfasst, bevor überhaupt Code existierte, und erfüllt gleich zwei Zwecke: Sie beschreibt die *endgültige* Demo (Klicken zum Bewegen, Zielauswahl, GAS-Fähigkeiten, NPC-KI, Multiplayer, Steam) und dokumentiert die Philosophie des Repositorys – *„Das öffentliche Repo wird nur die sauberen, schrittweisen Episoden-Snapshots enthalten.“*

Das Verfassen der README-Datei als Erstes zwang mich dazu, mich darauf festzulegen, was das Projekt *eigentlich* war, sodass jede spätere Entscheidung daran gemessen werden konnte.

### 2. Das Unreal-Projekt anhand der „TopDown“-Vorlage einrichten

Der zweite Commit (`11b0994`) importiert eine abgespeckte Version der „TopDown“-Vorlage von Unreal. Ich habe bewusst die Kernkomponenten beibehalten – `Character`, `PlayerController`, `GameMode`, Cursor-Effekte und die Eingabeaktionen –, da mir dies einen garantiert funktionierenden Ausgangspunkt bot, und anschließend die Demo-Varianten entfernt, die ich nicht benötigte.

Die Datei `Build.cs` enthält die Modulabhängigkeiten, von denen ich von Anfang an wusste, dass ich sie benötigen würde:

```csharp
PublicDependencyModuleNames.AddRange(new string[] {
    "Core",
    "CoreUObject",
    "Engine",
    "InputCore",
    "EnhancedInput",
    "AIModule",
    "NavigationSystem",
    "Niagara",
    "UMG"
});
```

Beachte, was noch *nicht* vorhanden ist: `GameplayAbilities`. GAS ist eine bekannte zukünftige Anforderung, aber ich habe die Grundlage bewusst minimal gehalten – Module werden erst hinzugefügt, wenn das System, das sie benötigt, fertig ist, nicht vorher. Das Projekt hieß zu diesem Zeitpunkt noch `MPTDARPG` (Multi-Player Top-Down ARPG).

### 3. Erstellen Sie Vorlagen, bevor Sie auch nur ein einziges Dokument verfassen

Anstatt die Dokumentation ad hoc zu verfassen, habe ich zunächst zwei Vorlagen erstellt (`7af828d`):

- `SYSTEM_DOCUMENTATION_TEMPLATE.md` – eine strukturierte Überschrift: Zweck, Verantwortlichkeiten, *Nicht-Verantwortlichkeiten*, Schlüsselklassen, Datenfluss, Replikationsregeln, Randfälle, Test-Checkliste.
- `EPISODE_SCRIPT_TEMPLATE.md` – Ziel, Kontext und Abhängigkeiten, Zusammenfassung auf hoher Ebene, technische Aufschlüsselung, Code-Schnipsel, häufige Fallstricke, Checkliste.

Der Abschnitt **„Nicht-Verantwortlichkeiten“** ist hier der heimliche Held. Er zwingt den Verfasser dazu, zu formulieren, was ein System *nicht* tut – und genau so lässt sich eine schleichende Ausweitung des Projektumfangs erkennen, bevor sie eintritt.

### 4. Erstellen Sie die Systemdokumentation als Batch-Datei

Nachdem die Vorlagen gesperrt waren, habe ich die ersten zehn Systemdokumente in einem Rutsch geschrieben (`31c241b`): NPC-KI, Gruppensystem, Spieler-KI, Pooling, Spawner, GAS, Zielauswahl für Fähigkeiten, Benutzeroberfläche, Multiplayer, Steam. Diese wurden nicht anhand des Codes verfasst – sie basierten auf der *Absicht* und beschrieben, was jedes System leisten sollte. Das ist ein Spezifikationsdokument, das zum Blaupapier für die gesamte Implementierungsarbeit wurde.

In einem zweiten Schritt (`c7b78be`) wurden die Dokumentationen zum Spielersystem, zum Zielsystem und zum PvP-System hinzugefügt und die Architekturübersicht um PvP erweitert. Beachten Sie das Muster: **Die Dokumentationen waren der erste Entwurf des Designs**, und der Code wurde später entsprechend angepasst – genau das Gegenteil des üblichen Ansatzes „zuerst der Code, dann die Dokumentation“.

### 5. Wählen Sie die Dokumentationswerkzeuge aus

Ich habe kurz eine Docsify-Website (automatisch generierte Seitenleiste, Hosting über GitHub Pages) in `460b0a8` ausprobiert. Einen Tag später habe ich sie (`75c1058`) zugunsten von Obsidian für die privaten Dokumente gelöscht und den Obsidian-Ordner zu `.gitignore` hinzugefügt:

```
# Obsidian
.obsidian/
.obsidian/workspace
.obsidian/workspace.json
```

Der Grund: Dieses Repo ist **privat**, daher benötigt es kein Webhosting. Obsidian bietet mir Verlinkungen im Wiki-Stil (ein riesiger Vorteil für ein Netzwerk mit 30 Dokumenten), eine Grafikansicht und freie Erkundung – und das alles lokal. Docsify wäre nur dann relevant, wenn diese Dokumente öffentlich zugänglich wären, was die Architektur bewusst verhindert. Die Tools sollten zur *tatsächlichen Bereitstellung* der Inhalte passen, nicht zum Trend der Woche.

### 6. Planung der Serie: Gliederungen, Drehbücher, Arbeitsablauf

Im Rahmen der Planung wurde die gesamte Serienproduktionskette aufgebaut:

- **Episodenliste** — 36 Episoden, gruppiert nach Phasen, jeweils mit einem einzeiligen Ziel.
- **Umfangsübersicht** — klare Projektgrenzen und Erfolgskriterien.
- **Serienübersicht** — Zielgruppe, Voraussetzungen, Lernergebnisse.
- **Episodenskripte 1–5** — vollständige Entwürfe (Projekteinrichtung, Top-Down-Kamera, „Click-to-Move“, Gegner-Spawner, „Click-to-Target“).
- **Verzweigungsstrategie** — `main`/`dev`/`feature/*`/`episode/*`-Zweige, mit der Regel, dass *keine Commits direkt in `main` oder `dev` erfolgen dürfen*.
- **Workflow für den Export von Episoden** — der Prozess, bei dem vor der Veröffentlichung erweiterte Funktionen aus einem Snapshot entfernt werden.

Zwei Planungsbeschlüsse sind besonders hervorzuheben:

**Das Branch-Modell spiegelt die Zwei-Repo-Strategie wider.** `episode/*`-Branches werden von `dev` abzweigt und *niemals zurückgemergt* – sie dienen als Staging-Bereiche für öffentliche Snapshots. Die Workflow-Dokumentation nennt sogar die einzelnen Schritte: Build in `/Project`, `episode/XX` erstellen, erweiterte Funktionen entfernen, in `Series/EpisodeXX/` kopieren, öffentlich pushen. Die gesamte Serienproduktion ist als wiederholbarer Prozess automatisiert.

**Die Reihenfolge der Episoden war nicht in Stein gemeißelt.** In `852748a` habe ich die Episoden 4 und 5 vertauscht – „Enemy Spawner“ kommt nun *vor* „Click-to-Target“ –, da der Spawner ein NPC-Lebenszyklus-System und das Zielen ein Spieler-Kampfsystem ist und sie somit in unterschiedliche Phasen gehören. Dies war eine Korrektur im Rahmen der Vorproduktionsprüfung, die genau deshalb entdeckt wurde, weil die Dokumentation zur Überprüfung vorlag.

### 7. Fügen Sie die Diagramme hinzu

Mit „Mermaid“ werden eingebettete Diagramme inline in allen zehn Systemdokumenten erstellt. Da Mermaid (anstelle von handgezeichneten Bildern) verwendet wird, befinden sich die Diagramme in denselben Dateien wie der Text, werden in Git versioniert und lassen sich bei Designänderungen mühelos aktualisieren. Das Architekturdokument wurde um ein mehrschichtiges Diagramm ergänzt: Spieler → Spieler-KI → Fähigkeitssystem → NPC-KI → Spawner+Pooling → Multiplayer → Steam, das zum visuellen Anker für das gesamte Projekt wurde.

### 8. Abschluss der Vorproduktion mit der Risikoprüfung

Die letzten Commits des Tages dienen ausschließlich der Produktionsverwaltung, und sie sind mein Lieblingsteil dieses Abschnitts:

- **Risikoidentifizierung** — 40 Risiken in 5 Kategorien.
- **Risikominderungsplan** — eine Minderungsstrategie pro Risiko mit den Leitlinien „Prototyp / Vereinfachung / Verzögerung“.
- **Produktionszeitplan** — ca. 12,5 Wochen für die private Demo, ca. 8 Wochen für die Episodenproduktion, ein 12-Monats-Kalender mit wöchentlichem Veröffentlichungsrhythmus.
- **Checkliste für die private Demo** — vollständige Aufgabenverfolgung von A1 bis A7.
- **Die Umbenennung** — `MPTDARPG` → **`Onset`**, 38 Verweise in 6 Dateien. Das Projekt hatte endlich einen richtigen Namen.

Die Bezeichnung der Leitlinien zur Risikominderung ist es wert, übernommen zu werden: Indem jedes Risiko in die Kategorien *Prototyp erstellen, vereinfachen oder verschieben* eingeordnet wird, wird der klassische Fehler vermieden, Risiken aufzulisten, ohne eine Entscheidung dazu zu treffen.

---

## Ergebnisse und Validierung

- Repository-Grundgerüst mit über 80 strukturierten Verzeichnissen und einer sicherheitsbewussten `.gitignore`-Datei – die *vor* jeglichem Code committet wurde.
- 10 Systemdokumente sowie Dokumente zu Spieler, Targeting und PvP, alle nach Vorlagen verfasst und miteinander verlinkt.
- Vollständige Serienplanung: Gliederung für 36 Episoden, 5 Skriptentwürfe, Verzweigungsstrategie, Export-Workflow.
- 40 identifizierte Risiken mit konkreten Maßnahmen zur Risikominderung und einem 12-monatigen Produktionszeitplan.
- Das Projekt erhielt offiziell den Namen **Onset**, eine saubere, auf TopDown basierende Grundlage wurde importiert und eine tägliche TODO-Rhythmik (27. Mai – 4. Juni) für die erste Entwicklungsphase wurde festgelegt.

**Was *nicht* gemacht wurde:** kein Gameplay-Code über die Basisvorlage hinaus, kein GAS, keine KI-Systeme. Das war der Sinn der Sache – die Grundlagenphase war bewusst „code-light“, damit Designentscheidungen kostengünstig auf dem Papier getroffen werden konnten, bevor sie stundenlange Überarbeitungen erforderten.

---

## Herausforderungen und Lösungen

### Das Docsify-Experiment

**Problem:** Ich wollte eine Website mit navigierbarer Dokumentation und habe ganz automatisch zu Docsify gegriffen – das ist schließlich das Tool, mit dem alle prahlen.

**Lösung:** Nach etwa zehn Minuten praktischer Nutzung wurde mir klar, dass die Dokumente privat und vorrangig lokal gespeichert sind; das Webhosting verursachte nur zusätzlichen Aufwand, ohne einen Mehrwert zu bieten. Ich bin zu Obsidian gewechselt, das dem Anwendungsfall eines privaten Wikis entspricht, und habe die Entscheidung in der `.gitignore`-Datei dokumentiert, anstatt eine verwirrende Sackgasse zu hinterlassen. **Erkenntnis:** Wähle Tools danach aus, wo sich die Inhalte tatsächlich befinden und wer sie liest – und nicht danach, was in einer Demo beeindruckend aussieht.

### Zielgenauigkeit unter Druck

**Problem:** Beim Verfassen der Systemdokumentation war die Versuchung groß, jede Funktion zu dokumentieren, die ich mir jemals gewünscht hatte (die „Alles ist Kern“-Falle).

**Lösung:** Das Vorlagenfeld „Non-Responsibilities“ erzwang explizite Ausschlusserklärungen, und die Übersicht über den Umfang legte feste Projektgrenzen fest. Der Episoden-Tausch (E4/E5) zeigte, dass der Überprüfungszyklus funktionierte: Da die Dokumente als zusammenhängendes Ganzes vorlagen, war eine falsch platzierte Episode *sichtbar* und ließ sich mit geringem Aufwand korrigieren.

### Die Angst vor dem „Schreiben von Spezifikationen vor dem Programmieren“

**Problem:** Es gibt einen echten mentalen Widerstand dagegen, Hunderte von Zeilen Dokumentation für Systeme zu schreiben, die es noch gar nicht gibt – es kommt einem wie vergebliche Mühe vor.

**Lösung:** Ich habe die Dokumente als *Spezifikation* und nicht als Dokumentation betrachtet. Sie haben die Fragen zur Architektur geklärt (was wird repliziert, was ist serverseitig maßgeblich, wie funktioniert die PvP-Filterung), bevor Änderungen noch Kosten verursacht hätten. Der Vorteil dabei ist, dass in späteren Phasen auf der Grundlage eines bekannten Designs implementiert werden konnte, anstatt dieses neu zu entwickeln.

---

## Reflexion und gewonnene Erkenntnisse

Die wichtigste Erkenntnis aus dieser Phase: **Die Struktur des Repositorys ist eine Produktentscheidung und keine reine Verwaltungsaufgabe.** Das Vorab-Erstellen von `Series/Episode01-36`, noch bevor ich auch nur eine einzige Funktion geschrieben hatte, verpflichtete mich zur „Tutorial-First“-Philosophie. Das Vorab-Festlegen der Sicherheitsregeln in `.gitignore` bedeutete, dass ich niemals ein Geheimnis rückgängig machen musste. Und das *vorherige* Verfassen der README-Datei gab jeder nachfolgenden Entscheidung einen Anker.

Ich habe auch gelernt, den Preis der Entscheidungsfreiheit zu respektieren. Jede Vorlage, jede Dokumentenstruktur und jede Konvention zur Verzweigung war eine *Einschränkung*, für die ich mich bewusst entschieden habe – und genau diese Einschränkungen haben die schnelle Iteration in späteren Phasen erst möglich gemacht.

Was ich anders machen würde: Ich hätte den Versuch mit Docsify wahrscheinlich ganz übersprungen (er hat zwei Commits gekostet, ohne einen bleibenden Nutzen zu bringen), und ich hätte die Dokumente zu Risiken und deren Minderung vielleicht etwas früher entworfen, da sie mehrere tatsächliche Hindernisse korrekt vorhergesagt haben, die Monate später auftraten (Konflikte bei den Eingabemethoden, unerwartete Probleme bei der Vernetzung dedizierter Server).

Das Prinzip, das sich als am wertvollsten erwiesen hat – und das ich in jedes Projekt einbringen würde –, ist die **„Document-First“-Entwicklung**: Man verfasst die Spezifikation vor der Umsetzung, sodass der Code dafür sorgt, dass die Dokumentation der Realität entspricht, und nicht umgekehrt.

---

## Zukunftsbezogene Aussagen

| Phase | Status |
|---|---|
| Repository-Gerüst, Dokumentationssystem, Serienplanung | ✅ Abgeschlossen |
| Überprüfung vor der Produktion, Risiken/Zeitplan, Umbenennung in „Onset“ | ✅ Abgeschlossen |
| A1 – Spielerkern & Eingabe (EnhancedInput, Kamera, Bewegung, Zielerfassung) | ⏭️ Als Nächstes |
| A2 – NPC-Lebenszyklus (Spawner, Pooling, Gruppen) | Geplant |
| A3 – KI (StateTrees, Wahrnehmung) | Geplant |
| A4 – Kampf (GAS, Tod, Leichen) | Geplant |
| A5 – Multiplayer & Steam | Geplant |

**Was als Nächstes ansteht:** Die Dokumentation hat mir einen Plan an die Hand gegeben, aber die eigentliche Bewährungsprobe beginnt erst jetzt. In der nächsten Phase wird auf der TopDown-Basis der eigentliche Kern des Onset-Players aufgebaut – das eingabeunabhängige Bewegungssystem, das Maus, Touch, Tastatur und Gamepad gleichzeitig unterstützt. Die täglichen Aufgaben für den 27. Mai stehen bereits auf der Liste.

> **Nächstes Mal in Beitrag 2:** Das Projekt „Bootstrap“ geht richtig los – wir entfernen die TopDown-Vorlage, initialisieren das leere Onset-Projekt neu und legen die A1-Spielersysteme (Eingabepipeline, Kamera, Bewegung) fest, auf denen alles andere aufbauen wird.

---

*Der Serienindex und die Vorlagen befinden sich unter [`Planning/Outlines/`](../Planning/Outlines/) und [`Planning/Templates/`](../Planning/Templates/). Quelle: Dieser Handlungsbogen umfasst die Commits von `88359a6` bis `2c82a9a`.*
