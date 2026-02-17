export default function PhotoLibrary2() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        From Idea to Architecture: Designing a Scalable Image Processing Pipeline
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2025-11-26</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Naive Approach</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        In my head, the logic was simple. Iterate through every folder, load every image, hash it, and check for duplicates. Easy, right?
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I wrote the first prototype as a single loop. It worked beautifully for a test folder of 100 images. Then I pointed it at my main library of 50,000+ photos.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The UI froze immediately. The disk thrashing was audible from the next room. And when I finally killed the process, I realised I had no way to restart without beginning from zero.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Identifying the Bottlenecks</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I realised that "processing an image" isn't a single atomic action. It’s actually a series of very different operations, each with its own specific bottleneck:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li><strong>Scanning:</strong> Fast, but disk-bound (seeking).</li>
        <li><strong>Loading:</strong> Extremely IO-heavy (sequential reads).</li>
        <li><strong>Decoding:</strong> CPU-heavy, variable time (JPEGs are messy).</li>
        <li><strong>Hashing:</strong> Pure math, CPU-bound.</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        By running these in a single sequence, I was forcing my fast CPU to wait for the slow disk, and then forcing the idle disk to wait for the busy CPU. It was the worst of both worlds.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Thinking in Pipelines</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I threw out the single loop and redesigned the system as a <strong>Pipeline</strong>. Instead of one worker doing everything, I imagined a factory line.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        A <strong>Scanner</strong> thread runs ahead, finding files and tossing paths into a queue. A pool of <strong>Loaders</strong> grab paths, pull the data off the disk, and pass the raw buffers to a pool of <strong>Decoders</strong>. Finally, the <strong>Hashers</strong> do the math and send the results to the UI.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This approach—Producer-Consumer queues connecting discrete stages—solved the responsiveness issue instantly. If the disk is slow, the hashers just pause. If the CPU is slammed, the scanners wait. The system naturally balances itself.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Why Structuring Matters
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        It’s tempting to "just use threads" (<code>std::async</code> is right there!), but raw threading quickly leads to a tangled mess of mutexes and race conditions.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        By enforcing a strict pipeline structure, I didn't just get performance. I got <strong>sanity</strong>. Each stage has a single input and a single output. I can test the "Decoder" stage in isolation without needing a valid disk system. I can swap out the "Scanner" for a test harness.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The architecture was set. Now I just had to implement it in Qt without shooting myself in the foot.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/pipeline-diagram.png"
        alt="High-level image processing pipeline showing stages and data flow"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
