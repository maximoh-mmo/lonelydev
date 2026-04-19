import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { posts } from './data/posts';

const Home = lazy(() => import('./pages/Home'));
const Projects = lazy(() => import('./pages/Projects'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Kumiko = lazy(() => import('./pages/Kumiko'));
const Keyboard = lazy(() => import('./pages/Keyboard'));
const Climbing = lazy(() => import('./pages/Climbing'));
const DevBlogIndex = lazy(() => import('./pages/dev-blog/index'));
const BlogPost = lazy(() => import('./pages/dev-blog/BlogPost'));

// Only load admin in development mode
let AdminPage;
if (process.env.NODE_ENV === 'development') {
  AdminPage = lazy(() => import('../admin/pages/Admin'));
}

function LazyLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
  );
}

function App() {
  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6 text-center mt-20">
        <ErrorBoundary>
          <Suspense fallback={<LazyLoader />}>
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
              <Route path="/dev-blog" element={<DevBlogIndex posts={posts} />} />
              <Route path="/dev-blog/:id" element={<BlogPost posts={posts} />} />
              {process.env.NODE_ENV === 'development' && (
                <Route path="/admin" element={<AdminPage />} />
              )}
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;