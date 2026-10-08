import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import CVViewer from './components/CVViewer';
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

function RouteLanguageSync() {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const routeLanguage = location.pathname === '/de' || location.pathname.startsWith('/de/') ? 'de' : 'en';
    if (!i18n.language.startsWith(routeLanguage)) i18n.changeLanguage(routeLanguage);
  }, [i18n, location.pathname]);

  return null;
}

function LazyLoader() {
  return <div className="route-loader" aria-live="polite">Loading…</div>;
}

const routeDefinitions = (prefix = '') => (
  <>
    <Route path={`${prefix}/`} element={<Home />} />
    <Route path={`${prefix}/projects`} element={<Projects />} />
    <Route path={`${prefix}/about`} element={<About />} />
    <Route path={`${prefix}/contact`} element={<Contact />} />
    <Route path={`${prefix}/cv`} element={<><Home /><CVViewer /></>} />
    <Route path={`${prefix}/projects/:projectId`} element={<ProjectDetail />} />
    <Route path={`${prefix}/kumiko`} element={<Kumiko />} />
    <Route path={`${prefix}/keyboard`} element={<Keyboard />} />
    <Route path={`${prefix}/climbing`} element={<Climbing />} />
    <Route path={`${prefix}/dev-blog`} element={<DevBlogIndex posts={posts} />} />
    <Route path={`${prefix}/dev-blog/:id`} element={<BlogPost posts={posts} />} />
  </>
);

function App() {
  return (
    <div className="site-shell">
      <RouteLanguageSync />
      <Navbar />
      <ErrorBoundary>
        <Suspense fallback={<LazyLoader />}>
          <Routes>
            {routeDefinitions('')}
            {routeDefinitions('/de')}
            <Route path="/lonelydev/" element={<Home />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default App;
