import { ArrowUpRight, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CVLink from './CVLink';

export default function CareerActions() {
  const { t } = useTranslation();
  return (
    <div className="career-actions">
      <CVLink id="career-cv" className="action-button"><FileText aria-hidden="true" />{t('ui.viewCV')}</CVLink>
      <a className="action-link" href="mailto:maxheinze@gmail.com">{t('ui.emailMax')}<ArrowUpRight aria-hidden="true" /></a>
    </div>
  );
}
