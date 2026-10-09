import projects from '../data/projects';
import ProjectCard from '../components/ProjectCard';
import { useTranslation, Trans } from 'react-i18next';
import TextLink from '../components/TextLink';
import SEO from '../components/SEO';
import useRouteLanguage from '../hooks/useRouteLanguage';

export default function Projects() {
  const { t } = useTranslation();
  const { prefix } = useRouteLanguage();
  return (
    <main className="page projects-page">
      <SEO title={t('projects.title')} description={t('ui.selectedWork')} url={prefix + '/projects'} />
      <header className="page-header"><p className="eyebrow">{t('ui.selectedWork')}</p><h1>{t('projects.title')}</h1><p className="page-lead"><Trans i18nKey="projects.subtitle" components={{ github: <TextLink href="https://github.com/maximoh-mmo" /> }} /></p></header>
      <ol className="project-list">{Object.values(projects).map((project, index) => <li key={project.id}><ProjectCard
        title={t('projects.' + project.id + '.title', { defaultValue: project.title })}
        description={t('projects.' + project.id + '.shortDescription', { defaultValue: project.shortDescription })}
        imageUrl={project.imageUrl} link={prefix + '/projects/' + project.id} tech={project.tech} index={index + 1} featured={project.featured}
      /></li>)}</ol>
    </main>
  );
}
