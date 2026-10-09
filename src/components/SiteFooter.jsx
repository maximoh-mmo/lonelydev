import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CVLink from './CVLink';
import useRouteLanguage from '../hooks/useRouteLanguage';

export default function SiteFooter() {
  const { t } = useTranslation();
  const { prefix } = useRouteLanguage();
  return (
    <footer className="site-footer">
      <p>{t('home.redesign.footerLead')}</p>
      <a className="site-footer__email" href="mailto:maxheinze@gmail.com">maxheinze@gmail.com</a>
      <div className="site-footer__links">
        <CVLink id="footer-cv">{t('ui.viewCV')}</CVLink>
        <Link to={prefix + '/projects'}>{t('ui.allProjects')}</Link>
        <a href="https://github.com/maximoh-mmo" target="_blank" rel="noopener noreferrer">GitHub<span className="sr-only"> {t('ui.newTab')}</span></a>
      </div>
    </footer>
  );
}
