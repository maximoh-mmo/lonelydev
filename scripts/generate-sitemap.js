import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { visiblePosts } from '../src/data/post-visibility.js';
import { allPosts } from '../src/data/posts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://maxheinze.com';

// Define static routes
const staticRoutes = [
  '/',
  '/projects',
  '/about',
  '/contact',
  '/kumiko',
  '/keyboard',
  '/climbing',
  '/dev-blog',
];

try {
  // 1. Get Project Routes
  const projectsDir = path.join(__dirname, '../src/data/projects');
  let projectRoutes = [];
  if (fs.existsSync(projectsDir)) {
    const projectFiles = fs.readdirSync(projectsDir);
    projectRoutes = projectFiles
      .filter((file) => file.endsWith('.js') && file !== 'index.js')
      .map((file) => `/projects/${file.replace('.js', '')}`);
  }

  // 2. Get Dev-blog Post Routes
  const postRoutes = visiblePosts(allPosts, new Date().toISOString().slice(0, 10))
    .map(post => `/dev-blog/${post.id}`);

  // Combine all routes
  const routes = [...staticRoutes, ...projectRoutes, ...postRoutes];
  const englishOnlyRoutes = new Set(['/kumiko', '/keyboard', '/climbing']);
  const localizedRoutes = routes.filter(route => !englishOnlyRoutes.has(route));
  const allRoutes = [...routes, ...localizedRoutes.map(route => '/de' + (route === '/' ? '' : route))];

  // Generate XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map((route) => {
    return `  <url>\n    <loc>${BASE_URL}${route}</loc>\n  </url>`;
  })
  .join('\n')}
</urlset>
`;

  // Write to public folder
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf-8');

  // Cloudflare Pages serves 404.html for unknown paths. Rewrite only known
  // client-side routes to the SPA shell so real pages return HTTP 200 while
  // genuinely missing URLs retain a proper 404 status.
  const redirects = [
    '# Generated from the public route manifest. Unknown paths use 404.html.',
    ...allRoutes
      .filter(route => route !== '/')
      .map(route => `${route} / 200`),
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(publicDir, '_redirects'), redirects, 'utf-8');

  console.log(`✅ Sitemap generated successfully with ${allRoutes.length} routes.`);
} catch (error) {
  console.error('❌ Error generating sitemap:', error);
  process.exit(1);
}
