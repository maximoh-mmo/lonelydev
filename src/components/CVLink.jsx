import { Link, useLocation } from 'react-router-dom';
import useRouteLanguage from '../hooks/useRouteLanguage';

export default function CVLink({ children, ...props }) {
  const location = useLocation();
  const { prefix } = useRouteLanguage();
  return <Link {...props} data-cv-link to={prefix + '/cv'} state={{ cvOpenerId: props.id, cvReturnTo: location.pathname + location.search + location.hash }}>{children}</Link>;
}
