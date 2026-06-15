---
id: "photoboss21"
title: "🏗️ Vom Monolithen zum Kompositionswurzel: SOLID-Refaktorierung in einer Qt-Desktop-App"
seoTitle: "Von Monolith zu Kompositionswurzel SOLID Refactoring Qt Desktop-App"
date: "2026-07-03"
category: "Softwareentwicklung"
summary: "Dieser Beitrag erklärt eine mehrphasige Refaktorisierung, bei der ein monolithisches Qt-Hauptfenster mithilfe von SOLID-Prinzipien in eine saubere Kompositionswurzel umgewandelt wird. Dienste werden extrahiert, Widget-Eigentum geklärt und Abhängigkeiten eingeschleust, was zu einer testbareren, wartbareren und lesbareren Codebasis führt."
project: "photoboss"
tags: ["Qt", "C++", "SOLID", "Dependency Injection", "Refactoring", "Architecture"]
status: "scheduled"
isAutoTranslated: true
---

# 🏗️ Vom Monolithen zum Composition Root: SOLID-Refactoring in einer Qt-Desktop-Anwendung

## Einleitung

Ich habe **PhotoBoss** entwickelt, eine C++/Qt-Desktop-Anwendung, die Verzeichnisse nach doppelten Fotos durchsucht und dabei hilft, diese zu bereinigen. Wie bei vielen Projekten, die als Prototyp beginnen, funktionierte der Code zwar – aber er war nicht gerade schön. Im Laufe der Zeit war sich `MainWindow.cpp` zu einer monolithischen Klasse mit etwa 700 Zeilen entwickelt, die die Pipeline verwaltete, den gesamten UI-Baum kontrollierte, Aktualisierungen der Miniaturansichten in die Warteschlange stellte, die Löschlogik abwickelte und im Allgemeinen viel zu viel über alles wusste.

Dieser Beitrag beschreibt eine mehrstufige Refaktorisierung, durch die das monolithische `MainWindow` in eine saubere **Composition Root** mit klarer Trennung der Verantwortungsbereiche umgewandelt wurde. (Eine Composition Root ist eine einzelne Stelle in der Anwendung – typischerweise `main()` –, an der alle Abhängigkeitsgraphen zusammengestellt werden. Jede andere Klasse erhält ihre Abhängigkeiten bereits vollständig zusammengestellt.) Dabei habe ich Dienste extrahiert, Verstöße gegen die SOLID-Prinzipien beseitigt und am Ende etwas erhalten, das ich morgens ohne Scham öffnen kann.

## Der Ausgangspunkt: Was lief schief?

Als ich 'MainWindow' zum ersten Mal schrieb, folgte ich dem Muster, das man in jedem Qt-Tutorial sieht: eine einzelne 'QMainWindow'-Unterklasse, die alles übernimmt. Die 'Init()'-Methode war besonders gravierend:

```cpp
void MainWindow::Init()
{
    // Create pipeline controller
    m_pipeline_controller_ = new PipelineController();

    // Create thumbnail scroll area, layout, groups...
    m_thumbnail_scroll_ = new QScrollArea();
    m_thumbnail_container_ = new QWidget();
    m_thumbnail_layout_ = new QVBoxLayout(m_thumbnail_container_);

    // Create preview pane
    m_preview_pane_ = new PreviewPane(this);

    // Create deletion service inline
    // ... all mixed together
}
```

Die Probleme waren zahlreich:
- **Verstoß gegen das Prinzip der Umkehrung der Abhängigkeiten (DIP)**: `MainWindow` instanziierte jede Abhängigkeit direkt. Es gab keine Möglichkeit, Implementierungen zu testen oder auszutauschen.
- **Verstoß gegen das Prinzip der einzigen Verantwortung (SRP)**: `MainWindow` kümmerte sich um das UI-Layout, die Pipeline-Koordination, die Verwaltung der Miniaturansichten und das Löschen von Dateien.
- **Überall verstreute Widget-Zugehörigkeit**: Zeiger auf untergeordnete Widgets waren über die Klasse verteilt, ohne klare Zugehörigkeitshierarchie.
- **Toter Code**: Einige aus früheren Iterationen übrig gebliebene Mitglieder waren deklariert, wurden aber nie gelesen.

## Phase 1: Ausgliederung eigenständiger Dienste

Die Codebasis hatte bereits einen langen Weg zurückgelegt – die Namenskonventionen waren vereinheitlicht worden (siehe [The Great Cleanup](#)), die Pipeline war in Phasen mit jeweils nur einer Aufgabe modularisiert worden, und das Phasenindikatorsystem war in einer übersichtlichen `Pipeline::Phase`-Enumeration zusammengefasst worden. Aber `MainWindow` war immer noch für alles zuständig und verband alles manuell miteinander. Der erste Schritt bestand darin, logische Grenzen innerhalb des Monolithen zu identifizieren und diese in eigene Klassen auszulagern.

### UiSnapshot: Eine eigenständige Datenstruktur

Die Klasse `UiUpdateQueue` enthielt eine verschachtelte `Snapshot`-Struktur, die den gesamten Zustand bündelte, den die Benutzeroberfläche zum Rendern benötigte. Da sie bereits gut konzipiert war – ein Werttyp ohne eigenes Verhalten –, war ihre Ausgliederung unkompliziert:

```cpp
// photoboss/inc/photoboss/ui/UiSnapshot.h
struct UiSnapshot {
    Pipeline::PipelineState pipelineState = Pipeline::PipelineState::Stopped;
    QString statusMessage;
    std::deque<ImageGroup> pendingGroups;
    QMap<quint64, ImageGroup> updatedGroups;
    QMap<QString, QPixmap> thumbnailCache;
    QMap<Pipeline::Phase, QPair<int, int>> phaseProgress;
};
```

Dies wird nun zwischen `UiUpdateQueue` (Produzent) und `MainWindow` (Konsument) ausgetauscht, ohne dass eine der beiden Seiten die internen Typen der anderen kennen muss.

### ThumbnailManager: Verwaltung des Miniaturansichtsbaums

Der Code für die Verwaltung der Miniaturansichten war der am stärksten gekoppelte Teil. `MainWindow` verwaltete den Scrollbereich, das Container-Widget, das Layout, die Zuordnung der Gruppen-Widgets, die Multimap für die Miniaturansichten-Warteschlange und den Miniaturansichten-Cache. Die Ausgliederung gestaltete sich schwierig, da diese Abhängigkeiten sich gegenseitig beeinflussten.

**Wichtige Erkenntnis**: Nach der Extraktion musste `ThumbnailManager` über `PreviewPane` informiert sein (um Vorschau-Signale zu verbinden), aber es musste auch seinen Widget-Unterbaum an `MainWindow` übergeben. Die saubere Lösung bestand darin, dass `ThumbnailManager` seinen gesamten Unterbaum intern verwaltete und ihn über `rootWidget()` zur Verfügung stellte:

```cpp
class ThumbnailManager : public QObject {
    Q_OBJECT
public:
    explicit ThumbnailManager(PreviewPane* previewPane, QObject* parent = nullptr);
    
    QWidget* rootWidget() const;        // Returns the QScrollArea
    int minimumWidthHint() const;       // Layout hint for the splitter
    
    // Group/thumbnail management
    void processPendingGroup(const ImageGroup& group);
    void processUpdatedGroups(const QMap<quint64, ImageGroup>& updatedGroups);
    void distributeThumbnails(const QMap<QString, QPixmap>& thumbnails);
    void clearResults();

signals:
    void selectionChanged();

private:
    QScrollArea* m_scrollArea_;
    QWidget* m_container_;
    QVBoxLayout* m_layout_;
    // ...
};
```

Innerhalb des Konstruktors wird die vollständige Widget-Hierarchie erstellt:

```cpp
ThumbnailManager::ThumbnailManager(PreviewPane* previewPane, QObject* parent)
    : QObject(parent), m_previewPane_(previewPane)
{
    m_container_ = new QWidget();
    m_layout_ = new QVBoxLayout(m_container_);

    // Compute minimum width from settings + layout metrics
    int spacing = m_layout_->spacing();
    int margins = m_layout_->contentsMargins().left() +
        m_layout_->contentsMargins().right();
    m_minimumWidth_ = settings::ThumbnailsPerRow * settings::ThumbnailWidth
        + settings::ThumbnailsPerRow * spacing + margins;

    m_container_->setMinimumWidth(m_minimumWidth_);
    m_container_->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Expanding);

    m_scrollArea_ = new QScrollArea();
    m_scrollArea_->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Expanding);
    m_scrollArea_->setWidgetResizable(true);
    m_scrollArea_->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    m_scrollArea_->setWidget(m_container_);
}
```

### DeletionService: Extrahieren der Löschlogik

Die Deletionslogik war eine weitere natürliche Grenze. Der Löschbestätigungsdialog und die Funktion zum Verschieben in den Papierkorb existierten bereits aus früheren Arbeiten (in früheren Beiträgen behandelt), aber alles war direkt in 'MainWindow' eingebettet. Methoden wie 'countSelectedForDeletion()' und 'onDeleteClicked()' arbeiteten auf demselben Set ausgewählter Vorschaubilder, lebten aber in der Fensterklasse. Ich habe diese in eine 'DeletionService'-Klasse extrahiert.

Um DIP für das tatsächliche Löschverhalten zu verfolgen, habe ich eine Schnittstelle eingeführt:

```cpp
class IDeletionStrategy {
public:
    virtual ~IDeletionStrategy() = default;
    virtual bool deleteFile(const QString& path) = 0;
};
```

Mit einer einfachen konkreten Umsetzung:

```cpp
class TrashDeletionStrategy : public IDeletionStrategy {
public:
    bool deleteFile(const QString& path) override {
        return QFile::moveToTrash(path);
    }
};
```

Dadurch wurde der 'DeletionService' testbar – ich konnte eine Mock-Strategie einschleusen, die Dateien aufzeichnete, anstatt sie tatsächlich zu löschen.

### Korrektur des statischen 'lastState'

Während der Extraktion von 'updatePhaseProgress()' bemerkte ich, dass 'applySnapshot()' eine 'statische Pipeline::P ipelineState lastState' hatte. Das war ein Korrektheitsfehler, der nur darauf wartete, aufzutreten: Statische lokale Elemente in Mitgliedsfunktionen sind im globalen Zustand im Verkleidung. Ich habe es zu einer richtigen Mitgliedsvariablen 'm_lastPipelineState_' befördert, was die Extraktion ebenfalls einfach machte.

## Phase 2: Von `Init()` zum Composition Root

Die erste Phase extrahierte die Dienste, ließ aber 'MainWindow' weiterhin für die Verbindung verantwortlich. Die zweite Phase verlagerte diese Verantwortung vollständig.

### Widget-Besitz: Die entscheidende Designentscheidung

Meine erste Designskizza sah vor, dass ThumbnailManager den Container und das Layout von Init() erhielt – ein Kompromiss, um zu vermeiden, zu viel auf einmal umzustrukturieren. Dies führte jedoch zu einer zirkulären Abhängigkeit vom Papier: MainWindow benötigte ThumbnailManager, um die Widgets zu besitzen, aber ThumbnailManager benötigte MainWindow, um sie zu erstellen.

Die eigentliche Antwort war einfacher: **ThumbnailManager sollte seinen eigenen Widget-Unterbaum besitzen.** Nachdem ich diese Änderung vorgenommen hatte, benötigte MainWindow überhaupt nicht mehr „m_thumbnail_scroll_“, „m_thumbnail_container_“ oder „m_thumbnail_layout_“.

### Konstruktorinjektion

Der 'MainWindow'-Konstruktor nimmt nun alle seine Abhängigkeiten als 'unique_ptr' an:

```cpp
MainWindow(std::unique_ptr<PipelineController> controller,
           std::unique_ptr<ThumbnailManager> thumbnailManager,
           std::unique_ptr<PreviewPane> previewPane,
           std::unique_ptr<DeletionService> deletionService,
           QWidget* parent = nullptr);
```

In 'Init()' gibt es keine 'neuen' Aufrufe für Dienste – es wird einfach die eingeschleusten Widgets in die Benutzeroberfläche eingefügt:

```cpp
void MainWindow::Init()
{
    // Phase indicators (still owned by MainWindow, but that's OK — thin UI widgets)
    m_phase_indicators_[Pipeline::Phase::Find] = new ProgressCounterWidget("Scanning", this);
    m_phase_indicators_[Pipeline::Phase::Analyze] = new ProgressCounterWidget("Analysis", this);
    m_phase_indicators_[Pipeline::Phase::Group] = new ProgressCounterWidget("Grouping", this);

    // Split body: thumbnails | preview
    m_splitter_ = new QSplitter(Qt::Horizontal);
    m_splitter_->addWidget(m_thumbnailManager_->rootWidget());
    m_splitter_->addWidget(m_preview_pane_.get());

    m_deletionService_->setDialogParent(this);

    // Wire signals
    connect(m_thumbnailManager_.get(), &ThumbnailManager::selectionChanged,
            this, &MainWindow::onGroupSelectionChanged);
    connect(m_deletionService_.get(), &DeletionService::deletionCompleted,
            this, [this]() { clearResults(); updateDeleteButtonState(); });

    WireConnections();
}
```

### Die Kompositionswurzel

Mit dieser Änderung wird „main.cpp“ zum **Kompositionsstamm** – dem einzigen Ort in der Anwendung, an dem Abhängigkeitsdiagramme zusammengestellt werden:

```cpp
int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    app.setStyleSheet(/* ... */);

    auto controller = std::make_unique<photoboss::PipelineController>();
    auto previewPane = std::make_unique<photoboss::PreviewPane>();
    auto thumbnailManager = std::make_unique<photoboss::ThumbnailManager>(previewPane.get());
    auto deletionService = std::make_unique<photoboss::DeletionService>(
        thumbnailManager.get(),
        std::make_unique<photoboss::TrashDeletionStrategy>(),
        nullptr);

    photoboss::MainWindow window(
        std::move(controller),
        std::move(thumbnailManager),
        std::move(previewPane),
        std::move(deletionService));

    window.show();
    return app.exec();
}
```

Beachten Sie die Reihenfolge: Dienste werden von unten nach oben in der Reihenfolge ihrer Abhängigkeiten erstellt. `previewPane` wird vor `thumbnailManager` erstellt, da Letzterer einen Raw-Zeiger auf Ersteres benötigt (für das Vorschausignal). `thumbnailManager` wird vor `deletionService` erstellt, da Letzterer die Gruppen-Widgets von Ersterem durchläuft.

## Phase 3: YAGNI klug anwenden

Nicht jedes SOLID-Prinzip muss dogmatisch angewendet werden. Ich habe mich gegen zwei Abstraktionen entschieden:

**Keine 'IPipelineController'-Schnittstelle.** Der Pipeline-Controller hat eine stabile Implementierung ohne Mock-Anforderung. Eine Schnittstelle hinzuzufügen wäre reine Standardarbeit ohne jeglichen Nutzen.

```cpp
// Not this:
std::unique_ptr<IPipelineController> controller;

// Just this:
std::unique_ptr<PipelineController> controller;
```

**Keine 'IAppConfig'-Oberfläche.** Die Anwendungseinstellungen ('settings::ThumbnailWidth', 'settings::SCHEMA_VERSION' usw.) sind Kompilierungszeitkonstanten. Sie sind keine volatilen Abhängigkeiten, die verspottet werden müssen.

## Die Ergebnisse

So sieht der Unterschied in Zahlen aus:

| Metrik | Vorher | Nachher |
|---|---|---|
| Zeilen in `MainWindow.cpp` | ~700 | ~270 |
| Membervariablen in `MainWindow` | 26+ | 15 |
| In `Init()` erstellte Dienste | 5 | 0 |
| SOLID-Verstöße in MainWindow | Mehrere | Minimal |
| Neu hinzugefügte Dateien | — | 7 |
| Compiler-Warnungen | 1 | 0 |

(Es gab auch ein verirrtes U+FFFD-Ersatzzeichen in 'SqliteHashCache.cpp', das eine C4828-Warnung auslöste – ersetzte es durch einen gewöhnlichen ASCII-Bindestrich. Ein kleiner Fund, aber die Art von Sache, die sich lohnt, aufzuräumen, wenn man schon im Code ist.)

### Was funktioniert

- **Testbarkeit**: Jeder Dienst kann unabhängig instanziiert und getestet werden
- **Lesbarkeit**: 'MainWindow' delegiert jetzt eindeutig an benannte Dienste, anstatt alles inline zu erledigen
- **Changeability**: Das Wechseln von Strategien (z. B. 'TrashDeletionStrategy' → permanente Löschung) erfordert null Änderungen an 'MainWindow'
- **Widget-Eigentum**: Jedes Widget hat einen klaren Besitzer; Keine hängenden Zeiger

### Gelernte Lektionen

Ein paar Dinge, die ich für mein zukünftiges Ich erwähnen möchte:

1. **Schreibe zuerst die Kompositionswurzel.** Die Funktion 'main()' sollte immer der Ort sein, an dem der Anwendungsgraph zusammengesetzt wird. Es zuletzt zu bauen bedeutete, die Konstrukteursignaturen nachzuarbeiten – machbar, aber mehr Reibung als nötig.
2. **Das 'setDialogParent()'-Muster ist ein Geruch.** Der Parent-Parent-Dialog des Löschdialogs ist das MainWindow-Objekt, das zum Zeitpunkt der Kompositionswurzel noch nicht existiert. Ich brauchte einen spät ankommenden Zuspieler. Ein disziplinierterer Ansatz wäre, wenn 'MainWindow' die Dialogerstellung direkt über eine Fabrik besitzt oder den Dialog eltern-agnostisch macht und nach dem Bau neu als Eltern nutzt.
3. **Signale, die Servicegrenzen überschreiten, benötigen einen Mediator.** Signale wie 'selectionChanged()' verknüpfen ThumbnailManager mit MainWindow. Im Moment fungiert MainWindow als dünne Kleberschicht, und das ist in Ordnung. Wenn der Signalgraph deutlich wächst, lohnt es sich, eine dedizierte Mediatorklasse zu extrahieren.

## Nächste Schritte

Nachdem die Architektur aufgeräumt ist, sind die unmittelbaren Prioritäten:

- **Entfernen Sie das verbleibende tote Mitglied 'm_body_'** aus MainWindow — deklariert, aber nicht mehr verwendet, da der Splitter den Körperbereich übernommen hat.
- **Unit-Tests für 'DeletionService'** mit einem Mock 'IDeletionStrategy' und 'ThumbnailManager' mit einem Mock 'PreviewPane'. Beide sind nun unabhängig voneinander testbar.
- **Pipeline-Fehlermeldung**: Die Zustandsmaschine hat derzeit grundlegende Zustände Stopped/Running/Stopping. Eine detailliertere Fehlerausbreitung würde es der Benutzeroberfläche ermöglichen, pro-Stufen-Fehler aufzudecken.

## Reflexion

Diese Refaktorierung bestätigte etwas, das ich schon länger vermute: **SOLID-Prinzipien sind am nützlichsten als Diagnosewerkzeug, nicht als vorschreibende Checkliste.** Der Code sagte mir, wo die Probleme lagen – 'MainWindow::Init()' war unlesbar, Änderungen hatten Kaskadeneffekte, Tests erforderten den vollständigen Anwendungsstack. SOLID hat mir den Wortschatz gegeben, um zu beschreiben, *warum* das Probleme sind und was ich dagegen tun kann.

Die wichtigste Erkenntnis? **Widget-Besitz ist das C++/Qt-Äquivalent zur Abhängigkeitsinjektion.** In einem Web-Framework würde man Services über Konstruktorparameter injizieren. In Qt musst du auch darüber nachdenken, wem jedes Widget gehört, wem es gelöscht wird und wie die Eltern-Kind-Hierarchie auf deinen Abhängigkeitsgraphen abgebildet ist. Wenn man den Widget-Besitz richtig macht, fügte sich alles andere zusammen.

---

*PhotoBoss ist Open Source. Das vollständige Repository ist verfügbar unter [github.com/maximoh-mmo/PhotoBoss](https://github.com/maximoh-mmo/PhotoBoss).*
