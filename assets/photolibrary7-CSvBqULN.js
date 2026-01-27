import{j as e}from"./index-gOWlT_Qd.js";function i(){return e.jsxs("main",{className:"max-w-3xl mx-auto px-6 py-12 text-gray-800",children:[e.jsx("h1",{className:"text-4xl font-bold mb-2",children:"🧠 Short-Circuiting Work: Introducing a Persistent Hash Cache"}),e.jsx("p",{className:"text-gray-500 mb-8",children:"Posted on 2026-01-27"}),e.jsx("p",{className:"mb-6",children:"In the previous entries, I built a multi-stage pipeline to scan directories, load images, and compute perceptual hashes. It worked — but it was doing far more work than necessary."}),e.jsx("p",{className:"mb-6",children:"As I started running the tool against real data — years of backups, copied folders, and “just in case” archives — one problem became obvious:"}),e.jsx("p",{className:"mb-8 font-semibold",children:"I was re-hashing the same images over and over again."}),e.jsx("p",{className:"mb-8",children:"This entry covers how I introduced a persistent, versioned hash cache and restructured the pipeline to take advantage of it."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"The problem: expensive work, repeated endlessly"}),e.jsx("p",{className:"mb-6",children:"Perceptual hashing isn’t free:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Images must be read from disk"}),e.jsx("li",{children:"Decoded into memory"}),e.jsx("li",{children:"Processed by one or more algorithms"})]}),e.jsx("p",{className:"mb-8",children:"When scanning large photo collections, especially ones built up over many years, the same files appear repeatedly — often unchanged. Re-doing that work every time isn’t just slow, it’s wasteful."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"Design goals"}),e.jsx("p",{className:"mb-6",children:"Before writing any code, I set a few constraints:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-2",children:[e.jsxs("li",{children:[e.jsx("strong",{children:"Correctness first"}),e.jsx("br",{}),"Cached results must only be reused if the file is definitely unchanged."]}),e.jsxs("li",{children:[e.jsx("strong",{children:"No silent invalidation bugs"}),e.jsx("br",{}),"If a hash algorithm changes, old results should not be trusted."]}),e.jsxs("li",{children:[e.jsx("strong",{children:"Pipeline-friendly"}),e.jsx("br",{}),"The cache shouldn’t be a bolt-on — it should be a natural stage in the flow."]}),e.jsxs("li",{children:[e.jsx("strong",{children:"Future-proof"}),e.jsx("br",{}),"This tool may grow new hash methods over time."]})]}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"File identity: defining “the same image”"}),e.jsx("p",{className:"mb-6",children:"To decide whether a cached hash is reusable, I define a file identity using:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"File path"}),e.jsx("li",{children:"File size"}),e.jsx("li",{children:"Last modified timestamp"})]}),e.jsx("p",{className:"mb-6",children:"This strikes a pragmatic balance:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Fast to query"}),e.jsx("li",{children:"Stable across runs"}),e.jsx("li",{children:"Good enough for personal photo archives"})]}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`// Any change to these fields invalidates cached hashes
struct FileIdentity {
QString path;
quint64 sizeBytes;
quint64 modifiedTime;
};
// Constructed once during scanning
FileIdentity identity{
fileInfo.absoluteFilePath(),
fileInfo.size(),
fileInfo.lastModified().toSecsSinceEpoch()
};`}),e.jsx("p",{className:"mb-8",children:"If any of these change, the cache is bypassed."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"A cache-first pipeline"}),e.jsx("p",{className:"mb-6",children:"Instead of caching at the end, I introduced a CacheLookup stage early in the pipeline."}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-10 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`Scanner --> CacheLookup
CacheLookup -->|Hit| ResultProcessor
CacheLookup -->|Miss| DiskReader
DiskReader --> HashWorker
HashWorker --> ResultProcessor`}),e.jsx("p",{className:"mb-8",children:"This allows cached images to completely skip disk I/O and hashing."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"Persistent storage with SQLite"}),e.jsx("p",{className:"mb-6",children:"I chose SQLite for a few reasons:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Zero external dependencies"}),e.jsx("li",{children:"Mature, well-tested"}),e.jsx("li",{children:"Good performance for local workloads"})]}),e.jsx("p",{className:"mb-6",children:"The schema is intentionally explicit:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsxs("li",{children:[e.jsx("strong",{children:"files"})," — file identity"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"hash_methods"})," — hash key + version"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"hashes"})," — computed values with timestamps"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"meta"})," — schema versioning"]})]}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`-- Files are identified by stable, cheap-to-query properties
CREATE TABLE files (
id INTEGER PRIMARY KEY,
path TEXT NOT NULL,
size_bytes INTEGER NOT NULL,
mtime_unix INTEGER NOT NULL,
UNIQUE(path, size_bytes, mtime_unix)
);


-- Each hash algorithm is explicitly versioned
CREATE TABLE hash_methods (
id INTEGER PRIMARY KEY,
name TEXT NOT NULL,
version INTEGER NOT NULL,
UNIQUE(name, version)
);


-- Computed hashes link files to hash methods
CREATE TABLE hashes (
file_id INTEGER NOT NULL,
hash_method_id INTEGER NOT NULL,
value BLOB NOT NULL,
computed_at INTEGER NOT NULL,
PRIMARY KEY (file_id, hash_method_id),
FOREIGN KEY (file_id) REFERENCES files(id),
FOREIGN KEY (hash_method_id) REFERENCES hash_methods(id)
);`}),e.jsx("p",{className:"mb-6",children:"I also enabled:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"WAL mode"}),e.jsx("li",{children:"Foreign keys"}),e.jsx("li",{children:"Transactional writes"})]}),e.jsx("p",{className:"mb-8",children:"This keeps the cache fast and resilient."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"Versioned hash methods"}),e.jsx("p",{className:"mb-8",children:"One subtle but important decision: hash methods are versioned. If I tweak an algorithm in the future, I don’t want to silently reuse incompatible results. Cached entries are only valid if versions match."}),e.jsx("p",{className:"mb-8",children:"This lets the system evolve without breaking trust in the data."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"Runtime configurability"}),e.jsx("p",{className:"mb-6",children:"With the cache and pipeline in place, I added a simple UI layer:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Users can enable or disable hash methods"}),e.jsx("li",{children:"The UI reflects whatever hashes are registered at runtime"}),e.jsx("li",{children:"No hardcoded assumptions in the interface"})]}),e.jsx("img",{src:"/images/hash-settings-dialog.png",alt:"Settings dialog showing configurable hash methods",className:"rounded-lg shadow-lg mb-10 w-full object-contain"}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"Reflections"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Designing the cache before optimising paid off"}),e.jsx("li",{children:"Treating cached results as first-class pipeline outputs simplified everything"}),e.jsx("li",{children:"Versioning early avoids painful migrations later"})]}),e.jsx("p",{className:"mb-8",children:"There’s still plenty to improve — grouping duplicates, similarity thresholds, and better reporting — but the foundation now feels solid."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"What’s next"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Grouping visually similar images"}),e.jsx("li",{children:"Surfacing likely duplicates"}),e.jsx("li",{children:"Helping decide what to keep, archive, or delete"})]}),e.jsx("p",{className:"mb-8",children:"That’s where this stops being a technical exercise and starts solving the original problem."})]})}export{i as default};
