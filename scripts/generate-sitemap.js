import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  const postsFilePath = path.join(__dirname, '../src/data/posts.js');
  const postRoutes = [];
  if (fs.existsSync(postsFilePath)) {
    const postsFileContent = fs.readFileSync(postsFilePath, 'utf-8');
    // Regex to extract id: 'some-id'
    const idRegex = /id:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = idRegex.exec(postsFileContent)) !== null) {
      postRoutes.push(`/dev-blog/${match[1]}`);
    }
  }

  // Combine all routes
  const allRoutes = [...staticRoutes, ...projectRoutes, ...postRoutes];

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

  console.log(`✅ Sitemap generated successfully with ${allRoutes.length} routes.`);
} catch (error) {
  console.error('❌ Error generating sitemap:', error);
  process.exit(1);
}
