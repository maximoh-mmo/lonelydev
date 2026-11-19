---
id: "website2"
title: "⚙️ Ein Blick hinter die Kulissen von maxheinze.com: SVG-Morphologie-Filter, virtuelle Vite-Module zur Erstellungszeit und statische Routengenerierung"
seoTitle: "Ein Blick hinter die Kulissen von maxheinze.com: SVG-Morphologie-Filter, Build-Zeit, Vite-Virtual-Module und statische Routengenerierung"
date: "2026-12-07"
category: "Software Engineering"
summary: "Löst das Problem der plattformübergreifenden Typografie für konturierte Hero-Elemente mithilfe eines SVG-FeMorphology-Dilatations- und Composite-Subtraktionsfilters, ersetzt das clientseitige YAML-Parsing durch ein virtuelles Vite-Modul zur Erstellungszeit und generiert statische HTML-Route-Einträge aus der Datei „sitemap.xml“."
project: "Portfolio"
tags: ["Vite", "SVG Filters", "Typography", "React", "Performance", "CI/CD", "Cloudflare Pages"]
status: "scheduled"
isAutoTranslated: true
---
## Einführung

Der visuelle Feinschliff auf einer Portfolio-Website ist oft nur so gut wie die Browser- und Bundler-Mechaniken darunter. Während des **maxheinze.com**-Redesigns ('f768f94' bis '02dea04' plus die Planungspipeline-Updates '1b3d0cb' und 'ac1bcc2') traten drei subtile technische Probleme auf, die mit CSS-Anpassungen allein nicht gelöst werden konnten:

1. **Plattformübergreifende, konturierte Überschriften-Glyphen**, die sich in variablen Schriftarten überlappen und durchschneiden.
2. **Aufblähung des clientseitigen Blog-Bundles** durch das Parsen von YAML-Frontmatter im Browser bei über 60 zweisprachigen Markdown-Dateien.
3. **Deep-Link-Routing und Mediengewichtung** bei einer zweisprachigen statischen Bereitstellung auf Cloudflare Pages.

Hier erfahren Sie, wie die einzelnen Komponenten im Hintergrund funktionieren.

---

## 1. Artefaktfreie umrissene Typografie über SVG-Morphologie

Das neu gestaltete Hero-Element kombiniert einen fetten Display-Text (*„Systems that hold“*) mit einem konturierten Echo-Satz (*„under pressure.“* / *„unter Druck bestehen.“*). Dieser einfache Kontrast zwischen zwei Wörtern führte zu sieben aufeinanderfolgenden Commits (`f768f94` bis `7678b01`) im Zusammenhang mit plattformübergreifendem Debugging.

Wenn Sie CSS `-webkit-text-stroke` oder eine Outline-Schriftart auf moderne geometrische Schriftarten anwenden – insbesondere bei variablen Schriftstärken –, zeichnet der Strich jeden Vektor-Teilpfad unabhängig nach. Überall dort, wo sich horizontale Striche, Schleifen oder Schäfte innerhalb eines Glyphs überlappen (wie bei `e`, `a` oder `s`), verläuft der innere Strich diagonal quer durch die Buchstabenform. Der Wechsel zur statischen Schriftart „Inter“ (`3d98a36`) verbesserte die Konsistenz, doch blieben bei verschiedenen GPU-Textrasterisierern subtile Eckenversatzspitzen bestehen.

### Die Filter-Pipeline-Lösung (`a1b18a1`, `7211677`, `7678b01`)
Anstatt Glyphenpfade direkt zu zeichnen, habe ich den Umriss mithilfe eines Inline-SVG-Filters (`#echo-outline` in `src/pages/Home.jsx`) in die Pixel-Compositing-Phase verschoben:

```xml
<filter id="echo-outline" x="-30%" y="-30%" width="160%" height="160%">
  <feMorphology in="SourceAlpha" operator="dilate" radius="1.25" result="dilated" />
  <feComposite in="dilated" in2="SourceAlpha" operator="out" result="strokeMask" />
  <feFlood floodColor="#f3f0e9" floodOpacity="1" result="strokeColor" />
  <feComposite in="strokeColor" in2="strokeMask" operator="in" result="stroke" />
  <feDropShadow in="stroke" dx="0" dy="0" stdDeviation="3" floodColor="#030507" floodOpacity="0.9" result="shadow" />
  <feMerge>
    <feMergeNode in="shadow" />
    <feMergeNode in="stroke" />
  </feMerge>
</filter>
```

Der Filter wirkt ausschließlich auf die gerasterte Alpha-Silhouette (`SourceAlpha`):
1. **Dilate:** Erweitert die undurchsichtige Textsilhouette in alle Richtungen um `1,25 px` (`feMorphology`).
2. **Innenbereich subtrahieren (`operator="out"`):** Schneidet die ursprüngliche, nicht erweiterte Glyphen-Alphakanal-Silhouette sauber aus der erweiterten Silhouette heraus – dabei bleibt **nur** der äußere Umrissring von `1,25 px` mit null internen Pfadschnittpunkten und einem vollständig transparenten Innenbereich übrig.
3. **Füllung & Halo:** Füllt diesen Ring mit genau der Farbe der Überschrift (`#f3f0e9`) und fügt einen dunklen Schlagschatten (`#030507`) hinzu, sodass die hohlen Buchstaben vor dem hellen Key-Art-Hintergrund scharf bleiben.

---

## 2. Virtuelles Vite-Modul zur Erstellungszeit (`virtual:blog-metadata`)

Als der Dev-Blog über 50+ Beiträge hinauswuchs (jeder mit einer englischen Quelle ".en.md" und der deutschen Übersetzung ".de.md"), litt die ursprüngliche Architektur unter zwei Skalierungsfehlern: 
* Rendering von importierten Markdown-Dateien von '/dev-blog' bereitwillig, um Titel, Zusammenfassungen und Tags im Browser zu extrahieren. 
* Frontmatter wurde clientseitig mit einem fragilen partiellen Regex anstelle eines konformen YAML-Parsers geparst.

In '8b4411a' (dokumentiert in 'docs/CONTENT_PIPELINE.md') habe ich dieses clientseitige Parsing durch ein benutzerdefiniertes Node-Side-Vite-Plugin ('scripts/blog-metadata.js') ersetzt:

```text
[src/content/blog/*.md] ---> [gray-matter in Node (blogMetadataPlugin)]
                                         |
            Validates schema, dates, tags & English source presence
                                         |
                                         v
[DevBlogIndex] <--- synchronous import --- [virtual:blog-metadata]
[BlogPost]     <--- lazy ?raw import  --- [Matching .en/.de Markdown body]
```

### Wie es den Inhaltsvertrag durchsetzt
1. **Strict Build-Time Validation:** 'readBlogMetadata()' analysiert jede '.en.md'- und '.de.md'-Datei mit 'gray-matter' in Node und stellt sicher, dass 'id' mit dem Dateinamen übereinstimmt, 'date' mit 'YYYY-MM-DD' übereinstimmt, erforderliche Felder ('title', 'summary', 'category', 'project') nicht leere Strings sind, 'tags' ein String-Array ist und jeder Beitrag eine autoritative englische Quelle hat. 
2. **Synchroner Index, Lazy Bodies:** 'src/data/blog.js' importiert 'virtual:blog-metadata' synchron, sodass der '/dev-blog'-Index und die Sprachfilter sofort angezeigt werden, während 'BlogPost.jsx' vollständige Markdown-Texte hinter 'import.meta.glob('.. /.. /content/blog/*.md', { Query: '?raw' })' faule Importe. 
3. **Deterministische Filteridentität & Fallback:** Filterschlüssel ('category', normalisiertes 'project') lösen sich immer aus den autoritativen englischen Metadaten ('source.category') auf, selbst auf deutschen Routen, wodurch doppelte lokalisierte Dropdown-Buckets verhindert werden. Wenn noch keine deutsche Übersetzung existiert, fällt 'localizedPost()' nahtlos auf Englisch zurück und setzt 'isFallback: true' so ein, dass eine klare Mitteilung angezeigt wird, ohne die Veröffentlichung zu blockieren. 
4. **Live HMR:** 'handleHotUpdate()' überwacht während der Entwicklung 'src/content/blog/', wodurch das virtuelle Modul ungültig wird und Metadaten sofort aktualisiert wird, sobald sich eine Markdown-Datei ändert.

Um Rückschritte zu verhindern, startet 'scripts/check-blog.js' Vite im Middleware-Modus, SSR rendert '/dev-blog' und '/' sowohl in 'en' als auch in 'de' über jeden registrierten Beitrag und überprüft Veröffentlichungsgrenzen mit 'visiblePosts()'.

---

## 3. Statische Routeneingabegenerierung, Lichtmodus & geplanter CI

### Deep-Link-Eintragsdateien von 'sitemap.xml' ('8e62820', 'e04fb91')
Single-Page-React-Router, die von statischen CDNs bedient werden, basieren normalerweise auf Fallback-"404.html"- oder Wildcard-Rewrite-Regeln – was dazu führen kann, dass Suchcrawler oder strenge Edge-Caches "404"-Statuscodes auf Deeplinks wie "/de/dev-blog/photoboss12" protokollieren.

Innerhalb von 'vite.config.js' läuft das Plugin 'copyCloudflareFiles()' unter 'closeBundle()', analysiert jede von <loc>'scripts/generate-sitemap.js generierte ''URL' und schreibt entsprechende statische .html''-Eingangspunkte unter 'dist/' (wobei 'dist/index.html' in 'dist/404.html' und 'dist<route>.html' kopiert wird), sodass jedes englische und deutsche Projekt, jede Seite und jede berechtigte Dev-Blog-Route mit einer nativen '200 OK'-Statistikdatei gelöst wird.

### Lichtoberflächenkalibrierung & zweisprachige Rechtsseiten ('8a35cc4', '3c89437', 'b39d74e', '02dea04')
Neben der Kernarchitektur habe ich eine wirklich leichte Themenvariante kalibriert ('Home.light.css', bei der Kopf- und Fußzeilenoberflächen sauber ohne dunkles Durchlauf abgestimmt werden), zweisprachige Imprint-/Privacy-Routen hinzugefügt, ungenutzte, schwergewichtige Rasterframes entfernt, um das Medienladen zu verbessern ('8b4411a'), die EXIF-Orientierung der Seiten normalisiert ('02dea04') und den GitHub-Aktions-Workflow ('scheduled-build.yml') auf einen **Montag und Freitag '07:00 UTC'**-Tropf-Feed-Release-Zeitplan verschoben ('1b3d0cb', 'ac1bcc2').

---

## Blick nach vorne

Nachdem sowohl **JTS3D** als auch das **maxheinze.com**-Redesign dokumentiert sind, tauchen unsere nächsten drei Beiträge wieder in reine Spieleentwicklung ein – wir öffnen die Haube für **Achi**, ein plattformübergreifendes abstraktes Strategiespiel mit 9-Bit-Bitboards, einem Zero-Allocation Negamax-Löser, farbenblind-sicherem Vektorrendering und '0 KB' 16-Bit-PCM-Prozedural-Audiosynthese.
