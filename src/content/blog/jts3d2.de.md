---
id: "jts3d2"
title: "🔒 Zero-Trust-basierte statische Veröffentlichung und Live-Vorschauen in einer Sandbox für nicht-technisch versierte Autoren"
seoTitle: "Zero-Trust-basierte statische Veröffentlichung und Live-Vorschauen in einer Sandbox-Umgebung für nicht-technisch versierte Autoren"
date: "2026-11-30"
category: "Software Engineering"
summary: "Entwicklung eines Git-CMS mit geteiltem Repository, einem schreibgeschützten Docker-Container, Cloudflare Tunnel und JWT-Authentifizierung über Access, einer HMAC-signierten Worker-Webhook-Brücke sowie Echtzeit-Vorschauen von Astro-Entwürfen in einer CSP-Sandbox."
project: "JTS3D"
tags: ["Cloudflare", "Docker", "Zero Trust", "GitHub Actions", "Astro", "Security Architecture", "CMS"]
status: "scheduled"
isAutoTranslated: true
---
## Einführung

Im vorherigen Beitrag haben wir ein lokales Astro + Node.js Content Studio für einen 3D-Künstler gebaut. Lokales Authoring funktioniert hervorragend am Schreibtisch – aber echte kreative Arbeit findet auf Laptops, Studios und Last-Minute-Bewerbungen statt.

Der nächste technische Schritt war es, das Content Studio mit **Ein-Klick-"Speichern & Veröffentlichen"-Automatisierung** und **Echtzeit-Live-Vorschauen nicht gespeicherter Bearbeitungen** online zu bringen, wobei strikte Zero-Trust-Grenzen durchgesetzt wurden:

1. **Der gehostete Editor darf niemals über Berechtigungen verfügen, den Website-Code zu ändern oder direkt in die Produktionsumgebung zu deployen.**
2. **Ein Content-Commit darf niemals in der Lage sein, Code innerhalb der Build-Pipeline auszuführen.**
3. **Jede Anfrage – einschließlich der Vorschau auf Live-Entwürfe – muss authentifiziert, in einer Sandbox ausgeführt und gegen veraltete oder gleichzeitige Speichervorgänge geschützt sein.**

---

## 1. Git-CMS mit geteilten Repositorys und Grenzen für das Prinzip der geringsten Berechtigungen

Anstatt Portfolio-Inhalte im selben Repository wie Astro-Vorlagen und GitHub-Actions-Workflows zu speichern, trennt die gehostete Architektur Code und Daten in **zwei private Repositorys** mit vollständig voneinander getrennten Anmeldedaten:

```text
+-------------------------------------------------------------------------+
|                   1. Artist Browser -> Zero-Trust Gate                  |
|      Cloudflare Access (MFA) + Signed JWT (CF-Access-Jwt-Assertion)     |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|               2. Read-Only Docker Editor + Cloudflare Tunnel            |
|  - Verifies JWT issuer, audience, expiry & explicit email allowlist     |
|  - Commits validated JSON/WebP/MP4/PDF via Content-Repo-Only Token      |
|  - Never touches website source code or Pages deployment secrets        |
+------------------------------------+------------------------------------+
                                     |
        Saves Draft                  | Clicks "Save & Publish"
        (editor-draft)               | Advances publish-ready
                                     v
+-------------------------------------------------------------------------+
|                 3. Data-Only Content Repository (GitHub)                |
|   Strict path allowlist, 256 MiB ceiling, zero code/workflow files      |
+------------------------------------+------------------------------------+
                                     | Push Webhook (HMAC-SHA256)
                                     v
+-------------------------------------------------------------------------+
|              4. Signed Webhook Bridge (Cloudflare Worker)               |
|   Verifies raw HMAC signature -> Dispatches publish-content.yml         |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|             5. Trusted Website Pipeline (GitHub Actions)                |
|   Imports validated data (no code exec) -> Astro Build -> CF Pages      |
+-------------------------------------------------------------------------+
```

### Warum diese Trennung wichtig ist
* **Das Editor-Token berücksichtigt den Code nicht:** Der Docker-Editor verfügt lediglich über ein fein abgestuftes Token, dessen Geltungsbereich auf das reine Daten-Repository beschränkt ist (`Inhalt: Lese-/Schreibzugriff`, `Commit-Status: Lesezugriff`), und `hosted-editor.mjs` verbietet ausdrücklich das Pushen in `main` oder `master` – Schreibzugriffe sind streng auf `editor-draft` und `publish-ready` beschränkt, und alle Pfade außerhalb von `content/*.json`, `public/images/`, `public/videos/` und `public/documents/*.pdf` werden abgelehnt.
* **Die Webhook-Bridge kann nicht bereitstellen:** Der Cloudflare Worker (`deploy/publish-webhook/worker.mjs`) überprüft den rohen `x-hub-signature-256`-HMAC-Header mithilfe von Web Crypto, validiert, dass der Push aus dem `publish-ready`-Zweig des privaten Content-Repositorys mit `redirect: 'manual'` (Authentifizierungs-Header werden bei Weiterleitungen niemals weitergeleitet) und löst einen einzigen festen `workflow_dispatch` im Website-Repository aus.
* **Die Website-Pipeline vertraut Inhalten niemals blind:** Der Veröffentlichungs-Workflow (`publish-content.yml`) importiert Datenblobs aus dem Content-Repository, ohne Skripte auszuführen, führt eine vollständige Schema- und Asset-Validierung durch, überprüft, ob der Ziel-SHA noch der neuesten Revision entspricht, und stellt `dist/` auf Cloudflare Pages bereit – dabei werden sowohl Anwendungs- als auch Content-Commits in `dist/build-revision.json` protokolliert.

![Hosted Content Studio mit Status „Gespeichert“ und „Automatische Veröffentlichung“](/images/jts3d/automatic-publishing-preview.png)

---

## 2. Absicherung des Hosted-Editor-Containers (`compose.yml`)

Da ein Node.js-Editor hochgeladene Bilder, Videos und PDFs verarbeitet, ist die Containerbereitstellung mit Verteidigungs-in-Depth-Laufzeitbeschränkungen ("deploy/compose.yml') gesperrt:

* **Null veröffentlichte Host-Ports:** Der Editor-Container bindet überhaupt keine Host-Ports. Ein Sidecar-"Cloudflared"-Tunnel teilt sich seinen privaten Netzwerknamensraum ('network_mode: service:editor'), sodass sämtlicher Datenverkehr zuerst durch Cloudflare-Edge gelangen und Cloudflare Access passieren muss. 
* **Unveränderliche Dateisystem- & Droped-Fähigkeiten:** Der Editor-Container läuft als Nicht-Root-Benutzer mit 'read_only: true', 'cap_drop: [ALL]', 'security_opt: [no-new-privileges:true]', Speicher-/CPU-Limits ('2g' / '2' CPUs) und einem einzelnen 'tmpfs'-Mount, der auf '/tmp' ('mode=0700') ausgerichtet ist. 
* **Kryptografische JWT-Verifizierung bei jeder Anfrage:** 'accessVerifier()' in 'tools/hosted-editor.mjs' validiert jeden eingehenden 'cf-access-jwt-assertion'-Header gegen Cloudflares entfernten JWKS-Endpunkt ('RS256'), verifiziert Aussteller, Zielgruppe, erforderliche Ansprüche ('exp', 'iat', 'sub', 'email') und eine explizite, nicht groß- oder kleinschreifempfindliche E-Mail-Erlaubnisliste – gekoppelt mit einem Rate-Begrenzer pro Identität (30 Mutationen pro Minute).

Wenn ein Publikations-Webhook jemals fehlschlägt oder eine Timeout ausläuft, sieht der Künstler ein klares Statusfeedback (*wartend*, *veröffentlicht*, *live* oder *fehlgeschlagen*) direkt neben den angestickten Speicherkontrollen und kann auf **Erneut veröffentlichen** klicken, ohne jemals GitHub zu berühren.

---

## 3. Echtzeit-Sandbox-Live-Vorschauen für nicht gespeicherte Schnitte

Das Warten auf einen vollständigen statischen Build und das Deployen, nur um zu prüfen, ob ein Zeilenumbruch oder eine Galerieunterschrift gut gelesen wird, stört den kreativen Fluss.

Um das sauber zu lösen, ohne Astro-Vorlagen in JavaScript zu duplizieren, habe ich ein **Private Live Draft Preview**-System hinzugefügt ('tools/draft-preview.mjs', 'editor/preview.js', 'astro.preview.config.mjs'):

```text
[Editor Form State] --(debounced POST /api/preview)--> [Schema Validation]
                                                               |
                                                               v
[Sandboxed Iframe]  <--(Renders Real Astro Templates)-- [Expiring Memory Store]
(1280 / 820 / 390px)     (No Git Commit / No Disk Write) (Max 20 Snapshots, 10m TTL)
```

1. **Same Templates, Real CSS:** Ein dediziertes, von SSR kompiliertes Vorschau-Bundle ("preview/pages/index.astro") rendert die exakten Komponenten "index.astro", "projects/[slug].astro", "about.astro", "contact.astro" und "impressum.astro" sowie "global.css" gegen die nicht gespeicherte Nutzlast. 
2. **Multi-Viewport-Inspektion:** Im Studio teilen sich die Breitbildschirme in einem nebeneinanderliegenden Format + Vorschaufenster auf, mit schnellem Wechsel zwischen **Desktop ('1280px')**, **Tablet ('820px')** und **Mobile ('390px')**, wodurch die Scrollposition über Live-Updates hinweg erhalten bleibt. 
3. **Ephemeral & Strictly Sandboxed:** Snapshots werden über 'siteSchema' und 'projectSchema' validiert, strikt in einer begrenzten In-Memory-Map (maximal 20 Einträge, Lebensdauer von 10 Minuten), mit 'noindex'- und 'no-store'-Headern hinter derselben Cloudflare Access + Session-Token-Grenze bereitgestellt und innerhalb einer iframe-Sandbox gerendert, die Formulareinreichungen, externe Anfragen und die Navigation auf oberer Ebene blockiert – während die öffentliche statische 'dist/'-Build vollständig frei von Vorschau-Endpunkten oder Editor-Code bleibt.

! [Content Studio Side-by-Side-Live-Vorschau auf dem Desktop] (/images/jts3d/editor-live-preview.png)

! [Content Studio Mobile 390px Live-Entwurfsvorschau] (/images/jts3d/editor-live-preview-mobile.png)

---

## Wichtige Erkenntnisse

Das Bauen von **JTS3D** hat bestätigt, dass großartiges Werkzeugmachen für Künstler exakt denselben Prinzipien folgt, egal ob du mit Unreal Engine C++ oder Node/Astro arbeitest: 
* **Komplexität ausblenden, nicht Fähigkeit:** Der Künstler bearbeitet Texte, tauscht Typografie-/Palette-Tokens aus, überprüft mobile Layouts und veröffentlicht live – ohne jemals einen Git-Branch, YAML-Schema oder Docker-Befehl zu sehen. 
* **Vertrauensgrenzen isolieren:** Die Trennung von Inhaltsdaten von ausführbarem Code und Bereitstellungsgeheimnissen stellt sicher, dass Bequemlichkeit niemals auf Kosten der Sicherheit geht.

In den nächsten beiden Beiträgen wende ich dieselbe Philosophie der Systemtransparenz wieder auf meine eigene Website zurück – und zeige, wie ich **maxheinze.com** für technische Recruiter neu gestaltet habe.
