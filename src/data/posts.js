const allPosts = [
  {
    id: 'photoboss9',
    title: '📸 Engineering Diary: Building a High-Performance Image Pipeline in PhotoBoss',
    seoTitle: 'High-Performance Image Decoding and UI Batching in Qt',
    date: '2026-04-17',
    category: 'Software Engineering',
    summary:
      'Refactoring the thumbnail system into a formal pipeline stage with Direct-to-Size decoding, smooth lerped progress reporting, and race-condition-safe UI batching.',
    project: 'PhotoBoss',
    tags: ['C++', 'Qt', 'Performance', 'Architecture', 'UX'],
  },
  {
    id: 'photoboss8',
    title: '📸 Finding the Needle in the Haystack: Similarity Search & Grouping',
    seoTitle: 'Similarity Search & Grouping for Exact Image Deduplication',
    date: '2026-02-17',
    category: 'Software Engineering',
    summary:
      'Implementing a similarity engine with weighted scoring (pHash, dHash, aHash) to group near-duplicate images, and refactoring the pipeline for pragmatism.',
    project: 'PhotoBoss',
    tags: ['C++', 'Qt', 'Similarity Search', 'Algorithms', 'Refactoring'],
  },
  {
    id: 'photoboss7',
    title: '📸 Short-Circuiting Work: Introducing a Persistent Hash Cache',
    seoTitle: 'Persistent Hash Caching with SQLite for Pipeline Optimization',
    date: '2026-01-27',
    summary: 'Adding a versioned, persistent hash cache to avoid recomputing expensive perceptual hashes. This entry covers file identity, cache-first pipeline design, SQLite persistence, and how treating cached results as first-class pipeline outputs dramatically reduces unnecessary work.',
    category: 'Software Engineering',
    project: 'PhotoBoss',
    tags: ['C++', 'SQLite', 'Optimization', 'Caching', 'Systems Design'],
  },
  {
    id: 'photoboss6',
    title: '📸 Designing a Persistent Hash Cache with SQLite',
    seoTitle: 'Designing a SQLite Persistent Hash Cache in C++',
    date: '2026-01-21',
    summary: 'Building a first-class cache stage using SQLite: identifying files, storing multiple hash algorithms, and injecting results back into the pipeline to skip redundant work.',
    category: 'Software Engineering',
    project: 'PhotoBoss',
    tags: ['C++', 'SQLite', 'Database Design', 'Schema Versioning'],
  },
  {
    id: 'photoboss5',
    title: '📸 The Realisation: Recomputing Everything Is Wasteful',
    seoTitle: 'Optimizing Image Hashing Pipelines with Caching',
    date: '2026-01-07',
    summary: 'Identifying the inefficiency of recomputing hashes for unchanged files, and defining caching requirements for persistence, invalidation, and multiple hash algorithms.',
    category: 'Software Engineering',
    project: 'PhotoBoss',
    tags: ['System Analysis', 'Performance', 'Caching'],
  },
  {
    id: 'photoboss4',
    title: '📸 Hashing Images: More Than Just Checksums',
    seoTitle: 'Multithreaded Perceptual and Cryptographic Image Hashing in C++',
    date: '2025-12-24',
    summary: 'Implementing both cryptographic and perceptual image hashing, separating IO, decoding, and computation into pipeline stages with worker pools for performance.',
    category: 'Software Engineering',
    project: 'PhotoBoss',
    tags: ['C++', 'Multithreading', 'Hashing', 'Cryptography'],
  },
  {
    id: 'photoboss3',
    title: '📸 Learning Qt by Building: Threads, Signals, and Ownership',
    seoTitle: 'Qt Concurrency: Threads, Signals, and Object Ownership',
    date: '2025-12-10',
    summary: 'A deep dive into Qt threading, signals/slots, and object ownership while building a responsive photo processing pipeline — including early mistakes and lessons learned.',
    category: 'Software Engineering',
    project: 'PhotoBoss',
    tags: ['C++', 'Qt', 'Concurrency', 'Signals & Slots'],
  },
  {
    id: 'photoboss2',
    title: '📸 From Idea to Architecture: Designing a Scalable Image Processing Pipeline',
    seoTitle: 'Scalable Image Processing Pipeline Architecture in C++',
    date: '2025-11-26',
    summary: 'How I modeled a messy photo library as a parallel pipeline of scanning, decoding, hashing, and aggregation — enabling scalable and responsive image processing.',
    category: 'Software Engineering',
    project: 'PhotoBoss',
    tags: ['System Architecture', 'Pipeline Pattern', 'Scalability'],
  },
  {
    id: 'photoboss1',
    title: '📸 The Problem Nobody Talks About: Photo Libraries at Scale',
    seoTitle: 'Managing Multi-Year Photo Libraries at Scale',
    date: '2025-11-12',
    summary: 'Exploring the hidden chaos of multi-year photo libraries — exact duplicates, resized copies, messaging exports — and why typical deduplication tools fail.',
    category: 'Software Engineering',
    project: 'PhotoBoss',
    tags: ['Problem Solving', 'Requirements Analysis'],
  },
  {
    id: 'labyrinth5',
    title: '🧠 Building a Real Constraint Solver for the Labyrinth.',
    seoTitle: 'Building a Constraint Solver for Procedural Generation in Unity',
    date: '2025-11-14',
    summary: 'Building a proper constraint-based reasoning system for the labyrinth generator — introducing a unified validation pipeline, tile feasibility evaluation, and the foundations of a real constraint solver.',
    category: 'Game Dev',
    project: 'Labyrinth',
    tags: ['Unity', 'C#', 'Constraint Solver', 'Algorithms'],
  },
  {
    id: 'labyrinth4',
    title: '🧠 From Random Chaos to Structured Generation',
    seoTitle: 'Rule-Driven Procedural Labyrinth Generation in C#',
    date: '2025-10-29',
    summary: 'Refactoring the labyrinth generator into a modular, rule-driven system built on constraints.',
    category: 'Game Dev',
    project: 'Labyrinth',
    tags: ['C#', 'Architecture', 'Refactoring', 'Design Patterns'],
  },
  {
    id: 'labyrinth3',
    title: '🌀 Making the Labyrinth Shift!',
    seoTitle: 'Animating Tile Movement and Grid Shifting in Unity',
    date: '2025-10-28',
    summary: 'Animating tile movement and grid shifting in Unity — bringing the Labyrinth to life with smooth transitions and interactive mechanics.',
    category: 'Game Dev',
    project: 'Labyrinth',
    tags: ['Unity', 'Input System', 'Animation', 'Coroutines'],
  },
  {
    id: 'labyrinth2',
    title: '🌀 Designing a Dynamic Maze Tile System',
    seoTitle: 'Designing a Dynamic Procedural Maze Tile System in Unity',
    date: '2025-10-27',
    summary: 'Creating the core tile types, rotations, and grid structure for a procedural Labyrinth in Unity.',
    category: 'Game Dev',
    project: 'Labyrinth',
    tags: ['Unity', 'ScriptableObjects', 'Bit Manipulation', 'C#'],
  },
  {
    id: 'labyrinth',
    title: '🌀 Building a Living Labyrinth',
    seoTitle: 'Procedural Maze Generation in Unity',
    date: '2025-10-27',
    summary: 'Exploring procedural maze generation inspired by Verrückte Labyrinth and turning board game mechanics into a Unity project.',
    category: 'Game Dev',
    project: 'Labyrinth',
    tags: ['Unity', 'Game Design', 'Procedural Generation'],
  },
  {
    id: 'scheduled-post-test',
    title: '🚀 Future Feature: Something Amazing',
    date: '2026-12-25',
    category: 'Software Engineering',
    summary: 'This post is from the future and should only be visible in development mode.',
    project: 'PhotoBoss',
    tags: ['Future', 'Test'],
  },
  {
    id: 'draft-post-test',
    title: '📝 Work in Progress',
    date: '2026-04-18',
    status: 'draft',
    category: 'Software Engineering',
    summary: 'This is a draft and should only be visible in development mode.',
    project: 'PhotoBoss',
    tags: ['Draft', 'Test'],
  },
];

// Check for markdown files to determine which posts are available
const markdownModules = import.meta.glob('../../content/blog/*.md', { query: '?raw' });

// Filter posts to only include those that have markdown content
export const posts = allPosts.filter(post => {
  // Always show all posts in development mode
  if (import.meta.env.DEV) return true;
  
  // Hide drafts in production
  if (post.status === 'draft') return false;
  
  // Hide future posts in production
  const referenceDate = typeof __BUILD_DATE__ !== 'undefined' 
    ? __BUILD_DATE__ 
    : new Date().toISOString().split('T')[0];
  if (post.date > referenceDate) return false;
  
  // Only show posts that have markdown content
  const enPath = `../../content/blog/${post.id}.en.md`;
  const dePath = `../../content/blog/${post.id}.de.md`;
  return markdownModules[enPath] || markdownModules[dePath];
});