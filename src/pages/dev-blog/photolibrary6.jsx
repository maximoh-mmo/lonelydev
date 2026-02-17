export default function PhotoLibrary6() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        Designing a Persistent Hash Cache with SQLite
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2026-01-21</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Identity without Reading</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The core challenge of a cache is trust. If I ask the database <em>"Do you know the hash for Photo.jpg?"</em>, and it says <em>"Yes,"</em> I need to be 100% certain that <code>Photo.jpg</code> hasn't changed since that hash was calculated.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        But I can't read the file to check, because reading the file is the exact thing I'm trying to avoid.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The solution is a proxy identity. I assume a file is unchanged if three values remain constant:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li><strong>Absolute Path</strong> (Location)</li>
        <li><strong>Size in Bytes</strong> (Magnitude)</li>
        <li><strong>Last Modified Time</strong> (History)</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Is it theoretically possible to modify a file while keeping its size and timestamp exactly the same? Yes. Is it likely to happen to my family vacation photos? No.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Schema</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Designing the database felt like putting together a puzzle. I didn't want a single flat table. I wanted a system that could handle multiple hash algorithms (MD5, pHash, BlockMean) for the same file.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I settled on a normalised 3-table structure:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li><strong>Files Table:</strong> Stores the Path, Size, and MTime. This is the "Key".</li>
        <li><strong>Methods Table:</strong> Stores the name of the algorithm (e.g., "pHash") and its <em>Version</em>.</li>
        <li><strong>Hashes Table:</strong> The glue. It links a File to a Method and stores the Blob data.</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This separation is powerful. If I update my pHash calculation code, I just bump the version number in the Methods table. The app will see the version mismatch and automatically re-compute the new hashes, while leaving the MD5 hashes untouched.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        The Cache as a Pipeline Member
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The best part of this design? The cache isn't some side-car process. It’s just another stage in the pipeline.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The <strong>CacheLookup</strong> stage sits right after the Scanner. It checks the DB. If it gets a hit, it sends the result directly to the UI, bypassing the heavy "loading" and "hashing" stages entirely. It feels like cheating.
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
