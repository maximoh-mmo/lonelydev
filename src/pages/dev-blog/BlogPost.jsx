import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import TranslationDisclaimer from '../../components/TranslationDisclaimer';
import SEO from '../../components/SEO';
import { localizedPost } from '../../data/blog';
import { ChevronLeft, Calendar, Tag, Folder } from 'lucide-react';

// For loading the content lazily
const markdownModules = import.meta.glob('../../content/blog/*.md', { query: '?raw' });

export default function BlogPost({ posts }) {
  const { id } = useParams();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const language = pathname.startsWith('/de/') ? 'de' : 'en';
  const prefix = language === 'de' ? '/de' : '';
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPost() {
      setLoading(true);
      setError(false);

      try {
        const entry = posts.find(post => post.id === id);
        if (!entry) throw new Error('Post is not published');
        const localized = localizedPost(entry, language);
        const matchingKey = `../../content/blog/${id}.${localized.contentLanguage}.md`;
        const rawContent = await markdownModules[matchingKey]();
        if (cancelled) return;
        
        const contentStr = rawContent.default || rawContent;
        const content = contentStr.replace(/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
        
        if (!cancelled) {
          setPost({ ...localized, content, id });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading blog post:', err);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPost();

    return () => {
      cancelled = true;
    };
  }, [id, language, posts]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
          <div className="h-64 bg-gray-200 rounded mt-10"></div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('blog.notFound', 'Post not found')}</h2>
        <button 
          onClick={() => navigate(`${prefix}/dev-blog`)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {t('nav.devBlog', 'Back to Blog')}
        </button>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-6 py-16 text-left">
      <SEO 
        title={post.seoTitle || post.title} 
        description={post.summary} 
        url={`${prefix}/dev-blog/${id}`}
      />
      
      <button 
        onClick={() => navigate(`${prefix}/dev-blog`)}
        className="group flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-12"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">{t('nav.devBlog')}</span>
      </button>

      <header className="mb-12">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </time>
          </div>
          <div className="flex items-center gap-1.5">
            <Folder className="w-4 h-4" />
            <span>{t(`blog.categories.${post.category}`, { defaultValue: post.category })}</span>
          </div>
          {post.project && (
            <div className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">
              {post.project}
            </div>
          )}
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-8 leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-wrap gap-2">
          {post.tags?.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      </header>

      {(post.isAutoTranslated && !post.isFallback) && language === 'de' && <TranslationDisclaimer type="auto" />}
      {post.isFallback && language === 'de' && <TranslationDisclaimer type="missing" />}

      <MarkdownRenderer content={post.content} />

      <footer className="mt-20 pt-10 border-t border-gray-100 italic text-gray-500 text-sm">
        {t('blog.footer', 'Thanks for reading! If you have any questions about this technical implementation, feel free to reach out via the contact page.')}
      </footer>
    </article>
  );
}
