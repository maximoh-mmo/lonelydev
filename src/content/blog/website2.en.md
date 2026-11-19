---
id: website2
title: "⚙️ Under the Hood of maxheinze.com: SVG Morphology Filters, Build-Time Vite Virtual Modules & Static Route Generation"
seoTitle: "Under the Hood of maxheinze com SVG Morphology Filters Build Time Vite Virtual Modules and Static Route Generation"
date: "2026-12-07"
category: "Software Engineering"
summary: "Solves cross-platform outlined hero typography using an SVG feMorphology dilation and composite subtraction filter, replaces client-side YAML parsing with a build-time Vite virtual module, and generates static HTML route entries from sitemap.xml."
project: "Portfolio"
tags: ["Vite", "SVG Filters", "Typography", "React", "Performance", "CI/CD", "Cloudflare Pages"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction

Visual polish on a portfolio site is often only as good as the browser and bundler mechanics underneath it. During the **maxheinze.com** redesign (`f768f94` through `02dea04`, plus the scheduling pipeline updates `1b3d0cb` and `ac1bcc2`), three subtle engineering problems surfaced that could not be solved with CSS tweaks alone:

1. **Cross-platform outlined headline glyphs** tearing and intersecting inside variable fonts.
2. **Client-side blog bundle bloat** from parsing YAML frontmatter in the browser across 60+ bilingual Markdown files.
3. **Deep-link routing and media weight** across a bilingual static deployment on Cloudflare Pages.

Here is how each piece works under the hood.

---

## 1. Artifact-Free Outlined Typography via SVG Morphology

The redesigned hero pairs solid display text (*"Systems that hold"*) with an outlined echo phrase (*"under pressure."* / *"unter Druck bestehen."*). That simple two-word contrast caused seven consecutive commits (`f768f94` through `7678b01`) of cross-platform debugging.

When you apply CSS `-webkit-text-stroke` or an outline font to modern geometric typefaces—especially variable weights—the stroke traces each vector subpath independently. Wherever horizontal bars, loops, or stems overlap inside a glyph (such as `e`, `a`, or `s`), the inner stroke cuts diagonally right across the letterform. Switching to static Inter (`3d98a36`) improved consistency, yet subtle corner miter spikes remained across different GPU text rasterizers.

### The Filter Pipeline Solution (`a1b18a1`, `7211677`, `7678b01`)
Instead of stroking glyph paths directly, I moved the outline into the pixel-compositing stage using an inline SVG filter (`#echo-outline` in `src/pages/Home.jsx`):

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

The filter operates purely on the rasterized alpha silhouette (`SourceAlpha`):
1. **Dilate:** Expands the opaque text silhouette outward by `1.25px` in every direction (`feMorphology`).
2. **Subtract Interior (`operator="out"`):** Cuts the original un-dilated glyph alpha cleanly out of the expanded silhouette—leaving **only** the `1.25px` exterior perimeter ring with zero internal path intersections and a genuinely transparent interior.
3. **Flood & Halo:** Fills that ring with the exact headline ink (`#f3f0e9`) and merges a dark drop shadow (`#030507`) so the hollow letters remain crisp over the bright key art behind them.

---

## 2. Build-Time Vite Virtual Module (`virtual:blog-metadata`)

As the dev-blog grew past 50+ posts (each with an English source `.en.md` and German `.de.md` translation), the original architecture suffered from two scaling flaws:
* Rendering `/dev-blog` imported Markdown files eagerly to extract titles, summaries, and tags in the browser.
* Frontmatter was parsed client-side with a fragile partial regex rather than a compliant YAML parser.

In `8b4411a` (documented in `docs/CONTENT_PIPELINE.md`), I replaced that client-side parsing with a custom Node-side Vite plugin (`scripts/blog-metadata.js`):

```text
[src/content/blog/*.md] ---> [gray-matter in Node (blogMetadataPlugin)]
                                         |
            Validates schema, dates, tags & English source presence
                                         |
                                         v
[DevBlogIndex] <--- synchronous import --- [virtual:blog-metadata]
[BlogPost]     <--- lazy ?raw import  --- [Matching .en/.de Markdown body]
```

### How It Enforces the Content Contract
1. **Strict Build-Time Validation:** `readBlogMetadata()` parses every `.en.md` and `.de.md` file with `gray-matter` in Node, ensuring `id` matches the filename, `date` matches `YYYY-MM-DD`, required fields (`title`, `summary`, `category`, `project`) are non-empty strings, `tags` is a string array, and every post has an authoritative English source.
2. **Synchronous Index, Lazy Bodies:** `src/data/blog.js` imports `virtual:blog-metadata` synchronously so the `/dev-blog` index and language filters render instantaneously, while `BlogPost.jsx` keeps full Markdown bodies behind `import.meta.glob('../../content/blog/*.md', { query: '?raw' })` lazy imports.
3. **Deterministic Filter Identity & Fallback:** Filter keys (`category`, normalized `project`) always resolve from the authoritative English metadata (`source.category`) even on German routes, preventing duplicate localized dropdown buckets. When a German translation does not yet exist, `localizedPost()` seamlessly falls back to English and sets `isFallback: true` to display a clear notice without blocking publication.
4. **Live HMR:** `handleHotUpdate()` watches `src/content/blog/` during development, invalidating the virtual module and refreshing metadata immediately whenever a Markdown file changes.

To prevent regressions, `scripts/check-blog.js` boots Vite in middleware mode, SSR-renders `/dev-blog` and `/` in both `en` and `de` across every registered post, and verifies publication cutoffs against `visiblePosts()`.

---

## 3. Static Route Entry Generation, Light Mode & Scheduled CI

### Deep-Link Entry Files from `sitemap.xml` (`8e62820`, `e04fb91`)
Single-page React routers served from static CDNs normally rely on fallback `404.html` or wildcard rewrite rules—which can cause search crawlers or strict edge caches to log `404` status codes on deep links like `/de/dev-blog/photoboss12`.

Inside `vite.config.js`, the `copyCloudflareFiles()` plugin runs at `closeBundle()`, parses every `<loc>` URL generated by `scripts/generate-sitemap.js`, and writes matching static `.html` entry points under `dist/` (copying `dist/index.html` to `dist/404.html` and `dist<route>.html`) so every English and German project, page, and eligible dev-blog route resolves with a native `200 OK` static file.

### Light Surface Calibration & Bilingual Legal Pages (`8a35cc4`, `3c89437`, `b39d74e`, `02dea04`)
Alongside the core architecture, I calibrated a genuinely light theme variant (`Home.light.css`, matching header and footer surfaces cleanly without dark bleed-through), added bilingual Imprint/Privacy routes, stripped unused high-weight raster frames to improve media loading (`8b4411a`), normalized climbing page EXIF orientations (`02dea04`), and moved the GitHub Actions workflow (`scheduled-build.yml`) to a **Monday and Friday `07:00 UTC`** drip-feed release schedule (`1b3d0cb`, `ac1bcc2`).

---

## Looking Ahead

With both **JTS3D** and the **maxheinze.com** redesign documented, our next three posts dive back into pure game engineering—opening the hood on **Achi**, a cross-platform abstract strategy game built in Godot 4 featuring 9-bit bitboards, a zero-allocation Negamax solver, colorblind-safe vector rendering, and `0 KB` 16-bit PCM procedural audio synthesis.
