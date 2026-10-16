export default {
  id: 'photoboss',
  title: 'PhotoBoss',
  imageUrl: '/images/photoboss/dark_mode_preview.webp',
  shortDescription: 'A local-first C++ and Qt workflow for finding, reviewing, and resolving duplicate image groups at scale.',
  description: 'PhotoBoss is a local-first desktop tool built with C++, Qt, and SQLite. It scans image libraries, builds comparable file identities, groups likely duplicates, and supports a deliberate review workflow before any destructive choice is made. Its published build log records the architecture, performance work, UI refactors, and platform-specific decisions across the project.',
  contributions: [
    ['Concurrent scan pipeline', 'Separated discovery, metadata extraction, hashing, caching, grouping, and UI updates into explicit stages that can report progress and stop cleanly.'],
    ['Local data and caching', 'Used SQLite-backed local storage and stable file identities to avoid repeating expensive work while keeping the workflow private and local-first.'],
    ['Review-oriented interface', 'Designed the interface around comparison and informed selection, including progressive status, thumbnail delivery, and controls that remain safe while scans are active.'],
    ['Cross-platform engineering', 'Implemented platform-aware storage detection and performance profiles while keeping the main pipeline and application architecture shared.']
  ],
  reflections: 'The 26-part build log is the primary evidence for the project, showing how implementation decisions changed through real use, profiling, and refactoring.',
  tech: ['C++', 'Qt', 'SQLite', 'Concurrency', 'Local-first'],
  blogProject: 'PhotoBoss',
  featured: true
};
