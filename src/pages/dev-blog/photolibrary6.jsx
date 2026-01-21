export default function PhotoLibrary6() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold mb-2">
        Designing a Persistent Hash Cache with SQLite
      </h1>
      <p className="text-gray-500 mb-8">Posted on {/* insert date */}</p>

      <h2 className="text-2xl font-semibold mb-4">
        File Identity
      </h2>
      <p className="mb-6">
        A file is identified by:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Path</li>
        <li>Size</li>
        <li>Modification time</li>
      </ul>

      <p className="mb-8">
        If all three match, the file is assumed unchanged.
      </p>

      <h2 className="text-2xl font-semibold mb-4">
        Schema Design
      </h2>
      <p className="mb-6">
        The database schema includes:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li><strong>files</strong> — file identity and metadata</li>
        <li><strong>hash_methods</strong> — algorithm name and version</li>
        <li><strong>hashes</strong> — computed values</li>
        <li><strong>meta</strong> — schema versioning</li>
      </ul>

      <p className="mb-6">
        This allows:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Safe upgrades</li>
        <li>Algorithm invalidation</li>
        <li>Fine-grained cache hits</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4">
        Cache as a Pipeline Stage
      </h2>
      <p className="mb-6">
        The cache isn’t a bolt-on optimisation — it’s a first-class pipeline
        stage.
      </p>

      <p className="mb-6">
        If all required hashes are present:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Disk IO is skipped</li>
        <li>Decoding is skipped</li>
        <li>Hashing is skipped entirely</li>
      </ul>

      <p className="mb-8">
        Results are injected directly back into the pipeline.
      </p>

{/* Placeholder image */}
      <img
        src="/images/photoboss/sql-schema.png"
        alt="SQLite schema for the hash cache"
        className="rounded-lg shadow-lg mb-10 w-full object-contain"
      />
    </main>
  );
}
