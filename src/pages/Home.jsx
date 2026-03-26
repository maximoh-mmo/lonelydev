import { useTranslation, Trans } from 'react-i18next';
import TextLink from '../components/TextLink';
import SEO from '../components/SEO';

export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-center">
      <SEO 
        title="Home" 
        description="Portfolio of Max Heinze, a Game Programmer specializing in C++, C#, Unity, and Unreal Engine." 
        url="/" 
      />
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">
        {t('home.title')}
      </h1>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="home.intro1"
          components={{
            kumiko: <TextLink to="/Kumiko" />,
            keyboard: <TextLink to="/Keyboard" />,
          }}
        />
        <br />
        {t('home.intro2')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="home.intro3"
          components={{
            cpp: <strong />,
            csharp: <strong />,
            unity: <strong />,
            unreal: <strong />,
          }}
        />
      </p>

      <div className="text-left sm:text-center space-y-4 mb-10">
        <p className="text-gray-800 text-base">
          <Trans
            i18nKey="home.explore"
            components={{ projects: <TextLink to="/Projects" /> }}
          />
        </p>
        <p className="text-gray-800 text-base">
          <Trans
            i18nKey="home.peek"
            components={{ keyboard: <TextLink to="/Keyboard" /> }}
          />
        </p>
        <p className="text-gray-800 text-base">
          <Trans
            i18nKey="home.discover"
            components={{ climbing: <TextLink to="/Climbing" /> }}
          />
        </p>
      </div>

      <p className="text-xl font-semibold">
        <Trans
          i18nKey="home.footer"
          components={{ contact: <TextLink to="/Contact" /> }}
        />
      </p>
    </main>
  );
}
