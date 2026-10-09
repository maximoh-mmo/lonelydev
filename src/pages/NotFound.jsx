import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useRouteLanguage from '../hooks/useRouteLanguage';
import SEO from '../components/SEO';
export default function NotFound() {
  const { t } = useTranslation();
  const { prefix } = useRouteLanguage();
  return <main className="page"><SEO title={t('ui.notFoundTitle')} /><header className="page-header"><p className="eyebrow">404</p><h1>{t('ui.notFoundTitle')}</h1><p className="page-lead">{t('ui.notFoundIntro')}</p><Link className="action-link" to={prefix || '/'}>{t('ui.backHome')}</Link></header></main>;
}
