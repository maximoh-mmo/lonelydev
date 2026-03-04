import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const navLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.devBlog'), path: '/dev-blog' },
    { name: t('nav.projects'), path: '/projects' },
    { name: t('nav.about'), path: '/about' },
    { name: t('nav.contact'), path: '/contact' },
  ];

  const LanguageSwitcher = () => (
    <div className="flex items-center gap-2 ml-4 border-l pl-4 border-gray-200">
      <button
        onClick={() => changeLanguage('en')}
        className={`text-sm font-medium ${i18n.language === 'en' ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
      >
        EN
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => changeLanguage('de')}
        className={`text-sm font-medium ${i18n.language === 'de' ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
      >
        DE
      </button>
    </div>
  );

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-gray-800">Max Heinze</Link>
        
        <div className="hidden md:flex items-center">
          <ul className="flex gap-6 text-gray-700 font-medium">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link to={link.path} className="hover:text-blue-600 transition">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
          <LanguageSwitcher />
        </div>

        <div className="flex items-center md:hidden">
          <div className="mr-4">
             <button
              onClick={() => changeLanguage(i18n.language === 'en' ? 'de' : 'en')}
              className="p-2 text-gray-600 hover:text-blue-600 transition flex items-center gap-1"
            >
              <Globe className="w-5 h-5" />
              <span className="text-xs font-bold uppercase">{i18n.language.split('-')[0]}</span>
            </button>
          </div>
          <button
            className="text-gray-700 focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <ul className="md:hidden bg-white px-4 pb-4 space-y-2 shadow-md">
          {navLinks.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className="block py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}