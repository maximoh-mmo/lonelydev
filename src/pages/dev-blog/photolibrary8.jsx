export default function PhotoLibrary8() {
    return (
        <main className="max-w-4xl mx-auto px-6 py-16 text-left">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
                Finding the Needle in the Haystack: Similarity Search & Grouping
            </h1>
            <p className="text-gray-500 mb-8 text-center italic">Posted on 2026-02-17</p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                In the previous entry, I introduced a persistent hash cache to stop
                re-processing the same files over and over. With that foundation in
                place, I could finally tackle the core problem that started this whole
                project:
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed font-semibold">
                My photo library is a mess of near-duplicates, resized copies, and
                slightly edited versions.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                I currently have over 50,000 photos scattered across multiple drives.
                Deleting exact duplicates (same byte content) cleans up about 10% of
                them. The rest? They require <strong>visual similarity</strong> matching.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Pipeline Architecture: Pragmatism over Abstraction
            </h2>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                As I started building the similarity engine, I ran into a wall with my
                original pipeline design. I had tried to make everything a generic
                <code>Stage</code> class that could be chained together endlessly.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                It sounded great in theory. In practice, it was a nightmare.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Some stages need one input and one output. Others (like the
                SimilarityEngine) need to consume <em>all</em> inputs before producing a
                single comprehensive output. Some need to talk to the database; others
                are pure CPU work.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                I found myself writing more code to satisfy the abstraction than to
                solve the actual problem. So, I took a step back.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Usage of <code>PipelineController</code> remains — it’s still the
                conductor. But instead of forcing every stage to look identical, I moved
                to concrete, purpose-built classes for each step.
            </p>

            <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
                <li>
                    <strong>Scanner</strong>: Finds files.
                </li>
                <li>
                    <strong>HashWorker</strong>: Computes hashes.
                </li>
                <li>
                    <strong>SimilarityEngine</strong>: Groups them.
                </li>
            </ul>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                They share common data structures, but they don’t share a forced common
                interface. This made the code simpler, easier to debug, and much easier
                to extend.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                The Similarity Engine
            </h2>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                With the pipeline unblocked, I implemented the grouping logic. It relies
                on a multi-pass approach.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Pass 1: Exact Matches
            </h3>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                First, we group files by SHA-256 hash. These are byte-for-byte
                identical. This is fast and safe.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Pass 2: Perceptual Grouping
            </h3>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                For the remaining images, we need to determine if they <em>look</em> the
                same. I didn't want to rely on a single algorithm, so I implemented a
                weighted scoring system.
            </p>

            <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
                {`struct Config {
    double strongThreshold = 0.90;
    
    // Weighted components
    double pHashWeight = 0.45;  // Perceptual Hash
    double dHashWeight = 0.25;  // Difference Hash
    double aHashWeight = 0.20;  // Average Hash
    double ratioWeight = 0.10;  // Aspect Ratio
};`}
            </pre>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                By combining pHash (structure), dHash (gradients), and aHash (color/brightness),
                plus a check on aspect ratio, we get a robust similarity score. If the
                weighted score exceeds 90%, the images are grouped together.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                UI: Dark Mode & Previews
            </h2>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Finally, I needed a way to verify these groups. Visual inspection is the
                only way to trust a tool like this.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                I built a <code>GroupWidget</code> that displays the "representative"
                image (best quality) alongside all its matches. I also added a
                dedicated <code>PreviewPane</code> to inspect details side-by-side.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                And, of course, I finally added <strong>Dark Mode</strong>. Because if
                you're going to stare at a photo deduplication tool at 2 AM, it might as
                well be easy on the eyes.
            </p>

            {/* Placeholder image */}
            <div className="bg-gray-800 rounded-xl h-64 flex items-center justify-center text-gray-400 mb-8 shadow-md">
                (Screenshot of the new Dark Mode Group Preview)
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What’s Next?</h2>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Now that grouping works, the next step is <strong>Action</strong>. I need
                to build the UI for efficiently selecting which images to keep and which
                to delete within these groups.
            </p>
        </main>
    );
}
