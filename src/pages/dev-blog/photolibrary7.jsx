export default function PhotoLibrary7() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        Short-Circuiting Work: Introducing a Persistent Hash Cache
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2026-01-27</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Implementation</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        In my last post, I designed the schema for my cache. Now it was time to wire it up.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The "Identity" problem was the first hurdle. I needed a way to fingerprint a file without reading it. I settled on a composite key:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`// Any change to these fields invalidates cached hashes
struct FileIdentity {
    QString path;
    quint64 sizeBytes;
    quint64 modifiedTime;
};`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Is it theoretically possible to modify a file while keeping its size and timestamp exactly the same? Yes. Is it likely to happen to my family vacation photos? No.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        For the database itself, I needed a schema that could handle multiple hash algorithms per file. I used a normalised approach:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`-- Files table (The Identity)
CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    mtime_unix INTEGER NOT NULL,
    UNIQUE(path, size_bytes, mtime_unix)
);

-- Hashes table (The Expensive Work)
CREATE TABLE hashes (
    file_id INTEGER NOT NULL,
    hash_method_id INTEGER NOT NULL,
    value BLOB NOT NULL,
    PRIMARY KEY (file_id, hash_method_id)
);`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This is where the pipeline architecture I fought for in Part 2 really paid off. If I had written a spaghetti-code loop, adding caching would have been a nightmare of `if` statements.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Instead, I just inserted a new node in the graph:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`Scanner --> CacheLookup
CacheLookup -->|Hit| ResultAggregation
CacheLookup -->|Miss| DiskLoader`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The <code>CacheLookup</code> worker takes a file path, queries SQLite, and makes a decision. If the hash exists, it creates a "Job Done" signal and sends it straight to the finish line. The disk loader never even knows the file existed.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        The First Run
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I implemented the SQLite backend, set up the WAL (Write-Ahead Logging) for concurrency, and fired it up.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <strong>Run 1:</strong> 45 minutes. (Expected. It had to hash everything from scratch).
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Then, the moment of truth. I closed the app. Re-opened it. And pointed it at the same 50,000 photos.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <strong>Run 2:</strong> 4 seconds.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I actually laughed out loud. The bottleneck had shifted entirely from "Parsing JPEGs" to "How fast can SQLite return rows?" (Answer: very fast).
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Runtime Config
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Because I versioned the hash methods in the database, I could now do something cool: I added a "Settings" dialog where I could toggle individual algorithms on and off.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Want to only use MD5 for speed? Uncheck "Perceptual Hash." The pipeline adjusts instantly. Re-enable it? The system checks the cache, sees the missing values for <em>that specific algorithm</em>, and schedules jobs to compute only the missing data.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        It felt like I had finally tamed the beast. The infrastructure was solid. Now I could finally focus on the actual goal: finding the duplicates.
      </p>

    </main>
  );
}