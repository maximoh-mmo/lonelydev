import { useTranslation } from 'react-i18next';
import { Info, AlertCircle } from 'lucide-react';

const TranslationDisclaimer = ({ type = 'auto' }) => {
  const { i18n } = useTranslation();
  
  if (i18n.language === 'en') return null;

  const content = {
    auto: {
      title: "Automatische Übersetzung",
      message: "Dieser Artikel wurde automatisch aus dem Englischen übersetzt, um ihn einem breiteren Publikum zugänglich zu machen. Bitte entschuldigen Sie etwaige Unstimmigkeiten in der Wortwahl oder Grammatik. Ich arbeite stetig an der Verbesserung meiner Inhalte.",
      icon: Info,
      style: "bg-blue-50 border-blue-400 text-blue-800"
    },
    missing: {
      title: "Noch nicht übersetzt",
      message: "Dieser Artikel ist noch nicht auf Deutsch verfügbar. Bitte wechseln Sie zu Englisch, um den vollständigen Artikel zu lesen.",
      icon: AlertCircle,
      style: "bg-amber-50 border-amber-400 text-amber-800"
    }
  };

  const { title, message, icon: Icon, style } = content[type] || content.auto;

  return (
    <div className={`border-l-4 p-4 mb-10 rounded-r-xl shadow-sm animate-pulse-subtle ${style}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-semibold">
            {title}
          </h3>
          <div className="mt-2 text-sm leading-relaxed">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationDisclaimer;