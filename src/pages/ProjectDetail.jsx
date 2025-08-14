// src/pages/ProjectDetail.jsx
import { useParams } from 'react-router-dom';

const projectData = {
  'kyoto-conflict': {
    title: 'Kyoto Conflict',
    imageUrl: '/images/kyoto-conflict.png',
    description: `Step into the pulsating heart of a futuristic Japanese suburb where neon-lit streets and advanced technology blend seamlessly with ancient traditions. Kyoto Conflict is an online-only first-person shooter that thrusts players into a brutal fight for dominance over a coveted artifact—a helmet of immense power capable of turning the tide of battle. Players must either storm enemy strongholds in daring raids or defend their sacred temple against relentless assault. The game features dynamic movement with bunny hopping mechanics, a unique capture/defend game mode combining Capture the Flag with attacker/defender gameplay, and strategic FOB capture points.`,
    team: `Developed by a Games Academy student team over 8 weeks in 2024/25, following the vision of Marcel Pospiech. As one of three programmers working under Marc Hoffmann (Lead Programmer) alongside Nils Hähndel, I collaborated with 3 producers, 6 artists, 1 game designer, and numerous external specialists to create this fast-paced multiplayer FPS experience.`,
    contributions: [
      ['Advanced Movement System', 'Implemented fluid first-person movement mechanics including dynamic bunny hopping systems that allow players to gain speed advantages, dodge enemy fire, and approach combat from unexpected angles, creating the fast-paced gameplay core to the experience.'],
      ['Multiplayer Respawn Systems', 'Developed robust respawn mechanics for the online-only multiplayer environment, managing player spawning logic, team balance, and strategic spawn point selection to maintain competitive flow during intense capture/defend scenarios.'],
      ['User Interface Design', 'Created comprehensive UI systems for this competitive FPS, including HUD elements for health, ammunition, objective status, team information, and real-time match progression feedback essential for the capture/defend gameplay mode.']
    ],
    roles: [],
    tech: ['Unreal Engine 5', 'Blueprints', 'Multiplayer Replication', 'First-Person Systems', 'Network Programming'],
    githubLink: 'https://github.com/IISkullsII/kyoto_conflict',
    itchLink: 'https://games-academy.itch.io/kyoto-conflict',
    videoId: 'jWcOfbf_yOU'
  },
  'steambrawl': {
    title: 'SteamBrawl',
    imageUrl: '/images/steambrawl.png',
    description: `SteamBrawl is a tactical online multiplayer auto-battler set in a post-apocalyptic steampunk world. Playable with 2-8 players (8 being ideal), players take the role of combat factions in an epic contest. Through a round-based system, they buy, upgrade, and place combat units, duel other players, with winners advancing to a grand Battle Royale at the end of each round. The game continues until only one player remains standing, combining strategic unit management with intense multiplayer competition.`,
    team: `Developed by an 8-person Games Academy student team over 10 weeks. As one of two programmers alongside Marc Hoffmann (Programming Lead), I worked with 2 artists, 2 game designers, and 2 producers, plus an external composer, to create this ambitious multiplayer auto-battler from concept to completion.`,
    contributions: [
      ['AI Movement & Combat Logic', 'Implemented sophisticated AI systems for unit behavior, pathfinding, and combat decision-making, ensuring units could navigate the battlefield intelligently and engage in tactical combat scenarios.'],
      ['User Interface Programming', 'Developed comprehensive UI systems for player faction management, unit purchasing and upgrading interfaces, match progression displays, and real-time battle status indicators across the complex multiplayer experience.'],
      ['VFX Integration', 'Integrated visual effects systems throughout the game, from unit abilities and combat impacts to environmental steampunk atmosphere effects, enhancing the post-apocalyptic aesthetic and player feedback.'],
      ['Result Computation Systems', 'Built robust systems for calculating battle outcomes, tracking player progression through rounds, managing Battle Royale mechanics, and determining final victory conditions across the 8-player competitive structure.']
    ],
    roles: [],
    tech: ['Unreal Engine 5', 'Steam Online Subsystem', 'Blueprints', 'Multiplayer Networking', 'AI Behavior Trees'],
    githubLink: 'https://github.com/Atzimilian/AMB',
    itchLink: 'https://games-academy.itch.io/steambrawl',
    videoId: 'eoslJcxZ5fQ'
  },
  'prophecy-of-ash': {
    title: 'Prophecy of Ash',
    imageUrl: '/images/prophecy-of-ash.png',
    description: `Prophecy of Ash is set within the vast desert canyons of Solmora — the final refuge of the elven races after their lands were consumed by a spreading corruption. Take the role of an emergent hero in the Last Refuge, explore a map filled with dangerous foes, and develop your magical and melee prowess to stem the tide of corruption. The game features tactical real-time combat, level and equipment-based progression, a main quest with multiple stages, and ten different side quests, each with their own sub-stages.`,
    team: `Created by Games Academy students over 8 weeks with a large multidisciplinary team including 3 producers, 4 programmers, 9 artists, plus external audio and support specialists. As one of the programmers on this ambitious project, I worked alongside Max Heinze (Lead Programmer), Marcel Jahn (Quest, Sound), and Niclas Rummler (Dialogue System) to bring this desert fantasy adventure to life.`,
    contributions: [
      ['Environment Scripting', 'Developed interactive environmental systems and scripted dynamic elements throughout the desert canyons and oases, creating immersive exploration experiences within the vast world of Solmora.'],
      ['Dialogue Logic', 'Implemented dialogue tree logic and character interaction systems, working closely with the narrative team to ensure smooth story delivery and player choice integration.'],
      ['Interaction Systems', 'Created robust player interaction frameworks for NPCs, objects, and quest elements, enabling seamless gameplay flow between exploration, combat, and story progression.']
    ],
    roles: [],
    tech: ['Unreal Engine 4', 'Blueprint Scripting', 'Cinematic Tools', 'Quest System Integration'],
    githubLink: 'https://github.com/maximoh-mmo/Prophecy-of-Ash',
    itchLink: 'https://games-academy.itch.io/prophecy-of-ash',
    videoId: 'kJjXn4JBC5A'
  },
  'trippy-stargnome': {
    title: 'Trippy Stargnome',
    imageUrl: '/images/trippy-stargnome.png',
    description: `Trippy Stargnome is a fast-paced, 3D sci-fi rail shooter where players blast through vibrant, surreal landscapes on a mission to repel waves of alien invaders. While the player's path through the level is tethered to a predefined route, movement remains free within the rail's boundaries, allowing for precise aiming, evasive maneuvers, and obstacle avoidance. Gameplay combines quick reflexes with tactical weapon use, offering a diverse arsenal including rapid-fire projectiles, guided missiles, and high-energy lasers. Levels feature dynamic enemy formations, environmental hazards, and collectible power-ups to keep the action unpredictable and engaging.`,
    team: `Developed by a 7-person team: one producer, three designers, two artists, and myself as the sole programmer. My work encompassed all gameplay programming, UI design and implementation, AI systems, audio integration, and gameplay polish.`,
    contributions: [
      ['Waypoint-Based Rail System','Engineered a fully editable waypoint system, enabling level designers to easily define and adjust the player\'s route within the Unreal Engine editor. This approach streamlined iteration and allowed for rapid level design experimentation.'],
      ['Combat Systems', 'Developed a modular weapon framework supporting multiple weapon types, from projectiles to guided missiles and lasers, each with distinct firing mechanics and effects. Implemented power-up collection and integration into combat flow.'],
      ['User Interface','Designed and implemented responsive UI elements for player health, ammunition, score, and kill streak tracking, ensuring clear and intuitive player feedback during intense gameplay moments.'],
      ['Audio Integration','Implemented adaptive audio cues and effects for weapons, enemies, and environmental events, enhancing immersion and player situational awareness.']
    ],
    roles: [],
    tech: ['Unity', 'C#', 'Trello', 'Git'],
    githubLink: 'https://github.com/maximoh-mmo/trippy-gnome',
    itchLink: 'https://maximoh-mmo.itch.io/trippy-stargnome',
    videoId: 'ru0owomF2p8'
  },
  'lola': {
    title: 'Lola',
    imageUrl: '/images/lola.png',
    description: `Stylized narrative prototype with a focus on story, exploration, and emotion.`,
    team: '',
    contributions: [],
    roles: ['Narrative scripting', 'Scene transitions', 'UI feedback'],
    tech: ['Unity', 'Timeline', 'Shader Graph'],
    githubLink: 'https://github.com/yourusername/lola',
    itchLink: '',
    videoId: 'YzwHw-e1L8w'
  }
};

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

      {/* Roles (if present and no contributions) */}
      {project.roles && project.roles.length > 0 && (!project.contributions || project.contributions.length === 0) && (
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

      {/* Roles (if present and no contributions) */}
      {project.roles && project.roles.length > 0 && (!project.contributions || project.contributions.length === 0) && (
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
