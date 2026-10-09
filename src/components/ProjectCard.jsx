import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ProjectCard({ title, description, imageUrl, link, tech = [], index, featured }) {
  const { t } = useTranslation();
  return <Link to={link} className="project-row">
    <div className="project-row__image"><img src={imageUrl} alt="" loading="lazy" /></div>
    <div className="project-row__copy">
      <p className="eyebrow">{String(index).padStart(2, '0')} / {featured ? t('projects.active') : t('ui.selectedWork')}</p>
      <h2>{title}</h2><p>{description}</p><ul className="tags">{tech.map(value => <li key={value}>{value}</li>)}</ul>
      <span className="action-link">{t('projects.viewProject')}<ArrowUpRight aria-hidden="true" /></span>
    </div>
  </Link>;
}
