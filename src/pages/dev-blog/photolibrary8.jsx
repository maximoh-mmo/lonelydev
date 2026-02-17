export default function PhotoLibrary8() {
    return (
        <main className="max-w-4xl mx-auto px-6 py-16 text-left">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
                Finding the Needle in the Haystack: Similarity Search & Grouping
            </h1>
            <p className="text-gray-500 mb-8 text-center italic">Posted on 2026-02-17</p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Final Piece</h2>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                We have a pipeline. We have a threaded worker pool. We have a robust, versioned database cache. The machine is built. Now it’s time to turn it on and do what we came here to do: <strong>Find the duplicates.</strong>
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                The Grouping Strategy
            </h2>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                I realised early on that a "One Pass Fits All" approach was wrong. Grouping exact byte-matches is easy (and objective). Grouping "similar" images is fuzzy (and subjective).
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                I adopted a sieve-like approach:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">Layer 1: The Exact Match</h3>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                First, I run a blazing fast pass using SHA-256. If two files have the same hash, they are the same file. Period. This cleared out about 4,000 files from my library instantly. These are the safe kills.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">Layer 2: The Visual Match</h3>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                This is where the math gets fun. I compare every image against every other image (using an indexing tree to avoid O(n^2) madness, of course).
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                I defined a "Similarity Score" based on a weighted average of:
            </p>

            <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
                {`struct Config {
    double strongThreshold = 0.90;
    
    // Components
    double pHashWeight = 0.45;  // Shape/Structure
    double dHashWeight = 0.25;  // Gradients
    double aHashWeight = 0.20;  // Average Color
    double ratioWeight = 0.10;  // Aspect Ratio
};`}
            </pre>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Why mix them? Because <code>pHash</code> is great at surviving compression artifacts, but sometimes thinks a building looks like a book. <code>aHash</code> is great at color, but fails if you crop the image. Together, they form a jury. If the jury votes 90% "Yes", it's a match.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                The Result (and the False Positives)
            </h2>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                I pressed "Scan". The pipeline roared to life. The cache hits flew by. And then, the "Groups Found" counter started ticking up.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                I opened the result viewer (which I finally styled in a sleek Dark Mode, because we aren't savages), and there they were.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                A photo of my dog from 2018. Next to it, a slightly smaller version labeled "Instagram Export". Next to that, a version with a sepia filter. <strong>PhotoBoss knew they were the same.</strong>
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                But it wasn't perfect. It also decided that a picture of a grey wall was identical to a picture of a grey sky. And it grouped two completely different sunsets because the color palettes were mathematically identical.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                The similarity engine is like an over-eager puppy right now. It finds the ball, but sometimes it brings you a rock instead. I need to tighten the scoring thresholds and maybe introduce a "safety" check for edge cases.
            </p>

            {/* Placeholder image */}
            <img
                src="/images/photoboss/dark_mode_preview.png"
                alt="Dark mode preview of the duplicate photo groups"
                className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
            />

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What’s Next?</h2>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                So, I can <em>see</em> the duplicates. But I can't easily kill them yet.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                I have a thumbnail view, but the actual "Delete" button is terrifyingly effective. I need to build a "Review & Confirm" workflow that feels safe to use on 15 years of memories. UX is hard, especially when the cost of a misclick is deleting your child's first steps.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                The engine is running. Now I just need to learn how to steer it.
            </p>
        </main>
    );
}
