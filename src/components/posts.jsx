// src/data/posts.js
export const posts = [
  {
    id: 'labyrinth',
    title: 'Building a Living Labyrinth',
    date: '2025-27-10',
    summary: 'Procedural mazes inspired by Verrückte Labyrinth.',
    component: () => import('../pages/dev-blog/Labyrinth.jsx'),
  },
  // more posts...
];
