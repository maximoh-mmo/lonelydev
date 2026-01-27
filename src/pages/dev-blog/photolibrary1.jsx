export default function PhotoLibrary1() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold mb-2">
        The Problem Nobody Talks About: Photo Libraries at Scale
      </h1>
      <p className="text-gray-500 mb-8">Posted on 2025-11-12</p>

      <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
      <p className="mb-6">
        Over the past 14 years, my household has accumulated an enormous number
        of photos. Phones changed, cameras upgraded, laptops replaced — and at
        each step, backups were made. Carefully. Repeatedly.
      </p>

      <p className="mb-6">
        What didn’t happen nearly as often was cleanup.
      </p>

      <p className="mb-6">
        The result is a photo library that contains:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Exact duplicates</li>
        <li>Slightly resized copies</li>
        <li>Edited variants</li>
        <li>Exported versions from messaging apps</li>
        <li>The same image copied across multiple backup generations</li>
      </ul>

      <p className="mb-8">
        At some point, this stopped being a storage issue and became something
        else entirely.
      </p>

      <p className="mb-8 font-semibold">
        It became a classification problem.
      </p>

      <h2 className="text-2xl font-semibold mb-4">
        Why Existing Solutions Fall Short
      </h2>
      <p className="mb-6">
        At first glance, this seems solvable with off-the-shelf tools. In
        practice, most approaches break down quickly.
      </p>

      <ul className="list-disc list-inside mb-8 space-y-2">
        <li>
          <strong>Filename comparison</strong>
          <br />
          Completely unreliable once files are copied, renamed, or exported.
        </li>
        <li>
          <strong>Metadata comparison</strong>
          <br />
          EXIF data is often stripped, modified, or inconsistent across exports.
        </li>
        <li>
          <strong>Exact hashing (MD5 / SHA)</strong>
          <br />
          Only detects byte-for-byte duplicates — useless for resized or edited
          images.
        </li>
      </ul>

      <p className="mb-8">
        What’s needed instead is a way to identify <em>visual similarity</em>,
        not binary equality.
      </p>

      <h2 className="text-2xl font-semibold mb-4">Project Goals</h2>
      <p className="mb-6">
        This project started with two parallel motivations:
      </p>

      <h3 className="text-xl font-semibold mb-2">
        A genuine personal pain point
      </h3>
      <p className="mb-6">
        I needed a practical way to organise and deduplicate a very large, very
        messy photo collection.
      </p>

      <h3 className="text-xl font-semibold mb-2">
        A deliberate skills exercise
      </h3>
      <p className="mb-4">I wanted to:</p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Improve my modern C++ skills</li>
        <li>Learn the Qt framework properly</li>
        <li>
          Produce reflective, production-style code suitable for my portfolio
        </li>
      </ul>

      <p className="mb-8">
        Rather than building a quick script, I treated this as a real software
        engineering problem — one that required careful architectural thinking.
      </p>

      <h2 className="text-2xl font-semibold mb-4">
        What This Series Covers
      </h2>
      <p className="mb-6">
        This blog series documents that journey:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>From problem framing</li>
        <li>To architectural design</li>
        <li>To concurrency, performance, and persistence</li>
        <li>To lessons learned along the way</li>
      </ul>

      <p className="mb-8">
        This is not a tutorial in the traditional sense. It’s a record of how
        and why decisions were made.
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/photo-library-sprawl.png"
        alt="Messy photo library with duplicated directories"
        className="rounded-lg shadow-lg mb-10 w-full object-contain"
      />
    </main>
  );
}
