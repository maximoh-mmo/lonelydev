---
id: photoboss1
title: "\U0001F4F8 Das Problem, über das niemand spricht: Fotobibliotheken im großen Maßstab"
seoTitle: Verwalten Sie mehrjährige Fotobibliotheken im großen Stil
date: '2025-11-12'
category: Software Engineering
summary: >-
  Erkunden Sie das verborgene Chaos mehrjähriger Fotobibliotheken – exakte
  Duplikate, verkleinerte Kopien, Messaging-Exporte – und warum typische
  Deduplizierungstools scheitern.
project: PhotoBoss
tags:
  - Problem Solving
  - Requirements Analysis
status: published
isAutoTranslated: true
---
Es begann ganz harmlos. Ein paar Ordner mit Fotos einer 2010er Kompaktkamera, auf einen Laptop gezogen. Dann kamen die Smartphones. Dann die Backups der Smartphones. Dann die Backups der Laptops, auf denen sich die Backups der Smartphones befanden.

14 Jahre später ächzt mein Heimserver unter der Last einer digitalen Geschichte, die nicht mehr zu verwalten ist. Wir sprechen von Terabytes an Erinnerungen, aber sie sind unter einem Sediment aus Redundanz begraben.

Ich habe kürzlich einen Ordner mit dem Namen „/backup_2018_final_sorted“ geöffnet und festgestellt, dass er einen anderen Ordner namens „/old_laptop_backup“ enthielt, der eine fast identische Kopie des ersten Ordners enthielt, jedoch mit leicht unterschiedlichen Dateinamen.

Es war nicht mehr nur ein Speicherproblem. Es war ein archäologisches Problem.

## Warum „Einfach Duplikate löschen“ nicht funktioniert hat

Mein erster Gedanke war, wie bei jedem Ingenieur: *„Ich schreibe einfach ein Drehbuch.“*

Ich habe mir ein Standard-Deduplizierungstool geschnappt, es 12 Stunden lang ausgeführt und ... es hat vielleicht 10 % des Datenmülls gefunden. Warum? Weil **binäre Gleichheit** in der realen Welt ein fragiles Konzept ist.

- **Die verkleinerte Kopie:** Ein aus Lightroom für Instagram exportiertes Bild ist „anders“ als auf dem Computer, aber für mich identisch. - **Die Metadatenverschiebung:** Bei einer von Android auf Windows kopierten Datei werden die EXIF-Daten häufig verfälscht, wodurch sich der Hash ändert. - **Die Messenger-Komprimierung:** Das über WhatsApp gesendete Foto? Es ist jetzt eine völlig neue Datei, die ihrer Seele (und Pixel) beraubt ist.

Mir wurde klar, dass Standardtools Dateien als *Daten* anzeigen, aber ich brauchte ein Tool, das sie als *Bilder* anzeigt. Ich musste nicht wissen, ob „img_123.jpg“ gleich „img_123_copy.jpg“ ist. Ich musste wissen, ob sie *gleich aussahen*.

---

## Ein Projekt ist geboren

Aus dieser Frustration entstand **PhotoBoss** (ein Arbeitstitel, der hängen blieb). Ich beschloss, dies nicht als schnelles Drehbuch, sondern als ernsthafte technische Herausforderung zu betrachten. Ich wollte ein System aufbauen, das Hunderttausende Bilder aufnehmen, sie wahrnehmungsmäßig erfassen und mir dabei helfen kann, das Chaos zu verstehen.

Es war auch der perfekte Vorwand, endlich meine modernen C++-Kenntnisse zu verbessern und tief in das Qt-Framework einzutauchen – nicht nur das Lesen der Dokumente, sondern auch den Kampf um Thread-Affinität, Besitz und benutzerdefinierte Modelle.

## Der Weg in die Zukunft

In den nächsten Beiträgen werde ich die Architektur dieser Sache dokumentieren. Es war eine Reise voller „naiver“ Implementierungen, die meinen PC zum Absturz brachten, der Entdeckung wahrnehmungsbezogener Hashing-Algorithmen und schließlich der Erkenntnis, dass ich eine persistente Datenbank brauchte, um den Verstand zu behalten.

Dies ist kein Tutorial zum Thema „Wie schreibe ich einen Deduplizierer“. Es ist ein Entwicklerprotokoll darüber, wie ich eine Lösung für ein Problem, das ich für mich selbst erstellt habe, überentwickelt habe.
