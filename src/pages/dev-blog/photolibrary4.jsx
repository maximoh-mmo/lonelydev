export default function PhotoLibrary4() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold mb-2">
        Hashing Images: More Than Just Checksums
      </h1>
      <p className="text-gray-500 mb-8">Posted on {/* insert date */}</p>

      <h2 className="text-2xl font-semibold mb-4">
        Exact vs Perceptual Hashes
      </h2>
      <p className="mb-6">
        Not all hashes solve the same problem.
      </p>

      <h3 className="text-xl font-semibold mb-2">
        Cryptographic hashes (MD5, SHA)
      </h3>
      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Fast</li>
        <li>Reliable</li>
        <li>Only detect exact duplicates</li>
      </ul>

      <h3 className="text-xl font-semibold mb-2">
        Perceptual hashes (pHash, aHash)
      </h3>
      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Capture visual structure</li>
        <li>Tolerant of resizing and minor edits</li>
        <li>Enable similarity comparison</li>
      </ul>

      <p className="mb-8">
        This project uses both, depending on context.
      </p>

      <h2 className="text-2xl font-semibold mb-4">
        Separating Concerns for Performance
      </h2>
      <p className="mb-6">
        Hashing images efficiently requires separating:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Disk IO</li>
        <li>Image decoding</li>
        <li>Hash computation</li>
      </ul>

      <p className="mb-8">
        Each of these stages has different performance characteristics. By
        isolating them into separate pipeline stages, the system avoids
        bottlenecks and scales with available CPU cores.
      </p>

      <h2 className="text-2xl font-semibold mb-4">
        Worker Pools and Load Balancing
      </h2>
      <p className="mb-6">
        Hash computation runs in worker pools sized to the machine’s
        capabilities. This ensures:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Maximum throughput</li>
        <li>Predictable CPU usage</li>
        <li>Minimal UI impact</li>
      </ul>

      <p className="mb-8">
        At this point, the system worked — but it was doing far more work than
        necessary.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/hash-worker-pool-diagram.png"
        alt="Worker pool layout for image hashing stage"
        className="rounded-lg shadow-lg mb-10 w-full object-contain"
      />
    </main>
  );
}
