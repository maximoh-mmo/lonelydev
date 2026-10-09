import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { localizedPost } from '../../data/blog';
import { useTranslation } from 'react-i18next';
import useRouteLanguage from '../../hooks/useRouteLanguage';
import SEO from '../../components/SEO';

export default function DevBlogIndex({ posts }) {
  const { t } = useTranslation();
  const { language, prefix } = useRouteLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const localized = useMemo(() => posts.map(post => localizedPost(post, language)), [posts, language]);
  const categories = ['All', ...new Set(localized.map(post => post.category))];
  const projects = ['All', ...new Set(localized.map(post => post.project))];
  const category = categories.includes(searchParams.get('category')) ? searchParams.get('category') : 'All';
  const project = projects.includes(searchParams.get('project')) ? searchParams.get('project') : 'All';
  const filtered = localized.filter(post => (category === 'All' || post.category === category) && (project === 'All' || post.project === project)).sort((a, b) => b.date.localeCompare(a.date));
  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value === 'All') next.delete(key); else next.set(key, value);
    setSearchParams(next);
  }
  function clearFilters() {
    const next = new URLSearchParams(searchParams);
    next.delete('project'); next.delete('category');
    setSearchParams(next);
  }
  return (
    <main className="page blog-page">
      <SEO title={t('blog.title')} description={t('ui.blogIntro')} url={prefix + '/dev-blog'} />
      <header className="page-header"><p className="eyebrow">{t('ui.blogKicker')}</p><h1>{t('blog.title')}</h1><p className="page-lead">{t('ui.blogIntro')}</p></header>
      <div className="blog-filters">
        <div className="blog-filter"><label htmlFor="blog-project">{t('blog.project')}</label><select id="blog-project" value={project} onChange={event => setFilter('project', event.target.value)}>{projects.map(value => <option key={value} value={value}>{value === 'All' ? t('blog.all') : t('blog.projects.' + value, { defaultValue: value })}</option>)}</select></div>
        <div className="blog-filter"><label htmlFor="blog-category">{t('blog.category')}</label><select id="blog-category" value={category} onChange={event => setFilter('category', event.target.value)}>{categories.map(value => <option key={value} value={value}>{value === 'All' ? t('blog.all') : t('blog.categories.' + value, { defaultValue: value })}</option>)}</select></div>
        {(project !== 'All' || category !== 'All') && <button className="filter-clear" type="button" onClick={clearFilters}>{t('blog.clearFilters')}</button>}
      </div>
      <p className="blog-count" role="status">{t('ui.postCount', { count: filtered.length })}</p>
      <ol className="blog-list">
        {filtered.map(post => <li key={post.id} className="blog-entry">
          <Link to={prefix + '/dev-blog/' + post.id}>
            <div className="blog-entry__meta">
              <time dateTime={post.date}>{new Date(post.date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time>
              <span>{post.project}</span><span>{t('blog.categories.' + post.category, { defaultValue: post.category })}</span>
              {import.meta.env.DEV && post.status === 'draft' && <span className="status-badge">{t('ui.draft')}</span>}
              {import.meta.env.DEV && post.date > new Date().toISOString().slice(0, 10) && <span className="status-badge">{t('ui.scheduled')}</span>}
            </div>
            <div className="blog-entry__copy" lang={post.contentLanguage}><h2>{post.title}</h2><p>{post.summary}</p><ul className="tags">{post.tags.map(tag => <li key={tag}>{tag}</li>)}</ul></div>
            <ArrowUpRight className="entry-arrow" aria-hidden="true" />
          </Link>
        </li>)}
      </ol>
      {!filtered.length && <p className="page-lead">{t('ui.noPosts')}</p>}
    </main>
  );
}
