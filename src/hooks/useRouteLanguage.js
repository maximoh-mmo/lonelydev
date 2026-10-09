import { useLocation } from 'react-router-dom';

export default function useRouteLanguage() {
  const { pathname } = useLocation();
  const language = pathname === '/de' || pathname.startsWith('/de/') ? 'de' : 'en';
  return { language, prefix: language === 'de' ? '/de' : '' };
}
