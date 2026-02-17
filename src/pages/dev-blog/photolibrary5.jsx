export default function PhotoLibrary5() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        The Realisation: Recomputing Everything Is Wasteful
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2026-01-07</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        The Problem With Repeated Scans
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Every time the application ran, it recomputed hashes for files that
        hadn’t changed. For large libraries, this quickly became the dominant
        cost.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed font-semibold">
        This violated a basic principle:
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Deterministic, expensive work should not be repeated unnecessarily.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Requirements for a Cache
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Any caching solution needed to:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Persist across application runs</li>
        <li>Automatically invalidate stale entries</li>
        <li>Support multiple hash algorithms</li>
        <li>Handle algorithm versioning</li>
        <li>Require zero external services</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        That narrowed the field quickly.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Why SQLite?
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        SQLite offers:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Zero deployment complexity</li>
        <li>Strong transactional guarantees</li>
        <li>Excellent performance for local workloads</li>
        <li>Schema versioning support</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Most importantly, it integrates cleanly with Qt.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/pipeline-cache-stage.png"
        alt="Image processing pipeline showing cache lookup stage before hashing"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
