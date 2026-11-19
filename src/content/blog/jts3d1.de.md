---
id: "jts3d1"
title: "🎨 Entwicklung einer Zero-Code-Pipeline für Portfolio, Studio und Medienaufbereitung für einen 3D-Künstler"
seoTitle: "Entwicklung eines „Zero-Code“-Portfolio-Studios und einer Medienbereinigungs-Pipeline für einen 3D-Künstler"
date: "2026-11-27"
category: "Software Engineering"
summary: "Erstellt ein Astro- und TypeScript-Portfolio in Verbindung mit einem lokalen Content Studio für einen 3D-Umgebungsgrafiker, das per Drag-and-Drop durchführbare Vergleiche zwischen Blockout und Rendering, „Artwork-First“-Galerien sowie eine mehrstufige Upload-Pipeline umfasst, die 24-MP-Bilder, FFprobe-Videostreams und CV-PDFs validiert."
project: "JTS3D"
tags: ["Astro", "TypeScript", "Node.js", "Tooling", "Security", "Media Pipeline", "UX"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

Mitten in meinem Entwicklungssprint im Oktober habe ich eine komplette Portfolio-Plattform – **JTS3D** – für eine 3D-Umgebungsgrafikerin entwickelt, die eine Präsentationsplattform benötigte, auf der Renderings in voller Auflösung, Vergleiche vom Blockout bis zum Endergebnis und Turntable-Videos im Mittelpunkt stehen, ohne dass sie sich jemals mit Markdown, JSON, Git oder ein Datenbank-CMS nutzen zu müssen.

Das zentrale Designziel spiegelte die Editor-Tools wider, die ich gerne in Spiel-Engines entwickle: **dem Grafiker ein visuelles, fehlersicheres Arbeitsumfeld zu bieten** und gleichzeitig strenge Schema-Garantien, eine reaktionsschnelle Ausgabe sowie eine mehrschichtige Medienvalidierung im Hintergrund sicherzustellen.

---

## 1. Dual-Server-Architektur: Statische Ausgabe trifft auf lokales Studio

Anstatt ein Laufzeit-Backend oder eine Datenbank mit dem öffentlichen Portfolio zu verknüpfen, gliedert sich das Projekt klar in zwei Teile:

1. **Öffentliches Portfolio (`Astro + TypeScript` unter `127.0.0.1:4321`):** Kompiliert validierte JSON-Datensätze (`content/site.json` und `content/projects/*.json`) zu einer statischen Website ohne überflüssigen Client-Ballast mit responsiven Bildvarianten, selbst gehosteten Schriftarten und ohne Einbettungen oder Tracker von Drittanbietern.
2. **Offline-Content-Studio (`Node.js` auf `127.0.0.1:4322`):** Ein maßgeschneiderter, formularbasierter Editor, der Änderungen anhand gemeinsamer Zod-Schemas validiert, stillschweigende Überschreibungen zwischen geöffneten Registerkarten mittels SHA-256-Revisions-Tokens verhindert und atomare, mit Zeitstempeln versehene Snapshots in `.local/backups/` erstellt, bevor ein Datensatz überschrieben wird.

```text
+----------------------------------+       +-----------------------------------+
|      Content Studio (:4322)      |       |      Astro Static Site (:4321)    |
|  - Site Copy, Palette & Type     |       |  - Home, Projects, About, Contact |
|  - Project & Gallery Reordering  | ----> |  - Shared [slug].astro Template   |
|  - Media & PDF Sanitation Gate   | saves |  - Draggable Render Comparisons   |
|  - Revision Hash + Atomic Backup | JSON  |  - Lightbox & Bounded Video       |
+----------------------------------+       +-----------------------------------+
```

Jeder Mutationsendpunkt überprüft die genauen Loopback-Origin- und Host-Header sowie ein prozessspezifisches 64-Hex-Sitzungstoken (`TOKEN`) und sorgt so dafür, dass der lokale Autorenserver streng auf dem Rechner des Künstlers isoliert bleibt.

---

## 2. 3D-Galerien mit Fokus auf die Kunstwerke, Vergleiche und Vollbild-Verankerung

Für einen 3D-Umgebungsgrafiker steht und fällt ein Portfolio damit, wie schnell ein Besucher Beleuchtung, Geometrie und Materialübergänge begutachten kann, ohne dass eine überladene Benutzeroberfläche dabei stört.

### Einheitliche Mediengalerien und per Drag & Drop bedienbare Vergleiche
Jede Projektseite (`src/pages/projects/[slug].astro`) rendert eine gemeinsame **Galerie**-Komponente (`Gallery.astro`), die hochauflösende Standbilder, MP4-/WebM-Analysevideos und einen interaktiven, per Tastatur und Touch bedienbaren Vorher-Nachher-Schieberegler (`Comparison.astro`) kombiniert, um Greybox-Blockouts mit den endgültigen, beleuchteten Renderings zu vergleichen.

![Schieberegler zum Vergleich zwischen interaktivem Blockout und endgültigem Rendering](/images/jts3d/comparison-focus.jpg)

In früheren Versionen waren die Galerie-Standbilder von den Abschnitten „Szenenaufschlüsselung“ getrennt, was zu doppelter Medienverwaltung führte. Um den Arbeitsablauf des Künstlers zu optimieren, habe ich die Projektmedien in einer geordneten Liste mit einem Umschaltknopf „**In der Szenenaufschlüsselung anzeigen**“ zusammengefasst – dabei habe ich einen automatischen Migrationspfad programmiert, sodass alte Datensätze nahtlos in einheitliche Galerieeinträge übernommen werden, sobald ein Projekt im Studio geöffnet wird.

! [Artwork-First-Projektgalerie mit Thumbnail Strip] (/images/jts3d/project-gallery-live.png)

### Begrenzte Videowiedergabe & benutzerdefinierte Poster-Thumbnails
Das automatische Abspielen von Video-Loops über eine Portfolioseite lenkt das Auge ab und erhöht die mobile Bandbreite. Stattdessen werden hochgeladene MP4- und WebM-Clips folgendermaßen: 
* Rendern Sie ein Standbild oder ein benutzerdefiniertes hochgeladenes Posterbild mit einem klaren Spielabzeichen im Vorschaustreifen. 
* Niemals automatisch abspielen und pausiert automatisch, sobald der Benutzer die Folie wechselt, wegscrollt oder die Vollbild-Lichtbox schließt.

! [Galerie-Thumbnail-Strip mit Unterstützung für benutzerdefinierte Videoposter] (/images/jts3d/video-gallery-thumbnails.png)

### Verankerung von Vollbildsymbolen in sichtbarem Artwork
Wenn gemischte Porträt-, Ultraweit- und 16:9-Renderings innerhalb einer gemeinsamen "Object-fit: contain"-Stufe angezeigt werden, führt das Platzieren eines "Vergrößern"-Symbols an der Ecke des äußeren Containers dazu, dass es unbeholfen über den leeren schwarzen Rand hoher oder schmaler Grafiken schwebt. In 'gallery.ts' und 'EnlargeIcon.astro' messen wir das tatsächlich bemalte Rechteck im Container, sodass die Vollbild-Schaltfläche unabhängig vom Seitenverhältnis fest in der sichtbaren Artwork-Ecke verankert ist.

---

## 3. Verteidigungs-in-Depth-Upload-Sanitation

Nicht-technischen Nutzern zu erlauben, Bilder, Videos und PDFs direkt in eine statische Website-Build-Pipeline hochzuladen, erfordert, dass jedes hochgeladene Byte bis zur Verifizierung als unvertrauenswürdig behandelt wird – sowohl um das Portfolio des Künstlers vor korrupten Exporten zu schützen als auch, um zu verhindern, dass fehlerhafte Payloads die Hosting-Kante erreichen.

### 1. Rasterbilder ('16 MiB' / '24 MP' Deckel)
Über das Studio eingereichte Bilder passieren 'sharp' in 'tools/editor-server.mjs': 
* Lehnt SVGs, animierte/mehrseitige Payloads ('metadata.pages > 1') und nicht erkannte Container ab. 
* Dekodiert den Pixelpuffer mit 'limitInputPixels: 24_000_000' und 'failOn: 'warning''. 
* Dreht in EXIF-Orientierung, entfernt alle EXIF-Metadaten, klemmt Abmessungen innerhalb von '2560 × 2560' ohne Upscaling ab und kodiert unter generierten sicheren Dateinamen als sauberes 'WebP' ('quality: 92') neu.

### 2. Container- & Stream-Inspektion für Video ('tools/video.mjs')
Cloudflare Pages setzt ein striktes "25 MiB"-Einzelattribut durch. Anstatt den Dateierweiterungen '.mp4' oder '.webm' zu vertrauen, verifiziert 'inspectVideo()' magische Bytes ('ftyp' für MP4, EBML '0x1A 0x45 0xDF 0xA3' für WebM) und erzeugt eine gebündelte 'ffprobe'-Binärdatei im gesperrten Modus: 
* Erzwingt '-protocol_whitelist Datei' und zwingt den Demuxer ('mov' oder 'matroska'), während externe MOV-Datenreferenzen ('-enable_drefs 0 -use_absolute_path 0') unter einem 20-sekündigen Timeout deaktiviert werden. 
* Überprüft Paketanzahl ('nb_read_packets > 0'), beschränkt Codecs auf websichere Streams ('H.264'/'AV1'/'VP9' für MP4; 'VP8'/'VP9'/'AV1' für WebM), lehnt getarnte 'attached_pic'-Streams ab und begrenzt die Videoauflösung auf 24 Megapixel. 
* Bietet lokale Studio-Vorschauen mit korrekter HTTP-Byte-Bereichsunterstützung und 'X-Content-Type-Options: nosniff'.

### 3. Strukturelle PDF-Inspektion für CV-Uploads ('tools/pdf.mjs')
Selbst ein statischer Resume-Link kann Risiken mit sich bringen, wenn ein exportiertes PDF eingebettete Skripte oder Startaktionen enthält. Beim Hochladen eines Lebenslaufs (begrenzt auf '10 MB' und '100 Seiten') überprüft 'inspectPdf()' den '%PDF-'-Header, analysiert jedes indirekte Objekt über 'pdf-lib' ('throwOnInvalidObject: true') und geht jedes Wörterbuch und jedes Array rekursiv durch – wobei Passwortverschlüsselung zusammen mit 'PDFName' abgelehnt wird, die mit 'JavaScript', 'JS', 'Launch', 'EmbeddedFiles', 'Filespec', 'RichMedia', 'XFA', 'OpenAction', 'AA', 'SubmitForm', 'ImportData', 'GoToR' oder 'GoToE' übereinstimmen.

! [CV-Upload- und Auswahlfenster im Content Studio] (/images/jts3d/cv-editor-update.png)

---

## Ergebnisse & Validierung

Jede Grenze im lokalen Studio – Schema-Kompatibilität, Ablehnung von Revision-Konflikten, atomare Backup-Wiederherstellung, gefälschte MP4/WebM-Payloads, verschlüsselte/skriptierte PDFs und responsive 1440px/900px/390px-Layoutintegrität – wird durch automatisierte Knotentests abgedeckt ('tests/security.test.mjs', 'tests/pdf.test.mjs', 'tests/design-media.test.mjs', 'tests/build.test.mjs').

Nachdem sich das Offline-Studio als solide erwiesen hatte, bestand die nächste Herausforderung darin, es online zu bringen: **Wie lässt man einen Künstler sich von überall anmelden, nicht gespeicherte Schnitte live vorschauen und mit einem Klick in die Produktion veröffentlichen – ohne dem Webeditor Zugriff auf Quellcode oder Bereitstellungsschlüssel zu geben?** Auf diese Zero-Trust-Architektur gehen wir im nächsten Beitrag ein.
