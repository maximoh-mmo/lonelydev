import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar'; // adjust if needed
import Home from './pages/Home';
import Projects from './pages/Projects';
import About from './pages/About';
import Contact from './pages/Contact';
import ProjectDetail from './pages/ProjectDetail';
import Kumiko from './pages/Kumiko';
import Keyboard from './pages/Keyboard';
import Climbing from './pages/Climbing';
import DevBlogIndex from './pages/dev-blog/index';
import { posts } from './data/posts';

function App() {
  return (
      <div className="bg-gray-100 min-h-screen">
        <Navbar />
        <main className="max-w-4xl mx-auto p-6 text-center mt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lonelydev/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/kumiko" element={<Kumiko />} />
            <Route path="/keyboard" element={<Keyboard />} />
            <Route path="/climbing" element={<Climbing />} />
            <Route path="/dev-blog" element={<DevBlogIndex />} />
            {/* Dynamically generate routes for each post */}
            {posts.map((post) => (
              <Route
                key={post.id}
                path={`/dev-blog/${post.id}`}
                element={
                  <AsyncComponent loader={post.component} />
                }
              />
            ))}
          </Routes>
        </main>
      </div>
  );
}
// Helper for lazy-loaded components
import { lazy, Suspense } from 'react';

function AsyncComponent({ loader }) {
  const Component = lazy(loader);
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <Component />
    </Suspense>
  );
}
export default App;
