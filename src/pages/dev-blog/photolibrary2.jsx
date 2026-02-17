export default function PhotoLibrary2() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        From Idea to Architecture: Designing a Scalable Image Processing Pipeline
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2025-11-26</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Starting With Constraints</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Before writing any code, I spent time identifying the core constraints of
        the problem.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This system would need to:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Traverse large directory trees</li>
        <li>Read thousands of files from disk</li>
        <li>Decode images of varying formats</li>
        <li>Run CPU-intensive hashing algorithms</li>
        <li>Remain responsive in a GUI environment</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Trying to solve this with a single threaded loop would be fragile and
        slow. Over-parallelising would be just as problematic.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed font-semibold">
        The solution had to be structured.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Thinking in Pipelines</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The key insight was to model the system as a pipeline of discrete stages:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Directory scanning</li>
        <li>File fingerprinting</li>
        <li>Disk reading</li>
        <li>Image decoding</li>
        <li>Hash computation</li>
        <li>Result aggregation</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Each stage:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Has a single responsibility</li>
        <li>Can be parallelised independently</li>
        <li>Communicates via queues or signals</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This structure allows the system to scale naturally as workloads grow.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Why a Pipeline Beats “Just Multithreading”
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        It’s tempting to “just throw threads at the problem,” but that approach
        quickly leads to:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Complex shared state</li>
        <li>Hard-to-debug race conditions</li>
        <li>Poor load balancing</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        A pipeline enforces:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Clear data ownership</li>
        <li>Backpressure between stages</li>
        <li>Natural points for caching and optimisation</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Once this structure was in place, the next decision was choosing the
        right framework to implement it.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/pipeline-diagram.png"
        alt="High-level image processing pipeline showing stages and data flow"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
