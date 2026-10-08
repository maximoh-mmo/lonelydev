import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUpRight, Play } from 'lucide-react';
import SEO from '../components/SEO';
import TranslationDisclaimer from '../components/TranslationDisclaimer';
import './Home.css';

const TagList = ({ items }) => (
  <ul className="project-tags" aria-label="Technologies">
    {items.map((item) => <li key={item}>{item}</li>)}
  </ul>
);

export default function Home() {
  const { t, i18n } = useTranslation();
  const prefix = i18n.language.startsWith('de') ? '/de' : '';

  return (
    <main className="portfolio-home">
      <SEO
        title={t('home.redesign.seoTitle')}
        description={t('home.redesign.seoDescription')}
        image="https://maxheinze.com/images/kyoto-conflict.png"
        url={prefix || '/'}
      />

      <section className="cinematic-hero" aria-labelledby="home-title">
        <img className="cinematic-hero__image" src="/images/kyoto-conflict.png" alt="" fetchPriority="high" />
        <div className="cinematic-hero__grain" aria-hidden="true" />
        <div className="cinematic-hero__copy">
          <p className="section-kicker">{t('home.redesign.kicker')}</p>
          <h1 id="home-title">{t('home.redesign.headlineLead')}<span>{t('home.redesign.headlineEcho')}</span></h1>
          <p className="cinematic-hero__intro">{t('home.redesign.intro')}</p>
          <div className="hero-actions">
            <Link className="text-action" to={`${prefix}/projects/kyoto-conflict`}>
              {t('home.redesign.caseStudy')} <ArrowUpRight aria-hidden="true" />
            </Link>
            <a className="text-action text-action--quiet" href="https://games-academy.itch.io/kyoto-conflict" target="_blank" rel="noreferrer">
              {t('home.redesign.playBuild')} <Play aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="system-note system-note--spawn"><span aria-hidden="true" />{t('home.redesign.kyotoNoteSpawn')}</div>
        <div className="system-note system-note--flag"><span aria-hidden="true" />{t('home.redesign.kyotoNoteFlag')}</div>
        <div className="featured-label"><small>{t('home.redesign.featured')}</small><strong>Kyoto Conflict</strong></div>
        <a className="hero-scroll" href="#onset"><span>{t('home.redesign.explore')}</span><ArrowDown aria-hidden="true" /></a>
      </section>

      <section className="project-chapter onset-chapter" id="onset" aria-labelledby="onset-title">
        <div className="chapter-copy">
          <p className="chapter-index">{t('home.redesign.onsetIndex')}</p>
          <h2 id="onset-title">Onset</h2>
          <p>{t('home.redesign.onsetDescription')}</p>
          <TagList items={['Unreal Engine', 'Gameplay Systems', t('home.redesign.inDevelopment')]} />
          <Link className="text-action" to={`${prefix}/dev-blog`}>{t('home.redesign.readNotes')} <ArrowUpRight aria-hidden="true" /></Link>
        </div>
        <div className="system-map" role="img" aria-label={t('home.redesign.onsetDiagramAlt')}>
          <span className="system-map__grid" aria-hidden="true" />
          <span className="system-node system-node--capture">{t('home.redesign.captureState')}</span>
          <span className="system-wire system-wire--one" aria-hidden="true" />
          <span className="system-node system-node--zone">{t('home.redesign.repZone')}</span>
          <span className="system-wire system-wire--two" aria-hidden="true" />
          <span className="system-node system-node--spawn">{t('home.redesign.spawnChoice')}</span>
          <p className="system-map__note">{t('home.redesign.onsetNote')}</p>
        </div>
      </section>

      <section className="project-chapter photoboss-chapter" aria-labelledby="photoboss-heading">
        <div className="photoboss-heading">
          <div><p className="chapter-index">{t('home.redesign.photoIndex')}</p><h2 id="photoboss-heading">{t('home.redesign.photoHeadline')}</h2></div>
          <p>{t('home.redesign.photoDescription')}</p>
        </div>
        <div className="photoboss-media">
          <img src="/images/photoboss/dark_mode_preview.png" alt={t('home.redesign.photoAlt')} loading="lazy" />
          <div className="photoboss-media__shade" aria-hidden="true" />
          <div className="photoboss-title"><small>C++ · Qt · SQLite</small><strong>PhotoBoss</strong></div>
          <p className="photoboss-note">{t('home.redesign.photoNote')}</p>
        </div>
        <div className="chapter-footer">
          <TagList items={['C++', 'Qt', 'SQLite', 'Windows 11']} />
          <Link className="text-action" to={`${prefix}/dev-blog`}>{t('home.redesign.readBuildLog')} <ArrowUpRight aria-hidden="true" /></Link>
        </div>
      </section>

      <footer className="home-footer">
        <p>{t('home.redesign.footerLead')}</p>
        <a href="mailto:maxheinze@gmail.com">maxheinze@gmail.com</a>
        <TranslationDisclaimer />
      </footer>
    </main>
  );
}
