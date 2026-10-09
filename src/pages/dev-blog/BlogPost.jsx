import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import TranslationDisclaimer from '../../components/TranslationDisclaimer';
import SEO from '../../components/SEO';
import CareerActions from '../../components/CareerActions';
import useRouteLanguage from '../../hooks/useRouteLanguage';
import { localizedPost } from '../../data/blog';
import { ChevronLeft, Calendar, Folder } from 'lucide-react';

// For loading the content lazily
const markdownModules = import.meta.glob('../../content/blog/*.md', { query: '?raw' });

export default function BlogPost({ posts }) {
  const { id } = useParams();
  const { t } = useTranslation();
  const { language, prefix } = useRouteLanguage();
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

  if (loading) return <main className="page article-page" aria-busy="true"><p className="page-lead" role="status">{t('ui.loading')}</p></main>;
  if (error || !post) return <main className="page"><header className="page-header"><h1>{t('blog.notFound', 'Post not found')}</h1><Link className="action-link" to={prefix + '/dev-blog'}>{t('nav.devBlog')}</Link></header></main>;
  return (
    <main className="page article-page">
      <SEO title={post.seoTitle || post.title} description={post.summary} url={prefix + '/dev-blog/' + id} />
      <Link className="action-link article-back" to={prefix + '/dev-blog'}><ChevronLeft aria-hidden="true" />{t('nav.devBlog')}</Link>
      <article>
        <header className="page-header">
          <p className="eyebrow">{post.project}</p>
          <h1 lang={post.contentLanguage}>{post.title}</h1>
          <div className="article-meta">
            <span><Calendar aria-hidden="true" /><time dateTime={post.date}>{new Date(post.date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time></span>
            <span><Folder aria-hidden="true" />{t('blog.categories.' + post.category, { defaultValue: post.category })}</span>
          </div>
          <ul className="tags">{post.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
          <p className="article-summary" lang={post.contentLanguage}>{post.summary}</p>
        </header>
        {language === 'de' && (post.isFallback ? <TranslationDisclaimer type="missing" /> : post.isAutoTranslated ? <TranslationDisclaimer type="auto" /> : null)}
        <div lang={post.contentLanguage}><MarkdownRenderer content={post.content} /></div>
        <footer className="article-end"><p>{t('ui.articleContact')}</p><CareerActions /></footer>
      </article>
    </main>
  );
}
