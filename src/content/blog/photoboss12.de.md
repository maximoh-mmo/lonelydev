---
id: "photoboss12"
title: "🗑️ Entwickler-Tagebuch: Entwicklung einer benutzerfreundlichen Löschfunktion für doppelte Fotos"
seoTitle: "Entwicklertagebuch: Entwicklung einer Benutzeroberfläche zum sicheren Löschen doppelter Fotos"
date: "2026-05-01"
category: "Softwareentwicklung"
summary: "Eine detaillierte Anleitung zur Implementierung einer mehrstufigen Benutzeroberfläche zum Löschen doppelter Fotos, bei der Sicherheit durch mehrstufige Bestätigungsschritte, die Kontrolle über die Auswahl durch den Benutzer und das Verschieben von Dateien in den Papierkorb anstelle einer endgültigen Löschung im Vordergrund stehen."
project: "photoboss"
tags: ["UI Implementation", "File Management", "Safety Features", "Duplicate Detection", "User Experience"]
status: "draft"
isAutoTranslated: true
---

## Das Problem

Nachdem die Duplikatserkennung funktionierte, brauchten die Nutzer eine Möglichkeit, auf die Ergebnisse zu reagieren. Es reicht nicht aus, Duplikate lediglich zu finden – man muss in der Lage sein, die überzähligen Dateien sicher zu entfernen, ohne versehentlich die einzige Kopie zu löschen.

## Die Herausforderung

Jede Löschfunktion birgt ein enormes Risiko:
- Das versehentliche Löschen eines einzigartigen Fotos hätte katastrophale Folgen
- Endgültige Löschvorgänge lassen sich nicht rückgängig machen
- Das Löschen der falschen Dateien könnte den Verlust unersetzlicher Erinnerungen bedeuten

## Die Lösung: Sicherheit geht vor

Rather than building a full delete pipeline immediately, I took a layered approach:

### Ebene 1: Die Schaltfläche

Die Schaltfläche „Duplikate löschen“ wird nur angezeigt, wenn:
- der Scan abgeschlossen ist (die Pipeline befindet sich im Status „Gestoppt“)
- tatsächlich Duplikate gefunden wurden (mindestens eine Gruppe mit mehr als einem Bild)

Dadurch wird verhindert, dass die Schaltfläche angezeigt wird, wenn nichts zu löschen ist.

### Ebene 2: Auswahlsteuerung

Jede Miniaturansicht verfügt über ein Kontrollkästchen, mit dem Benutzer angeben können, welche Kopien behalten oder gelöscht werden sollen. Standardmäßig behält die Benutzeroberfläche das „beste“ Bild (höchste Qualität, größte Datei) und markiert die anderen zum Löschen – Benutzer können dies jedoch durch Aktivieren oder Deaktivieren des Kontrollkästchens überschreiben.

### Layer 3: Confirmation Dialog

Wenn der Benutzer auf „Duplikate löschen“ klickt, erscheint ein Bestätigungsdialog mit folgenden Elementen:
- Eine Warnung bezüglich der Aktion
- Miniaturansichten aller zum Löschen markierten Dateien
- Ein obligatorisches Kontrollkästchen „Ich bin mir der Risiken bewusst“
- Eine deaktivierte Schaltfläche „Löschen“, bis das Kontrollkästchen aktiviert ist

### Layer 4: No Duplicates Notification

Wenn ein Scan abgeschlossen ist, aber keine Duplikate gefunden wurden, wird dem Benutzer ein Informationsdialog angezeigt: „Im gescannten Ordner wurden keine Duplikate gefunden.“

## Implementation Complete

The UI scaffolding is now fully functional with actual file deletion implemented:

- **Moving files to system trash** - Uses `QFile::moveToTrash()` for safe, recoverable deletion
- **Cache consistency** - After deletion, the UI clears and resets requiring a new scan to repopulate (the prune mechanism will clean stale entries on next scan)
- **User feedback** - Success/error dialogs show results of the deletion operation

## Wichtige Sicherheitsmerkmale bleiben erhalten

1. **Mehrstufige Bestätigung** – Schaltfläche sichtbar → Bestätigungsdialog → Kontrollkästchen zur Risikobestätigung
2. **Papierkorb statt endgültiger Löschung** – Dateien werden in den Papierkorb verschoben, von wo aus sie wiederhergestellt werden können
3. **Auswahlkontrolle** – Benutzer können über Kontrollkästchen festlegen, welche Dateien zum Löschen markiert werden
4. **Eindeutiges Feedback** – Erfolgsmeldungen und Fehlermeldungen geben Auskunft darüber, was geschehen ist

This incremental approach — building the UI shell first, then connecting the action — lets us validate the user experience without rushing the dangerous parts. The delete functionality is now complete and safe to use.
