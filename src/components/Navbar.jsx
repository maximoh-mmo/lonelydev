import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { AtSign, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CVLink from './CVLink';
import useRouteLanguage from '../hooks/useRouteLanguage';

const themeOptions = ['system', 'light', 'dark'];
function storedTheme() {
  try {
    const preference = localStorage.getItem('theme-preference');
    return themeOptions.includes(preference) ? preference : 'system';
  } catch { return 'system'; }
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState(storedTheme);
  const { t, i18n } = useTranslation();
  const { language, prefix } = useRouteLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.themePreference = theme;
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    try { localStorage.setItem('theme-preference', theme); } catch { /* Keep the session preference. */ }
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => setIsOpen(false), [location.pathname]);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = event => {
      if (event.key === 'Escape') { setIsOpen(false); menuRef.current?.focus(); }
    };
    const onPointer = event => { if (!navRef.current?.contains(event.target)) setIsOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [isOpen]);

  const changeLanguage = nextLanguage => {
    const unprefixedPath = location.pathname.replace(/^\/de(?=\/|$)/, '') || '/';
    const target = nextLanguage === 'de' ? '/de' + (unprefixedPath === '/' ? '' : unprefixedPath) : unprefixedPath;
    i18n.changeLanguage(nextLanguage);
    navigate(target + location.search + location.hash);
    setIsOpen(false);
  };
  const navLinks = [
    { name: t('nav.work'), path: prefix + '/' },
    { name: t('nav.about'), path: prefix + '/about' },
    { name: t('nav.devBlog'), path: prefix + '/dev-blog' },
  ];
  return (
    <nav ref={navRef} className="site-nav" aria-label={t('nav.primary')}>
      <Link to={prefix + '/'} className="site-nav__brand">MAX HEINZE</Link>
      <div id="primary-menu" className={'site-nav__panel ' + (isOpen ? 'is-open' : '')}>
        <ul className="site-nav__links">
          {navLinks.map(link => <li key={link.path}><Link to={link.path} aria-current={(location.pathname === link.path || (link.path === '/de/' && location.pathname === '/de')) ? 'page' : undefined}>{link.name}</Link></li>)}
          <li><CVLink id="nav-cv">{t('nav.cv')}</CVLink></li>
        </ul>
        <a className="site-nav__email" href="mailto:maxheinze@gmail.com"><AtSign aria-hidden="true" /><span>{t('nav.email')}</span></a>
        <div className="site-nav__settings">
          <div className="language-switch" role="group" aria-label={t('nav.language')}>
            <button type="button" aria-pressed={language === 'en'} className={language === 'en' ? 'is-active' : ''} onClick={() => changeLanguage('en')}>EN</button>
            <span aria-hidden="true">/</span>
            <button type="button" aria-pressed={language === 'de'} className={language === 'de' ? 'is-active' : ''} onClick={() => changeLanguage('de')}>DE</button>
          </div>
          <label className="theme-select"><span>{t('nav.theme')}</span><select value={theme} onChange={event => setTheme(event.target.value)}>{themeOptions.map(option => <option value={option} key={option}>{t('nav.theme_' + option)}</option>)}</select></label>
        </div>
      </div>
      <button ref={menuRef} className="site-nav__menu" type="button" onClick={() => setIsOpen(open => !open)} aria-controls="primary-menu" aria-expanded={isOpen} aria-label={t('nav.menu')}>{isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
    </nav>
  );
}
