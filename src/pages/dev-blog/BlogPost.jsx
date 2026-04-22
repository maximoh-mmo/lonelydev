import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import TranslationDisclaimer from '../../components/TranslationDisclaimer';
import SEO from '../../components/SEO';
import { ChevronLeft, Calendar, Tag, Folder } from 'lucide-react';

// For loading the content lazily
const markdownModules = import.meta.glob('../../content/blog/*.md', { query: '?raw' });

// Simple frontmatter parser (avoids gray-matter Buffer issue in browser)
function parseMarkdown(content, id = '') {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    console.debug('[parseMarkdown] No match for', id, 'content slice:', content.slice(0, 80));
    return { data: {}, content };
  }

  const frontmatter = {};
  const dataLines = match[1].split('\n');
  let currentKey = null;
  let currentArray = null;
  let multilineMode = null;
  let multilineValue = [];
  let previousKey = null;

  dataLines.forEach(line => {
    const trimmed = line;

    // Skip empty lines that are just part of multiline
    if (multilineMode && trimmed === '') {
      multilineValue.push(' ');
      return;
    }

    // Handle YAML multiline continuation (>-, |+, etc)
    if (multilineMode) {
      if (trimmed.startsWith(' ') || trimmed.startsWith('\t')) {
        multilineValue.push(trimmed);
        return;
      } else {
        if (currentKey) {
          frontmatter[currentKey] = multilineValue.join(' ').trim().replace(/^["']|["']$/g, '');
        }
        currentKey = null;
        multilineMode = null;
        multilineValue = [];
      }
    }

    // Handle array items (multiline YAML arrays like: tags: - item1 - item2)
    if (trimmed.startsWith('- ')) {
      if (!currentArray && previousKey) {
        currentArray = [];
        frontmatter[previousKey] = currentArray;
      }
      if (currentArray) {
        currentArray.push(trimmed.slice(2).trim().replace(/^"|"$/g, ''));
      }
      return;
    }

    // Track previous key for array detection
    previousKey = currentKey;

    // Close array if we have one and hit a non-indented line
    if (currentArray && currentKey) {
      frontmatter[currentKey] = currentArray;
      currentArray = null;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) return;

    let key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    // Skip empty values
    if (!value) {
      currentKey = key;
      currentArray = null;
      return;
    }

    // Handle multiline YAML (>, >-, |+)
    if (value === '>' || value === '>-' || value === '|+') {
      multilineMode = value;
      currentKey = key;
      multilineValue = [];
      return;
    }

    // Handle arrays [item1, item2]
    if (value.startsWith('[') && value.endsWith(']')) {
      currentArray = value.slice(1, -1).split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      frontmatter[key] = currentArray;
      currentArray = null;
      currentKey = null;
    } else if (value.startsWith('"') && value.endsWith('"')) {
      frontmatter[key] = value.slice(1, -1);
      currentKey = null;
    } else if (value.startsWith("'") && value.endsWith("'")) {
      frontmatter[key] = value.slice(1, -1);
      currentKey = null;
    } else {
      // Treat bare values starting with - as array markers
      if (value.startsWith('-')) {
        currentArray = value.slice(1).split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        frontmatter[key] = currentArray;
        currentArray = null;
      } else {
        frontmatter[key] = value.replace(/^["']|["']$/g, '');
      }
      currentKey = null;
    }
  });

  console.debug('[parseMarkdown] Parsed', id, ':', frontmatter);
  return { data: frontmatter, content: match[2] };
}

export default function BlogPost() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPost() {
      setLoading(true);
      setError(false);
      setIsFallback(false);
      try {
        const preferredLang = i18n.language === 'de' ? 'de' : 'en';
        const allKeys = Object.keys(markdownModules);
        const enKey = allKeys.find(k => k.includes('/' + id + '.en.'));
        const deKey = allKeys.find(k => k.includes('/' + id + '.de.'));
        const targetLangFile = preferredLang === 'de' ? deKey : enKey;
        const fallbackLangFile = preferredLang === 'de' ? enKey : deKey;
        const matchingKey = targetLangFile || fallbackLangFile;
        
        if (preferredLang === 'de' && !deKey && enKey) {
          setIsFallback(true);
        }
        
        if (!matchingKey) {
          throw new Error('No markdown file found');
        }

        const rawContent = await markdownModules[matchingKey]();
        if (cancelled) return;
        
        const contentStr = rawContent.default || rawContent;
        const { data, content } = parseMarkdown(contentStr, id);
        
        if (!cancelled) {
          setPost({ ...data, content, id });
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
  }, [id, i18n.language]);

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
          onClick={() => navigate('/dev-blog')}
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
        url={`/dev-blog/${id}`} 
      />
      
      <button 
        onClick={() => navigate('/dev-blog')}
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
              {new Date(post.date).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </time>
          </div>
          <div className="flex items-center gap-1.5">
            <Folder className="w-4 h-4" />
            <span>{post.category}</span>
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

      {(post.isAutoTranslated && !isFallback) && i18n.language === 'de' && <TranslationDisclaimer type="auto" />}
      {isFallback && i18n.language === 'de' && <TranslationDisclaimer type="missing" />}

      <MarkdownRenderer content={post.content} />

      <footer className="mt-20 pt-10 border-t border-gray-100 italic text-gray-500 text-sm">
        {t('blog.footer', 'Thanks for reading! If you have any questions about this technical implementation, feel free to reach out via the contact page.')}
      </footer>
    </article>
  );
}
