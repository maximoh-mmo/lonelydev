---
id: photoboss12
title: "\U0001F5D1️ Entwickler-Tagebuch: Entwicklung einer Benutzeroberfläche zum sicheren Löschen doppelter Fotos"
seoTitle: >-
  Entwicklertagebuch: Entwicklung einer Benutzeroberfläche zum sicheren Löschen
  doppelter Fotos
date: '2026-05-01'
category: Software Engineering
summary: >-
  Eine detaillierte Anleitung zur Implementierung einer mehrstufigen
  Benutzeroberfläche zum Löschen doppelter Fotos, bei der Sicherheit durch
  mehrstufige Bestätigungsschritte, die Kontrolle über die Auswahl durch den
  Benutzer und das Verschieben von Dateien in den Papierkorb anstelle einer
  endgültigen Löschung im Vordergrund stehen.
project: photoboss
tags:
  - UI Implementation
  - File Management
  - Safety Features
  - Duplicate Detection
  - User Experience
status: draft
isAutoTranslated: true
---

# Entwickler-Tagebuch: Hinzufügen der Löschfunktion zur Benutzeroberfläche – Implementierung abgeschlossen

**Veröffentlicht am 19.04.2026**

## Das Problem

Nachdem die Duplikatserkennung funktionierte, brauchten die Nutzer eine Möglichkeit, auf die Ergebnisse zu reagieren. Es reicht nicht aus, Duplikate lediglich zu finden – man muss in der Lage sein, die überzähligen Dateien sicher zu entfernen, ohne versehentlich die einzige Kopie zu löschen.

## Die Herausforderung

Jede Löschfunktion birgt ein enormes Risiko:
- Das versehentliche Löschen eines einzigartigen Fotos hätte katastrophale Folgen
- Endgültige Löschvorgänge lassen sich nicht rückgängig machen
- Das Löschen der falschen Dateien könnte den Verlust unersetzlicher Erinnerungen bedeuten

## Die Lösung: Sicherheit geht vor

Anstatt sofort eine vollständige Lösch-Pipeline aufzubauen, habe ich einen schrittweisen Ansatz gewählt:

### Ebene 1: Die Schaltfläche

Die Schaltfläche „Duplikate löschen“ wird nur angezeigt, wenn:
- der Scan abgeschlossen ist (die Pipeline befindet sich im Status „Gestoppt“)
- tatsächlich Duplikate gefunden wurden (mindestens eine Gruppe mit mehr als einem Bild)

Dadurch wird verhindert, dass die Schaltfläche angezeigt wird, wenn nichts zu löschen ist.

### Ebene 2: Auswahlsteuerung

Jede Miniaturansicht verfügt über ein Kontrollkästchen, mit dem Benutzer angeben können, welche Kopien behalten oder gelöscht werden sollen. Standardmäßig behält die Benutzeroberfläche das „beste“ Bild (höchste Qualität, größte Datei) und markiert die anderen zum Löschen – Benutzer können dies jedoch durch Aktivieren oder Deaktivieren des Kontrollkästchens überschreiben.

### Ebene 3: Bestätigungsdialog

Wenn der Benutzer auf „Duplikate löschen“ klickt, erscheint ein Bestätigungsdialog mit folgenden Elementen:
- Eine Warnung bezüglich der Aktion
- Miniaturansichten aller zum Löschen markierten Dateien
- Ein obligatorisches Kontrollkästchen „Ich bin mir der Risiken bewusst“
- Eine deaktivierte Schaltfläche „Löschen“, bis das Kontrollkästchen aktiviert ist

### Ebene 4: Benachrichtigung über keine Duplikate

Wenn ein Scan abgeschlossen ist, aber keine Duplikate gefunden wurden, wird dem Benutzer ein Informationsdialog angezeigt: „Im gescannten Ordner wurden keine Duplikate gefunden.“

## Implementierung abgeschlossen

Das UI-Gerüst ist nun voll funktionsfähig, und das Löschen von Dateien ist nun implementiert:

- **Dateien in den System-Papierkorb verschieben** - Verwendet `QFile::moveToTrash()` für eine sichere, wiederherstellbare Löschung
- **Cache-Konsistenz** - Nach dem Löschen wird die Benutzeroberfläche geleert und zurückgesetzt, sodass ein neuer Scan erforderlich ist, um sie wieder zu füllen (der Bereinigungsmechanismus entfernt veraltete Einträge beim nächsten Scan)
- **Benutzerrückmeldung** - Erfolg/Fehler-Dialoge zeigen die Ergebnisse des Löschvorgangs an

## Wichtige Sicherheitsmerkmale bleiben erhalten

1. **Mehrstufige Bestätigung** – Schaltfläche sichtbar → Bestätigungsdialog → Kontrollkästchen zur Risikobestätigung
2. **Papierkorb statt endgültiger Löschung** – Dateien werden in den Papierkorb verschoben, von wo aus sie wiederhergestellt werden können
3. **Auswahlkontrolle** – Benutzer können über Kontrollkästchen festlegen, welche Dateien zum Löschen markiert werden
4. **Eindeutiges Feedback** – Erfolgsmeldungen und Fehlermeldungen geben Auskunft darüber, was geschehen ist

Dieser schrittweise Ansatz – zuerst die Benutzeroberfläche zu erstellen und dann die Aktion zu verknüpfen – ermöglicht es uns, die Benutzererfahrung zu überprüfen, ohne die risikobehafteten Teile überstürzt anzugehen. Die Löschfunktion ist nun fertiggestellt und kann bedenkenlos genutzt werden.
