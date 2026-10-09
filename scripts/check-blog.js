import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { readBlogMetadata } from './blog-metadata.js';
import { allPosts } from '../src/data/posts.js';
import { visiblePosts } from '../src/data/post-visibility.js';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import { HelmetProvider } from 'react-helmet-async';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'src/content/blog');
const metadata = readBlogMetadata(directory);
const before = Object.fromEntries(fs.readdirSync(directory).map(file => [file, fs.readFileSync(path.join(directory, file))]));
const skip = spawnSync(process.execPath, ['scripts/auto-translate.js', '--skip-translate'], { cwd: root, encoding: 'utf8' });
assert.equal(skip.status, 0);
assert(skip.stdout.includes('no providers loaded and no content written'));
assert.equal(Object.keys(metadata).length, allPosts.length);
assert(visiblePosts(allPosts, '2026-10-09').some(post => post.id === 'onset16'));
assert(!visiblePosts(allPosts, '2026-10-09').some(post => post.id === 'onset17'));
assert.equal(visiblePosts([{ date: '2020-01-01', status: 'draft' }], '2026-10-09').length, 0);
assert.equal(visiblePosts(allPosts, '2020-01-01', true).length, allPosts.length);

const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true }, ssr: { noExternal: ['react-router-dom', 'react-router'], resolve: { conditions: ['module-sync', 'import', 'node', 'development'] } } });
try {
  const { MemoryRouter } = await server.ssrLoadModule('/node_modules/react-router-dom/dist/index.mjs');
  const { localizedPost } = await server.ssrLoadModule('/src/data/blog.js');
  const { default: BlogIndex } = await server.ssrLoadModule('/src/pages/dev-blog/index.jsx');
  const { default: Home } = await server.ssrLoadModule('/src/pages/Home.jsx');
  const i18n = i18next.createInstance();
  await i18n.init({ lng: 'en', fallbackLng: 'en', resources: Object.fromEntries(['en', 'de'].map(language => [language, { translation: JSON.parse(fs.readFileSync(path.join(root, `public/locales/${language}.json`), 'utf8')) }])) });
  function render(component, route) {
    return renderToStaticMarkup(React.createElement(HelmetProvider, {}, React.createElement(I18nextProvider, { i18n }, React.createElement(MemoryRouter, { initialEntries: [route] }, component))));
  }
  for (const language of ['en', 'de']) {
    await i18n.changeLanguage(language);
    const prefix = language === 'de' ? '/de' : '';
    const html = render(React.createElement(BlogIndex, { posts: visiblePosts(allPosts, '2026-10-09') }), `${prefix}/dev-blog`);
    assert(!html.includes('categories.undefined'));
    assert(html.includes(`href="${prefix}/dev-blog/onset16"`));
    assert(!html.includes('/dev-blog/onset17'));
    assert(!/<h2[^>]*><\/h2>/.test(html));
    assert(!render(React.createElement(Home), prefix || '/').includes('Automatische Übersetzung'));
    for (const post of allPosts) {
      const selected = localizedPost(post, language);
      assert(selected.title && selected.summary && selected.category);
      assert.equal(selected.date, post.date);
      assert.equal(selected.status, post.status);
      assert.equal(selected.category, metadata[post.id].en.category);
      assert.equal(selected.isAutoTranslated, selected.contentLanguage === 'de' && metadata[post.id].de.isAutoTranslated === true);
    }
  }
  const fallback = allPosts.find(post => !metadata[post.id].de);
  assert(fallback, 'Fixture should include an untranslated English post');
  assert.equal(localizedPost(fallback, 'de').isFallback, true);
  assert.equal(localizedPost(fallback, 'de').contentLanguage, 'en');
  assert.equal(localizedPost(fallback, 'en').isFallback, false);
  for (const [file, bytes] of Object.entries(before)) assert.deepEqual(fs.readFileSync(path.join(directory, file)), bytes);
  console.log(`PASS: ${allPosts.length} posts in both languages; source identities, typed translation flags, fallback, draft/future cutoff, and development visibility.`);
} finally {
  await server.close();
}
