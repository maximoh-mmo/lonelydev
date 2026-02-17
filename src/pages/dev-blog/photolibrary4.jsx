export default function PhotoLibrary4() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        Hashing Images: More Than Just Checksums
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2025-12-24</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">The MD5 Trap</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        When you say "file comparison" to a programmer, they instinctively reach for MD5 or SHA-256. It’s reflex.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        So, that’s what I did. I built a lightning-fast pipeline that computed SHA-256 hashes for every file in my library. I was proud of it. It chewed through 100GB of photos in minutes.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        It was also useless.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        A single bit flip changes a SHA-256 hash completely. Opening a JPEG and saving it again (even at %100 quality) changes the hash. Resizing an image by 1 pixel changes the hash. My library was full of "duplicates" that were byte-distinct but visually identical.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Enter Perceptual Hashing
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I needed a hash that behaved like a human eye. If I squint at a picture of a cat, and then squint at a smaller version of that same picture, they look the same.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This led me to the world of <strong>pHash</strong> (Perceptual Hash) and <strong>aHash</strong> (Average Hash).
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li><strong>aHash</strong> breaks the image into an 8x8 grid of greyscale pixels and compares each pixel to the average brightness. It’s incredibly fast and great for finding resized copies.</li>
        <li><strong>pHash</strong> uses a Discrete Cosine Transform (DCT) — the same math behind JPEG compression — to fingerprint the low-frequency structure of the image. It focuses on the "shape" of the image rather than the pixels.</li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        The Cost of Seeing
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The catch? Calculating a pHash is expensive. You have to decode the full image, convert to greyscale, and run matrix math.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        My pipeline slowed to a crawl. The scanner was feeding file paths instantly, but the "Hasher" stage was choking on the CPU load.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This forced me to rethink my worker pool. I couldn't just have one "Hasher" thread. I needed a swarm of them. I updated the pipeline to dynamically scale the worker pool based on the user's CPU core count (minus one, to keep the UI responsive).
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Now, looking at the Task Manager is satisfying: 100% utilisation across all cores, churning through memories at maximum speed.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/hash-worker-pool-diagram.png"
        alt="Worker pool layout for image hashing stage"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
