const allPosts = [
  { id: 'photoboss12', date: '2026-05-01', status: 'draft' },
  { id: 'photoboss11', date: '2026-04-24', status: 'published' },
  { id: 'photoboss10', date: '2026-04-22', status: 'published' },
  { id: 'photoboss9', date: '2026-04-17', status: 'published' },
  { id: 'photoboss8', date: '2026-02-17', status: 'published' },
  { id: 'photoboss7', date: '2026-01-27', status: 'published' },
  { id: 'photoboss6', date: '2026-01-21', status: 'published' },
  { id: 'photoboss5', date: '2026-01-07', status: 'published' },
  { id: 'photoboss4', date: '2025-12-24', status: 'published' },
  { id: 'photoboss3', date: '2025-12-10', status: 'published' },
  { id: 'photoboss2', date: '2025-11-26', status: 'published' },
  { id: 'photoboss1', date: '2025-11-12', status: 'published' },
  { id: 'labyrinth5', date: '2025-11-14', status: 'published' },
  { id: 'labyrinth4', date: '2025-10-29', status: 'published' },
  { id: 'labyrinth3', date: '2025-10-28', status: 'published' },
  { id: 'labyrinth2', date: '2025-10-27', status: 'published' },
  { id: 'labyrinth1', date: '2025-10-27', status: 'published' },
];

export const posts = allPosts.filter(post => {
  if (post.status === 'draft') return false;
  const referenceDate = new Date().toISOString().split('T')[0];
  if (post.date > referenceDate) return false;
  return true;
});