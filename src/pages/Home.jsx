import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUpRight, Play } from 'lucide-react';
import SEO from '../components/SEO';
import useRouteLanguage from '../hooks/useRouteLanguage';
import './Home.css';
import './Home.motion.css';
import './Home.light.css';

const TagList = ({ items }) => (
  <ul className="project-tags" aria-label="Technologies">
    {items.map((item) => <li key={item}>{item}</li>)}
  </ul>
);

export default function Home() {
  const { t } = useTranslation();
  const { prefix } = useRouteLanguage();
  const pageRef = useRef(null);

  useEffect(() => {
    const page = pageRef.current;
    const targets = Array.from(page?.querySelectorAll('[data-reveal]') || []);
    if (!page || !targets.length) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(target => target.classList.add('is-visible'));
      return undefined;
    }

    page.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.16 });

    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <main ref={pageRef} className="portfolio-home motion-ready">
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
          <h1 id="home-title">{t('home.redesign.headlineLead')}<span className="headline-echo">{t('home.redesign.headlineEcho')}</span></h1>
          <p className="cinematic-hero__intro"><Trans i18nKey="home.redesign.intro" components={{ emphasis: <mark /> }} /></p>
          <div className="hero-actions">
            <Link className="text-action" to={`${prefix}/projects/kyoto-conflict`}>
              {t('home.redesign.caseStudy')} <ArrowUpRight aria-hidden="true" />
            </Link>
            <a className="text-action text-action--quiet" href="https://games-academy.itch.io/kyoto-conflict" target="_blank" rel="noreferrer">
              {t('home.redesign.playBuild')} <Play aria-hidden="true" />
            </a>
          </div>
          <dl className="hero-proof" aria-label={t('home.redesign.kyotoProofLabel')}>
            <div><dt>{t('home.redesign.kyotoProofCtf')}</dt><dd>{t('home.redesign.kyotoProofCtfDetail')}</dd></div>
            <div><dt>{t('home.redesign.kyotoProofSpawn')}</dt><dd>{t('home.redesign.kyotoProofSpawnDetail')}</dd></div>
          </dl>
        </div>
        <div className="system-note system-note--spawn"><span aria-hidden="true" />{t('home.redesign.kyotoNoteSpawn')}</div>
        <div className="system-note system-note--flag"><span aria-hidden="true" />{t('home.redesign.kyotoNoteFlag')}</div>
        <div className="featured-label"><small>{t('home.redesign.featured')}</small><strong>Kyoto Conflict</strong></div>
        <a className="hero-scroll" href="#onset"><span>{t('home.redesign.explore')}</span><ArrowDown aria-hidden="true" /></a>
      </section>

      <section className="project-chapter onset-chapter" id="onset" aria-labelledby="onset-title">
        <div className="chapter-copy" data-reveal>
          <p className="chapter-index">{t('home.redesign.onsetIndex')}</p>
          <h2 id="onset-title">Onset</h2>
          <p>{t('home.redesign.onsetDescription')}</p>
          <TagList items={['Unreal Engine 5.8', t('home.redesign.onsetGenre'), t('home.redesign.inDevelopment')]} />
          <Link className="text-action" to={prefix + '/dev-blog?project=Onset'}>{t('home.redesign.readNotes')} <ArrowUpRight aria-hidden="true" /></Link>
        </div>
        <div className="system-map" role="img" aria-label={t('home.redesign.onsetDiagramAlt')} data-reveal>
          <span className="system-map__grid" aria-hidden="true" />
          <div className="architecture-boundary"><span>{t('home.redesign.onsetAuthority')}</span><strong>{t('home.redesign.onsetCore')}</strong></div>
          <div className="architecture-columns">
            <div className="architecture-lane">
              <p>{t('home.redesign.onsetGameplayLayer')}</p>
              <span className="system-node">{t('home.redesign.onsetInput')}</span>
              <span className="system-wire" aria-hidden="true" />
              <span className="system-node">{t('home.redesign.onsetTargeting')}</span>
              <span className="system-wire" aria-hidden="true" />
              <span className="system-node">{t('home.redesign.onsetCombat')}</span>
            </div>
            <div className="architecture-lane">
              <p>{t('home.redesign.onsetSimulationLayer')}</p>
              <span className="system-node">{t('home.redesign.onsetAI')}</span>
              <span className="system-wire" aria-hidden="true" />
              <span className="system-node">{t('home.redesign.onsetThreat')}</span>
              <span className="system-wire" aria-hidden="true" />
              <span className="system-node">{t('home.redesign.onsetPool')}</span>
            </div>
            <div className="architecture-lane">
              <p>{t('home.redesign.onsetDataLayer')}</p>
              <span className="system-node">{t('home.redesign.onsetIdentity')}</span>
              <span className="system-wire" aria-hidden="true" />
              <span className="system-node">{t('home.redesign.onsetPersistence')}</span>
              <span className="system-wire" aria-hidden="true" />
              <span className="system-node">{t('home.redesign.onsetInventory')}</span>
            </div>
          </div>
          <div className="architecture-server"><span>{t('home.redesign.onsetServer')}</span><small>{t('home.redesign.onsetServerDetail')}</small></div>
          <p className="system-map__note">{t('home.redesign.onsetNote')}</p>
        </div>
      </section>

      <section className="project-chapter photoboss-chapter" aria-labelledby="photoboss-heading">
        <div className="photoboss-heading" data-reveal>
          <div><p className="chapter-index">{t('home.redesign.photoIndex')}</p><h2 id="photoboss-heading">{t('home.redesign.photoHeadline')}</h2></div>
          <p>{t('home.redesign.photoDescription')}</p>
        </div>
        <div className="photoboss-media" data-reveal>
          <img src="/images/photoboss/dark_mode_preview.png" alt={t('home.redesign.photoAlt')} loading="lazy" />
          <div className="photoboss-media__shade" aria-hidden="true" />
          <div className="photoboss-title"><small>C++ · Qt · SQLite</small><strong>PhotoBoss</strong></div>
          <p className="photoboss-note">{t('home.redesign.photoNote')}</p>
        </div>
        <div className="chapter-footer" data-reveal>
          <TagList items={['C++', 'Qt', 'SQLite', 'Windows 11']} />
          <Link className="text-action" to={prefix + '/dev-blog?project=PhotoBoss'}>{t('home.redesign.readBuildLog')} <ArrowUpRight aria-hidden="true" /></Link>
        </div>
      </section>

    </main>
  );
}
