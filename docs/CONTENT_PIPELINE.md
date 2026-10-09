# Blog content and validation builds

English `src/content/blog/<id>.en.md` files are the authoritative inputs for
the existing translation tooling. German `<id>.de.md` files are committed
translations; `isAutoTranslated: true` identifies machine-generated content.
Existing German files may contain untranslated passages. This patch neither
regenerates nor edits those articles.

`src/data/posts.js` is the publication registry. Its ID, date, and status remain
authoritative for scheduling even where Markdown frontmatter differs. YAML
provides titles, summaries, tags, and SEO text. Source-English category/project
identities drive filters in both languages; UI locale files provide labels.
The existing PhotoBoss casing variants map to one filter identity.

The Vite metadata plugin parses real YAML using gray-matter in Node, validates
required fields, and supplies complete metadata synchronously. Article bodies
remain lazy imports. Browser code no longer implements a partial YAML parser or
waits for every article body before rendering the index. Missing German files
fall back to English; only translated German articles display the automatic
translation notice. A missing-translation notice accompanies English fallback
on German article routes. The homepage carries neither notice.

## Routine work

- `npm ci`
- `npm run dev`: sitemap generation and Vite; no translation calls.
- `npm run build` or `npm run build:skip-translate`: sitemap and Vite build;
  no translation calls, no Markdown writes, no credentials required.
- `node scripts/check-blog.js`: metadata, localized rendering, source identity,
  fallback, and publication-cutoff regression checks.
- `npm run lint`: report remaining baseline failures separately.

`node scripts/auto-translate.js --skip-translate` exits before loading providers
and makes no content writes. Sitemap generation intentionally updates
`public/sitemap.xml`; build output lives in `dist`. Inspect generated sitemap
changes before committing. Builds for the same source and UTC publication date
use the same visibility rules; this is not a promise of byte-identical output
across toolchains or dates.

Production visibility uses the UTC build date: drafts and future-dated entries
are hidden from the index and direct article routes. A scheduled entry becomes
eligible on its date. Development shows all registered posts. The sitemap uses
the same predicate in production mode and includes English and German URLs.
A new deployment is required to advance the publication cutoff; deployed sites
do not reveal posts solely because a visitor's clock advances. Future Markdown
is still bundled, as before; scheduling is not confidential-content protection.

## Explicit translation

`npm run translate` creates missing German translations, including scheduled
posts, while preserving existing files. `npm run translate:force` intentionally
regenerates existing translations. Both may contact configured providers and
write many files. Review, validate, and commit desired output before a native
Cloudflare build. Only English-source to German output is supported by this
runner, preventing a language flag from overwriting English sources.

The existing Friday workflow explicitly runs `npm run translate && npm run
build` to retain its previous behavior after making ordinary builds safe.
It then triggers the existing deployment hook. Translation output made only
inside that disposable runner is not committed and cannot reach a native
Cloudflare rebuild from Git. This pre-existing limitation needs a separate,
deliberate deployment decision if scheduled translations must be persisted;
the patch adds no deployment system and changes no Cloudflare settings.

## Remaining baseline lint failures

The original branch reported 42 errors. Node globals are now configured for
scripts and the Vite config, and `__BUILD_DATE__` is a read-only browser global.
The remaining 17 pre-existing errors comprise unused renderer parameters,
an unused translation helper and catch variable, and two translation regex
warnings. They are outside this focused content-contract patch.
