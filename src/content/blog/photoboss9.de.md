---
id: photoboss9
title: "📸 Engineering-Tagebuch: Aufbau einer Hochleistungs-Bild-Pipeline in PhotoBoss"
seoTitle: "Hochleistungs-Bild-Dekodierung und UI-Batching in Qt"
date: "2026-04-17"
category: "Software Engineering"
summary: "Refactorierung des Thumbnail-Systems in eine formale Pipeline-Stufe mit Direct-to-Size-Dekodierung, sanfter Lerp-Fortschrittsanzeige und Race-Condition-sicherem UI-Batching."
project: "PhotoBoss"
tags: ["C++", "Qt", "Performance", "Architektur", "UX"]
status: "published"
isAutoTranslated: false
---

In den letzten Commits bin ich tief in den Maschinenraum von PhotoBoss eingetaucht. Mein Ziel war einfach, aber ehrgeizig: ein träges, Deadlock-anfälliges Thumbnail-System in eine professionelle, hochperformante Pipeline zu verwandeln.

Hier ist ein Blick auf das „Was“, das „Warum“ und wohin die Reise als Nächstes geht.

## 1. Die Herausforderungen: Warum ich refactored habe

Bevor ich diese Änderungen in Angriff nahm, stieß PhotoBoss an drei bedeutende Mauern:

- **Die Deadlock-Mauer**: Bei großen Datensätzen „hing“ oder fror die Benutzeroberfläche ein, da das Thumbnail-System und die Discovery-Engine ohne einen einheitlichen Controller um Ressourcen konkurrierten.
- **Die Speicher-Mauer**: Ich lud vollständige 20MP+ hochauflösende Bilder in den Speicher, nur um ein 150-Pixel-Thumbnail zu generieren. Bei modernen Kameras ist das eine massive Verschwendung von CPU und RAM.
- **Die Shutdown-Mauer**: Das Stoppen eines Scans hinterließ oft „Ghost“-Threads oder zwang mich zu einem vorzeitigen Shutdown, wobei die vom Hashing-Engine bereits verarbeiteten Ergebnisse verloren gingen.

---

## 2. Die Lösung: Eine einheitliche Pipeline

Ich habe das fragmentierte `ThumbnailProvider`-Singleton durch eine formale **Thumbnail-Generator-Stufe** ersetzt, die direkt in den `PipelineController` integriert ist.

### Der einheitliche Fortschrittsbalken (Das UX-Geheimnis)

Eine der sichtbarsten Verbesserungen ist das neue einheitliche Fortschrittsmeldesystem. Zuvor war der Fortschrittsbalken sprunghaft und unzusammenhängend und flatterte zwischen Scan-Zahlen und Verarbeitungs-Zahlen hin und her.

Ich habe diese in eine einzige lineare Reise konsolidiert. Um es sich wirklich hochwertig anfühlen zu lassen, habe ich nicht nur rohe Signale verknüpft. Stattdessen habe ich einen **Linear Interpolation (Lerping)**-Mechanismus im `PipelineController` implementiert.

Jetzt steuert ein 30ms-Timer die UI-Updates. Wenn die Verarbeitungs-Engine plötzlich 500 Hashes fertigstellt, „springt“ der Fortschrittsbalken nicht nach vorne; er gleitet sanft auf den Zielwert zu:

```cpp
// So glätte ich den Fortschrittsbalken
double gap = static_cast<double>(m_processedFiles_) - m_displayedFiles_;
double step = qMax(gap * 0.05, 1.0); // 5% der Lücke alle 30ms bewegen
m_displayedFiles_ += step;
```

Diese kleine Änderung hat eine massive Auswirkung auf die UX. Sie lässt die Anwendung stabil und reaktionsschnell wirken, selbst wenn die zugrunde liegende Arbeit in unregelmäßigen, Multithreading-Schüben erfolgt.

### „Direct-to-Size“-Dekodierung (Das Performance-Geheimnis)

Der größte Performance-„Sieg“ war die Änderung der Art und Weise, wie ich mit der Festplatte kommuniziere. Anstatt:

`Datei -> Vollständig Laden (Langsam) -> Vollständig Rotieren (Sehr Langsam) -> Verkleinern`

verwende ich jetzt `QImageReader` mit `setScaledSize()`:

`Datei -> Nur die benötigten 150x150 Pixel dekodieren (Sofort) -> Kleinen Puffer rotieren -> Fertig`

Durch die Dekodierung nur der untergetasteten Pixel habe ich die pro Bild erforderliche Arbeit um über **95%** reduziert. Das Rotieren eines kleinen Thumbnails ist im Vergleich zur Rotation eines 24-Megapixel-Originals praktisch kostenlos.

### Smarteres UI-Batching

Um die UI reaktionsfähig zu halten, habe ich ein hochfrequentes Populationssystem im `MainWindow` implementiert. Anstatt den GUI-Thread mit jedem einzelnen Ergebnis zu überlasten, bündele ich nun Gruppen alle 20ms. Dies hält die Bildrate hoch und ermöglicht es den Thumbnails, in Echtzeit auf den Bildschirm zu „flitzen“.

### Der Fix für Race Conditions: m_thumbnailCache

In einem Multithreading-System war das Thumbnail manchmal eher fertig, als das UI-Widget überhaupt erstellt wurde! Ich habe einen lokalen Cache im `MainWindow` hinzugefügt, der diese „verwaisten“ Thumbnails hält, bis ihr entsprechendes UI-Element erstellt ist, um fehlende Bilder zu vermeiden.

---

## 3. Aktueller Status: Bereit für den Einsatz

PhotoBoss kann nun tausende Bilder entdecken, sie auf Ähnlichkeit hashen und die UI mit Thumbnails in einer einzigen flüssigen Bewegung füllen. Die Pipeline ist stabil, speichereffizient und leert ihr Backlog beim Shutdown korrekt.

## 4. Meine Roadmap: Was kommt als Nächstes?

Ich verschiebe nun meinen Fokus auf die Benutzersteuerung und Datenverwaltung.

- **✅ Sofortige Priorität: Der „Stopp“-Button**
  Derzeit ist der „Scan starten“-Button eine Einbahnstraße. Ich werde einen **Stopp/Unterbrechen**-Umschalter implementieren. Wenn ein Scan läuft, ändert sich der Button zu „Stopp“, sodass Benutzer die Pipeline ordnungsgemäß unterbrechen können. Dies erfordert eine sorgfältige Signalisierung durch alle Stufen, um die Arbeit sofort ohne Absturz zu beenden.

- **✅ Datenverwaltung: Löschfunktion**
  Das Finden von Duplikaten ist nur nützlich, wenn man darauf reagieren kann. Ich baue die Logik, um Dateien sicher in den Papierkorb zu verschieben oder sie direkt aus der UI zu löschen, mit integrierten Sicherheitsprüfungen, damit man nicht versehentlich seine besten Aufnahmen löscht.

- **✅ Benutzerauswahl: Konfigurierbare Ähnlichkeit**
  Nicht jeder Benutzer möchte das Gleiche. Einige wollen exakte bitgenaue Duplikate; andere wollen Fotos finden, die im Abstand von einer Sekunde aufgenommen wurden.
  - **Exakter Modus**: Enge Schwellenwerte für die schnelle Bereinigung von Duplikaten.
  - **Ähnlichkeits-Modus**: Lockerere Schwellenwerte für die Gruppierung von „Fast-Treffern“.

Ich werde eine UI für diese Engine-Parameter hinzufügen, damit man die Suche an die Bedürfnisse der eigenen Bibliothek anpassen kann.

PhotoBoss wird jeden Tag schneller und smarter. Bleibt dran, wenn ich in die „Aktions“-Phase des Projekts übergehe!
