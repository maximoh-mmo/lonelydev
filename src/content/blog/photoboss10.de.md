---
isAutoTranslated: true
---
# Entwickler-Tagebuch: Den „Shutdown-Geist“ besiegen & Das Rennen um die Race Condition

In meinem letzten Beitrag habe ich beschrieben, wie ich in PhotoBoss eine leistungsstarke Bild-Pipeline aufgebaut habe. Sie war schneller, flüssiger und speicherfreundlicher. Doch selbst wenn ein System stabil erscheint, besteht immer die Gefahr, dass die hohe Geschwindigkeit subtile Synchronisationslücken überdeckt – jene Art von „Geistern“, die einem erst dann zu schaffen machen, wenn die richtigen Hardware- oder Auslastungsbedingungen zusammenkommen.

Bei einer proaktiven Überprüfung der Pipeline-Logik habe ich heute eine potenzielle Race Condition entdeckt. Auch wenn sie sich in der Praxis noch nicht bemerkbar gemacht hat, macht es den Unterschied zwischen „Prototyp“- und „Produktions“-Code aus, diese Schwachstellen zu beheben, bevor sie zu Fehlern werden.

Hier ist, was ich herausgefunden habe, wie ich das System abgesichert habe und warum „onStart“ nicht immer so früh auftritt, wie man denkt.

## 1. Der Phantom-Shutdown (Der proaktive Fang)

Die PhotoBoss-Pipeline basiert auf einem Produzenten-Konsumenten-Modell. Jede Stufe (Scanner, Reader, Hasher) registriert sich als „Produzent“ für die nächste Warteschlange in der Kette. Sobald kein Produzent mehr übrig ist, wird die Warteschlange geschlossen, und die nächste Stufe erkennt, dass es Zeit ist, den Betrieb einzustellen.

**Die Theorie**: Mir ist aufgefallen, dass ich `register_producer()` innerhalb der `onStart()`-Methode der Stage aufgerufen habe.

Auch wenn dies für meinen Entwicklungsrechner ausreichend stabil schien, deutet die Theorie verteilter Systeme auf einen „Wettlauf bis zum Ziel“ hin, den ich mit zunehmender Skalierung der App unweigerlich verlieren würde:

1. Der **Scanner** startet, findet zwei kleine Bilder und ist sofort fertig.
2. Er ruft `producer_done()` in der **Scan-Warteschlange** auf.
3. Da die **Cache-Lookup**-Phase (der nächste Produzent in der Warteschlange) noch darauf wartet, dass das Betriebssystem ihren Thread startet, wurde ihr `onStart()` noch nicht ausgeführt.
4. Die **Scan-Warteschlange** sieht, dass 0 Produzenten registriert sind, geht davon aus, dass der Vorgang beendet ist, und **fährt vorzeitig herunter**.
5. Als der **Cache-Lookup**-Thread schließlich aktiv wird, stellt er fest, dass seine Eingabewarteschlange bereits geschlossen ist oder seine Registrierung zu spät erfolgt ist, um noch eine Rolle zu spielen.

In einem kleinen Verzeichnis führte dies dazu, dass die Pipeline oft schon „verschwand“, bevor sie überhaupt gestartet war, was zu fehlenden Ergebnissen und inkonsistentem Verhalten führte.

## 2. Die Lösung: Absicherung des Lebenszyklus

Um das zu beheben, musste ich die „Interessenanmeldung“ vom *Arbeitsbeginn* auf den *Geburtszeitpunkt* verlegen.

### Sofortige Anmeldung

Ich habe alle Aufrufe von `register_producer()` in die **Konstruktoren** der Stage-Worker verschoben. Da alle Worker bereits im Haupt-UI-Thread erstellt werden, noch bevor die Pipeline überhaupt ausgelöst wird, haben wir nun die hundertprozentige Gewissheit, dass jede Stage zur Gesamtzahl der Producer zählt, bevor auch nur ein einziges Datenbit übertragen wird.

### Synchronisierter Start

Außerdem habe ich die Logik von `createPipeline` umgestellt. Anstatt jeden Thread unmittelbar nach der Erstellung des Workers zu starten, gehe ich nun wie folgt vor:

1. Initialisiere **alle** Worker und Warteschlangen.
2. Stelle sicher, dass jeder Worker sein Interesse als Produzent angemeldet hat.
3. **Dann**, und nur dann, sende das Signal `start()` gleichzeitig an alle Threads.

```cpp
// The new sequence: Prep first, then Fire.
for (auto* thread : m_hash_worker_threads_) thread->start();
for (auto* thread : m_thumbnail_worker_threads_) thread->start();
m_pipeline_->resultThread.start();
```

## 3. Warum das wichtig ist

Das ist nicht nur „pedantische Programmierarbeit“. In einer Produktionsanwendung sind solche Race-Conditions die Hauptursache für „nicht reproduzierbare“ Fehler – also solche, die nur auf schnelleren CPUs oder bei bereits vorgewärmter Festplatte auftreten.

Durch die Optimierung des Registrierungsablaufs habe ich dafür gesorgt, dass PhotoBoss zuverlässig funktioniert, egal ob Sie 5 Fotos auf einem alten Laptop oder 50.000 Fotos auf einer 16-Kern-Workstation scannen.

## 4. Wie geht es weiter?

Nachdem der „Maschinenraum“ nun synchronisiert und stabil läuft, kehre ich zurück zur „Brücke“ (der Benutzeroberfläche).

*   **Optimierung der „Stopp“-Schaltfläche:** Da die Warteschlangen nun vorhersehbar sind, kann ich einen zuverlässigen „Panikknopf“ implementieren, der alle Rückstände sofort löscht, ohne dass „Geisterergebnisse“ in den Pipes zurückbleiben.
*   **Der Löschvorgang:** Sichere Entsorgung der von der Engine gefundenen Duplikate.

Der Motor ist getunt. Jetzt ist es an der Zeit, dem Fahrer das Steuer zu überlassen.
