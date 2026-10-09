import { Link } from 'react-router-dom';

export default function TextLink({ to, href, children, className = "" }) {
  const baseClass = "inline-link";
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
