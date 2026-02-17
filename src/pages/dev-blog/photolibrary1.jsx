export default function PhotoLibrary1() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        The Problem Nobody Talks About: Photo Libraries at Scale
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2025-11-12</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Digital Hoard</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        It started innocent enough. A few folders of photos from a 2010 compact camera, dragged onto a laptop. Then came the smartphones. Then the backups of the smartphones. Then the backups of the laptops that held the backups of the smartphones.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Fast forward 14 years, and my home server is groaning under the weight of a digital history that has become impossible to manage. We’re talking about terabytes of memories, but they’re buried under a sediment of redundancy.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I recently opened a folder named <code>/backup_2018_final_sorted</code>, only to find it contained another folder called <code>/old_laptop_backup</code>, which contained a nearly identical copy of the first folder, but with slightly different file names.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed font-semibold">
        It wasn't just a storage problem anymore. It was an archaeology problem.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Why "Just Deleting Duplicates" Didn't Work
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        My first thought, like any engineer, was: <em>"I'll just write a script."</em>
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I grabbed a standard deduplication tool, ran it for 12 hours, and... it found maybe 10% of the junk. Why? because <strong>binary equality</strong> is a fragile concept in the real world.
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li><strong>The Resized Copy:</strong> An image exported from Lightroom for Instagram is "different" to the computer, but identical to me.</li>
        <li><strong>The Metadata Shift:</strong> A file copied from Android to Windows often gets its EXIF data tumbled, changing its hash.</li>
        <li><strong>The Messenger Compression:</strong> That photo sent via WhatsApp? It’s a completely new file now, stripped of its soul (and pixels).</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I realised that standard tools view files as <em>data</em>, but I needed a tool that viewed them as <em>images</em>. I didn't need to know if <code>img_123.jpg</code> equalled <code>img_123_copy.jpg</code>. I needed to know if they <em>looked the same</em>.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">A Project is Born</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This frustration birthed <strong>PhotoBoss</strong> (a working title that stuck). I decided to treat this not as a quick script, but as a serious engineering challenge. I wanted to build a system that could ingest hundreds of thousands of images, fingerprint them perceptually, and help me make sense of the chaos.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        It was also the perfect excuse to finally sharpen my modern C++ skills and dive deep into the Qt framework — not just reading the docs, but fighting the battles of thread affinity, ownership, and custom models.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        The Road Ahead
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Over the next few posts, I’m going to document the architecture of this thing. It’s been a journey of "naive" implementations that crashed my PC, discovery of perceptual hashing algorithms, and the eventual realization that I needed a persistent database to keep sanity.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This isn't a tutorial on "How to write a deduplicator." It's a dev log of "How I over-engineered a solution to a problem I created for myself."
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/photo-library-sprawl.png"
        alt="Messy photo library with duplicated directories"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
