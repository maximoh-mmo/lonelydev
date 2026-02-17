export default function PhotoLibrary6() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        Designing a Persistent Hash Cache with SQLite
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2026-01-21</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        File Identity
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        A file is identified by:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Path</li>
        <li>Size</li>
        <li>Modification time</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        If all three match, the file is assumed unchanged.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Schema Design
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The database schema includes:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li><strong>files</strong> — file identity and metadata</li>
        <li><strong>hash_methods</strong> — algorithm name and version</li>
        <li><strong>hashes</strong> — computed values</li>
        <li><strong>meta</strong> — schema versioning</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This allows:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Safe upgrades</li>
        <li>Algorithm invalidation</li>
        <li>Fine-grained cache hits</li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Cache as a Pipeline Stage
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The cache isn’t a bolt-on optimisation — it’s a first-class pipeline
        stage.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        If all required hashes are present:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Disk IO is skipped</li>
        <li>Decoding is skipped</li>
        <li>Hashing is skipped entirely</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Results are injected directly back into the pipeline.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/sql-schema.png"
        alt="SQLite schema for the hash cache"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
