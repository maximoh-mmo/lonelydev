import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import useRouteLanguage from '../hooks/useRouteLanguage';

export default function Impressum() {
  const { language, prefix } = useRouteLanguage();
  const german = language === 'de';

  return (
    <main className="page article-page">
      <SEO title={german ? 'Impressum' : 'Legal notice'} description={german ? 'Impressum und Anbieterkennzeichnung für maxheinze.com.' : 'Legal notice and provider information for maxheinze.com.'} url={prefix + '/impressum'} />
      <header className="page-header">
        <p className="eyebrow">{german ? 'Rechtliche Angaben' : 'Legal information'}</p>
        <h1>{german ? 'Impressum' : 'Legal notice'}</h1>
      </header>
      <div className="prose">
        <h2>{german ? 'Angaben gemäß § 5 DDG und § 18 MStV' : 'Provider information under § 5 DDG and § 18 MStV'}</h2>
        <p>Max Heinze<br />Drevesstraße 25<br />14473 Potsdam<br />Deutschland</p>
        <h2>{german ? 'Kontakt' : 'Contact'}</h2>
        <p>E-Mail: <a href="mailto:maxheinze@gmail.com">maxheinze@gmail.com</a></p>
        <h2>{german ? 'Verantwortlich für den Inhalt' : 'Responsible for editorial content'}</h2>
        <p>{german ? 'Verantwortlich gemäß § 18 Abs. 2 MStV:' : 'Responsible under § 18(2) MStV:'}<br />Max Heinze<br />Drevesstraße 25<br />14473 Potsdam</p>
        <h2>{german ? 'Datenschutz' : 'Privacy'}</h2>
        <p>{german ? 'Informationen zur Verarbeitung personenbezogener Daten finden Sie in der ' : 'Information about the processing of personal data is available in the '}<Link to={prefix + '/privacy'}>{german ? 'Datenschutzerklärung' : 'privacy notice'}</Link>.</p>
      </div>
    </main>
  );
}
