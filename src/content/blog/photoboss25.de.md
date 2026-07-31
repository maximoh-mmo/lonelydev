---
id: "photoboss25"
title: "🔍 Alle Duplikate finden (und tatsächlich anzeigen): Eine Nachbetrachtung zur Streaming-Gruppierung"
seoTitle: "Jedes Duplikat finden (und tatsächlich anzeigen): Eine Nachbetrachtung zur Streaming-Gruppierung"
date: "2026-07-31"
category: "Softwareentwicklung"
summary: "Ein Fehlerbericht über identische Duplikate, die nach dem Löschen erneut auftauchten, entpuppte sich als zwei miteinander verknüpfte Probleme: eine Ähnlichkeits-Engine, die die Cluster-Zugehörigkeit von einem nach Qualitätskriterien ausgewählten Vertreter abhängig machte, und ein gedrosselter UI-Stream, der Ergebnisse, die er nicht rechtzeitig darstellen konnte, stillschweigend verwarf. Dieser Beitrag behandelt sowohl die beiden Grundursachen als auch die Korrekturen zur Abgleichung und zum Drain sowie die damit einhergehenden Verbesserungen der Benutzererfahrung."
project: "photoboss"
tags: ["SimilarityEngine", "Streaming UI", "Qt", "Bug Fix"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

In den letzten Beiträgen habe ich mich intensiv mit der Leistungsoptimierung beschäftigt – begrenzte Warteschlangen, skalierte Dekodierungen, hardwareorientierte Scan-Profile –, bis die Pipeline an die Grenzen der Hardware stieß. Der Engpass verlagerte sich vom Speicherengpass auf die Festplatte, was genau dort liegt, wo er hingehört. Als dann ein Fehlerbericht einging, ging es nicht um Geschwindigkeit, sondern um Korrektheit:

> Ich durchsuche eine Reihe von Dateien, lösche alle gefundenen Duplikate, führe dieselbe Suche erneut durch – und es werden weitere Duplikate gefunden. Zu 100 % identische Dateien. Warum wurden sie beim ersten Mal nicht gefunden und markiert?

Der beängstigendste Teil dieses Berichts ist der letzte Satz. „Zu 100 % identische Dateien“ – keine Beinahe-Duplikate, keine Kopien mit geänderter Dateigröße, sondern Byte-für-Byte identische Duplikate. Der Pfad für exakte Duplikate in der Gruppierungs-Engine ist absolut zuverlässig; er fasst identische SHA-256-Hashes konstruktionsbedingt in einem Cluster zusammen. Wenn keine identischen Dateien gefunden wurden, hat die Engine sie entweder nie erkannt oder sie wurden zwar erkannt, aber in der Benutzeroberfläche nie angezeigt.

Es stellte sich heraus, dass beides zutraf. Hinter einem verwirrenden Symptom verbargen sich zwei separate, sich gegenseitig verstärkende Probleme:

1. **Eine Genauigkeitslücke in der Ähnlichkeits-Engine.** Beinahe-Duplikate wurden abgelehnt, weil die Mitgliedschaft auf ein einziges "repräsentatives" Bild beschränkt war, das nach Qualität und nicht nach Zentralität gewählt wurde.
2. **Ein stiller Datenabfall in der Ergebnis-UI.** Die autoritative letzte Gruppenliste wurde ins Leere ausgesendet, und der gedrosselte, inkrementelle Strom gab lautlos Ergebnisse auf, die er nicht rechtzeitig rendern konnte.

Dieser Beitrag ist die Nachbetrachtung – die beiden Hauptursachen, die Lösungen und eine Handvoll UX-Verbesserungen, die damit einhergingen.

## Die Voraussetzungen schaffen: Wie Gruppen den Weg auf die Leinwand schaffen

Die Pipeline besteht aus einer Kette von Stufen, die durch begrenzte Warteschlangen miteinander verbunden sind, wobei jede Stufe auf einem eigenen Thread läuft:

```mermaid
Enumerate → CacheLookup → DiskReader → HashWorker → CacheStore
                                                     ↓
                                           ResultProcessor (grouping)
                                                     ↓
                                          ThumbnailGenerator / UI sink
```

`ResultProcessor` verfügt über eine `SimilarityEngine`. Für jedes gehashtes Bild, das er aus der Warteschlange entnimmt, ruft er `addImage()` auf und fragt anschließend die Engine nach einem „Delta“ – welche bestehenden Gruppen gewachsen sind und welche neuen Gruppen sich gebildet haben. Diese Deltas werden als `groupAdded`-/`groupUpdated`-Signale ausgegeben, die über eine threadsichere Snapshot-Warteschlange mit einer Begrenzung auf ca. 30 fps an die Benutzeroberfläche weitergeleitet werden.

Es gibt außerdem einen abschließenden, maßgeblichen Schritt: Sobald die Eingabewarteschlange geschlossen wird, wird die vollständige Gruppenliste der Engine als `groupingFinished` ausgegeben. Die Absicht hinter diesem Design ist, dass der inkrementelle Stream Ihnen Echtzeit-Feedback liefert und das abschließende Signal die maßgebliche Informationsquelle darstellt. Diese Absicht ist der ausschlaggebende Grund dafür, dass die Geschichte so endet, wie sie endet.

## Bug 1: Der Vertreter war ein Torwächter, kein Mitglied

In der `SimilarityEngine` werden Bilder schrittweise in Cluster eingeteilt. Wenn ein neues Bild eintrifft, wird anhand seiner Perceptual-Hash-Teilwörter eine Suche im invertierten Index durchgeführt, woraufhin eine kurze Liste mit möglichen Clustern erstellt wird. Anschließend muss nachgewiesen werden, dass das Bild zu einem dieser Cluster gehört.

So sah dieser Nachweis ursprünglich aus:

```cpp
double sim = confidence(*node->result, *m_clusters_[ci].representative->result);
if (sim >= m_cfg_.strongThreshold) {
    // join cluster
}
```

Das neue Bild wurde ausschließlich mit dem **Repräsentanten** des Clusters verglichen. Das klingt vernünftig, bis man fragt, *wie* der Repräsentant ausgewählt wird:

```cpp
double SimilarityEngine::score(const ImageNode& img)
{
    const double pixels = width * height;
    double score = pixels;
    score += img.fileSize * 0.001;
    if (ext == "png") score *= 1.05;
    ...
}
```

Es handelt sich um eine **Qualitäts-Heuristik** – das größte, schärfste und am besten kodierte Bild gewinnt. Qualität ist nicht zentral. Der Anker eines Clusters lässt sich optisch leicht vom gemeinsamen Inhalt der Gruppe unterscheiden: ein übergeschärfter, hochskalierter Export neben einem Dutzend sauberer Kopien desselben Fotos. Das Ergebnis war ein klassischer Fast-Duplikat-Fehler: Bild B ist offensichtlich das gleiche Foto wie Mitglied M, punktet jedoch unter dem Schwellenwert gegenüber dem *Repräsentanten*, sodass es abgelehnt wird, einen eigenen Cluster bildet und Sie zwei überlappende „Duplikat“-Gruppen erhalten, von denen beide denken, dass das andere nicht existiert.

### Die Lösung: Testen Sie gegen alle und lassen Sie alle werben

Zwei Änderungen an `SimilarityEngine`:

1. **'matchesAnyMember()'** — Ein Kandidat tritt bei, wenn er die starke Schwelle gegen *jehver* Mitglied des Clusters überschreitet, nicht nur gegen den Vertreter.
2. **'addToIndex()'** — die pHash-Unterwörter jedes Mitglieds gelangen nun in den invertierten Index, nicht nur in die des Vertreters. Andernfalls ist ein Cluster nur über den Vertreter *auffindbar*, und der "Any Member"-Test wird nie durchgeführt.

```cpp
bool SimilarityEngine::matchesAnyMember(
    const ImageNode& node,
    const SimilarityGroup& cluster) const
{
    for (const auto* member : cluster.members) {
        if (confidence(*node.result, *member->result) >= m_cfg_.strongThreshold)
            return true;
    }
    return false;
}
```

Der Aufwand bleibt begrenzt: Der invertierte Index grenzt die Kandidaten weiterhin auf Cluster ein, die ≥2 Sub-Hashes gemeinsam haben, sodass die Überprüfung aller Mitglieder nur für eine Handvoll Cluster durchgeführt wird. Der Kompromiss besteht in einem leichten Anstieg des Risikos der Kettenbildung – A~B und B~C können nun A~C mitziehen, selbst wenn das Paar schwächer ist –, was jedoch durch die bestehenden Per-Hash-Gates bereits abgeschwächt wird.

## Fehler 2: Die Engine hat sie gefunden; die Benutzeroberfläche hat sie verloren

Die Genauigkeitskorrektur war notwendig, aber nicht ausreichend. Im Nutzerbericht stand, dass *100 % identische* Dateien sind, und identische Dateien landen immer in einem Cluster – diese Gruppierung ist unverzichtbar. Also wurden identische Duplikate *beim ersten Durchlauf* gefunden. Sie haben einfach nie den Bildschirm erreicht.

Hier ist der Ablauf des Abbruchs. `ResultProcessor` gibt am Ende von `doRun()` das maßgebliche Signal `groupingFinished` aus:

```cpp
emit groupingFinished(result);
```

Und 'PipelineFactory'... Ich habe es nie verbunden. Beim Scrollen des Signalverdrahtungsblocks wurden nur 'groupAdded', 'groupUpdated', 'thumbnailReady' und die Fortschritts-/Statussignale an den UI-Sink verdrahtet. Die endgültige, maßgebliche Liste wurde ins Leere gelassen.

Dadurch war die Benutzeroberfläche komplett vom gedrosselten inkrementellen Stream abhängig, und dieser Strom hatte ein Kapazitätsproblem. 'MainWindow::applySnapshot' rendert höchstens 'MainWindowBatchProcessSize' — **10** — ausstehende Gruppen pro Snapshot, wobei die Snapshots auf **33 ms** gedrosselt sind. Die Pipeline hingegen kann während eines großen Scans deutlich schneller als 300 Gruppen/Sekunde emittieren. Wenn das passiert, bleibt der Überlauf im 'm_pendingGroups'-Deque von 'UiUpdateQueue' und wartet darauf, entleert zu werden.

Und dann gibt der Timer auf:

```cpp
void UiUpdateQueue::maybeEmitSnapshot()
{
    {
        QMutexLocker lock(&m_mutex);
        if (!m_dirty) {            // nothing changed → stop emitting
            m_throttleTimer_.stop();
            return;
        }
        m_dirty = false;
    }
    emit snapshotReady(this->snapshot());
}
```

Wenn sonst nichts die Warteschlange als schmutzig markiert, stoppt der Timer – selbst wenn 'm_pendingGroups' noch voll ist. Der Rest wird still aufgegeben. Gruppen wurden gefunden, verarbeitet und weggeworfen, ohne jemals gezeigt zu werden. Das Löschen der sichtbaren Duplikate und das erneute Ausführen ließ das Problem verschwinden: Weniger Dateien bedeuteten weniger Gruppen, der Stream passte ins Budget, und die "neuen" Duplikate erschienen. Es sah aus wie ein Suchfehler; Es war ein Rendering-Budget-Bug.

### Die Lösung: ein Sicherheitsnetz für den Abgleich + ein Abfluss, der die Arbeit vollendet

Zwei sich ergänzende Änderungen:

**1. Verdrahte die Quelle der Wahrheit.** Einen 'finalizeGroups()'-Pfad auf dem UI-Sink hinzugefügt, der die 'groupingFinished'-Liste durch den Snapshot führt. 'ThumbnailManager::reconcileGroups()' läuft dann ab: Jede Gruppen-ID, die nie ein Widget erhalten hat, erhält jetzt eines, und bestehende Widgets werden auf den autoritativen Zustand aktualisiert. Dies garantiert, dass das Endergebnis immer angezeigt wird, unabhängig davon, wie stark der inkrementelle Strom überlaufen ist.

**2. Machen Sie die ausstehende Warteschlange bis zum Abschluss.** Zwei kleine Änderungen an 'UiUpdateQueue':

```cpp
// commitProcessed: after the UI consumes a batch, keep the stream alive
if (!m_pendingGroups.empty()) {
    m_dirty = true;
    lock.unlock();
    scheduleSnapshotEmit();
}

// maybeEmitSnapshot: don't stop until both lists are empty
if (!m_dirty && m_pendingGroups.empty() && m_finalGroups.empty()) {
    m_throttleTimer_.stop();
    return;
}
```

Jetzt stoppt der Timer nur, wenn wirklich nichts mehr zu zeigen ist. Während des Scans tickt er weiter, die Benutzeroberfläche verbraucht 10 Bilder pro Frame, und die Warteschlange sinkt auf null.

## Der UX-Politur, der kam

Da ich die Oberfläche bereits berührte, wurden in derselben Version ein paar kleine Ärgernisse behoben:

**Durchsuchen erinnert sich, wo du warst.** Der Verzeichniswähler öffnete sich jedes Mal im Home-Verzeichnis des Nutzers. Jetzt bevorzugt es den aktuellen Ordner, dann wird das letzte Verzeichnis über 'QSettings' beibehalten und fällt beim ersten Start nur wieder auf Home zurück:

```cpp
QString startDir = QDir::homePath();
if (!m_current_folder_.isEmpty()) {
    startDir = m_current_folder_;
} else {
    const QString lastDir = QSettings().value(QStringLiteral("lastDirectory")).toString();
    if (!lastDir.isEmpty())
        startDir = lastDir;
}
```

**Deaktivierte Buttons *sehen* deaktiviert.** Das dunkle Theme hatte keine 'QPushButton:disabled'-Regel und – schlimmer noch – der generische Button-Block verwendete die 'var(#2d2d2d)'-Syntax, die Qt-Stylesheets nicht unterstützen. Jeder Hintergrund, jede Schwebung und jede gedrückte Erklärung wurde stillschweigend ignoriert. Während eines Scans war der Durchsuchen-Button deaktiviert, aber optisch identisch mit einem aktivierten. Die ungültige Syntax wurde durch echte Farben ersetzt und der fehlende Zustand hinzugefügt:

```css
QPushButton:disabled {
    background-color: #232323;
    color: #6a6a6a;
    border: 1px solid #2b2b2b;
}
```

**Der Löschdialog war nicht mehr speicherfressig.** Wenn du ein großes Duplikat-Set löschst, wird der Bestätigungsdialog verwendet, um jedes Bild in voller Auflösung zu dekodieren, nur um Vorschauen zu erstellen. Es verwendet nun (a) den bereits entschlüsselten ThumbnailManager-Cache von 'ThumbnailManager' wieder, (b) greift auf 'QImageReader' mit einer vorskalierten Größe zurück, sodass er nie vollständig dekodiert, und (c) begrenzt Vorschauen auf 100 mit dem Label "Erste 100 Vorschauen (N mehr)".

**Trash, dann nuke.** 'QFile::moveToTrash' schlägt auf einigen Dateisystemen fehl (Netzwerkfreigaben, nicht unterstützte Laufwerke). 'TrashDeletionStrategy' normalisiert nun Pfadtrenner, versucht zuerst den Papierkorb und entfernt die Datei dauerhaft, wenn der Papierkorb-Move fehlschlägt – sodass eine Löschung nie stillschweigend übersprungen wird:

```cpp
if (QFile::moveToTrash(nativePath)) {
    return true;
}
return QFile::remove(nativePath);
```

## Die Ergebnisse

| Change | Was es behoben hat | Auswirkungen |
|---|---|---|
| 'matchesAnyMember' + 'addToIndex' | Beinahe-Duplikate abgelehnt gegen einen nicht-zentralen Vertreter | Identische und nahezu identische Dateien landen zuverlässig in einer einzigen Gruppe beim ersten Scan |
| Verdrahtetes 'groupingFinished' + 'reconcileGroups' | Endgültige Gruppenliste ins Leere emittiert | Das autoritative Ergebnis erreicht garantiert den Bildschirm |
| Pending-Group Drain | Timer wurde gestoppt, während die Warteschlange noch voll war | Keine still verlassenen Gruppen mehr; Der Bach fließt auf null |
| Preview Cache Reuse + skalierte Dekodierung + 100-Cap | Dialoge löschen und jedes Bild in voller Auflösung decodieren | Dialoge öffnen sich auf großen Sets deutlich schneller, reagieren bei 10k+ Dateien |
| Browse-Rückruf, disabled states, Müll-Fallback | Kleine, aber echte UX-Fehler | Konsistentes Verhalten über das Windows-Ziel hinweg; keine Löschungen, die still auf Netzwerklaufwerken verschluckt werden |

Die Delete-then-Rescan-Repro, die das alles gestartet hat, endet jetzt bei beiden Durchläufen ohne Duplikate.

## Reflexion

**Der Vertreter war nicht nur ein suboptimaler Anker – er war aktiv das falsche Werkzeug.** Der schwierigste Teil der Genauigkeitskorrektur war zu erkennen, dass der Vertreter nicht ausgewählt wird, *zentral* zu sein; Es wird als *beste* ausgewählt (das Bild mit der höchsten Qualität als Gesicht der Gruppe behalten). Das sind unterschiedliche Eigenschaften, und wenn die Mitgliedschaft durch eine Qualitätsheuristik begrenzt wird, kann der Anker visuell vom Rest der Gruppe abseits stehen. Die Lösung war nicht, einen besseren Vertreter zu wählen – sondern ganz aufzuhören, den Vertreter zu bedrängen. Testen Sie gegen alle, lassen Sie alle werben.

**Unsichtbare Fehler sind die schlimmsten Fehler.** Der Bug mit dropped-groups war durch die Konstruktion unsichtbar: Nichts wurde protokolliert, nichts fehlerhaft, das Programm wurde "erfolgreich" abgeschlossen. Es brauchte einen erneuten Ablauf des Scans auf einem kleineren Datensatz, um ihn zu reproduzieren, da das Symptom erst auftrat, als die Pipeline *aufhörte* das UI-Budget zu überlaufen. Die Lektion verallgemeinert: Wenn du schrittweise renderst, brauchst du einen autoritativen Endzustand, mit dem sich die Benutzeroberfläche übereinstimmt. Sie wandelt jeden inkrementellen Fehler von "dauerhaft verlorene Daten" in "Daten vorübergehend verspätet" um – ein viel günstigerer Ausfallmodus.

**Ein Abfluss muss sich selbst tragen.** Der Gashebel-Bug war ein klassisches Missverhältnis zwischen Angebot und Nachfrage. Ein Gashebel, der stoppt, wenn der *Produzent* still wird, ist nur dann korrekt, wenn der Verbraucher garantiert aufgeholt ist. Wenn der Fortschritt des Verbrauchers wieder aktiviert wurde, schloss der Schubhebel die Lücke: Der Timer stoppt jetzt erst, wenn beide Warteschlangen wirklich leer sind. Das Streamen von Ergebnissen in eine Benutzeroberfläche ist ein Angebot und Nachfrage, nicht nur ein Algorithmusproblem – der Gruppierungsalgorithmus war korrekt; Die *Lieferung* war verlustbehaftet.

**Das Kettengruppierungsrisiko ist ein bewusster Kompromiss.** Tests gegen alle Mitglieder erhöhen leicht die Wahrscheinlichkeit, dass transitive Kettengruppen (A~B und B~C verschmelzen A~C). Ich habe das bewusst akzeptiert: Die Gates in 'Confidence()' lehnen Paare unterhalb der pHash/dHash-Floors ab, und der Rückrufgewinn überwiegt das Präzisionsrisiko. Wenn es ein Problem wird, ist es natürlich, dass man Matches gegen ≥2 Mitglieder benötigt.

## Nächste Schritte

Das Clustering bietet nun echte Verhaltensgarantien zum Testen – Abruf für alle Mitglieder, Kettengruppenbeschränkungen, Delta-Korrektheit – und verdient mehr als nur eine manuelle Verifikation:

| Priorität | Was | Warum |
|----------|------|-----|
| 1 | End-to-End-Testsuite für die Gruppierungs-Engine | Die Engine hat jetzt Verhaltensgarantien; Sie brauchen ein richtiges Geschirr |
| 2 | Kettengruppen-Präzisionshärtung (Mehrteilakzeptanz) | Nur wenn in der Praxis transitive Kettengruppen auftreten |

Solange das Harness nicht existiert, ist die Repro, die das alles ausgelöst hat, der Akzeptanztest: Lösche jedes Duplikat, scanne neu und erwarte beide Male null Gruppen.

---

*PhotoBoss ist Open Source. Das vollständige Repository ist verfügbar unter [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
