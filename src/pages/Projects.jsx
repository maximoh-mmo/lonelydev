import ProjectCard from '../components/ProjectCard';

export default function Projects() {
  return (
    <section className="mt-20 text-center">
      
        <div className="grid md:grid-cols-2 gap-8">
          <ProjectCard
            title="Prophecy of Ash"
            description="A third-person adventure set in the desert canyons of Solmora, where players battle corrupted creatures and explore the last refuge of the desert elves. Built in Unreal Engine 5.5 over 8 weeks."
            imageUrl="/images/prophecy-of-ash.png"
            link="/projects/prophecy-of-ash"
          />
          <ProjectCard
            title="Untitled"
            description="A stylized 3D platform adventure inspired by Zelda, focused on environmental puzzles and exploration. Currently in development in Unreal Engine 5.6."
            imageUrl="/images/prophecy-of-ash.png"
            link="/projects/prophecy-of-ash"
          />
        </div>
        <br></br>
      <h1 className="text-3xl font-semibold mb-6">Previous Projects</h1>
      <div className="grid md:grid-cols-2 gap-8">
          
          <ProjectCard
            title="Kyoto Conflict"
            description="A fast-paced online FPS set in a futuristic Japanese suburb, blending advanced movement mechanics with tactical capture-and-defend gameplay. Built in Unreal Engine 5.5. *
            imageUrl="/images/kyoto-conflict.png"
            link="/projects/kyoto-conflict"
          />

          <ProjectCard
            title="SteamBrawl"
            description="An 8-player online auto-battler set in a post-apocalyptic steampunk world, where players recruit, upgrade, and position units before clashing in tactical duels. Built in Unreal Engine 5.4 over 10 weeks."
            imageUrl="/images/steambrawl.png"
            link="/projects/steambrawl"
          />

          <ProjectCard
            title="Trippy Stargnome"
            description="A psychedelic 3D sci-fi rail shooter where players battle waves of alien invaders, upgrading their arsenal through kill streaks to liberate their home planet."
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

