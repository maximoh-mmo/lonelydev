import { Link } from 'react-router-dom';

export default function ProjectCard({ title, description, imageUrl, link }) {
    const isAbsoluteUrl = /^(https?:)?\/\//.test(imageUrl);
    const fullImageUrl = isAbsoluteUrl
      ? imageUrl
      : `${import.meta.env.BASE_URL}${imageUrl.replace(/^\/+/, '')}`;

    return (
      <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition">
        <img
          src={fullImageUrl}
          alt={title}
          className="w-full h-48 object-cover"
        />
        <div className="p-4">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <p className="text-gray-600 mt-2 text-sm">{description}</p>
            {link.startsWith('http') ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-blue-600 hover:underline"
              >
                View Project →
              </a>
            ) : (
              <Link
                to={link}
                className="inline-block mt-4 text-blue-600 hover:underline"
              >
                View Project →
              </Link>
            )}
        </div>
      </div>
    );
  }
  