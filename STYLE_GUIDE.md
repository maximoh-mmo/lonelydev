# Max Heinze portfolio style guide

## Purpose
Help employers assess Max's programming strengths through his work and reach his CV or email. Put personal contributions before general project context. Ground claims in approved evidence. Preserve original articles and translations; never invent responsibilities, results, measurements, or engine versions.

## Shared foundations
Use custom properties in src/index.css for canvas, surfaces, ink, muted text, accents, borders, spacing, and reading width. Both themes share the same hierarchy. Cinematic homepage image overlays deliberately retain light text on dark backgrounds. Navigation and footer use the same chrome surface.

Wrap secondary pages in main.page. Use a left-aligned header.page-header, short .eyebrow, one h1, and .page-lead. Use .prose for reading content, .editorial-section for About/project sections, and .tags for metadata. Avoid generic card grids, arbitrary theme colors, and hover zoom effects.

## Hiring paths
Use CareerActions for CV and email. Use CVLink for the full-screen viewer so return navigation and opener focus remain available. The footer provides these actions throughout the site. Work opens the curated homepage; All projects opens the full archive.

## Languages and reading
Use useRouteLanguage for route prefixes: English at / and German at /de. Preserve query filters and hashes during language switches. Identify English legacy content on German routes. Article notices distinguish machine translations from English fallback. Format dates in UTC.

Each article owns one h1. Markdown body h1 becomes h2. Keep one semantic pre/code pair per block. Wide code and tables scroll within their containers. Images retain meaningful alt text and intrinsic proportions; project previews can crop deliberately. Announce external new-tab links where appropriate.

## Accessibility
Keep visible focus, a skip link, readable contrast, and controls at least 44px tall. Mobile navigation closes with Escape and restores focus. The native CV dialog makes the background inert, focuses Close, supports Escape, and restores focus to its invoking link. Direct CV loads close to the corresponding language homepage. Keep Open PDF and Download available as fallbacks.

Respect reduced motion. Theme supports system/light/dark, applies before paint, and tolerates unavailable storage. Review 320px mobile, tablet, and desktop in both languages and themes before release.
