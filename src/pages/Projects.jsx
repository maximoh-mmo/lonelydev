import ProjectCard from '../components/ProjectCard';
import projects from '../data/projects';

export default function Projects() {

  const projectList = Object.values(projects);
  
  const featuredProjects = projectList.filter(project => project.featured);
  const previousProjects = projectList.filter(project => !project.featured);

  return (
   <section className="mt-20 text-center">
      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <>
          <h1 className="text-3xl font-semibold mb-6">Featured Projects</h1>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {featuredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                title={project.title}
                description={project.shortDescription || project.description}
                imageUrl={project.imageUrl}
                link={`/projects/${project.id}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Previous Projects */}
      {previousProjects.length > 0 && (
        <>
          <h1 className="text-3xl font-semibold mb-6">Previous Projects</h1>
          <div className="grid md:grid-cols-2 gap-8">
            {previousProjects.map((project) => (
              <ProjectCard
                key={project.id}
                title={project.title}
                description={project.shortDescription || project.description}
                imageUrl={project.imageUrl}
                link={`/projects/${project.id}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

