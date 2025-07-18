import ProjectCard from '../components/ProjectCard';

export default function Projects() {
  return (
    <section className="mt-20 text-center">
      
        <div className="grid md:grid-cols-2 gap-8">
          <ProjectCard
            title="Prophecy of Ash"
            description="A narrative-driven 3rd person adventure game exploring themes of memory and identity. Built in Unreal Engine 5.5."
            imageUrl="/images/prophecy-of-ash.png"
            link="/projects/prophecy-of-ash"
          />
          <ProjectCard
            title="Untitled"
            description="3d Platform puzzle game. Built in Unreal Engine 5.5."
            imageUrl="/images/prophecy-of-ash.png"
            link="/projects/prophecy-of-ash"
          />
        </div>
        <br></br>
      <h1 className="text-3xl font-semibold mb-6">Previous Projects</h1>
      <div className="grid md:grid-cols-2 gap-8">
          
          <ProjectCard
            title="Kyoto Conflict"
            description="A fast-paced first-person deathmatch shooter with advanced movement mechanics. Built in Unreal Engine 5.5"
            imageUrl="/images/kyoto-conflict.png"
            link="/projects/kyoto-conflict"
          />

          <ProjectCard
            title="SteamBrawl"
            description="An 8-player online autochess battler with peer-to-peer multiplayer. Built in Unreal Engine 5.4."
            imageUrl="/images/steambrawl.png"
            link="/projects/steambrawl"
          />

          <ProjectCard
            title="Trippy Stargnome"
            description="A colorful arcade platformer focused on momentum and puzzle-solving in bizarre alien landscapes."
            imageUrl="/images/trippy-stargnome.png"
            link="/projects/trippy-stargnome"
          />

          <ProjectCard
            title="Lola"
            description="A stylized exploration prototype focused on emotional storytelling, puzzles, and environmental design."
            imageUrl="/images/lola.png"
            link="/projects/lola"
          />
        </div>
      
    </section>
  );
}
