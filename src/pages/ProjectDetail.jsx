import { useParams } from 'react-router-dom';
import projects from '../data/projects';


export default function ProjectDetail() {
  const { projectId } = useParams();
  const project = projects[projectId];

  if (!project) {
    return <div className="p-6 text-center text-gray-500">Project not found.</div>;
  }

  const isAbsoluteUrl = /^(https?:)?\/\//.test(project.imageUrl);
  const fullImageUrl = isAbsoluteUrl
    ? project.imageUrl
    : `${import.meta.env.BASE_URL}${project.imageUrl.replace(/^\/+/, '')}`;

  return (
    <main className="max-w-4xl mx-auto p-6">
      {/* Video or Image */}
      {project.videoId ? (
        <div className="aspect-video mb-6">
          <iframe
            className="w-full h-full rounded-lg shadow"
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
          className="rounded-lg shadow-md w-full h-auto"
        />
      )}

      {/* Title + Itch Link */}
      {project.itchLink ? (
        <a href={project.itchLink} target="_blank" rel="noopener noreferrer">
          <h1 className="text-4xl font-bold mt-6 mb-4">{project.title}</h1>
        </a>
      ) : (
        <h1 className="text-4xl font-bold mt-6 mb-4">{project.title}</h1>
      )}

      {/* Description */}
      <p className="text-gray-700 mb-6">{project.description}</p>

      {/* Contributions (if present) */}
      {project.contributions && project.contributions.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-2">My Contributions</h2>
          <ul className="list-disc list-inside mb-6 text-gray-600 space-y-2">
            {project.contributions.map(([title, desc], index) => (
              <li key={index}>
                <strong>{title}:</strong> {desc}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Team Info (if present) */}
      {project.team && (
        <>
          <h2 className="text-2xl font-semibold mb-2">Team</h2>
          <p className="text-gray-700 mb-6">{project.team}</p>
        </>
      )}

      {/* Roles (if present and no contributions) */}
      {project.roles && project.roles.length > 0 && (!project.contributions || project.contributions.length === 0) && (
        <>
          <h2 className="text-2xl font-semibold mb-2">My Roles</h2>
          <ul className="list-disc list-inside mb-6 text-gray-600">
            {project.roles.map((role, index) => <li key={index}>{role}</li>)}
          </ul>
        </>
      )}

      {/* Reflections */}
      {project.reflections && (
        <>
          <h2 className="text-2xl font-semibold mb-2">Reflections</h2>
          <p className="text-gray-700 mb-6">{project.reflections}</p>
        </>
      )}

      {/* Tech */}
      <h2 className="text-2xl font-semibold mb-2">Technologies</h2>
      <ul className="list-disc list-inside mb-6 text-gray-600">
        {project.tech.map((t, index) => <li key={index}>{t}</li>)}
      </ul>

      {/* External Links */}
      <div className="flex justify-center gap-6 mb-12 flex-wrap">
          {project.githubLink && (
            <a href={project.githubLink}
            target="_blank"
            rel="noopener noreferrer"
          className="inline-block mt-4 px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
        >
          View on GitHub
        </a>
      )}
      {project.itchLink && (
        <a
          href={project.itchLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
        >
          View on Itch.io
        </a>
      )}
      </div>
    </main>
  );
}
