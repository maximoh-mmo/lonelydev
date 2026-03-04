import { Link } from 'react-router-dom';

export default function TextLink({ to, href, children, className = "" }) {
  const baseClass = "inline-block text-blue-700 hover:text-blue-900 font-bold border-b-2 border-transparent hover:border-blue-700 transition-all duration-300 hover:scale-[1.02]";
  const combinedClass = `${baseClass} ${className}`.trim();

  if (href) {
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={combinedClass}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={combinedClass}>
      {children}
    </Link>
  );
}
