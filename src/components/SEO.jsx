import { Helmet } from 'react-helmet-async';
import useRouteLanguage from '../hooks/useRouteLanguage';

export default function SEO({ title, description, image, url, noindex = false, localized = true }) {
  const { language } = useRouteLanguage();
  const siteTitle = 'Max Heinze - Game Programmer';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;

  const defaultDescription = "Portfolio of Max Heinze, a specialized Game Programmer. Explore his projects, development blog, and experiences in software engineering and game development.";
  const metaDescription = description || defaultDescription;

  const defaultImage = "https://maxheinze.com/social-preview.png";
  const metaImage = image || defaultImage;

  const defaultUrl = "https://maxheinze.com";
  const metaUrl = url ? `${defaultUrl}${url}` : defaultUrl;
  const routePath = url || '/';
  const englishPath = routePath.replace(/^\/de(?=\/|$)/, '') || '/';
  const germanPath = `/de${englishPath === '/' ? '' : englishPath}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Max Heinze",
    "url": defaultUrl,
    "jobTitle": "Game Programmer",
    "description": metaDescription,
    "sameAs": [
      "https://github.com/maximoh-mmo",
      "https://linkedin.com/in/maxheinze"
    ]
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:type" content="website" />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:locale" content={language === 'de' ? 'de_DE' : 'en_US'} />
      <meta property="og:locale:alternate" content={language === 'de' ? 'en_US' : 'de_DE'} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={metaUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      <link rel="canonical" href={metaUrl} />
      {!noindex && localized && <link rel="alternate" hrefLang="en" href={`${defaultUrl}${englishPath}`} />}
      {!noindex && localized && <link rel="alternate" hrefLang="de" href={`${defaultUrl}${germanPath}`} />}
      {!noindex && localized && <link rel="alternate" hrefLang="x-default" href={`${defaultUrl}${englishPath}`} />}

      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}
