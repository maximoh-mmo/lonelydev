import{j as e}from"./index-CShOxQRm.js";function i(){return e.jsxs("main",{className:"max-w-3xl mx-auto px-6 py-12 text-gray-800",children:[e.jsx("h1",{className:"text-4xl font-bold mb-2",children:"Designing a Persistent Hash Cache with SQLite"}),e.jsx("p",{className:"text-gray-500 mb-8",children:"Posted on "}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"File Identity"}),e.jsx("p",{className:"mb-6",children:"A file is identified by:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Path"}),e.jsx("li",{children:"Size"}),e.jsx("li",{children:"Modification time"})]}),e.jsx("p",{className:"mb-8",children:"If all three match, the file is assumed unchanged."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"Schema Design"}),e.jsx("p",{className:"mb-6",children:"The database schema includes:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsxs("li",{children:[e.jsx("strong",{children:"files"})," — file identity and metadata"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"hash_methods"})," — algorithm name and version"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"hashes"})," — computed values"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"meta"})," — schema versioning"]})]}),e.jsx("p",{className:"mb-6",children:"This allows:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Safe upgrades"}),e.jsx("li",{children:"Algorithm invalidation"}),e.jsx("li",{children:"Fine-grained cache hits"})]}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"Cache as a Pipeline Stage"}),e.jsx("p",{className:"mb-6",children:"The cache isn’t a bolt-on optimisation — it’s a first-class pipeline stage."}),e.jsx("p",{className:"mb-6",children:"If all required hashes are present:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Disk IO is skipped"}),e.jsx("li",{children:"Decoding is skipped"}),e.jsx("li",{children:"Hashing is skipped entirely"})]}),e.jsx("p",{className:"mb-8",children:"Results are injected directly back into the pipeline."}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-10 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`// SQLite schema or cache lookup implementation

CREATE TABLE files (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  mtime INTEGER NOT NULL
);

CREATE TABLE hash_methods (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE hashes (
  file_id INTEGER NOT NULL,
  method_id INTEGER NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (file_id, method_id)
);`})]})}export{i as default};
