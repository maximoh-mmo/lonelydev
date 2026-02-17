export default function PhotoLibrary5() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        The Realisation: Recomputing Everything Is Wasteful
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on 2026-01-07</p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Progress Bar that Never Ends</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        My parallel pipeline was a thing of beauty. I could drag a folder of 10,000 images onto the window, and watch 32 CPU threads devour it. The fans would spin up, the progress bar would fly across the screen, and 45 seconds later, I had my results.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Then I closed the app. And opened it again. And dragged the same folder in.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        And waited another 45 seconds.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        The "Lightbulb" Moment
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        It seems obvious in hindsight, but in the heat of "getting it working," I had ignored a fundamental truth: <strong>My photos don't change.</strong>
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        A picture taken in 2012 and stored on my NAS hasn't been modified in a decade. Why was I spending expensive CPU cycles decoding and hashing it every single time I wanted to organise my library?
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I realised that for this tool to be actually <em>usable</em>—to be something I could open, tweak a filter, and close without feeling dread—it needed <strong>Memory</strong>.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Defining the Cache
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I grabbed a notebook (paper is still the best IDE) and sketched out what a caching system would actually look like. It wasn't just "save the results." It had strict requirements:
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li><strong>Persistence:</strong> It has to survive application restarts. (Goodbye, <code>std::map</code>).</li>
        <li><strong>Invalidation:</strong> If I <em>do</em> edit a photo, the cache must know instantly. Stale data is worse than no data.</li>
        <li><strong>Versioning:</strong> If I improve my hashing algorithm next week, I need a way to tell the database "throw away the old hashes, they are garbage now."</li>
        <li><strong>Zero Config:</strong> I didn't want to install a PostgreSQL server just to run my desktop app.</li>
      </ul>


      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        The Candidate: SQLite
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I briefly considered using a massive JSON file or a custom binary format. Then I remembered I wanted to keep my sanity.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        SQLite was the only logical choice. It’s serverless, it’s single-file, and it has transactional integrity. If my app crashes halfway through writing a cache entry, the database won't get corrupted. Plus, Qt has excellent support for it via <code>QSqlDatabase</code>.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The decision was made. Now I just had to design a schema that could identify a file uniquely without actually reading it.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/pipeline-cache-stage.png"
        alt="Image processing pipeline showing cache lookup stage before hashing"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
