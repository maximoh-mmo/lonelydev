---
id: "website1"
title: "🖥️ Design für Recruiter: Der X-Ray-Held \"Spieler vs. System\" & Aufmerksamkeitsgeordnete Bewegungschoreografie"
seoTitle: "Design für Personalvermittler: Der „X-Ray-Player“ im Vergleich zum „System-Hero“ und die Choreografie von bewegungsorientierten Aufmerksamkeitsabläufen"
date: "2026-12-04"
category: "Software Engineering"
summary: "Neugestaltung von maxheinze.com mit einem interaktiven „Player View vs. System View“-X-Ray-Helden-Overlay für „Kyoto Conflict“, datengestützten Diagrammen zur Multiplayer-Autorität sowie einer in einem Durchgang erstellten Bewegungssequenz, die auf die Aufmerksamkeitsreihenfolge der Rekrutierer abgestimmt ist."
project: "Portfolio"
tags: ["React", "Portfolio Design", "UI Engineering", "SVG", "Motion Design", "Accessibility", "Unreal Engine"]
status: "scheduled"
isAutoTranslated: true
---
## Einführung: Das Portfolio-Paradoxon des Systemprogrammierers lösen

Als ich in **onset29'** erklärte, warum ich mich von einem Solo-MMO entfernt habe, habe ich auf ein zentrales Dilemma hingewiesen, mit dem sich jeder Gameplay- und Multiplayer-Programmierer konfrontiert hat: **Die härteste Ingenieursarbeit, die wir leisten, ist auf einem Screenshot unsichtbar.**

Man kann Wochen damit verbringen, Race-Conditions auf einem Listen-Server zu beheben, Berechtigungsgrenzen für einen dedizierten Server zu entwerfen oder eine cache-orientierte Multithread-Pipeline aufzubauen – und wenn ein Personalvermittler auf Ihrer Homepage landet, sieht er einen Screenshot aus dem Spiel, der ihm so gut wie nichts darüber verrät, *welche Teile Sie entwickelt haben* oder *wie sich das System unter Last bewährt*.

In über **28 Commits** auf `maximoh-mmo/lonelydev` (von `eab02ff` bis `02dea04`) habe ich **maxheinze.com** von Grund auf neu gestaltet, um diese Lücke zu schließen – damit lässt sich die Backend-Architektur nun auf einen Blick überprüfen, ohne dass dabei die visuelle Qualität beeinträchtigt wird.

---

## 1. Der interaktive „Spieler-Ansicht vs. System-Ansicht“-X-Ray-Hero

Anstatt die Startseite mit allgemeinen Stichpunkten zur Unternehmensgeschichte zu beginnen, zeigt der neu gestaltete Hero-Bereich (`src/pages/Home.jsx`) zunächst das Key Art von **Kyoto Conflict** – unserem 13-Spieler-Online-FPS im Capture-the-Flag-Modus, der auf der Unreal Engine basiert – und überlagert dieses direkt über dem Frame mit einem ein- und ausblendbaren **X-Ray-System-Overlay** (`src/components/KyotoHeroSystems.jsx`) direkt über das Bild.

Ein Besucher kann jederzeit zwischen zwei Ansichten desselben Features wechseln:
* **Spieleransicht:** Zeigt die rohe Gameplay-Szene, versehen mit zwei prägnanten Anmerkungen der Entwicklungsleiter: *„Die Steuerung der Vorwärtsbasis aktualisiert die Spawn-Berechtigung“* und *„Der Server ist für jeden Flag-Zustandsübergang verantwortlich.“*
* **Systemansicht:** Zeigt eine manuell erstellte SVG-Nachbildung unseres Unreal-Blueprint-Graphen (`PickupFlag`: `OnPickedUpEvent`, `OnRespawnEvent`, `OnFlagReturnedHome`, `Set Visibility` sowie Wwise-`PostEvent`-Aufrufe), die direkt neben der maßgeblichen C++-Methode `AKyotoPickupFlag::GivePickupTo()` dargestellt wird – wobei `SetFlagStatus(EKyotoFlagStatus::Held)`, `ServerRPC_SetHasFlag(true)` und `DropFlagDelegate.BindUFunction`.

```text
+-------------------------------------------------------------------+
|  [ Player View ]  [ System View ]                                 |
|                                                                   |
|  1. Blueprint Graph (SVG)                                         |
|     OnPickedUpEvent ---> Set Visibility (false) ---> PostEvent    |
|                                                                   |
|  2. Server-Authoritative C++ (KyotoPickupFlag.cpp)                |
|     state->SetFlagStatus(EKyotoFlagStatus::Held);                 |
|     PlayerState->ServerRPC_SetHasFlag(true);                      |
|     FlagHolder->DropFlagDelegate.BindUFunction(this, "DropFlag"); |
+-------------------------------------------------------------------+
```

Anstatt zu behaupten: *„Ich kenne mich mit Unreal C++ und Replikation aus“*, stellt das erste Ansichtsfenster innerhalb von fünf Sekunden nach dem Laden der Seite **den verifizierten Blueprint-Ausführungsablauf, die C++-RPC-Kompetenz und einen spielbaren Proof** nebeneinander dar.

---

## 2. Evidenzbasierte Fallstudien und interaktive Kompetenzgrenzen

Diese Philosophie – „Zeigt die Architektur, nicht nur den Werbetext“ – zieht sich über die gesamte Startseite bis hin zu den speziellen Projektseiten (`cd50432`, `dc2a410`, `c8de5ff`) fort:

* **Kyoto-Konfliktfallstudie ('CaseStudy.motion.css'):** Zerlegt die End-to-End-Capture Flag-Eigenschaft mit einem animierten **Capture Path**-Flow ('At base → Pickup → Carried → Capture → Score and Reset' plus dem 'Dropped → Returned'-Zweig), einem 3-spaltigen **Player → Listen-Server-Host → Jeder Client**-Autoritätsaufteilung und offenen architektonischen Kompromissen (wie dem Blueprint-reinen Workflow eines externen Programmierers für Kompatibilität mit reiner C++-Reinheit). 
* **Onset Authority Boundary Map ('Home.jsx'):** Rendert eine dreispurige Architekturkarte (*Gameplay-Pfad*, *KI & Simulation*, *Online & Daten*), oberhalb begrenzt durch den **Server-autoritativen C++-Kern** und unten verankert durch **Dedicated Server (autoritative Simulation & State)**. Das Schweben oder Fokussieren einer Lane beleuchtet den gesamten Weg von der Eingabe bis zur Persistenz. 
* **PhotoBoss Pipeline Evidence:** Koppelt den Dark-Mode-Duplikat-Review-Screenshot direkt mit der architektonischen Korrekturnotiz, die dokumentiert, wie SQLite-Caching und "Direct-to-Size"-Dekodierung wiederholte 50.000-Bild-Scans von Minuten auf Sekunden reduzieren.

---

## 3. Auf die Aufmerksamkeit abgestimmte Bewegungschoreografie

Zu viele Entwicklerportfolios verteilen durchgehend schwebende Karten, Schreibmaschinenverzögerungen und wiederholende Schimmers über jedes Element auf dem Bildschirm. In [MOTION-DIRECTION.md](https://github.com/maximoh-mmo/lonelydev/blob/main/MOTION-DIRECTION.md) habe ich strenge Regeln durchgesetzt: **ein dominantes Aufmerksamkeitssignal pro Viewport, null Scroll-Hijacking, und jede Animation fügt sich einmal in ein starkes statisches Design über.**

Jede Millisekunde der Heldensequenz ("Home.motion.css") folgt einer bewussten **Auftrag zur Aufmerksamkeit des Rekrutierers** (*Rolle & Relevanz → Anspruch → Handlung → Beweis → Kontext*):

| Zeitstempel | Visuelles Hinweis | Aufmerksamkeitsziel |
| :---: | :--- | :--- |
| **'0,00s'** | Rollen-Kicker & vollständige Überschrift sofort sichtbar | Null versteckter Text bei der ersten Malung |
| **'0.15s'** | Cyanfarbener Akzent zieht sich unter die letzte Zeile von *"unter Druck." * | Kernanspruch im Ingenieurwesen |
| **'0.55s'** | Hintergrundmarkierung zieht sich über *"Gameplay, Multiplayer und Werkzeuge"* | Rolle & Relevanz |
| **'0,85s'** | Primäre CTA-Unterstreichung erstreckt sich auf die volle Breite ('1,3s'-Pfeilanstoß) | Primäre Aktion (Fallstudie) |
| **'1.05s – 1.40s'** | Nachweis-Grenzregeln ziehen sich nach unten, dann wird jeder Eigentumsanspruch begleicht | Verifizierter Nachweis |
| **'1,60s – 1,95s'** | Bild-Leitlinien, Punkte und Kontextbezeichnungen erweitern sich | Spielkontext |
| **'2.05s+'** | Blueprint-Drähte werden nachgezeichnet und Schlüsselzeilen C++ werden in der Reihenfolge hervorgehoben | Systemarchitektur enthüllt |
| **'2.60s'** | Scroll-Cue stößt sanft zweimal an, dann ruht es | Nächstes Kapitel |

### Mehrsprachige Linienwickel-Präzision mit 'getClientRects()' lösen
Da die Seite vollständig zweisprachig (**Englisch** und **Deutsch**) ist, erstreckt sich der Schlagzeilensatz *"unter Druck." * / *"unter Druck bestehen." * erhält sich unterschiedlich über Desktop-, Tablet- und Mobilbildschirmbreiten. Eine naive '::after { width: 100% }' Unterstrich auf einem umwickelten Inline-'<span>' erstreckt sich über die gesamte Boxbreite statt mit der tatsächlichen letzten Textzeile übereinzustimmen.

In 'Home.jsx' liest ein 'ResizeObserver' zusammen mit 'document.fonts.ready' 'text.getClientRects()' und weist '--echo-left' und '--echo-width' dynamisch aus dem **letzten Client-Rect** zu, wodurch sich die cyanfarbene Akzentunterstreichung sauber unter dem endgültigen gerenderten Wort in jeder Sprache und in jeder Sichtfensterbreite einschlägt.

### Resilienz unter 'bevorzugt-reduzierte-Bewegung' und No-JS
Abschnitte unterhalb des Folds verwenden einen einzigen gemeinsamen 'IntersectionObserver' ('Schwellenwert: 0,16', sofort nach einmaliger Aktivierung unbeobachtet). Entscheidend ist, dass '.motion-ready' nur angehängt wird, wenn JavaScript ausgeführt wird, und 'prefers-reduced-motion: reduce' ist **nicht** aktiv – was keine unsichtbaren Elemente gewährleistet, falls JS fehlschlägt, und die abgeschlossene statische Betonung für Benutzer mit reduzierter Bewegung sofort angezeigt wird.

---

## Als Nächstes: Unter der Haube von maxheinze.com

Das Design des visuellen Erlebnisses brachte außerdem drei knifflige Frontend- und Build-Pipeline-Probleme ans Licht: Artefaktfreie umrissene Typografie für Windows, Linux und macOS zu erhalten; 60+ zweisprachige Blogbeiträge schnell zu indexieren; und die Verhinderung von Deep-Link-404s auf Cloudflare-Seiten. Wir analysieren diese Lösungen in **'website2'**.
