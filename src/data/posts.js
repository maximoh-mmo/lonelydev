export const posts = [
  {
    id: 'labyrinth3',
    title: '🌀 Making the Labyrinth Shift!',
    date: '2025-10-28',
    summary: 'Animating tile movement and grid shifting in Unity — bringing the Labyrinth to life with smooth transitions and interactive mechanics.',
    category: 'Game Dev',
    component: () => import('../pages/dev-blog/Labyrinth3.jsx'),
  },
  {
    id: 'labyrinth2',
    title: '🌀 Designing a Dynamic Maze Tile System',
    date: '2025-10-27',
    summary: 'Creating the core tile types, rotations, and grid structure for a procedural Labyrinth in Unity.',
    category: 'Game Dev',
    component: () => import('../pages/dev-blog/Labyrinth2.jsx'),
  },
  {
    id: 'labyrinth',
    title: '🌀 Building a Living Labyrinth',
    date: '2025-10-27',
    summary: 'Exploring procedural maze generation inspired by Verrückte Labyrinth and turning board game mechanics into a Unity project.',
    category: 'Game Dev',
    component: () => import('../pages/dev-blog/Labyrinth.jsx'),
  },
];