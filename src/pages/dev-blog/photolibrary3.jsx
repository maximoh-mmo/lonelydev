export default function PhotoLibrary3() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        Learning Qt by Building: Threads, Signals, and Ownership
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2025-12-10</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Why Qt?</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Qt was chosen for several reasons:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Mature cross-platform support</li>
        <li>Integrated UI and concurrency tools</li>
        <li>A signal/slot model well-suited to pipelines</li>
        <li>Strong documentation and ecosystem</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        However, Qt is not a thin abstraction. It has opinions — especially about
        object ownership and threading.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Key Qt Concepts I Had to Internalise
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Some of the most important lessons:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>
          <strong>Thread affinity matters</strong>
          <br />
          Every QObject belongs to a specific thread.
        </li>
        <li>
          <strong>Signals and slots are the right abstraction</strong>
          <br />
          They handle thread boundaries safely and cleanly.
        </li>
        <li>
          <strong>moveToThread() is powerful but dangerous</strong>
          <br />
          It changes where code executes, not who owns the object.
        </li>
        <li>
          <strong>Lifetime management is critical</strong>
          <br />
          Qt’s parent–child ownership model is simple, but unforgiving if misused.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Early Mistakes (and Fixes)
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I initially made several common mistakes:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Accessing objects from the wrong thread</li>
        <li>Confusing execution context with data ownership</li>
        <li>Overusing shared mutable state</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Refactoring toward a message-passing model simplified the system
        dramatically. Once each pipeline stage communicated exclusively via
        signals, the design became easier to reason about — and far more robust.
      </p>

      {/* Placeholder code snippet */}
      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`// Example QObject moved to a worker thread and connected via signals
QThread* workerThread = new QThread;
Worker* worker = new Worker;

worker->moveToThread(workerThread);

QObject::connect(workerThread, &QThread::started,
                 worker, &Worker::process);

QObject::connect(worker, &Worker::finished,
                 workerThread, &QThread::quit);

workerThread->start();`}
      </pre>
      {/* Placeholder image */}
      <img
        src="/images/photoboss/parallel-working.png"
        alt="Diagram showing multiple hash workers working in parallel on disk I/O results"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
