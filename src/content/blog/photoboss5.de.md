---
id: photoboss5
title: "\U0001F4F8 Die Erkenntnis: Alles neu zu berechnen ist Verschwendung"
seoTitle: Optimierung von Bild-Hashing-Pipelines durch Zwischenspeicherung
date: '2026-01-07'
category: Software Engineering
summary: >-
  Ermittlung der Ineffizienz bei der Neuberechnung von Hashwerten für
  unveränderte Dateien sowie Festlegung der Caching-Anforderungen hinsichtlich
  Persistenz, Ungültigkeitserklärung und verschiedener Hash-Algorithmen.
project: PhotoBoss
tags:
  - System Analysis
  - Performance
  - Caching
status: published
isAutoTranslated: true
---

Meine parallele Pipeline war ein wahres Meisterwerk. Ich konnte einen Ordner mit 10.000 Bildern in das Fenster ziehen und zusehen, wie 32 CPU-Threads ihn verschlangen. Die Lüfter drehten auf, der Fortschrittsbalken flog über den Bildschirm, und 45 Sekunden später hatte ich meine Ergebnisse.

Dann habe ich die App geschlossen. Und sie wieder geöffnet. Und denselben Ordner hineingezogen.

Und wartete weitere 45 Sekunden.

## Der „Aha“-Moment

Im Nachhinein erscheint es offensichtlich, aber in der Hektik, „es zum Laufen zu bringen“, hatte ich eine grundlegende Tatsache außer Acht gelassen: **Meine Fotos ändern sich nicht.**

Ein Foto, das 2012 aufgenommen und auf meinem NAS gespeichert wurde, wurde seit zehn Jahren nicht mehr verändert. Warum habe ich jedes Mal, wenn ich meine Bibliothek ordnen wollte, wertvolle Rechenleistung für das Dekodieren und Hashen dieses Fotos verschwendet?

Mir wurde klar, dass dieses Tool, um wirklich *nutzbar* zu sein – also etwas, das ich öffnen, an dessen Filtern ich herumspielen und wieder schließen konnte, ohne dabei Unbehagen zu verspüren –, **Speicher** benötigte.

---

## Definition des Caches

Ich schnappte mir ein Notizbuch (Papier ist immer noch die beste Entwicklungsumgebung) und skizzierte, wie ein Caching-System konkret aussehen könnte. Es ging nicht einfach nur darum, „die Ergebnisse zu speichern“. Es gab strenge Anforderungen:

1.  **Persistenz:** Es muss einen Neustart der Anwendung überstehen. (Auf Wiedersehen, `std::map`).
2.  **Invalidierung:** Wenn ich ein Foto bearbeite, muss der Cache dies sofort erkennen. Veraltete Daten sind schlimmer als gar keine Daten.
3.  **Versionierung:** Wenn ich nächste Woche meinen Hash-Algorithmus verbessere, brauche ich eine Möglichkeit, der Datenbank mitzuteilen: „Wirf die alten Hashes weg, sie sind jetzt Müll.“
4.  **Zero Config:** Ich wollte keinen PostgreSQL-Server installieren, nur um meine Desktop-App auszuführen.

---

## Der Kandidat: SQLite

Ich habe kurz darüber nachgedacht, eine riesige JSON-Datei oder ein benutzerdefiniertes Binärformat zu verwenden. Dann fiel mir ein, dass ich mir meine geistige Gesundheit bewahren wollte.

SQLite war die einzig logische Wahl. Es ist serverlos, besteht aus einer einzigen Datei und bietet Transaktionsintegrität. Sollte meine App während des Schreibvorgangs eines Cache-Eintrags abstürzen, wird die Datenbank nicht beschädigt. Außerdem bietet Qt über `QSqlDatabase` eine hervorragende Unterstützung dafür.

Die Entscheidung war gefallen. Nun musste ich nur noch ein Schema entwerfen, mit dem sich eine Datei eindeutig identifizieren ließ, ohne sie tatsächlich zu lesen.
