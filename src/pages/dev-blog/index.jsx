import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';

const markdownModules = import.meta.glob('../../content/blog/*.md', { query: '?raw' });

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, content: '' };

  const frontmatter = {};
  const dataLines = match[1].split('\n');
  dataLines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    } else if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  });

  return { data: frontmatter, content: match[2] };
}

export default function DevBlogIndex({ posts }) {
  const { t, i18n } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState('All');
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    async function loadTranslations() {
      const lang = i18n.language === 'de' ? 'de' : 'en';
      const allKeys = Object.keys(markdownModules);

      const loaded = {};
      for (const post of posts) {
        const targetKey = allKeys.find(k => k.includes(`/${post.id}.${lang}.`));
        const fallbackKey = allKeys.find(k => k.includes(`/${post.id}.en.`));
        const fileKey = targetKey || fallbackKey;

        if (fileKey) {
          try {
            const rawContent = await markdownModules[fileKey]();
            const contentStr = rawContent.default || rawContent;
            const { data } = parseFrontmatter(contentStr);
            loaded[post.id] = data;
          } catch (err) {
            console.error('Error loading translation for', post.id, err);
          }
        }
      }
      setTranslations(loaded);
    }

    loadTranslations();
  }, [i18n.language, posts]);

  // Extract unique options
  const categories = ['All', ...new Set(posts.map((p) => p.category))];
  const projects = ['All', ...new Set(posts.map((p) => p.project).filter(Boolean))];

  // Filter Logic
  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        const categoryMatch =
          selectedCategory === 'All' || post.category === selectedCategory;
        const projectMatch =
          selectedProject === 'All' || post.project === selectedProject;
        return categoryMatch && projectMatch;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedCategory, selectedProject]);

  const clearFilters = () => {
    setSelectedCategory('All');
    setSelectedProject('All');
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <SEO 
        title={t('blog.title', 'Dev Blog')} 
        description="Development blog posts and project updates." 
        url="/dev-blog" 
      />
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('blog.title')}
      </h1>

      {/* Filter Bar */}
      <div className="relative flex flex-col md:flex-row gap-4 mb-10 justify-center items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-600">{t('blog.project')}</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {projects.map((proj) => (
              <option key={proj} value={proj}>
                {proj === 'All' ? t('blog.all') : t(`blog.projects.${proj}`, { defaultValue: proj })}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-600">{t('blog.category')}</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? t('blog.all') : t(`blog.categories.${cat}`, { defaultValue: cat })}
              </option>
            ))}
          </select>
        </div>

        {(selectedCategory !== 'All' || selectedProject !== 'All') && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-500 hover:text-red-700 font-medium px-4 py-2 md:absolute md:right-4"
          >
            {t('blog.clearFilters')}
          </button>
        )}
      </div>

      <div className="space-y-8">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <Link
              key={post.id}
              to={`/dev-blog/${post.id}`}
              className="block p-6 rounded-2xl border border-gray-200 hover:shadow-lg transform hover:-translate-y-1 transition duration-300 bg-white"
            >
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {translations[post.id]?.title || post.title}
                </h2>
                {import.meta.env.DEV && (
                  <div className="flex gap-2 shrink-0">
                    {post.status === 'draft' && (
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-200">
                        Draft
                      </span>
                    )}
                    {new Date(post.date) > new Date() && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-purple-200">
                        Scheduled
                      </span>
                    )}
                  </div>
                )}
              </div>

              <p className="text-gray-500 text-sm mb-3">
                {new Date(post.date).toLocaleDateString(t.language === 'de' ? 'de-DE' : 'en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p className="text-gray-700 mb-4">
                {translations[post.id]?.summary || post.summary}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags && post.tags.map(tag => (
                  <span key={tag} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold border border-blue-100">
                    {tag}
                  </span>
                ))}
              </div>

              <span className="inline-block text-sm text-gray-500 font-medium">
                {t(`blog.categories.${post.category}`, { defaultValue: post.category })}
              </span>
            </Link>
          ))
        ) : (
          <div className="text-center text-gray-500 py-12">
            No posts found matching your filters.
          </div>
        )}
      </div>
    </main>
  );
}