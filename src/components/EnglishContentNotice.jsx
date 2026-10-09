import { useTranslation } from 'react-i18next';
import useRouteLanguage from '../hooks/useRouteLanguage';
export default function EnglishContentNotice() {
  const { t } = useTranslation();
  const { language } = useRouteLanguage();
  return language === 'de' ? <aside className="translation-notice" lang="de"><p>{t('ui.originalEnglish')}</p></aside> : null;
}
