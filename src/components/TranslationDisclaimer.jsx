import { useTranslation } from 'react-i18next';
import { Info, AlertCircle } from 'lucide-react';

export default function TranslationDisclaimer({ type = 'auto' }) {
  const { i18n } = useTranslation();
  if (!i18n.resolvedLanguage?.startsWith('de')) return null;
  const missing = type === 'missing';
  const Icon = missing ? AlertCircle : Info;
  return <aside className="translation-notice" aria-labelledby="translation-notice-title">
    <h2 id="translation-notice-title"><Icon aria-hidden="true" />{missing ? 'Noch nicht übersetzt' : 'Automatische Übersetzung'}</h2>
    <p>{missing
      ? 'Dieser Artikel ist noch nicht auf Deutsch verfügbar. Der englische Originaltext wird unten angezeigt.'
      : 'Dieser Artikel wurde automatisch aus dem Englischen übersetzt, um ihn einem breiteren Publikum zugänglich zu machen. Bitte entschuldigen Sie etwaige Unstimmigkeiten in der Wortwahl oder Grammatik. Ich arbeite stetig an der Verbesserung meiner Inhalte.'}</p>
  </aside>;
}
