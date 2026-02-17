export default function PhotoLibrary7() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        🧠 Short-Circuiting Work: Introducing a Persistent Hash Cache
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2026-01-27</p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        In the previous entries, I built a multi-stage pipeline to scan
        directories, load images, and compute perceptual hashes. It worked —
        but it was doing far more work than necessary.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        As I started running the tool against real data — years of backups,
        copied folders, and “just in case” archives — one problem became
        obvious:
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed font-semibold">
        I was re-hashing the same images over and over again.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This entry covers how I introduced a persistent, versioned hash cache
        and restructured the pipeline to take advantage of it.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        The problem: expensive work, repeated endlessly
      </h2>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Perceptual hashing isn’t free:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Images must be read from disk</li>
        <li>Decoded into memory</li>
        <li>Processed by one or more algorithms</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        When scanning large photo collections, especially ones built up over
        many years, the same files appear repeatedly — often unchanged.
        Re-doing that work every time isn’t just slow, it’s wasteful.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Design goals</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Before writing any code, I set a few constraints:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>
          <strong>Correctness first</strong>
          <br />
          Cached results must only be reused if the file is definitely
          unchanged.
        </li>
        <li>
          <strong>No silent invalidation bugs</strong>
          <br />
          If a hash algorithm changes, old results should not be trusted.
        </li>
        <li>
          <strong>Pipeline-friendly</strong>
          <br />
          The cache shouldn’t be a bolt-on — it should be a natural stage in
          the flow.
        </li>
        <li>
          <strong>Future-proof</strong>
          <br />
          This tool may grow new hash methods over time.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        File identity: defining “the same image”
      </h2>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        To decide whether a cached hash is reusable, I define a file identity
        using:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>File path</li>
        <li>File size</li>
        <li>Last modified timestamp</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This strikes a pragmatic balance:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Fast to query</li>
        <li>Stable across runs</li>
        <li>Good enough for personal photo archives</li>
      </ul>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`// Any change to these fields invalidates cached hashes
struct FileIdentity {
QString path;
quint64 sizeBytes;
quint64 modifiedTime;
};
// Constructed once during scanning
FileIdentity identity{
fileInfo.absoluteFilePath(),
fileInfo.size(),
fileInfo.lastModified().toSecsSinceEpoch()
};`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        If any of these change, the cache is bypassed.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        A cache-first pipeline
      </h2>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Instead of caching at the end, I introduced a CacheLookup stage early
        in the pipeline.
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`Scanner --> CacheLookup
CacheLookup -->|Hit| ResultProcessor
CacheLookup -->|Miss| DiskReader
DiskReader --> HashWorker
HashWorker --> ResultProcessor`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This allows cached images to completely skip disk I/O and hashing.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Persistent storage with SQLite
      </h2>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I chose SQLite for a few reasons:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Zero external dependencies</li>
        <li>Mature, well-tested</li>
        <li>Good performance for local workloads</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The schema is intentionally explicit:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li><strong>files</strong> — file identity</li>
        <li><strong>hash_methods</strong> — hash key + version</li>
        <li><strong>hashes</strong> — computed values with timestamps</li>
        <li><strong>meta</strong> — schema versioning</li>
      </ul>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`-- Files are identified by stable, cheap-to-query properties
CREATE TABLE files (
id INTEGER PRIMARY KEY,
path TEXT NOT NULL,
size_bytes INTEGER NOT NULL,
mtime_unix INTEGER NOT NULL,
UNIQUE(path, size_bytes, mtime_unix)
);


-- Each hash algorithm is explicitly versioned
CREATE TABLE hash_methods (
id INTEGER PRIMARY KEY,
name TEXT NOT NULL,
version INTEGER NOT NULL,
UNIQUE(name, version)
);


-- Computed hashes link files to hash methods
CREATE TABLE hashes (
file_id INTEGER NOT NULL,
hash_method_id INTEGER NOT NULL,
value BLOB NOT NULL,
computed_at INTEGER NOT NULL,
PRIMARY KEY (file_id, hash_method_id),
FOREIGN KEY (file_id) REFERENCES files(id),
FOREIGN KEY (hash_method_id) REFERENCES hash_methods(id)
);`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I also enabled:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>WAL mode</li>
        <li>Foreign keys</li>
        <li>Transactional writes</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This keeps the cache fast and resilient.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Versioned hash methods
      </h2>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        One subtle but important decision: hash methods are versioned. If I
        tweak an algorithm in the future, I don’t want to silently reuse
        incompatible results. Cached entries are only valid if versions
        match.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This lets the system evolve without breaking trust in the data.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Runtime configurability
      </h2>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        With the cache and pipeline in place, I added a simple UI layer:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Users can enable or disable hash methods</li>
        <li>The UI reflects whatever hashes are registered at runtime</li>
        <li>No hardcoded assumptions in the interface</li>
      </ul>

      <img
        src="/images/hash-settings-dialog.png"
        alt="Settings dialog showing configurable hash methods"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Reflections</h2>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Designing the cache before optimising paid off</li>
        <li>
          Treating cached results as first-class pipeline outputs simplified
          everything
        </li>
        <li>Versioning early avoids painful migrations later</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        There’s still plenty to improve — grouping duplicates, similarity
        thresholds, and better reporting — but the foundation now feels
        solid.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">What’s next</h2>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Grouping visually similar images</li>
        <li>Surfacing likely duplicates</li>
        <li>Helping decide what to keep, archive, or delete</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        That’s where this stops being a technical exercise and starts solving
        the original problem.
      </p>
    </main>
  );
}