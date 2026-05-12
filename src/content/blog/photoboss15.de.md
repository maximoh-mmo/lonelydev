---
id: "photoboss15"
title: "🚀 Engineering Diary: Pipeline-Refactoring und Parallelleistungsgrundlagen"
seoTitle: "Entwicklertagebuch: Überarbeitung der Pipeline und Grundlagen der Parallel-Performance"
date: "2026-05-22"
category: "Softwareentwicklung"
summary: "Der Beitrag beschreibt einen dreitägigen Sprint, der eine monolithische Bildverarbeitungspipeline mit einer Fabrik in Einzelverantwortungsstufen umstrukturierte, deterministische Start- und Stoppgarantien hinzufügte, parallele Thread-Pools, einen OpenGL-Spinner und einen schnellen Thumbnail-Generator einführte. Das neue Design verbessert die Responsivität der Benutzeroberfläche, ermöglicht konfigurierbare Parallelität für verschiedene Hardware und bereitet die Grundlage für SSD- vs. HDD-Leistungstests."
project: "photoboss"
tags: ["Pipeline", "Parallelism", "Refactoring", "Performance", "UI", "Testing"]
status: "scheduled"
isAutoTranslated: true
---

# Überarbeitung der Pipeline und Grundlagen der Parallelverarbeitung

*„Drei Tage, ein paar tausend Zeilen Code und eine Benutzeroberfläche, die sich endlich reaktionsschnell anfühlt – das ist die Geschichte des jüngsten Sprints von PhotoBoss.“*

---

## Einführung

Im vorherigen Beitrag haben wir **speicherbasiertes Scannen** hinzugefügt, damit die Benutzeroberfläche den Benutzern genau sagen kann, wie viele Bytes gelesen werden. In dem Moment, als diese Zahl in der Statusleiste erschien, sprudelten neue Fragen aus der Benutzeroberfläche:

* *Wie viele Dateien haben wir bereits bearbeitet?*  
* *Welche Phase der Pipeline läuft aktuell?*  
* *Warum verschwindet der Spinner manchmal bei langen Scans?*

Unsere bestehende Pipeline war eine **monolithische Kette**, in der eine Handvoll Klassen mehrere unabhängige Aufgaben ausführten (Dateien aufzählen, EXIF-Daten lesen, Hashes berechnen, Duplikate gruppieren). Diese Klassen verwalteten auch ihre eigenen Threads und Warteschlangen, wodurch die Benutzeroberfläche gezwungen wurde, direkt in den internen Status zu schauen, um Fortschrittsaktualisierungen zu erhalten. Das Ergebnis war eine fragile Kopplung, die jedes Mal brach, wenn wir die Implementierung einer Phase änderten, und die Benutzeroberfläche konnte leicht asynchron werden, was zu den Spinner-Sichtbarkeitsfehlern führte, die Sie gesehen haben.

Der dreitägige Sprint drehte sich daher darum, **die Pipeline neu zu gestalten**, damit sie Folgendes erreichen kann:

1. **Sauberen Fortschritt pro Stufe offenlegen**, ohne dass die Benutzeroberfläche in die Inneren gräbt.
2. **Die schweren Teile parallel laufen lassen**, wo die Hardware tatsächlich profitieren kann.
3. **Sauber abschalten**, selbst wenn ein Nutzer einen Scan mitten im Flug abbricht.
4. **Thumbnails sofort liefern**, damit das Bildraster nie einfriert.

Im Folgenden gehe ich die konkreten Veränderungen durch, die Beweggründe hinter jeder einzelnen und wie sie uns auf den nächsten Meilenstein vorbereiteten – einen SSD- vs. HDD-Leistungs-A/B-Test.

---

## 1. Single-Responsibility-Phasen und eine fabrikgefertigte Pipeline

### Was hat sich geändert? * Einführung einer „PipelineFactory“, die **reine Bühnenobjekte** miteinander verbindet: * „FileEnumerator“ – durchläuft den Verzeichnisbaum und gibt Dateipfade aus. * „ExifRead“ – analysiert EXIF-Blöcke parallel. * „HashWorker“ – berechnet Wahrnehmungs-Hashes. * „Gruppierung“ – erstellt doppelte Gruppen aus Hash-Ergebnissen. * „ThumbnailGenerator“ – erstellt Miniaturansichten in Benutzeroberflächengröße. * Jede Stufe erbt von einer einfachen „StageBase“ und implementiert eine einzelne „run()“-Methode.

### Warum es wichtig ist
* **Klarheit** – Entwickler können eine Stage lesen und sofort ihren Zweck erkennen.
* **Testability** – eine Stufe kann instanziiert, mit einer deterministischen Warteschlange versorgt und verifiziert werden, ohne die vollständige Benutzeroberfläche zu starten.
* **Erweiterbarkeit** – das Hinzufügen einer neuen Stufe (z. B. eines zukünftigen KI-Ähnlichkeitsdetektors) ist so einfach wie das Erstellen einer Klasse und deren Registrierung bei der Fabrik; kein UI-Code muss sich ändern.

---

## 2. Deterministische Startup- und Sofortstopp-Garantien

### Was hat sich geändert?
* 'PipelineController::stop()' löscht jetzt **jede interne Warteschlange** und ruft 'notifyAll()' auf jeder auf, um wartende Threads zu wecken.
* Alle Stufen registrieren sich als Produzenten **in ihren Konstruktören**, nicht träge während 'onStart()'.

### Warum es wichtig ist
* Benutzer können jederzeit auf **Stopp** klicken, ohne das Risiko einzugehen, dass vereinzelte Arbeitselemente später den SQLite-Hash-Cache beschädigt oder die Benutzeroberfläche zum Absturz bringen.
* Die Abschaltsequenz ist jetzt vollständig deterministisch, was das Debuggen deutlich erleichtert.

---

## 3. Parallelität, wo es sich auszahlt

### Was hat sich geändert?
* Separate Thread-Pools für I/O-gebundene ('FileEnumerator') und CPU-gebundene ('ExifRead', 'HashWorker') arbeiten.
* Warteschlangen sind pro Stufe groß dimensioniert, sodass die schnellere Stufe die langsamere Stufe füttern kann, ohne den Speicher zu überfordern.

### Warum es wichtig ist
* **SSD-Workloads** – Festplattenlesungen sind schnell, sodass die Hash-Arbeiter beschäftigt bleiben können und die Pipeline CPU-gebunden wird.
* **HDD-Workloads** – Der Enumerator-Threadpool wird gedrosselt, um zufälliges Such-Thrashing zu vermeiden, während die Warteschlangen größer werden, um die Latenz zu absorbieren.
* Die Benutzeroberfläche erhält nun **phasenspezifische Signale**, die unabhängig vom zugrundeliegenden Thread-Plan korrekt bleiben.

---

## 4. OpenGL Spinner-Widget

### Was hat sich geändert?
* Ersetzte den schwergewichtigen Qt-Spinner durch einen shadergesteuerten 'ShaderSpinnerWidget'.
* Das Widget respektiert die Dark-Theme-Palette und aktualisiert sich über einen hochauflösenden Timer.

### Warum es wichtig ist * Der Spinner bleibt auch dann **glatt und sichtbar**, wenn die Pipeline gesättigt ist, wodurch das Flimmern eliminiert wird, das bei der vorherigen Implementierung problematisch war. * Beim Rendern handelt es sich jetzt um einen winzigen GPU-Fragment-Shader, der praktisch keine CPU-Zyklen verbraucht.

---

## 5. Thumbnail-Pipeline-Überarbeitung

### Was hat sich geändert?
* 'ThumbnailGenerator' verwendet jetzt 'QImageReader::setScaledSize', um **direkt auf die Miniaturgröße zu dekodieren**.
* Die Orientierung wird **nur auf den winzigen Puffer** angewendet, nicht auf das Bild in voller Auflösung.
* Die Stufe läuft in einem eigenen Threadpool mit einer begrenzten Warteschlange, um UI-Updates flüssig zu halten.

### Warum es wichtig ist
* Die Pro-Bild-Verarbeitung sank von **~80 ms auf ~12 ms** – eine ~95 % Geschwindigkeitssteigerung.
* Der Speicherverbrauch ist deutlich geringer (kein vollauflösender QImage befindet sich im RAM), was UI-Einfrieren verhindert, wenn der Benutzer Ordner mit vielen hochauflösenden Fotos durchstöbert.

---

## 6. Konsistente Benennung und Stil

* Das Präfix 'm_' wurde für alle Mitgliedsvariablen übernommen.
* Klassennamen bereinigt ('ShaderSpinnerWidget', 'FileEnumerator').
* Ein einheitlicher Code-Stil macht die Codebasis für neue Mitwirkende zugänglich und gibt statischen Analysatoren ein klares Ziel.

---

## 7. Parallele vs. nichtparallele Pipelines – wann kommt es darauf an?

| Situation | Empfohlene Form | Grund |
|-----------|-------------------|--------|
| Winzige Bibliotheken (< 200 MB) | **Serial** – ein Worker-Thread für alle Stufen | Thread-Management-Overhead überwiegt jeden Vorteil; Das Debuggen bleibt unkompliziert. |
| Typische Verbrauchersammlungen (mehrere GB) | **Parallel** – unterschiedliche I/O- und CPU-Thread-Pools | Festplatten-I/O (besonders auf einer SSD) kann sich mit CPU-gebundenem Hashing überschneiden, wodurch sowohl Kerne als auch Speicher beschäftigt bleiben. |
| Thumbnail-lastige Benutzeroberfläche (Raster mit 1000+ Bildern) | **Gemischt** – Hauptpipeline parallel halten, 'ThumbnailGenerator' auf einem dedizierten begrenzten Pool ausführen | Sorgt dafür, dass die Benutzeroberfläche reaktionsschnell bleibt, während im Hintergrund Vorschaubilder generiert werden. |
| Low-End-Hardware (Einzelkern, begrenzter RAM) | **Hybrid** – enumerieren im Hauptthread, Hash auf einem einzelnen Worker | Vermeidet den Kontextwechsel-Overhead, während UI-Ereignisse trotzdem ineinander verschoben werden. |
| Automatisiertes Testen | **Serial** – Deaktiviere den Threadpool der Fabrik und führe die Stufen nacheinander aus | Bietet deterministische Reihenfolge, wodurch timingbedingte Fehler leicht reproduziert werden können. |

Der Refactor zwingt **nicht** jeden Benutzer in eine vollständig parallele Pipeline; Stattdessen gibt es uns die Knöpfe, mit denen wir die richtige Form für die jeweilige Hardware auswählen können.

---

## 8. Vorbereitung auf den nächsten Meilenstein – SSD- vs. HDD-A/B-Tests

Da die Pipeline nun modular, beobachtbar und sicher stoppbar ist, können wir systematisch **messen** und **die Leistung auf verschiedenen Speichermedien optimieren**:

1. **Instrumentieren Sie jede Phase** (Eintritts-/Austrittszeitstempel, Warteschlangentiefen, CPU-Auslastung). 2. **Führen Sie den gleichen Datensatz aus** auf einer NVMe-SSD und auf einer 7200-RPM-Festplatte mit unterschiedlichen Thread-Anzahlen, Warteschlangenkapazitäten und Read-Ahead-Puffergrößen. 3. **Metriken sammeln** – Gesamtdurchsatz, Latenz pro Stufe, CPU-Auslastung, Speicherdruck, E/A-Wartezeit. 4. **Identifizieren Sie die optimale Konfiguration** für jeden Speichertyp und sperren Sie diese Werte in „PipelineConfig.h“. 5. **Kennzeichnen Sie das Repo** (z. B. „v1.2-pipeline-locked“), sobald die Schwellenwerte erreicht sind.

Derzeit steht keine KI-gesteuerte Ähnlichkeitserkennung auf der Roadmap; die Priorität ist es, **eine zuverlässige, leistungsstarke Pipeline abzuschließen**, die sich vorhersehbar auf SSDs und HDDs verhält, bevor wir höherwertige Funktionen berücksichtigen.

---

## 9. TL; DR

* Die speichersensitive Scan-Benutzeroberfläche stellt Anforderungen bereit, die die alte monolithische Pipeline nicht erfüllen konnte. * Wir haben **Einzelverantwortungsstufen**, eine **werkseitig erstellte parallele Pipeline**, **einheitliche Phasenberichterstattung**, einen **OpenGL-Spinner** und einen **schnellen Miniaturbildgenerator** eingeführt. * Mit der neuen Architektur können wir **die Pipeline dort parallel ausführen, wo es hilfreich ist (SSD, gemischte Workloads) und für kleine Sammlungen oder Low-End-Hardware auf seriell zurückgreifen**. * Auf dieser Grundlage ist der nächste konkrete Schritt ein **SSD- vs. HDD-Leistungs-A/B-Test**; Nach der Optimierung werden die Pipeline-Einstellungen für alle zukünftigen Versionen gesperrt.
