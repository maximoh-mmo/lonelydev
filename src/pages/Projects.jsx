import ProjectCard from '../components/ProjectCard';
import projects from '../data/projects';

export default function Projects() {
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
              {/* Keep consistent width across all cards */}
              <div className="w-full md:max-w-md">
                <ProjectCard
                  title={project.title}
                  description={project.shortDescription}
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
      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 py-16 text-left">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Projects
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Current and previous selected Game projects. Additional projects can be found on my <a
          href="https://github.com/maximoh-mmo"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >GitHub</a>.
        </p>
      </header>

      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-6">Active Development:</h2>
          {renderProjectGrid(featuredProjects)}
          <div className="my-12" />
        </>
      )}

      {/* Previous Projects */}
      {previousProjects.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-6">Previous Projects:</h2>
          {renderProjectGrid(previousProjects)}
        </>
      )}
    </section>
  );
}