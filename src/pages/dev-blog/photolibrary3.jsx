export default function PhotoLibrary3() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        Learning Qt by Building: Threads, Signals, and Ownership
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2025-12-10</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Framework Choice</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I chose Qt for this project because I wanted to learn it properly. I’ve dabbled before, but "dabbling" in Qt usually means "copy-pasting from StackOverflow until the window shows up."
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This time, I wanted to understand the machine. And oh boy, did the machine fight back.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Thread Affinity: The Silent Killer
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Coming from a generic C++ background, I assumed that if I had a pointer to an object, I could call methods on it.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Qt says: <em>"No."</em>
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I spent three days debugging a race condition where my UI would update <em>sometimes</em>, but crash randomly. The culprit? <strong>Thread Affinity</strong>. In Qt, every <code>QObject</code> "lives" on a specific thread. If you call a method on it from another thread, you are breaking the law.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        The Signal/Slot Enlightenment
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The solution—and the moment the framework finally "clicked" for me—was fully embracing <strong>Signals and Slots</strong>.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Instead of <code>worker-&gt;doWork()</code>, you emit <code>requestWork()</code>.
        Instead of the worker returning data, it emits <code>workFinished(result)</code>.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        It feels cumbersome at first. You’re writing boilerplate just to call a function. But then you realise what Qt is doing for you: <strong>It’s marshaling the call across thread boundaries automatically.</strong> Use a queued connection, and the data arrives safely on the receiver's thread, with no mutex locking required in your business logic.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        MoveToThread() is Not Magic
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        One specific trap I fell into:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`// Current Thread: Main
MyWorker* worker = new MyWorker();      // Created on Main Thread
QThread* thread = new QThread();
worker->moveToThread(thread);           // Moved to Worker Thread
thread->start();`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I learned the hard way that the <em>constructor</em> of <code>MyWorker</code> still runs on the main thread. If you allocate sub-objects or timers in the constructor, they stay on the main thread, while the worker itself moves. The result is a Frankenstein object straddling two threads.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Fixing this required a strict pattern: Do setup in a <code>start()</code> slot, not the constructor.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        It was a painful week, but my pipeline is now completely lock-free, relying entirely on message passing. It’s cleaner, safer, and arguably more "Qt" than anything I’ve written before.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/parallel-working.png"
        alt="Diagram showing multiple hash workers working in parallel on disk I/O results"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
