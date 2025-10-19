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
          </Routes>
        </main>
      </div>
  );
}

export default App;
