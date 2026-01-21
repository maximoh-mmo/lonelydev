export default function PhotoLibrary3() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold mb-2">
        Learning Qt by Building: Threads, Signals, and Ownership
      </h1>
      <p className="text-gray-500 mb-8">Posted on {/* insert date */}</p>

      <h2 className="text-2xl font-semibold mb-4">Why Qt?</h2>
      <p className="mb-6">
        Qt was chosen for several reasons:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Mature cross-platform support</li>
        <li>Integrated UI and concurrency tools</li>
        <li>A signal/slot model well-suited to pipelines</li>
        <li>Strong documentation and ecosystem</li>
      </ul>

      <p className="mb-8">
        However, Qt is not a thin abstraction. It has opinions — especially about
        object ownership and threading.
      </p>

      <h2 className="text-2xl font-semibold mb-4">
        Key Qt Concepts I Had to Internalise
      </h2>
      <p className="mb-6">
        Some of the most important lessons:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-2">
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

      <h2 className="text-2xl font-semibold mb-4">
        Early Mistakes (and Fixes)
      </h2>
      <p className="mb-6">
        I initially made several common mistakes:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Accessing objects from the wrong thread</li>
        <li>Confusing execution context with data ownership</li>
        <li>Overusing shared mutable state</li>
      </ul>

      <p className="mb-8">
        Refactoring toward a message-passing model simplified the system
        dramatically. Once each pipeline stage communicated exclusively via
        signals, the design became easier to reason about — and far more robust.
      </p>

      {/* Placeholder code snippet */}
      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-10 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
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
        className="rounded-lg shadow-lg mb-10 w-full object-contain"
      />
    </main>
  );
}
