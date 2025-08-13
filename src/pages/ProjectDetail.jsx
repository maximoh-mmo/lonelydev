// src/pages/ProjectDetail.jsx
import { useParams } from 'react-router-dom';

const projectData = {
  'kyoto-conflict': {
    title: 'Kyoto Conflict',
    imageUrl: '/images/kyoto-conflict.png',
    description: `A fast-paced first-person deathmatch shooter built in Unreal Engine 5. 
    The project focuses on fluid movement, tight multiplayer gameplay, and level flow.`,
    roles: ['Movement system', 'Multiplayer respawn', 'UI design'],
    tech: ['Unreal Engine 5', 'Blueprints', 'Replication'],
    externalLink: 'https://github.com/yourusername/kyoto-conflict',
    videoId: ''
  },
  'steambrawl': {
    title: 'SteamBrawl',
    imageUrl: '/images/steambrawl.png',
    description: `An 8-player autochess battler with P2P multiplayer. Designed to function without dedicated servers.`,
    roles: ['AI movement/fight logic', 'VFX integration', 'Result computation'],
    tech: ['Unreal Engine 5', 'Steam Online Subsystem', 'Blueprints'],
    externalLink: 'https://github.com/yourusername/steambrawl',
    videoId: ''
  },
  'prophecy-of-ash': {
    title: 'Prophecy of Ash',
    imageUrl: '/images/prophecy-of-ash.png',
    description: `Narrative-driven third-person adventure exploring identity and memory.`,
    roles: ['Environment scripting', 'Dialogue logic', 'Interaction systems'],
    tech: ['Unreal Engine 4', 'Cinematic tools', 'Blueprint scripting'],
    externalLink: 'https://github.com/yourusername/prophecy-of-ash',
    videoId: ''
  },
  'trippy-stargnome': {
    title: 'Trippy Stargnome',
    imageUrl: '/images/trippy-stargnome.png',
    description: `Trippy Stargnome is a fast-paced, 3D sci-fi rail shooter where players blast through vibrant, surreal landscapes on a mission to repel waves of alien invaders. While the player’s path through the level is tethered to a predefined route, movement remains free within the rail’s boundaries, allowing for precise aiming, evasive maneuvers, and obstacle avoidance. Gameplay combines quick reflexes with tactical weapon use, offering a diverse arsenal including rapid-fire projectiles, guided missiles, and high-energy lasers. Levels feature dynamic enemy formations, environmental hazards, and collectible power-ups to keep the action unpredictable and engaging.`,
    team: `Developed by a 7-person team: one producer, three designers, two artists, and myself as the sole programmer. My work encompassed all gameplay programming, UI design and implementation, AI systems, audio integration, and gameplay polish.`
    contributions: [['Waypoint-Based Rail System','Engineered a fully editable waypoint system, enabling level designers to easily define and adjust the player’s route within the Unreal Engine editor. This approach streamlined iteration and allowed for rapid level design experimentation.'],['Combat Systems', 'Developed a modular weapon framework supporting multiple weapon types, from projectiles to guided missiles and lasers, each with distinct firing mechanics and effects. Implemented power-up collection and integration into combat flow.'],['User Interface','Designed and implemented responsive UI elements for player health, ammunition, score, and kill streak tracking, ensuring clear and intuitive player feedback during intense gameplay moments.'],['Audio Integration','Implemented adaptive audio cues and effects for weapons, enemies, and environmental events, enhancing immersion and player situational awareness.'],
    tech: ['Unity', 'C#', 'Trello', 'Git'],
    githubLink: 'https://github.com/maximoh-mmo/trippy-gnome',
    itchLink: 'https://maximoh-mmo.itch.io/trippy-stargnome',
    videoId: 'ru0owomF2p8'
  },
  'lola': {
    title: 'Lola',
    imageUrl: '/images/lola.png',
    description: `Stylized narrative prototype with a focus on story, exploration, and emotion.`,
    roles: ['Narrative scripting', 'Scene transitions', 'UI feedback'],
    tech: ['Unity', 'Timeline', 'Shader Graph'],
    externalLink: 'https://github.com/yourusername/lola',
    videoId: 'YzwHw-e1L8w'
  }
};

// src/pages/ProjectDetail.jsx
import { useParams } from 'react-router-dom';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const project = projectData[projectId];

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

      {/* Team Info (if present) */}
      {project.team && (
        <>
          <h2 className="text-2xl font-semibold mb-2">Team</h2>
          <p className="text-gray-700 mb-6">{project.team}</p>
        </>
      )}

      {/* Contributions (if present) */}
      {project.contributions && (
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

      {/* Roles (if present) */}
      {project.roles && !project.contributions && (
        <>
          <h2 className="text-2xl font-semibold mb-2">My Roles</h2>
          <ul className="list-disc list-inside mb-6 text-gray-600">
            {project.roles.map((role, index) => <li key={index}>{role}</li>)}
          </ul>
        </>
      )}

      {/* Tech */}
      <h2 className="text-2xl font-semibold mb-2">Technologies</h2>
      <ul className="list-disc list-inside mb-6 text-gray-600">
        {project.tech.map((t, index) => <li key={index}>{t}</li>)}
      </ul>

      {/* External Links */}
      {project.githubLink && (
        <a
          href={project.githubLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
        >
          View on GitHub
        </a>
      )}
    </main>
  );
}
