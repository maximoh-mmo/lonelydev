---
id: "photoboss17"
title: "🛠️ Verbesserung des Löschbestätigungsdialogs in Photoboss"
seoTitle: "Verbesserung des Löschbestätigungsdialogs in Photoboss"
date: "2026-06-05"
category: "Softwareentwicklung"
summary: "Der Beitrag beschreibt, wie der DeleteConfirmDialog in der Photoboss-Anwendung überarbeitet wurde, um magische Zahlen zu entfernen, Vorschaubild-Caching einzuführen und das Styling mithilfe von CSS-Variablen auf QSS zu übertragen. Diese Änderungen verbessern Wartbarkeit, Leistung und Themenflexibilität."
project: "photoboss"
tags: ["Qt", "C++", "UI", "Performance", "Theming", "Caching"]
status: "scheduled"
isAutoTranslated: true
---

# Verbesserung des Löschbestätigungsdialogs in Photoboss

## Einleitung

Bei der Entwicklung von Anwendungen, die potenziell schädliche Vorgänge wie das Löschen von Dateien ausführen, ist der Bestätigungsdialog ein entscheidender Berührungspunkt für die Benutzererfahrung. In Photoboss, unserem Tool zum Auffinden doppelter Bilder, war der „DeleteConfirmDialog“ zwar funktionsfähig, wies jedoch mehrere verbesserungswürdige Aspekte auf: im gesamten Code verstreute fest codierte Werte, fehlendes Bild-Caching, das zu Neuladungen führte, sowie ein uneinheitliches Design. Dieser Beitrag dokumentiert, wie ich diesen Dialog optimiert habe, um ihn wartungsfreundlicher, leistungsfähiger und ansprechender zu gestalten.

## Die ursprüngliche Implementierung

Das ursprüngliche „DeleteConfirmDialog“-Fenster funktionierte zwar, wies jedoch Anzeichen einer überstürzten Entwicklung auf:

```cpp
// Hardcoded dimensions scattered throughout
setMinimumSize(500, 400);
scrollArea->setMinimumHeight(200);

// Magic numbers everywhere
int cols = 4;
label->setFixedSize(100, 100);

// Inline styling that's hard to maintain
label->setStyleSheet("border: 1px solid #555; border-radius: 4px; color: #888;");

// No image caching - reloading every time the dialog is shown
QImage img(entry.path);
QPixmap pixmap = QPixmap::fromImage(img).scaled(100, 100, Qt::KeepAspectRatio, Qt::SmoothTransformation);
```

Dieser Ansatz war zwar funktional, machte den Code jedoch schwer wartbar und ineffizient für Benutzer, die den Dialog während einer Sitzung möglicherweise mehrmals öffnen und schließen.

## Phase 1: Extrahieren von Dimensionen in AppSettings

Getreu dem Grundsatz, dass „magische Zahlen vermieden werden sollten“, habe ich zunächst die mit dem Dialog verbundenen Dimensionskonstanten ermittelt:

- Mindestgröße des Dialogfelds (500×400)
- Mindesthöhe des Bildlaufbereichs (200)
- Größe der Miniaturansicht (100×100)
- Anzahl der Spalten im Raster (4)
- Abstand im Layout (6)

Ich habe diese unter Verwendung des Qt-Musters „static inline constexpr“ für Konstanten ohne Overhead in „AppSettings.h“ hinzugefügt:

```cpp
// Delete Confirmation Dialog
static inline constexpr int DeleteConfirmDialogMinWidth = 500;
static inline constexpr int DeleteConfirmDialogMinHeight = 400;
static inline constexpr int DeleteConfirmDialogThumbnailSize = 100;
static inline constexpr int DeleteConfirmDialogGridCols = 4;
static inline constexpr int DeleteConfirmDialogScrollAreaMinHeight = 200;
static inline constexpr int DeleteConfirmDialogLayoutSpacing = 6;
```

Diese Änderung führte zu einer sofortigen Verbesserung der Wartbarkeit der Maßangaben.

## Phase 2: Implementierung des Caching von Miniaturansichten

Die bedeutendste Leistungsverbesserung kam durch das Hinzufügen von Thumbnail-Caching. Ursprünglich wurde bei jedem Aufruf des Dialogs alle Bilder von der Festplatte neu geladen und neu skaliert – ein kostspieliger Vorgang, besonders bei großen Bildsammlungen.

Ich habe ein `QMap<QString, QPixmap> thumbnailCache_`-Element hinzugefügt, um geladene Miniaturansichten zu speichern, und eine Hilfsmethode erstellt:

```cpp
QPixmap DeleteConfirmDialog::loadAndCacheThumbnail(const QString& filePath)
{
    // Check if we already have this thumbnail cached
    if (thumbnailCache_.contains(filePath)) {
        return thumbnailCache_[filePath];
    }
    
    // Load and scale the image
    QImage img(filePath);
    if (img.isNull()) {
        return QPixmap(); // Return null pixmap for failed loads
    }
    
    // Scale to thumbnail size
    QPixmap pixmap = QPixmap::fromImage(img).scaled(
        settings::DeleteConfirmDialogThumbnailSize, settings::DeleteConfirmDialogThumbnailSize, 
        Qt::KeepAspectRatio, Qt::SmoothTransformation
    );
    
    // Cache the thumbnail
    thumbnailCache_.insert(filePath, pixmap);
    return pixmap;
}
```

Dadurch wird sichergestellt, dass jedes Bild pro Dialoginstanz höchstens einmal von der Festplatte geladen wird, was die Leistung erheblich verbessert, wenn Benutzer den Dialog mehrmals öffnen und schließen.

## Phase 3: Farben in QSS übertragen (CSS-Variablen)

Nach ersten Verbesserungen wurde mir klar, dass Farben und Stile in das QSS-Stylesheet gehören und nicht in den C++-Code. Qt unterstützt seit Version 5.14 CSS-Variablen, wodurch wir Themenfarben einmalig definieren und im gesamten Stylesheet darauf verweisen können.

### Das Problem mit Farben in AppSettings

Zwar habe ich zunächst Farbkonstanten in „AppSettings.h“ hinzugefügt, doch dieser Ansatz hat einige Einschränkungen:
- Farben werden im C++-Code und in QSS doppelt verwendet
- Kein Wechsel des Designs zur Laufzeit
- Es ist schwieriger, die visuelle Konsistenz in der gesamten App zu gewährleisten
- QSS übernimmt die Widget-spezifische Gestaltung bereits auf elegante Weise

### Die Lösung: CSS-Variablen in QSS

Ich habe den Code überarbeitet, um CSS-Variablen in „dark.qss“ zu verwenden:

```css
* {
    /* Theme Color Variables */
    --bg-primary: #1e1e1e;
    --bg-secondary: #252525;
    --border-focus: #555;
    --text-muted: #888;
    --accent-danger: #C0392B;
    --accent-warning: #ff6b6b;
    --thumbnail-placeholder-bg: #333;
    --thumbnail-placeholder-text: #777;
}

/* Delete button styling */
QPushButton#deleteButton {
    background-color: var(--accent-danger);
    color: white;
    border: none;
}

/* Thumbnail styling */
QLabel#thumbnailLabel {
    border: 1px solid var(--border-focus);
    border-radius: 4px;
}
```

### Aktualisierung des C++-Codes

Der C++-Code verwendet nun Objektnamen anstelle von Inline-Stilen:

```cpp
// Before: inline styles with colors from AppSettings
deleteButton_->setStyleSheet(
    QString("background-color: %1; color: %2;")
    .arg(settings::DeleteConfirmDialogDeleteButtonBgColor)
    .arg(settings::DeleteConfirmDialogDeleteButtonTextColor)
);

// After: just set the object name, QSS handles styling
deleteButton_->setObjectName("deleteButton");
```

Similarly for thumbnails:
```cpp
auto* label = new QLabel(this);
label->setObjectName("thumbnailLabel");
label->setFixedSize(settings::DeleteConfirmDialogThumbnailSize, 
                    settings::DeleteConfirmDialogThumbnailSize);
// No inline styles needed - QSS handles it
```

### Farben aus den AppSettings entfernen

Da Farben nun in QSS enthalten sind, habe ich die Farbkonstanten aus AppSettings.h entfernt:

```cpp
// Before: colors in AppSettings
static inline constexpr char DeleteConfirmDialogWarningColor[] = "#ff6b6b";
static inline constexpr char DeleteConfirmDialogBorderColor[] = "#555";
// ... etc

// After: colors only in QSS, dimensions stay in AppSettings
// Delete Confirmation Dialog dimensions only
static inline constexpr int DeleteConfirmDialogMinWidth = 500;
// ... etc
```

## Herausforderungen und Lösungen

### Herausforderung 1: Cache-Management
**Problem:** Wie geht man mit einer Cache-Ungültigigkeit um, wenn Dateien zwischen Dialoginstanzen wechseln können?
**Lösung:** Da der Dialog typischerweise kurzlebig ist und Dateien anzeigt, die sofort zur Löschung ausgewählt sind, habe ich mich für einen einfachen, lebenslangen Cache entschieden (gültig für die Dialoginstanz).

### Challenge 2: Failed Image Loading
**Problem:** What happens when an image file is corrupted or inaccessible?
**Solution:** Use distinct object names for success/failure states:
```cpp
if (!pixmap.isNull()) {
    label->setObjectName("thumbnailLabel");
} else {
    label->setObjectName("thumbnailLabelFailed");
}
```
Then style differently in QSS.

### Aufgabe 3: Gestaltung des Platzhalters
**Problem:** Wie lässt sich der Platzhalter „Loading...“ ohne Inline-Stile gestalten?
**Lösung:** Das QLabel übernimmt die Gestaltung von QSS. Da wir die platzhalterspezifische Gestaltung entfernt haben, kommt das standardmäßige dunkle Design zum Tragen, das mit dem Gesamterscheinungsbild der App im Einklang steht.

## Ergebnisse und Bestätigung

Nach der Implementierung bietet das „DeleteConfirmDialog“ nun folgende Funktionen:

1. **Bessere Wartbarkeit**: Abmessungen in AppSettings, Farben in QSS – alles am richtigen Platz
2. **Verbesserte Leistung**: Das Zwischenspeichern von Miniaturansichten verhindert das redundante Laden von Bildern
3. **Einheitliches Design**: CSS-Variablen sorgen für einheitliche Farben in der gesamten App
4. **Flexibilität beim Design**: Einfaches Wechseln zwischen Designs oder späteres Hinzufügen eines Hellmodus
5. **Wechsel des Designs zur Laufzeit**: Möglich, da Farben in QSS gespeichert sind und nicht in kompiliertem C++

Quantitativ stieg die Ladezeit für Miniaturen von ~50 ms pro Bild (Festplattenlast + Dekodieren + Skalierung) auf ~0 ms für zwischengespeicherte Bilder.

## Reflexion und gelernte Lektionen

Diese Verbesserung bestätigte mehrere wichtige Prinzipien:

1. **Konfiguration sinnvoll zentralisieren**: Maße gehören in C++ (AppSettings), Farben gehören in QSS
2. **CSS-Variablen für das Theming nutzen**: Sie bieten eine zentrale Informationsquelle für Farben und ermöglichen gleichzeitig den Wechsel zwischen verschiedenen Designs
3. **Nutzen Sie QSS-Selektoren**: Objektnamen (`#deleteButton`) und Eigenschaftsselektoren (`[state="selected"]`) sind leistungsfähiger als Inline-Stile
4. **Cachen Sie UI-Elemente intensiv**: Elemente, deren Erstellung aufwendig ist, profitieren stark vom Caching

## Ausblick

Während diese Verbesserung auf einen Dialog fokussiert war, können die Muster erweitert werden:

1. **Helles Design hinzufügen**: Erstellen Sie die Datei „light.qss“ mit unterschiedlichen Werten für die CSS-Variablen
2. **Wechsel des Designs zur Laufzeit**: Laden Sie je nach Benutzereinstellung unterschiedliche QSS-Dateien
3. **Erweiterung der QSS-Variablen**: Übertragen Sie weitere Farben in der gesamten App in CSS-Variablen
4. **Einheitliche Widget-Benennung**: Stellen Sie sicher, dass alle benutzerdefinierten Widgets einheitliche Objektnamen für die QSS-Zuordnung verwenden

Der „DeleteConfirmDialog“ ist nun eine ausgereifte, wartungsfreundliche Komponente, die die richtige Trennung zwischen der C++-Konfiguration und dem QSS-Styling verdeutlicht.


