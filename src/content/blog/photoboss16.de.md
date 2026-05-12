---
id: "photoboss16"
title: "⚙️ Pipeline-Krisenlösung: Von Endlosschleifen zu strukturierten Delta-Updates"
seoTitle: "Lösung für Pipeline-Krisen: Von Endlosschleifen zu strukturierten Delta-Updates"
date: "2026-05-29"
category: "Softwareentwicklung"
summary: "Nach der Refaktorisierung auf eine stufenbasierte Pipeline-Architektur traten innerhalb von 48 Stunden vier Kaskadenausfälle auf, die jeweils wichtige Einblicke in gleichzeitige Programmierung mit Qt lieferten. Die Bugs reichten von UI-Einfrieren und Abstürzen aufgrund von Eigentümerverwirrung bis hin zu endlosen Schleifen und ineffizienten Updates. Die implementierten Lösungen umfassen rekursive Mutexe, explizite Eigentumsübertragung, Verbraucherbestätigungsmuster und Delta-Tracking für inkrementelle Updates."
project: "photoboss"
tags: ["Qt", "Concurrency", "Pipeline Architecture"]
status: "scheduled"
isAutoTranslated: true
---

# Lösung von Pipeline-Krisen: Von Endlosschleifen zu strukturierten Delta-Updates

*Vier schwerwiegende Fehler in drei Tagen – jeder einzelne hat mir etwas Grundlegendes über Parallelität, Zustandsverwaltung und die Bedeutung klarer Abgrenzungen zwischen den einzelnen Pipeline-Stufen beigebracht.*

---

## Einleitung

Die vergangene Woche sollte eigentlich dem Feinschliff gewidmet sein. Wir hatten die neue, stufenbasierte Pipeline-Architektur eingerichtet, der OpenGL-Spinner lief reibungslos und die Erzeugung der Miniaturansichten erfolgte nahezu in Echtzeit. Der Code war sauber, die Architektur modular, und ich dachte, wir wären fertig.

Was ich nicht erwartet hatte, war, dass dieselbe architektonische Umgestaltung den Grundstein für vier aufeinanderfolgende Ausfälle gelegt hatte, die sich in den nächsten 48 Stunden bemerkbar machen würden. Jeder Fehler lehrte mich etwas Grundlegendes über das Schreiben von parallelem Code in Qt – Lektionen, die ich so schnell nicht vergessen werde.

Dieser Beitrag beschreibt die Untersuchung, die Ursachen und die Lösungen für jedes einzelne Problem – was letztlich zu einer grundlegenden Verbesserung der Art und Weise führte, wie unsere Pipeline Aktualisierungen an die Benutzeroberfläche übermittelt.

---

## 1. Der Ausgangspunkt

Unser Master-Zweig enthielt einen monolithischen `PipelineController`, der alles erledigte: Er verwaltete Threads, Warteschlangen, die Fortschrittsverfolgung und UI-Aktualisierungen – alles in einer einzigen Klasse mit 500 Zeilen. Als ich auf die stufenbasierte Architektur umstieg (dokumentiert im Beitrag „Pipeline Refactor“), führte ich drei neue Kernkomponenten ein:

- **`Pipeline`** — Eine Klasse, deren einziger Zweck darin besteht, Phasen, Warteschlangen und Threads zu verwalten und dabei für ein ordnungsgemäßes Lebenszyklusmanagement zu sorgen. Sie weiß, wie man alles startet, wie man alles stoppt und wie man nach Abschluss der Aufgaben aufräumt.

- **`PipelineFactory`** – Der Kabelbaum. Sie erstellt zunächst Warteschlangen, dann Stufen, die diese Warteschlangen nutzen, anschließend Threads zur Ausführung dieser Stufen und übergibt schließlich die Verantwortung an die Pipeline. Man kann sich das wie einen Elektriker vorstellen, der alle Stromkreise anschließt, bevor er den Hauptschalter betätigt.

- **`UiUpdateQueue`** — Ein threadsicherer Puffer, der zwischen den Pipeline-Workern und der Benutzeroberfläche angesiedelt ist. Die Pipeline-Stufen rufen Methoden wie `addPendingGroup()` oder `setThumbnail()` aus Worker-Threads auf, und die `UiUpdateQueue` fasst diese zu periodischen `snapshotReady`-Signalen zusammen, die vom `MainWindow` verarbeitet werden.

Im Nachhinein war ich so darauf fokussiert, die Architektur richtig hinzubekommen, dass ich die Implementierungsdetails überstürzt habe. Vier Käfer warteten auf mich.

---

## 2. Der erste Bug: Das Einfrieren

Ich habe es zuerst an einem Dienstagnachmittag bemerkt. Ich würde einen Scan starten, ihn ein paar Sekunden laufen lassen und dann auf die Stopp-Schaltfläche klicken. Die Benutzeroberfläche fror ein – nicht abstürzte, sondern frierte ein – völlig unansprechbar. Der Spinner hörte auf sich zu drehen. Das Fenster hat nicht einmal neu gezeichnet, wenn ich es aus dem Bildschirm gezogen und zurückgezogen habe.

Zuerst dachte ich, es läge an einer Pattsituation in der Pipeline selbst. Ich habe überall Logging hinzugefügt: vor jeder Mutex-Sperre, nach jedem Warten, innerhalb jeder Signalaussendung. Was ich herausfand, war kontraintuitiv: Die Pipeline war in Ordnung. Es war die UI-Update-Schicht, die sich selbst blockierte.

Das Problem lag in der Funktionsweise von `UiUpdateQueue::snapshot()`. Die Methode erwarb einen Mutex, erstellte eine Kopie ihres aktuellen Zustands und gab diese zurück. Die Snapshot-Methode musste jedoch intern auch `scheduleSnapshotEmit()` aufrufen – und diese Methode versuchte, denselben Mutex zu erwerben. Bei einem regulären `QMutex` behandelt Qt es als Deadlock und hängt sich auf, wenn derselbe Thread versucht, einen Mutex zu sperren, den er bereits hält.

Ich saß einen Moment da, starrte auf den Code und erkannte, dass ich einen klassischen Fehler gemacht hatte: Ich hatte angenommen, dass die Benutzeroberfläche, die von einem Ort aus 'snapshot()' aufruft, sich nie wieder eingeben würde. Aber Qts Warteschlangenverbindungen bedeuteten, dass 'scheduleSnapshotEmit()' innerhalb der Snapshot-Call-Kette aufgerufen werden konnte, was genau die Situation schuf, die ich zu vermeiden versucht hatte.

Die Lösung war unkompliziert – ersetzen Sie 'QMutex' durch 'QRecursiveMutex' – aber die Lektion blieb hängen: In jedem System, in dem Methoden andere Methoden aufrufen, die ebenfalls gesperrt werden müssen, modellieren rekursive Mutexe den Aufrufgraphen korrekt. Es geht nicht darum, faul beim Schlossdesign zu sein; Es geht darum, die Realität genau darzustellen.

---

## 3. Der zweite Bug: Die Abstürze

Der Freeze-Fix wurde eingeführt, und ich dachte, wir wären in Ordnung. Dann habe ich angefangen, Stop/Start-Zyklen zu testen. Klicken Sie auf Stopp, warten Sie zwei Sekunden, klicken Sie erneut auf Start. Die App stürzte ab. Nicht immer, aber genug, um beunruhigend zu sein. Manchmal war es ein Segfault. Manchmal hieß es: "QObject: Kann nicht zerstören, solange der Thread läuft."

Diese Diagnose hat länger gedauert, um sie zu diagnostizieren. Ich habe überall Destruktoren mit Logging hinzugefügt: Pipeline-Destruktor, Stufendestruktoren, Warteschlangenzerstörer. Es entstand ein Bild von Eigentümerverwirrung.

Die PipelineFactory erstellte Warteschlangen als lokale Stack-Variablen und leitete dann Referenzen auf diese Warteschlangen an Worker-Stages weiter, die in separaten Threads liefen. Als die PipelineFactory am Ende von 'create()' aus dem Umfang ging, wurden diese Warteschlangen zerstört – aber die Worker-Threads liefen weiterhin und versuchten weiterhin, Daten in Warteschlangen zu schieben, die nicht mehr existierten.

Es war, als würde man das Ethernet-Kabel aus einem Server herausziehen, während er noch auf die Festplatte schreibt. Der Server stürzt nicht sofort ab, aber beim nächsten Versuch, auf den Speicher zuzugreifen, herrscht Chaos.

Die Lösung war eher konzeptionell als technisch. Ich habe das Eigentum so umgestaltet, dass das Pipeline-Objekt alleiniger Eigentümer von allem ist, was es erstellt. Warteschlangen werden als 'std::unique_ptr' erstellt und in die Sammlung der Pipeline verschoben. Threads werden in einer Sammlung gespeichert, und der Pipeline-Destruktor ruft bei jedem Thread 'quit()' und 'wait()' auf, bevor irgendwelche Warteschlangen gelöscht werden. Die Reihenfolge ist entscheidend: zuerst Threads, dann Warteschlangen.

Dieses Muster – explizite Eigentumsübertragung, explizite Shutdown-Sequenzierung – wurde zu einer Regel, die ich heute überall anwende: Wenn du es erschaffst, besitzt du es. Wenn du es besitzt, bist du dafür verantwortlich, es in der richtigen Reihenfolge zu zerstören.

---

## 4. Der dritte Fehler: Die Endlosschleife

Dieser manifestierte sich als reines Chaos in den Protokollen. Alle paar Millisekunden sah ich:

```
Processing group id: 27 images: 2
Processing group id: 27 images: 2
Processing group id: 27 images: 2
```

Die gleiche Gruppe, immer wieder, tausende Male pro Sekunde. Die Benutzeroberfläche war nicht eingefroren – sie war in einer Schleife gefangen und verarbeitete dieselben Daten für immer. Die Anzahl der ausstehenden Gruppen blieb bei 59 und nahm nie ab.

Die eigentliche Ursache war bestechend einfach. Die UiUpdateQueue enthielt ein `std::deque<ImageGroup>`, das ausstehende Gruppen darstellte. Wenn das MainWindow einen Snapshot verarbeitete, erhielt es eine *Kopie* dieses Deques. Die while-Schleife verarbeitete Elemente von vorne, erstellte Widgets für sie und tat dann … nichts mit der ursprünglichen Warteschlange. Der nächste Snapshot war identisch mit dem letzten. Gruppe 27 befand sich immer noch an der Spitze und wartete darauf, erneut verarbeitet zu werden.

Es war, als hätte man ein Förderband, bei dem die Gegenstände am Ende in einen Behälter fallen, aber niemand den Behälter jemals leert. Das Band befördert immer wieder dieselben Gegenstände, weil der Behälter nie geräumt wird.

Ich habe eine 'commitProcessed(int count)'-Methode zu UiUpdateQueue hinzugefügt, die Items von der Vorderseite der eigentlichen Warteschlange abruft. Nach Abschluss der Batch-Verarbeitung ruft MainWindow diese Methode auf, um UiUpdateQueue mitzuteilen: "Ich habe N Items bearbeitet, bitte entfernen Sie sie aus der Quelle der Wahrheit." Dies ist ein häufiges Muster in Warteschlangensystemen – Verbraucheranerkennung – und es ist mittlerweile Teil unserer Architektur.

---

## 5. Der vierte Käfer: Die Delta-Revolution

Nachdem ich die Unendlichkeitsschleife behoben hatte, funktionierte alles – aber ich bemerkte etwas Ineffizientes. Jeder Schnappschuss enthielt *alle* ausstehende Gruppen, obwohl sich die meisten seit dem letzten Update nicht geändert hatten. Bei einem Scan mit Hunderten von Gruppen sind das viele Daten, die alle paar Millisekunden über die Thread-Grenze kopiert und gesendet werden.

Wichtiger noch: Ohne zu wissen *was* sich geändert hat, konnte die Benutzeroberfläche nicht intelligent reagieren. Wenn eine neue doppelte Gruppe entdeckt wird, ist das spannend – der Nutzer sollte eine Animation sehen, vielleicht ein Highlight. Wenn eine bestehende Gruppe wächst, weil ein weiteres Duplikat gefunden wurde, ist das ein kleines Update. Aber mein Code behandelte beide gleich: alles aussenden, die Benutzeroberfläche das selbst herausfinden lassen.

Ich bin zum SimilarityEngine zurückgekehrt – der Komponente, die gehashte Bilder nimmt und sie nach Ähnlichkeit gruppiert – und habe Delta-Tracking hinzugefügt. Der Motor merkt sich nun an die Größe jedes Clusters aus dem vorherigen Anruf. Wenn 'getGroupDelta()' aufgerufen wird, vergleicht es aktuelle Größen mit früheren Größen und gibt zwei Listen zurück: Cluster, die gerade von Single-Image zu Multi-Image (neu gebildet) gewechselt sind, und Cluster, die bereits Multi-Image waren und gewachsen sind.

```cpp
GroupDelta delta = engine.getGroupDelta();

for (const auto& g : delta.newlyFormed) {
    emit groupAdded(g);    // A brand new duplicate group!
}

for (const auto& g : delta.grown) {
    emit groupUpdated(g);  // Existing group got new members
}
```

Die ResultProcessor-Stufe verwendet nun diese präzisen Ereignisse. Thumbnail-Anfragen werden nur für neue Bilder in neuen oder wachsenden Gruppen ausgesendet, nicht für jedes Bild in jeder Gruppe bei jedem Update. Die Datenübertragung ist dramatisch zurückgegangen, und die Benutzeroberfläche kann gezieltes Feedback geben.

Das war nicht nur ein Fehlerbehebung – es war eine architektonische Verbesserung, die aus der Behebung der vorherigen Fehler entstanden ist. Man kann nicht optimieren, was man nicht misst, und man kann nicht präzise messen, ohne zu wissen, was sich verändert hat.

---

## 6. Reflexion

Vier Bugs, die mir jeweils etwas anderes beibringen:

Das rekursive Mutex hat mir beigebracht, dass das Lock-Design mit der Realität des Call-Graphen übereinstimmen muss, nicht mit einem idealisierten Modell von "einfachem" Locking.

Das Eigentum lehrte mich, dass explizite Eigentumsverhältnisse und lebenslanges Management keine akademischen Anliegen sind – sie unterscheiden Code, der funktioniert, von Code, der um 3 Uhr morgens mysteriös abstürzt.

Die Unendlichkeitsschleife hat mir beigebracht, dass Warteschlangenkonsumenten die verarbeiteten Artikel explizit bestätigen müssen. Der Produzent weiß nicht, was der Konsument getan hat; Der Verbraucher muss dem Produzenten Bescheid geben.

Das Delta-Tracking hat mich gelehrt, dass grobkörnige Aktualisierungen Informationen verbergen. Wenn Sie verfolgen, welche Änderungen sich ergeben, ermöglichen Sie nachgelagerte intelligentere Reaktionen.

Alle vier Bugs hatten einen gemeinsamen Faden: Sie entstanden aus dem Übergang zwischen den Architekturen. Der alte Code, trotz all seiner Unordnung, hatte sich weiterentwickelt, um diese Randfälle zu bewältigen. Der neue Code, sauber und modular, musste diese Lösungen wiederentdecken. Refactoring bedeutet nicht nur, Code zu verschieben – es bedeutet, die Lektionen neu zu lernen, die der Code bereits gelernt hat.

---

## 7. Wo wir jetzt sind

Die Pipeline ist stabil. Es startet sauber, läuft ohne Einfrieren, stoppt ohne Abstürze, verarbeitet jede Gruppe genau einmal und gibt präzise, inkrementelle Updates aus. Das Fundament, das wir aufgebaut haben, ist solide.

Als Nächstes möchte ich die Leistungstests durchführen, die wir im Beitrag zum Pipeline Refactor besprochen haben – das Messen des SSD- vs. HDD-Verhaltens, das Optimieren der Arbeiteranzahl, die Überprüfung der Parallelarchitektur bringt tatsächlich einen Vorteil. Dann möchte ich eine automatisierte Testsuite hinzufügen, die diese gleichzeitigen Szenarien deterministisch ausübt, damit wir die nächste Bug-Charge auffangen, bevor sie zu Produktionsproblemen werden.

Die Lektionen dieser Woche prägen bereits, wie ich Code schreibe. Explizite Eigentumsverhältnisse überall. Rekursive Mutexe, wenn Call-Graphen reentrant sind. Verbraucherbestätigung für Warteschlangenverarbeitung. Delta-Tracking für inkrementelle Updates.

Vorwärts.


