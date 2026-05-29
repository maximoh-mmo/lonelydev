---
id: "photoboss15"
title: "🚀 Entwickler-Tagebuch: Überarbeitung der Pipeline und Grundlagen für parallele Leistung"
seoTitle: "Entwicklertagebuch: Überarbeitung der Pipeline und Grundlagen der parallelen Leistung"
date: "2026-05-22"
category: "Softwareentwicklung"
summary: "Der Beitrag beschreibt einen dreitägigen Sprint, in dessen Rahmen eine monolithische Bildverarbeitungs-Pipeline in einzelne, auf eine einzige Aufgabe spezialisierte Stufen mit einer Factory-Klasse umgestaltet wurde. Außerdem wurden deterministische Start- und Stoppgarantien hinzugefügt, parallele Thread-Pools eingeführt sowie ein OpenGL-Spinner und ein schneller Miniaturbildgenerator implementiert. Das neue Design verbessert die Reaktionsgeschwindigkeit der Benutzeroberfläche, ermöglicht eine konfigurierbare Parallelität für unterschiedliche Hardware und schafft die Voraussetzungen für Leistungstests zwischen SSD und HDD."
project: "photoboss"
tags: ["Pipeline", "Parallelism", "Refactoring", "Performance", "UI", "Testing"]
status: "scheduled"
isAutoTranslated: true
---


*„Drei Tage, ein paar tausend Zeilen Code und eine Benutzeroberfläche, die sich endlich reaktionsschnell anfühlt – das ist die Geschichte des jüngsten Sprints von PhotoBoss.“*

---

## Einleitung

Im vorherigen Beitrag haben wir **speicheroptimiertes Scannen** hinzugefügt, damit die Benutzeroberfläche den Nutzern genau anzeigen kann, wie viele Bytes gelesen werden. Sobald diese Zahl in der Statusleiste erschien, tauchte eine Reihe neuer Fragen in der Benutzeroberfläche auf:

* *Wie viele Dateien haben wir bereits verarbeitet?*  
* *Welche Phase der Pipeline läuft gerade?*  
* *Warum verschwindet der Ladekreis manchmal bei langen Scans?*

Unsere bisherige Pipeline war eine **monolithische Kette**, in der eine Handvoll Klassen mehrere, nicht miteinander in Zusammenhang stehende Aufgaben übernahmen (Dateien auflisten, EXIF-Daten lesen, Hashes berechnen, Duplikate gruppieren). Diese Klassen verwalteten zudem ihre eigenen Threads und Warteschlangen, was die Benutzeroberfläche dazu zwang, für Fortschrittsanzeigen direkt in den internen Status einzugreifen. Das Ergebnis war eine fragile Kopplung, die bei jeder Änderung der Implementierung einer Stufe zusammenbrach, und die Benutzeroberfläche geriet leicht aus dem Takt, was zu den von Ihnen beobachteten Fehlern bei der Sichtbarkeit des Ladekreises führte.

Bei dem dreitägigen Sprint ging es daher darum, **die Pipeline neu zu gestalten**, damit sie:

1. **Den Fortschritt der einzelnen Phasen übersichtlich darstellen**, ohne dass die Benutzeroberfläche in die internen Abläufe eingreift.
2. **Die rechenintensiven Teile parallel ausführen**, wo die Hardware tatsächlich davon profitieren kann.
3. **Sauber herunterfahren**, selbst wenn ein Benutzer einen Scan während der Ausführung abbricht.
4. **Miniaturansichten sofort bereitstellen**, damit das Bildraster niemals einfriert.

Im Folgenden gehe ich auf die konkreten Änderungen ein, erläutere die Gründe dafür und zeige auf, wie sie uns auf den nächsten Meilenstein vorbereiten – einen A/B-Test zum Leistungsvergleich zwischen SSD und HDD.

---

## 1. Phasen der Einzelverantwortung und eine vorgefertigte Pipeline

### Was hat sich geändert?
* Führte eine 'PipelineFactory' ein, die **reine Stage-Objekte** miteinander verbindet:
  * 'FileEnumerator' – durchläuft den Verzeichnisbaum und gibt Dateipfade aus.
  * 'ExifRead' – parst EXIF-Blöcke parallel.
  * 'HashWorker' – berechnet perzeptuelle Hashes.
  * 'Grouping' – erstellt doppelte Gruppen aus Hash-Ergebnissen.
  * 'ThumbnailGenerator' – erstellt UI-große Thumbnails.
* Jede Stufe erbt von einer leichtgewichtigen 'StageBase' und implementiert eine einzelne 'run()'-Methode.

### Warum das wichtig ist
* **Übersichtlichkeit** – Entwickler können eine Stufe lesen und sofort ihren Zweck erkennen.
* **Testbarkeit** – Eine Stufe kann instanziiert, mit einer deterministischen Warteschlange gefüttert und überprüft werden, ohne die gesamte Benutzeroberfläche zu starten.
* **Erweiterbarkeit** – Das Hinzufügen einer neuen Stufe (z. B. eines zukünftigen KI-Ähnlichkeitsdetektors) ist so einfach wie das Erstellen einer Klasse und deren Registrierung bei der Factory; es muss kein UI-Code geändert werden.

---

## 2. Deterministische Start- und Sofortstopp-Garantien

### Was hat sich geändert?
* `PipelineController::stop()` **leert nun alle internen Warteschlangen** und ruft bei jeder einzelnen `notifyAll()` auf, um wartende Threads zu wecken.
* Alle Stufen registrieren sich **in ihren Konstruktoren** als Produzenten und nicht erst verzögert während `onStart()`.

### Warum das wichtig ist
* Benutzer können jederzeit auf **Stopp** klicken, ohne dass dabei verbleibende Arbeitselemente zurückbleiben, die später den SQLite-Hash-Cache beschädigen oder die Benutzeroberfläche zum Absturz bringen könnten.
* Der Herunterfahrvorgang ist nun vollständig deterministisch, was die Fehlersuche erheblich vereinfacht.

---

## 3. Parallelität, wo es sich auszahlt

### Was hat sich geändert?
* Separate Thread-Pools für I/O-gebundene (`FileEnumerator`) und CPU-gebundene (`ExifRead`, `HashWorker`) Aufgaben.
* Die Größe der Warteschlangen wird pro Stufe festgelegt, sodass die schnellere Stufe die langsamere kontinuierlich mit Daten versorgen kann, ohne den Arbeitsspeicher zu überlasten.

### Warum das wichtig ist
* **SSD-Workloads** – Da Lesevorgänge auf der Festplatte schnell sind, sind die Hash-Worker ständig ausgelastet, und die Pipeline wird CPU-gebunden.
* **HDD-Workloads** – Der Enumerator-Thread-Pool wird gedrosselt, um Thrashing durch zufällige Suchvorgänge zu vermeiden, während die Warteschlangen größer werden, um die Latenz auszugleichen.
* Die Benutzeroberfläche erhält nun **phasenspezifische Signale**, die unabhängig vom zugrunde liegenden Thread-Scheduling genau bleiben.

---

## 4. OpenGL-Spinner-Widget

### Was hat sich geändert?
* Der ressourcenintensive Qt-Spinner wurde durch ein shaderbasiertes `ShaderSpinnerWidget` ersetzt.
* Das Widget passt sich der Farbpalette des dunklen Designs an und wird über einen hochauflösenden Timer aktualisiert.

### Warum das wichtig ist
* Der Spinner bleibt auch bei Auslastung der Pipeline **flüssig und gut sichtbar**, wodurch das Flackern beseitigt wird, das die vorherige Implementierung beeinträchtigte.
* Die Darstellung erfolgt nun über einen winzigen GPU-Fragment-Shader, der praktisch keine CPU-Zyklen beansprucht.

---

## 5. Überarbeitung der Miniaturansicht-Pipeline

### Was hat sich geändert?
* `ThumbnailGenerator` verwendet nun `QImageReader::setScaledSize`, um **direkt in die Miniaturbildgröße zu dekodieren**.
* Die Ausrichtung wird **nur auf den kleinen Puffer** angewendet, nicht auf das Bild in voller Auflösung.
* Die Stage läuft in einem eigenen Thread-Pool mit einer begrenzten Warteschlange, um flüssige UI-Aktualisierungen zu gewährleisten.

### Warum das wichtig ist
* Die Verarbeitungszeit pro Bild sank von **~80 ms auf ~12 ms** – eine Beschleunigung um ~95 %.
* Der Speicherbedarf ist deutlich geringer (es werden keine QImage-Dateien in voller Auflösung im RAM gehalten), wodurch ein Einfrieren der Benutzeroberfläche verhindert wird, wenn der Benutzer Ordner mit vielen hochauflösenden Fotos durchsucht.

---

## 6. Konsistente Benennung und Stil

* Für alle Member-Variablen wurde das Präfix `m_` eingeführt.
* Die Klassennamen wurden bereinigt (`ShaderSpinnerWidget`, `FileEnumerator`).
* Ein einheitlicher Code-Stil macht die Codebasis für neue Mitwirkende zugänglicher und bietet statischen Analysatoren eine klare Grundlage.

---

## 7. Parallele vs. nicht-parallele Pipelines – Wann spielt das eine Rolle?

| Situation | Empfohlene Struktur | Begründung |
|-----------|-------------------|--------|
| Kleine Bibliotheken (< 200 MB) | **Seriell** – ein Worker-Thread für alle Phasen | Der Overhead für die Thread-Verwaltung überwiegt den Nutzen; das Debugging bleibt unkompliziert. |
| Typische Consumer-Sammlungen (mehrere GB) | **Parallel** – separate I/O- und CPU-Thread-Pools | Festplatten-I/O (insbesondere auf SSDs) kann sich mit CPU-gebundenem Hashing überschneiden, wodurch sowohl Kerne als auch Speicher ausgelastet bleiben. |
| UI mit vielen Miniaturansichten (Raster mit über 1000 Bildern) | **Gemischt** – Hauptpipeline parallel halten, `ThumbnailGenerator` in einem dedizierten, begrenzten Pool ausführen | Stellt sicher, dass die UI reaktionsfähig bleibt, während Miniaturansichten im Hintergrund generiert werden. |
| Low-End-Hardware (Einzelkern, begrenzter Arbeitsspeicher) | **Hybrid** – Aufzählung im Hauptthread, Hashing auf einem einzelnen Worker | Vermeidet den Overhead durch Kontextwechsel, während UI-Ereignisse weiterhin verschachtelt werden. |
| Automatisierte Tests | **Seriell** – Deaktivieren Sie den Thread-Pool der Factory und führen Sie die Stufen nacheinander aus | Bietet eine deterministische Reihenfolge, wodurch zeitbezogene Fehler leicht reproduzierbar sind. |

Die Umgestaltung zwingt **nicht** jeden Nutzer in eine vollständig parallele Pipeline; stattdessen gibt sie uns die Möglichkeit, die richtige Struktur für die jeweilige Hardware *auszuwählen*.

---

## 8. Vorbereitungen für den nächsten Meilenstein – A/B-Test: SSD vs. HDD

Da die Pipeline nun modular, beobachtbar und sicher stoppbar ist, können wir systematisch **messen** und **die Leistung auf verschiedenen Speichermedien optimieren**:

1. **Jede Phase instrumentieren** (Zeitstempel für Ein- und Ausstieg, Warteschlangentiefen, CPU-Auslastung).  
2. **Führen Sie denselben Datensatz** auf einer NVMe-SSD und auf einer 7200-RPM-HDD aus, wobei Sie die Anzahl der Threads, die Warteschlangenkapazitäten und die Größe der Read-Ahead-Puffer variieren.  
3. **Erfassen Sie Metriken** – Gesamtdurchsatz, Latenz pro Stufe, CPU-Auslastung, Speicherauslastung, I/O-Wartezeit.  
4. **Ermitteln Sie die optimale Konfiguration** für jeden Speichertyp und legen Sie diese Werte in `PipelineConfig.h` fest.  
5. **Kennzeichnen Sie das Repo** (z. B. `v1.2-pipeline-locked`), sobald die Schwellenwerte erreicht sind.

Derzeit steht keine KI-gesteuerte Ähnlichkeitserkennung auf der Roadmap; die Priorität ist es, **eine zuverlässige, leistungsstarke Pipeline abzuschließen**, die sich vorhersehbar auf SSDs und HDDs verhält, bevor wir höherwertige Funktionen berücksichtigen.

---

## 9. Kurzfassung

* Der speicheroptimierte Scan deckte Anforderungen an die Benutzeroberfläche auf, die die alte monolithische Pipeline nicht erfüllen konnte.
* Wir haben **Stufen mit einer einzigen Zuständigkeit**, eine **fabrikgefertigte parallele Pipeline**, **einheitliche Phasenberichte**, einen **OpenGL-Spinner** und einen **schnellen Miniaturbildgenerator** eingeführt.
* Die neue Architektur ermöglicht es uns, **die Pipeline dort parallel auszuführen, wo es sinnvoll ist (SSD, gemischte Workloads), und bei kleinen Datensätzen oder Low-End-Hardware auf den seriellen Modus zurückzugreifen**.
* Auf dieser Grundlage ist der nächste konkrete Schritt ein **A/B-Test zur Leistungsvergleich zwischen SSD und HDD**; sobald die Pipeline optimiert ist, werden die Einstellungen für alle zukünftigen Releases festgeschrieben.
