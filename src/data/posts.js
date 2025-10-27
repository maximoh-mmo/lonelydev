export const posts = [
  {
    id: 'labyrinth',
    title: '🌀 Building a Living Labyrinth',
    date: '2025-10-27',
    summary: 'Exploring procedural mazes inspired by Verrückte Labyrinth in Unity.',
    category: 'Game Dev',
    component: () => import('../pages/dev-blog/Labyrinth.jsx'),
  },
  {
    id: 'labyrinth2',
    title: '🌀 Building a Living Labyrinth 2',
    date: '2025-10-27',
    summary: 'Designing a Dynamic Maze Tile System in Unity.',
    category: 'Game Dev',
    component: () => import('../pages/dev-blog/Labyrinth2.jsx'),
  },
];