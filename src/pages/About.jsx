import { useTranslation, Trans } from 'react-i18next';
import TextLink from '../components/TextLink';
import SEO from '../components/SEO';

export default function About() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <SEO 
        title={t('about.title', 'About Me')} 
        description={t('about.subtitle', 'I am Max.')} 
        url="/about" 
      />
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('about.title')}
      </h1>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed italic">
        {t('about.subtitle')}
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        <Trans
          i18nKey="about.intro"
          components={{
            kumiko: <TextLink to="/Kumiko" />,
            keyboard: <TextLink to="/Keyboard" />,
          }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        {t('about.background')}
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        <Trans
          i18nKey="about.training"
          components={{
            ga: <TextLink href="https://games-academy.de/" />,
          }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        {t('about.hobbies')}
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        {t('about.motivation')}
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        {t('about.curiosity')}
      </p>
    </main>
  );
}
