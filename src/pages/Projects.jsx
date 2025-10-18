import ProjectCard from '../components/ProjectCard';
import projects from '../data/projects';

export default function Projects() {
  const projectList = Object.values(projects);

  const featuredProjects = projectList.filter((project) => project.featured);
  const previousProjects = projectList.filter((project) => !project.featured);

  const renderProjectGrid = (projectArray) => {
    const isOdd = projectArray.length % 2 !== 0;

    return (
      <div className="grid md:grid-cols-2 gap-8 justify-items-center">
        {projectArray.map((project, index) => {
          const isFirst = index === 0;

          return (
            <div
              key={project.id}
              className={
                isOdd && isFirst
                  ? 'md:col-span-2 flex justify-center w-full'
                  : 'w-full flex justify-center'
              }
            >
              <div className="max-w-lg w-full">
                <ProjectCard
                  title={project.title}
                  description={project.shortDescription || project.description}
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
    <section className="mt-20 text-center">
      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <>
          <h1 className="text-3xl font-semibold mb-6">Featured Projects</h1>
          {renderProjectGrid(featuredProjects)}
          <div className="my-12" />
        </>
      )}

      {/* Previous Projects */}
      {previousProjects.length > 0 && (
        <>
          <h1 className="text-3xl font-semibold mb-6">Previous Projects</h1>
          {renderProjectGrid(previousProjects)}
        </>
      )}
    </section>
  );
}