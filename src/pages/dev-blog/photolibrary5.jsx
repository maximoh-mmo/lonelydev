export default function PhotoLibrary5() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold mb-2">
        The Realisation: Recomputing Everything Is Wasteful
      </h1>
      <p className="text-gray-500 mb-8">Posted on {/* insert date */}</p>

      <h2 className="text-2xl font-semibold mb-4">
        The Problem With Repeated Scans
      </h2>
      <p className="mb-6">
        Every time the application ran, it recomputed hashes for files that
        hadn’t changed. For large libraries, this quickly became the dominant
        cost.
      </p>

      <p className="mb-8 font-semibold">
        This violated a basic principle:
      </p>

      <p className="mb-8">
        Deterministic, expensive work should not be repeated unnecessarily.
      </p>

      <h2 className="text-2xl font-semibold mb-4">
        Requirements for a Cache
      </h2>
      <p className="mb-6">
        Any caching solution needed to:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Persist across application runs</li>
        <li>Automatically invalidate stale entries</li>
        <li>Support multiple hash algorithms</li>
        <li>Handle algorithm versioning</li>
        <li>Require zero external services</li>
      </ul>

      <p className="mb-8">
        That narrowed the field quickly.
      </p>

      <h2 className="text-2xl font-semibold mb-4">
        Why SQLite?
      </h2>
      <p className="mb-6">
        SQLite offers:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Zero deployment complexity</li>
        <li>Strong transactional guarantees</li>
        <li>Excellent performance for local workloads</li>
        <li>Schema versioning support</li>
      </ul>

      <p className="mb-8">
        Most importantly, it integrates cleanly with Qt.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/pipeline-cache-stage.png"
        alt="Image processing pipeline showing cache lookup stage before hashing"
        className="rounded-lg shadow-lg mb-10 w-full object-contain"
      />
    </main>
  );
}
