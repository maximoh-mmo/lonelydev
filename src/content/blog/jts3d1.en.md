---
id: jts3d1
title: "🎨 Engineering a Zero-Code Portfolio Studio & Media Sanitation Pipeline for a 3D Artist"
seoTitle: "Engineering a Zero Code Portfolio Studio and Media Sanitation Pipeline for a 3D Artist"
date: "2026-11-27"
category: "Software Engineering"
summary: "Builds an Astro and TypeScript portfolio paired with a local Content Studio for a 3D environment artist, featuring draggable blockout-vs-render comparisons, artwork-first galleries, and a defense-in-depth upload pipeline validating 24MP images, FFprobe video streams, and CV PDFs."
project: "JTS3D"
tags: ["Astro", "TypeScript", "Node.js", "Tooling", "Security", "Media Pipeline", "UX"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction

Right in the middle of my October engineering sprint, I built a complete portfolio platform—**JTS3D**—for a 3D environment artist who needed a showcase that put full-resolution renders, blockout-to-final comparisons, and turntable videos front and center without ever forcing her to touch Markdown, JSON, Git, or a database CMS.

The core design goal mirrored the editor tooling I enjoy building in game engines: **give the artist a visual, mistake-proof studio** while enforcing strict schema guarantees, responsive output, and defense-in-depth media validation underneath.

---

## 1. Dual-Server Architecture: Static Output Meets Local Studio

Rather than coupling a runtime backend or database to the public portfolio, the project splits cleanly into two parts:

1. **Public Portfolio (`Astro + TypeScript` on `127.0.0.1:4321`):** Compiles validated JSON records (`content/site.json` and `content/projects/*.json`) into a zero-client-bloat static site with responsive image variants, self-hosted fonts, and zero third-party embeds or trackers.
2. **Offline Content Studio (`Node.js` on `127.0.0.1:4322`):** A bespoke, form-based editor that validates changes against shared Zod schemas, prevents silent overwrites across open tabs via SHA-256 revision tokens, and creates atomic timestamped snapshots in `.local/backups/` before overwriting any record.

```text
+----------------------------------+       +-----------------------------------+
|      Content Studio (:4322)      |       |      Astro Static Site (:4321)    |
|  - Site Copy, Palette & Type     |       |  - Home, Projects, About, Contact |
|  - Project & Gallery Reordering  | ----> |  - Shared [slug].astro Template   |
|  - Media & PDF Sanitation Gate   | saves |  - Draggable Render Comparisons   |
|  - Revision Hash + Atomic Backup | JSON  |  - Lightbox & Bounded Video       |
+----------------------------------+       +-----------------------------------+
```

Every mutation endpoint verifies exact loopback origin/host headers and a per-process 64-hex session token (`TOKEN`), keeping the local authoring server strictly isolated on the artist's machine.

---

## 2. Artwork-First 3D Galleries, Comparisons & Fullscreen Anchoring

For a 3D environment artist, a portfolio lives or dies on how quickly a visitor can inspect lighting, geometry, and material transitions without interface clutter getting in the way.

### Unified Media Galleries & Draggable Comparisons
Each project page (`src/pages/projects/[slug].astro`) renders a shared **Gallery** component (`Gallery.astro`) combining high-resolution stills, MP4/WebM breakdown videos, and an interactive keyboard- and touch-accessible before/after slider (`Comparison.astro`) for comparing greybox blockouts against final lit renders.

![Interactive Blockout vs. Final Render Comparison Slider](/images/jts3d/comparison-focus.jpg)

Earlier iterations separated gallery stills from "Scene Breakdown" sections, which led to duplicate media management. To streamline the artist's workflow, I consolidated project media into one ordered list with a **Show in Scene Breakdown** toggle—writing an automatic migration path so legacy records adapt seamlessly into unified gallery entries the moment a project opens in the studio.

![Artwork-First Project Gallery with Thumbnail Strip](/images/jts3d/project-gallery-live.png)

### Bounded Video Playback & Custom Poster Thumbnails
Autoplaying video loops across a portfolio page distract the eye and spike mobile bandwidth. Instead, uploaded MP4 and WebM clips:
* Render a still frame or a custom uploaded poster image with a clear play badge in the thumbnail strip.
* Never autoplay, and automatically pause whenever the user switches slides, scrolls away, or closes the fullscreen lightbox.

![Gallery Thumbnail Strip with Custom Video Poster Support](/images/jts3d/video-gallery-thumbnails.png)

### Anchoring Fullscreen Icons Inside Visible Artwork
When displaying mixed portrait, ultrawide, and 16:9 renders inside a shared `object-fit: contain` stage, placing an "Enlarge" icon at the corner of the outer container causes it to float awkwardly over empty black margin on tall or narrow artwork. In `gallery.ts` and `EnlargeIcon.astro`, we measure the actual painted rectangle inside the container so the fullscreen button anchors tightly inside the visible artwork corner regardless of aspect ratio.

---

## 3. Defense-in-Depth Upload Sanitation

Allowing non-technical users to upload images, videos, and PDFs directly into a static site build pipeline requires treating every uploaded byte as untrusted until verified—both to protect the artist's portfolio from corrupt exports and to prevent malformed payloads from reaching the hosting edge.

### 1. Raster Images (`16 MiB` / `24 MP` Cap)
Images submitted through the studio pass through `sharp` in `tools/editor-server.mjs`:
* Rejects SVGs, animated/multipage payloads (`metadata.pages > 1`), and unrecognized containers.
* Decodes the pixel buffer with `limitInputPixels: 24_000_000` and `failOn: 'warning'`.
* Rotates to EXIF orientation, strips all EXIF metadata, clamps dimensions within `2560 × 2560` without upscaling, and re-encodes as clean `WebP` (`quality: 92`) under generated safe filenames.

### 2. Container & Stream Inspection for Video (`tools/video.mjs`)
Cloudflare Pages enforces a strict `25 MiB` single-asset limit. Rather than trusting `.mp4` or `.webm` file extensions, `inspectVideo()` verifies magic bytes (`ftyp` for MP4, EBML `0x1A 0x45 0xDF 0xA3` for WebM) and spawns a bundled `ffprobe` binary in a locked-down mode:
* Enforces `-protocol_whitelist file` and forces the demuxer (`mov` or `matroska`) while disabling external MOV data references (`-enable_drefs 0 -use_absolute_path 0`) under a 20-second timeout.
* Verifies packet counts (`nb_read_packets > 0`), restricts codecs to web-safe streams (`H.264`/`AV1`/`VP9` for MP4; `VP8`/`VP9`/`AV1` for WebM), rejects disguised `attached_pic` streams, and caps video resolution at 24 megapixels.
* Serves local studio previews with proper HTTP byte-range support and `X-Content-Type-Options: nosniff`.

### 3. Structural PDF Inspection for CV Uploads (`tools/pdf.mjs`)
Even a static résumé link can introduce risk if an exported PDF contains embedded scripts or launch actions. When uploading a CV (capped at `10 MB` and `100 pages`), `inspectPdf()` verifies the `%PDF-` header, parses every indirect object via `pdf-lib` (`throwOnInvalidObject: true`), and walks every dictionary and array recursively—rejecting password encryption alongside any `PDFName` matching `JavaScript`, `JS`, `Launch`, `EmbeddedFiles`, `Filespec`, `RichMedia`, `XFA`, `OpenAction`, `AA`, `SubmitForm`, `ImportData`, `GoToR`, or `GoToE`.

![CV Upload and Selection Panel inside Content Studio](/images/jts3d/cv-editor-update.png)

---

## Results & Validation

Every boundary in the local studio—schema compatibility, revision-conflict rejection, atomic backup recovery, spoofed MP4/WebM payloads, encrypted/scripted PDFs, and responsive 1440px/900px/390px layout integrity—is covered by automated Node tests (`tests/security.test.mjs`, `tests/pdf.test.mjs`, `tests/design-media.test.mjs`, `tests/build.test.mjs`).

Once the offline studio proved solid, the next challenge was taking it online: **how do you let an artist sign in from anywhere, preview unsaved edits live, and publish to production in one click—without giving the web editor access to source code or deployment keys?** We cover that zero-trust architecture in the next post.
