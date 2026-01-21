export default function PhotoLibrary2() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold mb-2">
        From Idea to Architecture: Designing a Scalable Image Processing Pipeline
      </h1>
      <p className="text-gray-500 mb-8">Posted on {/* insert date */}</p>

      <h2 className="text-2xl font-semibold mb-4">Starting With Constraints</h2>
      <p className="mb-6">
        Before writing any code, I spent time identifying the core constraints of
        the problem.
      </p>

      <p className="mb-6">
        This system would need to:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Traverse large directory trees</li>
        <li>Read thousands of files from disk</li>
        <li>Decode images of varying formats</li>
        <li>Run CPU-intensive hashing algorithms</li>
        <li>Remain responsive in a GUI environment</li>
      </ul>

      <p className="mb-6">
        Trying to solve this with a single threaded loop would be fragile and
        slow. Over-parallelising would be just as problematic.
      </p>

      <p className="mb-8 font-semibold">
        The solution had to be structured.
      </p>

      <h2 className="text-2xl font-semibold mb-4">Thinking in Pipelines</h2>
      <p className="mb-6">
        The key insight was to model the system as a pipeline of discrete stages:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Directory scanning</li>
        <li>File fingerprinting</li>
        <li>Disk reading</li>
        <li>Image decoding</li>
        <li>Hash computation</li>
        <li>Result aggregation</li>
      </ul>

      <p className="mb-6">
        Each stage:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Has a single responsibility</li>
        <li>Can be parallelised independently</li>
        <li>Communicates via queues or signals</li>
      </ul>

      <p className="mb-8">
        This structure allows the system to scale naturally as workloads grow.
      </p>

      <h2 className="text-2xl font-semibold mb-4">
        Why a Pipeline Beats “Just Multithreading”
      </h2>
      <p className="mb-6">
        It’s tempting to “just throw threads at the problem,” but that approach
        quickly leads to:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Complex shared state</li>
        <li>Hard-to-debug race conditions</li>
        <li>Poor load balancing</li>
      </ul>

      <p className="mb-6">
        A pipeline enforces:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Clear data ownership</li>
        <li>Backpressure between stages</li>
        <li>Natural points for caching and optimisation</li>
      </ul>

      <p className="mb-8">
        Once this structure was in place, the next decision was choosing the
        right framework to implement it.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/pipeline-diagram.png"
        alt="High-level image processing pipeline showing stages and data flow"
        className="rounded-lg shadow-lg mb-10 w-full object-contain"
      />
    </main>
  );
}
