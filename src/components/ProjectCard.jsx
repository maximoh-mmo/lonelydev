import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ProjectCard({ title, description, imageUrl, link }) {
  const { t } = useTranslation();
  const isAbsoluteUrl = /^(https?:)?\/\//.test(imageUrl);
  const fullImageUrl = isAbsoluteUrl
    ? imageUrl
    : `${import.meta.env.BASE_URL}${imageUrl.replace(/^\/+/, '')}`;

  const isExternal = link.startsWith('http');
  const CardWrapper = isExternal ? 'a' : Link;
  const wrapperProps = isExternal 
    ? { href: link, target: "_blank", rel: "noopener noreferrer" }
    : { to: link };

  return (
    <CardWrapper 
      {...wrapperProps}
      className="group block bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
    >
      <div className="relative overflow-hidden">
        <img 
          src={fullImageUrl} 
          alt={title} 
          className="w-full h-48 object-cover" 
        />
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
      </div>
      
      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-gray-600 mt-2 text-sm">
          {description}
        </p>
        
        <div className="mt-4">
          <span className="inline-block text-blue-700 font-bold border-b-2 border-transparent transition-all duration-300 group-hover:text-blue-900 group-hover:border-blue-700 group-hover:scale-[1.02]">
            {t('projects.viewProject')} →
          </span>
        </div>
      </div>
    </CardWrapper>
  );
}
  