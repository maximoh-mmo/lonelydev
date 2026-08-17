const allPosts = [
  { id: 'onset19', date: '2026-10-19', status: 'scheduled' },
  { id: 'onset18', date: '2026-10-16', status: 'scheduled' },
  { id: 'onset17', date: '2026-10-12', status: 'scheduled' },
  { id: 'onset16', date: '2026-10-09', status: 'scheduled' },
  { id: 'onset15', date: '2026-10-05', status: 'scheduled' },
  { id: 'onset14', date: '2026-10-02', status: 'scheduled' },
  { id: 'onset13', date: '2026-09-28', status: 'scheduled' },
  { id: 'onset12', date: '2026-09-25', status: 'scheduled' },
  { id: 'onset11', date: '2026-09-21', status: 'scheduled' },
  { id: 'onset10', date: '2026-09-18', status: 'scheduled' },
  { id: 'onset9', date: '2026-09-14', status: 'scheduled' },
  { id: 'onset8', date: '2026-09-11', status: 'scheduled' },
  { id: 'onset7', date: '2026-09-07', status: 'scheduled' },
  { id: 'onset6', date: '2026-09-04', status: 'scheduled' },
  { id: 'onset5', date: '2026-08-31', status: 'scheduled' },
  { id: 'onset4', date: '2026-08-28', status: 'scheduled' },
  { id: 'onset3', date: '2026-08-24', status: 'scheduled' },
  { id: 'onset2', date: '2026-08-21', status: 'scheduled' },
  { id: 'onset1', date: '2026-08-17', status: 'published' },
  { id: 'photoboss26', date: '2026-08-07', status: 'published' },
  { id: 'photoboss25', date: '2026-07-31', status: 'published' },
  { id: 'photoboss24', date: '2026-07-24', status: 'published' },
  { id: 'photoboss23', date: '2026-07-17', status: 'published' },
  { id: 'photoboss22', date: '2026-07-10', status: 'published' },
  { id: 'photoboss21', date: '2026-07-03', status: 'published' },
  { id: 'photoboss20', date: '2026-06-26', status: 'published' },
  { id: 'photoboss19', date: '2026-06-19', status: 'published' },
  { id: 'photoboss18', date: '2026-06-12', status: 'published' },
  { id: 'photoboss17', date: '2026-06-05', status: 'published' },
  { id: 'photoboss16', date: '2026-05-29', status: 'published' },
  { id: 'photoboss15', date: '2026-05-22', status: 'published' },
  { id: 'photoboss14', date: '2026-05-15', status: 'published' },
  { id: 'photoboss13', date: '2026-05-08', status: 'published' },
  { id: 'photoboss12', date: '2026-05-01', status: 'published' },
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
  // In development, show all posts, drafts and scheduled (future dates) as well
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  if (post.status === 'draft') return false;

  const referenceDate = new Date().toISOString().split('T')[0];
  if (post.date > referenceDate) return false;
  return true;
});