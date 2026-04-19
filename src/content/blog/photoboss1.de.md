---
id: photoboss1
title: "📸 Das Problem, über das niemand spricht: Fotobibliotheken in großem Maßstab"
seoTitle: 'Verwaltung umfangreicher, über mehrere Jahre hinweg angewachsener Fotobestände'
date: '2025-11-12'
category: Software Engineering
summary: >-
  Ein Blick auf das verborgene Chaos in langjährigen Fotobibliotheken – exakte
  Duplikate, Kopien mit geänderter Größe, aus Messengern exportierte Dateien –
  und warum herkömmliche Tools zur Datendeduplizierung versagen.
project: PhotoBoss
tags:
  - Problem Solving
  - Requirements Analysis
status: published
isAutoTranslated: true
---

Es fing ganz harmlos an. Ein paar Ordner mit Fotos von einer Kompaktkamera aus dem Jahr 2010, die auf einen Laptop gezogen wurden. Dann kamen die Smartphones. Dann die Backups der Smartphones. Dann die Backups der Laptops, auf denen die Backups der Smartphones gespeichert waren.

14 Jahre später ächzt mein Heimserver unter der Last einer digitalen Vergangenheit, die mittlerweile unmöglich zu bewältigen ist. Wir sprechen hier von Terabytes an Erinnerungen, die jedoch unter einer Schicht aus Redundanzen begraben sind.

Ich habe kürzlich einen Ordner namens `/backup_2018_final_sorted` geöffnet und festgestellt, dass er einen weiteren Ordner namens `/old_laptop_backup` enthielt, der eine fast identische Kopie des ersten Ordners enthielt, allerdings mit leicht abweichenden Dateinamen.

Es war nicht mehr nur ein Platzproblem. Es war ein archäologisches Problem.

## Warum es nicht gereicht hat, einfach nur die Duplikate zu löschen

Mein erster Gedanke war, wie bei jedem Ingenieur: *„Ich schreibe einfach ein Skript.“*

Ich habe mir ein handelsübliches Tool zur Datendeduplizierung besorgt, es 12 Stunden lang laufen lassen, und … es hat vielleicht 10 % des Datenmülls gefunden. Warum? Weil **binäre Gleichheit** in der Praxis ein fragiles Konzept ist.

-   **Die in der Größe angepasste Kopie:** Ein aus Lightroom für Instagram exportiertes Bild sieht auf dem Computer „anders“ aus, ist für mich aber identisch.
-   **Die Verschiebung der Metadaten:** Bei einer von Android auf Windows kopierten Datei geraten die EXIF-Daten oft durcheinander, wodurch sich ihr Hash-Wert ändert.
-   **Die Messenger-Komprimierung:** Das Foto, das über WhatsApp verschickt wurde? Es ist jetzt eine völlig neue Datei, ihrer Seele (und ihrer Pixel) beraubt.

Mir wurde klar, dass herkömmliche Tools Dateien als *Daten* betrachten, ich aber ein Tool brauchte, das sie als *Bilder* betrachtet. Ich musste nicht wissen, ob `img_123.jpg` mit `img_123_copy.jpg` identisch war. Ich musste wissen, ob sie *gleich aussahen*.

---

## Ein Projekt entsteht

Aus dieser Frustration entstand **PhotoBoss** (ein Arbeitstitel, der schließlich hängen blieb). Ich beschloss, das Projekt nicht als schnelles Skript, sondern als ernsthafte technische Herausforderung anzugehen. Ich wollte ein System entwickeln, das Hunderttausende von Bildern verarbeiten, sie anhand ihrer visuellen Merkmale identifizieren und mir helfen konnte, Ordnung in das Chaos zu bringen.

Es war auch der perfekte Anlass, endlich meine Kenntnisse in modernem C++ aufzufrischen und mich intensiv mit dem Qt-Framework auseinanderzusetzen – nicht nur, indem ich die Dokumentation las, sondern indem ich mich mit Themen wie Thread-Affinität, Ownership und benutzerdefinierten Modellen auseinandersetzte.

## Der Weg in die Zukunft

In den nächsten paar Beiträgen werde ich die Architektur dieses Projekts dokumentieren. Es war eine Reise voller „naiver“ Implementierungen, die meinen PC zum Absturz brachten, der Entdeckung von Perceptual-Hashing-Algorithmen und der schlussendlichen Erkenntnis, dass ich eine persistente Datenbank brauchte, um nicht den Verstand zu verlieren.

Dies ist kein Tutorial zum Thema „Wie man einen Deduplizierer schreibt“. Es ist ein Entwickler-Tagebuch darüber, „wie ich eine Lösung für ein Problem, das ich mir selbst geschaffen hatte, viel zu kompliziert gestaltet habe“.
