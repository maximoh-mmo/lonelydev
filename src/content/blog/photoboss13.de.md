---
id: "photoboss13"
title: "🧹 Die große Aufräumaktion: Ein vierstufiger Weg zu sauberem Code"
seoTitle: "Die große Aufräumaktion: Ein vierstufiger Weg zu sauberem Code"
date: "2026-05-08"
category: "Softwareentwicklung"
summary: "Ein Entwickler stellt seine vierphasige Strategie zur Bereinigung eines gut durchschauten Code-Bestands vor, die auf der Entfernung von totem Code, der Zentralisierung der Konfiguration, der Beseitigung von Duplikaten und der Durchsetzung von Namenskonventionen basiert. Der Prozess erstreckte sich über zwei Wochen und verbesserte die Wartbarkeit, ohne neue Funktionen hinzuzufügen."
project: "photoboss"
tags: ["code cleanup", "refactoring", "software engineering"]
status: "scheduled"
isAutoTranslated: true
---

# Die große Aufräumaktion: Ein vierstufiger Weg zu sauberem Code

Ich arbeite seit Monaten fast täglich an diesem Code. Ich kenne ihn ziemlich gut – ich finde beim Debuggen sofort die richtige Datei, weiß noch, wo ich bei halbfertigen Funktionen aufgehört habe, und so weiter. Als es also an der Zeit war, Photoboss für die Veröffentlichung vorzubereiten, ging ich nicht völlig unvorbereitet an die Sache heran. Ich wusste ziemlich genau, was mich erwartete.

Allerdings sammelt sich selbst in vertrautem Code Unordnung an, wenn man sich voll und ganz auf die Umsetzung neuer Funktionen konzentriert hat. Kleine Experimente, die nicht funktioniert haben, TODO-Kommentare aus der frühen Implementierungsphase, Konstanten, die inline kopiert statt zentral verwaltet wurden, und eine Namensgebung, die sich im Laufe der Zeit mit meinem Stil weiterentwickelt hat. Nichts Schlimmes – keine Sicherheitsprobleme oder algorithmisches Durcheinander –, nur die normale Ansammlung von Unordnung, die bei einem aktiv entwickelten Projekt entsteht. Ich dachte mir, da ich ohnehin dabei war, den Code zu überarbeiten, könnte ich genauso gut auch einige dieser losen Enden beseitigen.

Was als „Lass uns ein paar Dinge aufräumen“ begann, entwickelte sich zu vier verschiedenen Phasen.

## Phase 1: Die schnellen Erfolge

Beim ersten Durchgang ging es darum, die offensichtlichen Probleme zu finden – toten Code, der zwar kompiliert, aber nicht aufgerufen wurde, fest codierte Werte, die auf zentralisierte Konstanten verweisen sollten, sowie Kommentare, die ihren Zweck bereits erfüllt hatten.

Die Struktur `SimilarityWeights` in `GroupTypes.h` war der entscheidende Punkt. Ich hatte sie schon früh als geplanten Ersatz für die Ähnlichkeitskonfiguration erstellt, war dann mit dem Ansatz in eine andere Richtung gegangen, hatte den Prototyp aber nie gelöscht. Die Gewichte unterschieden sich von denen, die ich letztendlich in `SimilarityEngine::Config` verwendet habe (0,45 gegenüber 0,60 für pHash), sodass jeder, der versucht hätte, sie zu nutzen, falsche Ergebnisse erhalten hätte. Toter Code, der Fehler verursacht hätte, wenn jemand versucht hätte, ihn zu nutzen – es lohnte sich, ihn zu entfernen.

Ein fest codierter Wert von `140` in `ImageThumbWidget.cpp`, der eigentlich `settings::ThumbnailWidth` hätte lauten sollen – dieser war bereits in `AppSettings.h` definiert, wurde aber nicht verwendet. Und ein TODO-Kommentar in `MainWindow.cpp` mit dem Wortlaut „Tatsächliches Löschen in den Papierkorb implementieren“, der noch aus der Zeit stammte, als ich diese Funktion vor Jahren erstmals entwickelt hatte. Die Funktionalität war längst implementiert, nur der Kommentar war noch vorhanden.

Die Sache mit `parentWidget()->parentWidget()` in `onGroupUpdated` war tatsächlich interessant. Ich hatte das in Eile geschrieben, um die Logik für das Warten auf Miniaturansichten zum Laufen zu bringen, und dabei zwei Aufrufe der übergeordneten Ebene verwendet, um die Qt-Widget-Hierarchie nach oben abzuklappern und zu überprüfen, ob ein `ImageThumbWidget` zum richtigen `GroupWidget` gehörte. Der Kommentar direkt daneben lautete „sehr hacky“ – was, zugegeben, auch stimmte. Nachdem ich die tatsächlichen Widget-Beziehungen aufgezeichnet hatte (das übergeordnete Element von `ImageThumbWidget` ist `GroupWidget`, also muss man nur das direkte übergeordnete Element prüfen), war die Lösung sauberer als das Original. Eine dieser Sachen, die gut funktionieren, bis jemand die Hierarchie ändert – und dann nicht mehr.

Alles nur kleine Änderungen, aber sie summierten sich. Etwa ein Tag Arbeit, verteilt auf mehrere Sitzungen.

## Phase 2: Konfiguration anpassen

Die Schwellenwerte für die Ähnlichkeitserkennung waren direkt in die Hash-Logik integriert – Werte wie 0,98 und 0,94 wurden direkt in die Vergleiche eingebettet. Das funktioniert gut, wenn man den Code kennt, ist aber nicht leicht zu erkennen, wenn jemand verstehen möchte, was die Empfindlichkeit der Erkennung steuert.

Ich habe einen Konfigurationsabschnitt in `AppSettings.h` hinzugefügt:

```cpp
static inline constexpr double SimilarityStrongThreshold = 0.97;
static inline constexpr double SimilarityWeakThreshold = 0.92;
static inline constexpr double SimilarityPHashGate = 0.98;
static inline constexpr double SimilarityDHashGate = 0.94;
```

Diese habe ich dann als Standardwerte in `SimilarityEngine::Config` hinterlegt. Nun sind die Schwellenwerte an einem Ort zusammengefasst, mit Namen, die ihren Zweck verdeutlichen, und die Engine liest die Werte aus einem Konfigurationsobjekt statt aus „magischen“ Werten. Das Gleiche gilt für die Zeitwerte der Benutzeroberfläche – Intervalle für Batch-Timer, Abmessungen von Scrollbereichen und Größen von Dialogfeldern. Alle wurden in zentralisierte Konstanten mit eindeutigen Namen verschoben.

Die Korrektur hinsichtlich der Typsicherheit war weitreichender. Die Klasse `GroupWidget` verfügte über eine Methode, die mithilfe von `reinterpret_cast` einen Strukturtyp als einen anderen behandelte:

```cpp
result.push_back(reinterpret_cast<const HashedImageResult*>(&thumb->Image()));
```

Technisch hat es funktioniert – die Speicheranordnung war kompatibel –, aber es war technisch nicht korrekt. Hätten sich die Strukturen jemals auseinanderentwickelt, wäre es zu einer stillen Datenverfälschung gekommen. Ich habe es durch eine einfachere Version ersetzt, die lediglich eine Zählung zurückgibt, anstatt auf interne Strukturen zu verweisen. Eine schlankere API, eine korrekte API.

## Phase 3: Beseitigung doppelter Logik

Das hat mich überrascht, als ich es entdeckt habe. Zwei Implementierungen derselben EXIF-Ausrichtungsumwandlung – dieselbe switch-Anweisung zur Anwendung der Drehung auf Basis von EXIF-Tags, an zwei Stellen kopiert.

`HashWorker.cpp` hatte eine eigene Version, und `OrientImage.cpp` enthielt ein Hilfsprogramm, das dasselbe tat, aber mit besserer Fehlerbehandlung. Ich habe die erste Version geschrieben, später dann das Hilfsprogramm erstellt und schließlich die Worker-Version verwendet, anstatt auf das Hilfsprogramm umzustrukturieren. Ein klassischer Fall.

HashWorker wurde umgestaltet, um die vorhandene Funktion `OrientImage` aufzurufen:

```cpp
QImage img;
img.loadFromData(item->imageBytes);
img = OrientImage(img, item->fileIdentity.exif().orientation.value_or(1));

if (img.isNull()) {
    result->source = HashSource::Error;
}
```

Acht Zeilen statt sechzig. Das Dienstprogramm verarbeitet bereits die vorzeitige Rückgabe für nicht gedrehte Bilder, sodass diese Optimierung nicht doppelt implementiert werden muss. Jetzt gibt es nur noch eine einzige Quelle der Wahrheit.

Beim Durchsehen der Überarbeitung ist mir aufgefallen, dass ich zunächst vergessen hatte, den Rückgabewert zuzuweisen – die Funktion wurde also aufgerufen, ohne das Ergebnis zu erfassen. Gedrehte Bilder wären stillschweigend fehlgeschlagen. Das Problem wurde noch vor der Veröffentlichung behoben, aber es handelt sich um einen jener subtilen Fehler, die durch doppelten Code entstehen – leicht unterschiedliche Implementierungen, die sich nicht ganz gleich verhalten.

## Phase 4: Einheitliche Namensgebung

Nach drei Aufräumphasen störten mich die Namenskonventionen zunehmend. Einige Member-Variablen hatten das Präfix `m_`, andere nicht. Einige endeten mit einem Unterstrich, andere nicht. Eine Mischung, die sich im Laufe der Zeit herausgebildet hatte.

Angepasst an die Qt-Konvention: `m_memberName_` – Präfix „m“, CamelCase, Unterstrich am Ende. Entspricht der Verwendung im Qt-eigenen Code. Mehrere Dateien, vielleicht fünfzig Variablen wurden umbenannt. Jetzt ist es vorhersehbar – sieht man einen Bezeichner mit diesem Muster, weiß man, dass es sich um eine Member-Variable handelt.

## Das Ergebnis

Eine Woche Aufräumarbeit, verteilt auf mehrere Programmier-Sitzungen. Keine Sicherheitslücken gefunden, keine algorithmischen Überarbeitungen, keine neuen Funktionen hinzugefügt. Nur die üblichen Feinarbeiten, die aktiv weiterentwickelte Projekte benötigen.

Der Code ist jetzt übersichtlicher. Konsistenter. Besser geeignet, von anderen gelesen und verstanden zu werden. Das ist das Ziel – Code, der denjenigen, die ihn pflegen, keine Steine in den Weg legt. Auch wenn ich am Ende der Einzige bin, der das tut!
