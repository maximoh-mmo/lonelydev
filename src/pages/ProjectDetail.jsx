import { useParams } from 'react-router-dom';
import projects from '../data/projects';
import { useTranslation } from 'react-i18next';
import TextLink from '../components/TextLink';


export default function ProjectDetail() {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const project = projects[projectId];

  if (!project) {
    return <div className="p-6 text-center text-gray-500">{t('projects.notFound')}</div>;
  }

  const isAbsoluteUrl = /^(https?:)?\/\//.test(project.imageUrl);
  const fullImageUrl = isAbsoluteUrl
    ? project.imageUrl
    : `${import.meta.env.BASE_URL}${project.imageUrl.replace(/^\/+/, '')}`;

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      {/* Video or Image */}
      {project.videoId ? (
        <div className="aspect-video mb-8">
          <iframe
            className="w-full h-full rounded-xl shadow-md"
            src={`https://www.youtube.com/embed/${project.videoId}`}
            title={`${project.title} video`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      ) : (
        <img
          src={fullImageUrl}
          alt={project.title}
          className="rounded-xl shadow-md w-full h-auto mb-8 transform transition-transform duration-300 hover:scale-105"
        />
      )}

      {/* Title + Itch Link */}
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t(`projects.${project.id}.title`, { defaultValue: project.title })}
      </h1>

      {project.itchLink && (
        <div className="text-center mb-10">
          <TextLink href={project.itchLink}>
            {t('projects.viewOnItch')}
          </TextLink>
        </div>
      )}

      {/* Description */}
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t(`projects.${project.id}.description`, { defaultValue: project.description })}
      </p>

      {/* Contributions (if present) */}
      {project.contributions && project.contributions.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('projects.contributions')}</h2>
          <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
            {project.contributions.map(([title, desc], index) => (
              <li key={index}>
                <strong>{t(`projects.${project.id}.contributions.${index}.title`, { defaultValue: title })}:</strong> {t(`projects.${project.id}.contributions.${index}.description`, { defaultValue: desc })}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Team Info (if present) */}
      {project.team && (
        <>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('projects.teamHeader')}</h2>
          <p className="text-lg text-gray-700 mb-8 leading-relaxed">
            {t(`projects.${project.id}.team`, { defaultValue: project.team })}
          </p>
        </>
      )}

      {/* Roles (if present and no contributions) */}
      {project.roles && project.roles.length > 0 && (!project.contributions || project.contributions.length === 0) && (
        <>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('projects.roles')}</h2>
          <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed">
            {project.roles.map((role, index) => <li key={index}>{t(`projects.${project.id}.roles.${index}`, { defaultValue: role })}</li>)}
          </ul>
        </>
      )}

      {/* Reflections */}
      {project.reflections && (
        <>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('projects.reflections')}</h2>
          <p className="text-lg text-gray-700 mb-8 leading-relaxed">
            {t(`projects.${project.id}.reflections`, { defaultValue: project.reflections })}
          </p>
        </>
      )}

      {/* Tech */}
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('projects.techHeader')}</h2>
      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed">
        {project.tech.map((t, index) => <li key={index}>{t}</li>)}
      </ul>

      {/* External Links */}
      <div className="flex justify-center gap-6 mb-12 flex-wrap">
        {project.githubLink && (
          <a href={project.githubLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
          >
            View on GitHub
          </a>
        )}
        {project.itchLink && (
          <a
            href={project.itchLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            View on Itch.io
          </a>
        )}
      </div>
    </main>
  );
}
