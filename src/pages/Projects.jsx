import ProjectCard from '../components/ProjectCard';
import projects from '../data/projects';
import { useTranslation, Trans } from 'react-i18next';
import TextLink from '../components/TextLink';
import SEO from '../components/SEO';

export default function Projects() {
  const { t } = useTranslation();
  const projectList = Object.values(projects);

  const featuredProjects = projectList.filter((project) => project.featured);
  const previousProjects = projectList.filter((project) => !project.featured);

  const renderProjectGrid = (projectArray) => {
    const isOdd = projectArray.length % 2 !== 0;

    return (
      <div className="grid md:grid-cols-2 gap-8 justify-center">
        {projectArray.map((project, index) => {
          const isFirst = index === 0;
          const shouldCenter = isOdd && isFirst;

          return (
            <div
              key={project.id}
              className={
                shouldCenter
                  ? "md:col-span-2 flex justify-center"
                  : "flex justify-center"
              }
            >
              <div className="w-full md:max-w-md">
                <ProjectCard
                  title={t(`projects.${project.id}.title`, { defaultValue: project.title })}
                  description={t(`projects.${project.id}.shortDescription`, { defaultValue: project.shortDescription })}
                  imageUrl={project.imageUrl}
                  link={`/projects/${project.id}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="text-center">
      <SEO 
        title={t('projects.title', 'Projects')} 
        description={t('projects.subtitle', 'A collection of my recent work.')} 
        url="/projects" 
      />
      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10">
          {t('projects.title')}
        </h1>
        <p className="text-lg text-gray-600 mx-auto">
          <Trans
            i18nKey="projects.subtitle"
            components={{
              github: (
                <TextLink
                  href="https://github.com/maximoh-mmo"
                />
              ),
            }}
          />
        </p>
      </header>

      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-6">{t('projects.active')}</h2>
          {renderProjectGrid(featuredProjects)}
          <div className="my-12" />
        </>
      )}

      {/* Previous Projects */}
      {previousProjects.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-6">{t('projects.previous')}</h2>
          {renderProjectGrid(previousProjects)}
        </>
      )}
    </section>
  );
}