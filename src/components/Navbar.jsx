import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AtSign, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const themeOptions = ['system', 'light', 'dark'];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme-preference') || 'system');
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isGerman = i18n.language.startsWith('de');
  const prefix = isGerman ? '/de' : '';

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.dataset.themePreference = theme;
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    localStorage.setItem('theme-preference', theme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => setIsOpen(false), [location.pathname]);

  const changeLanguage = (language) => {
    const unprefixedPath = location.pathname.replace(/^\/de(?=\/|$)/, '') || '/';
    const targetPath = language === 'de'
      ? `/de${unprefixedPath === '/' ? '' : unprefixedPath}`
      : unprefixedPath;
    i18n.changeLanguage(language);
    navigate(`${targetPath}${location.search}${location.hash}`);
  };

  const navLinks = [
    { name: t('nav.work'), path: `${prefix}/` },
    { name: t('nav.about'), path: `${prefix}/about` },
    { name: t('nav.devBlog'), path: `${prefix}/dev-blog` },
    { name: t('nav.cv'), path: `${prefix}/cv` },
  ];

  return (
    <nav className="site-nav" aria-label={t('nav.primary')}>
      <Link to={`${prefix}/`} className="site-nav__brand">MAX HEINZE</Link>

      <div className={`site-nav__panel ${isOpen ? 'is-open' : ''}`}>
        <ul className="site-nav__links">
          {navLinks.map((link) => (
            <li key={link.path}><Link to={link.path}>{link.name}</Link></li>
          ))}
        </ul>
        <a className="site-nav__email" href="mailto:maxheinze@gmail.com" aria-label={t('nav.email')}>
          <AtSign aria-hidden="true" /><span>{t('nav.email')}</span>
        </a>
        <div className="site-nav__settings">
          <div className="language-switch" aria-label={t('nav.language')}>
            <button type="button" className={!isGerman ? 'is-active' : ''} onClick={() => changeLanguage('en')}>EN</button>
            <span aria-hidden="true">/</span>
            <button type="button" className={isGerman ? 'is-active' : ''} onClick={() => changeLanguage('de')}>DE</button>
          </div>
          <label className="theme-select">
            <span>{t('nav.theme')}</span>
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              {themeOptions.map((option) => <option value={option} key={option}>{t(`nav.theme_${option}`)}</option>)}
            </select>
          </label>
        </div>
      </div>

      <button className="site-nav__menu" type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-label={t('nav.menu')}>
        {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
    </nav>
  );
}
