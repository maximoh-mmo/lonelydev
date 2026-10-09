import { Link, useParams } from 'react-router-dom';
import projects from '../data/projects';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import useRouteLanguage from '../hooks/useRouteLanguage';
import CaseStudy from '../components/CaseStudy';
import CareerActions from '../components/CareerActions';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const { prefix } = useRouteLanguage();
  const project = projects[projectId];
  if (!project) return <main className="page"><header className="page-header"><h1>{t('projects.notFound')}</h1><Link className="action-link" to={prefix + '/projects'}>{t('ui.backToProjects')}</Link></header></main>;
  const text = (field, fallback) => t('projects.' + project.id + '.' + field, { defaultValue: fallback });
  return (
    <main className="page project-detail">
      <SEO title={text('title', project.title)} description={text('shortDescription', project.shortDescription || project.description)} image={project.imageUrl.startsWith('http') ? project.imageUrl : 'https://maxheinze.com' + project.imageUrl} url={prefix + '/projects/' + project.id} />
      <Link className="action-link article-back" to={prefix + '/projects'}>{t('ui.backToProjects')}</Link>
      <header className="page-header"><p className="eyebrow">{t('ui.selectedWork')}</p><h1>{text('title', project.title)}</h1><p className="page-lead">{text('shortDescription', project.shortDescription)}</p>
        <ul className="tags project-tech">{project.tech.map(value => <li key={value}>{value}</li>)}</ul>
        <div className="action-group">
          {project.itchLink && <a className="action-button" href={project.itchLink} target="_blank" rel="noopener noreferrer">{t('ui.viewItch')}<span className="sr-only"> {t('ui.newTab')}</span></a>}
          {project.itchLink && text('playNote', '') && <p className="action-note">{text('playNote', '')}</p>}
          {project.githubLink && <a className="action-link" href={project.githubLink} target="_blank" rel="noopener noreferrer">{t('ui.viewGitHub')}<span className="sr-only"> {t('ui.newTab')}</span></a>}
        </div>
      </header>
      <div className="project-media">{project.videoId
        ? <iframe src={'https://www.youtube.com/embed/' + project.videoId} title={project.title + ' video'} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        : <img src={project.imageUrl} alt={project.title} />}
      </div>
      <CaseStudy projectId={project.id} />
      {project.contributions?.length > 0 && <section className="editorial-section"><div className="section-label"><h2>{t('projects.contributions')}</h2></div><dl className="contribution-list">{project.contributions.map(([title, description], index) => <div key={index}><dt>{text('contributions.' + index + '.title', title)}</dt><dd>{text('contributions.' + index + '.description', description)}</dd></div>)}</dl></section>}
      <section className="editorial-section"><div className="section-label"><h2>{t('ui.projectOverview')}</h2></div><div className="prose"><p>{text('description', project.description)}</p></div></section>
      {project.team && <section className="editorial-section"><div className="section-label"><h2>{t('projects.teamHeader')}</h2></div><div className="prose"><p>{text('team', project.team)}</p></div></section>}
      {project.roles?.length > 0 && !project.contributions?.length && <section className="editorial-section"><div className="section-label"><h2>{t('projects.roles')}</h2></div><ul className="prose">{project.roles.map((role, index) => <li key={index}>{text('roles.' + index, role)}</li>)}</ul></section>}
      {project.reflections && <section className="editorial-section"><div className="section-label"><h2>{t('projects.reflections')}</h2></div><div className="prose"><p>{text('reflections', project.reflections)}</p></div></section>}
      <section className="editorial-section"><div className="section-label"><h2>{t('ui.nextStep')}</h2></div><div><p className="case-context">{t('ui.articleContact')}</p><CareerActions /></div></section>
    </main>
  );
}
