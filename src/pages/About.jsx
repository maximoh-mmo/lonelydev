import { useTranslation, Trans } from 'react-i18next';
import TextLink from '../components/TextLink';
import SEO from '../components/SEO';
import CareerActions from '../components/CareerActions';
import useRouteLanguage from '../hooks/useRouteLanguage';

export default function About() {
  const { t } = useTranslation();
  const { prefix } = useRouteLanguage();
  return (
    <main className="page about-page">
      <SEO title={t('about.title')} description={t('about.subtitle')} url={prefix + '/about'} />
      <header className="page-header about-header">
        <div>
          <p className="eyebrow">{t('home.redesign.kicker')}</p>
          <h1>Max Heinze<span className="accent-dot">.</span></h1>
          <p className="page-lead">{t('home.redesign.intro')}</p>
          <p className="about-subtitle">{t('about.subtitle')}</p>
          <CareerActions />
        </div>
        <aside className="profile-facts" aria-label={t('ui.atAGlance')}>
          <dl>
            <div><dt>{t('ui.languages')}</dt><dd>C++ · C#</dd></div>
            <div><dt>{t('ui.engines')}</dt><dd>Unreal Engine · Unity</dd></div>
            <div><dt>{t('ui.training')}</dt><dd>Games Academy Berlin</dd></div>
          </dl>
        </aside>
      </header>
      <div className="about-sections">
        <section className="editorial-section" aria-labelledby="about-experience">
          <div className="section-label"><span aria-hidden="true">01 /</span><h2 id="about-experience">{t('ui.trainingExperience')}</h2></div>
          <div className="prose">
            <p><Trans i18nKey="about.training" components={{ ga: <TextLink href="https://games-academy.de/" /> }} /></p>
            <p>{t('about.background')}</p>
          </div>
        </section>
        <section className="editorial-section" aria-labelledby="about-working">
          <div className="section-label"><span aria-hidden="true">02 /</span><h2 id="about-working">{t('ui.howIWork')}</h2></div>
          <div className="prose"><p>{t('about.motivation')}</p><p>{t('about.curiosity')}</p></div>
        </section>
        <section className="editorial-section" aria-labelledby="about-making">
          <div className="section-label"><span aria-hidden="true">03 /</span><h2 id="about-making">{t('ui.beyondScreen')}</h2></div>
          <div className="prose">
            <p><Trans i18nKey="about.intro" components={{ kumiko: <TextLink to={prefix + '/kumiko'} />, keyboard: <TextLink to={prefix + '/keyboard'} /> }} /></p>
            <p>{t('about.hobbies')}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
