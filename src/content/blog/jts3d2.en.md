---
id: jts3d2
title: "🔒 Zero-Trust Static Publishing & Sandboxed Live Previews for Non-Technical Creators"
seoTitle: "Zero Trust Static Publishing and Sandboxed Live Previews for Non Technical Creators"
date: "2026-11-30"
category: "Software Engineering"
summary: "Architects a split-repository Git CMS with a read-only Docker container, Cloudflare Tunnel and Access JWT verification, an HMAC-signed Worker webhook bridge, and real-time CSP-sandboxed Astro draft previews."
project: "JTS3D"
tags: ["Cloudflare", "Docker", "Zero Trust", "GitHub Actions", "Astro", "Security Architecture", "CMS"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction

In the previous post, we built a local Astro + Node.js Content Studio for a 3D artist. Local authoring works great at a desk—but real creative work happens across laptops, studios, and last-minute job applications.

The next engineering step was bringing that Content Studio online with **one-click "Save & publish" automation** and **real-time live previews of unsaved edits**, while enforcing strict zero-trust boundaries:

1. **The hosted editor must never hold permissions to modify website code or deploy directly to production.**
2. **A content commit must never be able to execute code inside the build pipeline.**
3. **Every request—including live draft previews—must be authenticated, sandboxed, and resilient to stale or concurrent saves.**

---

## 1. Split-Repository Git CMS & Least-Privilege Boundaries

Rather than storing portfolio content inside the same repository as Astro templates and GitHub Actions workflows, the hosted architecture separates code and data into **two private repositories** with completely isolated credentials:

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

### Why This Split Matters
* **The Editor's Token is Blind to Code:** The Docker editor only holds a fine-grained token scoped to the data-only content repository (`Contents: read/write`, `Commit statuses: read`), and `hosted-editor.mjs` explicitly forbids pushing to `main` or `master`—limiting writes strictly to `editor-draft` and `publish-ready` and rejecting any path outside `content/*.json`, `public/images/`, `public/videos/`, and `public/documents/*.pdf`.
* **The Webhook Bridge Cannot Deploy:** The Cloudflare Worker (`deploy/publish-webhook/worker.mjs`) verifies the raw `x-hub-signature-256` HMAC header using Web Crypto, validates that the push came from the private content repository's `publish-ready` branch with `redirect: 'manual'` (never forwarding auth headers on redirects), and triggers a single fixed `workflow_dispatch` on the website repository.
* **The Website Pipeline Never Trusts Content Blindly:** The publishing workflow (`publish-content.yml`) imports data blobs without running any scripts from the content repo, runs full schema and asset validation, verifies the target SHA is still the latest revision, and deploys `dist/` to Cloudflare Pages—recording both application and content commits in `dist/build-revision.json`.

![Hosted Content Studio Showing Save and Automated Publication Status](/images/jts3d/automatic-publishing-preview.png)

---

## 2. Hardening the Hosted Editor Container (`compose.yml`)

Because a Node.js editor handles uploaded images, videos, and PDFs, the container deployment is locked down with defense-in-depth runtime restrictions (`deploy/compose.yml`):

* **Zero Published Host Ports:** The editor container binds no host ports at all. A sidecar `cloudflared` tunnel shares its private network namespace (`network_mode: service:editor`) so all traffic must enter through Cloudflare's edge and pass Cloudflare Access first.
* **Immutable Filesystem & Dropped Capabilities:** The editor container runs as a non-root user with `read_only: true`, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, memory/CPU ceilings (`2g` / `2` CPUs), and a single `tmpfs` mount scoped to `/tmp` (`mode=0700`).
* **Cryptographic JWT Verification on Every Request:** `accessVerifier()` in `tools/hosted-editor.mjs` validates every incoming `cf-access-jwt-assertion` header against Cloudflare's remote JWKS endpoint (`RS256`), verifying issuer, audience, required claims (`exp`, `iat`, `sub`, `email`), and an explicit case-insensitive email allowlist—paired with a per-identity rate limiter (30 mutations per minute).

If a publication webhook ever fails or times out, the artist sees clear status feedback (*waiting*, *publishing*, *live*, or *failed*) right next to the sticky Save controls and can click **Retry publishing** without ever touching GitHub.

---

## 3. Real-Time Sandboxed Live Previews for Unsaved Edits

Waiting for a full static build and deploy just to check whether a headline line-break or gallery caption reads well breaks creative flow.

To solve that cleanly without duplicating Astro templates in JavaScript, I added a **Private Live Draft Preview** system (`tools/draft-preview.mjs`, `editor/preview.js`, `astro.preview.config.mjs`):

```text
[Editor Form State] --(debounced POST /api/preview)--> [Schema Validation]
                                                               |
                                                               v
[Sandboxed Iframe]  <--(Renders Real Astro Templates)-- [Expiring Memory Store]
(1280 / 820 / 390px)     (No Git Commit / No Disk Write) (Max 20 Snapshots, 10m TTL)
```

1. **Same Templates, Real CSS:** A dedicated SSR-compiled preview bundle (`preview/pages/index.astro`) renders the exact `index.astro`, `projects/[slug].astro`, `about.astro`, `contact.astro`, and `impressum.astro` components and `global.css` against the unsaved payload.
2. **Multi-Viewport Inspection:** Inside the studio, wide screens split into a side-by-side form + preview pane with quick switches between **Desktop (`1280px`)**, **Tablet (`820px`)**, and **Mobile (`390px`)**, preserving scroll position across live updates.
3. **Ephemeral & Strictly Sandboxed:** Snapshots are validated through `siteSchema` and `projectSchema`, held strictly in a bounded in-memory map (max 20 entries, 10-minute lifetime), served with `noindex` and `no-store` headers behind the same Cloudflare Access + session-token boundary, and rendered inside an iframe sandbox that blocks form submissions, external requests, and top-level navigation—while leaving the public static `dist/` build completely free of preview endpoints or editor code.

![Content Studio Side-by-Side Live Preview on Desktop](/images/jts3d/editor-live-preview.png)

![Content Studio Mobile 390px Live Draft Preview](/images/jts3d/editor-live-preview-mobile.png)

---

## Key Takeaways

Building **JTS3D** reinforced that great toolmaking for artists follows the exact same principles whether you are working in Unreal Engine C++ or Node/Astro:
* **Hide complexity, not capability:** The artist edits copy, swaps typography/palette tokens, checks mobile layouts, and publishes live—without ever seeing a Git branch, YAML schema, or Docker command.
* **Isolate trust boundaries:** Separating content data from executable code and deployment secrets ensures convenience never comes at the cost of security.

In the next two posts, I turn that same systems-visibility philosophy back onto my own website—showing how I redesigned **maxheinze.com** for technical recruiters.
