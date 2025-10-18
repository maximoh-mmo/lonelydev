import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <span className="text-xl font-bold text-gray-800">Max Heinze</span>
        <ul className="hidden md:flex gap-6 text-gray-700 font-medium">
          <li><Link to="/" className="hover:text-blue-600 transition">Home</Link></li>
          <li><Link to="/projects" className="hover:text-blue-600 transition">Projects</Link></li>
          <li><Link to="/about" className="hover:text-blue-600 transition">About</Link></li>
          <li><Link to="/contact" className="hover:text-blue-600 transition">Contact</Link></li>
        </ul>

        <button
          className="md:hidden text-gray-700 focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
           {isOpen ? (
             <X className="w-6 h-6" />
           ) : (
             <Menu className="w-6 h-6" />
           )}
        </button>
      </div>

      {isOpen && (
        <ul className="md:hidden bg-white px-4 pb-4 space-y-2 shadow-md">
          <li><Link to="/" className="block py-2 text-gray-700 hover:text-blue-600">Home</Link></li>
          <li><Link to="/projects" className="block py-2 text-gray-700 hover:text-blue-600">Projects</Link></li>
          <li><Link to="/about" className="block py-2 text-gray-700 hover:text-blue-600">About</Link></li>
          <li><Link to="/contact" className="block py-2 text-gray-700 hover:text-blue-600">Contact</Link></li>
        </ul>
      )}
    </nav>
  );
}