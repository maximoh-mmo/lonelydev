import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, image, url }) {
  const siteTitle = 'Max Heinze - Game Programmer';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  
  const defaultDescription = "Portfolio of Max Heinze, a specialized Game Programmer. Explore his projects, development blog, and experiences in software engineering and game development.";
  const metaDescription = description || defaultDescription;
  
  const defaultImage = "https://maxheinze.com/social-preview.png";
  const metaImage = image || defaultImage;
  
  const defaultUrl = "https://maxheinze.com";
  const metaUrl = url ? `${defaultUrl}${url}` : defaultUrl;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Max Heinze",
    "url": defaultUrl,
    "jobTitle": "Game Programmer",
    "description": metaDescription,
    "sameAs": [
      "https://github.com/maxheinze",
      "https://linkedin.com/in/maxheinze"
    ]
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="de_DE" />

      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={metaUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={metaDescription} />
      <meta property="twitter:image" content={metaImage} />
      
      <link rel="canonical" href={metaUrl} />
      
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}
