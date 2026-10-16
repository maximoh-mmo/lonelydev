import { ArrowUpRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CVLink from './CVLink';
import useRouteLanguage from '../hooks/useRouteLanguage';

export default function CareerActions({ directEmail = false }) {
  const { t } = useTranslation();
  const { prefix } = useRouteLanguage();
  return (
    <div className="career-actions">
      <CVLink id="career-cv" className="action-button"><FileText aria-hidden="true" />{t('ui.viewCV')}</CVLink>
      {directEmail
        ? <a className="action-link" href="mailto:maxheinze@gmail.com">{t('ui.emailMax')}<ArrowUpRight aria-hidden="true" /></a>
        : <Link className="action-link" to={prefix + '/contact'}>{t('ui.emailMax')}<ArrowUpRight aria-hidden="true" /></Link>}
    </div>
  );
}
