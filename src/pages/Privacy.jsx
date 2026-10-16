import SEO from '../components/SEO';
import useRouteLanguage from '../hooks/useRouteLanguage';

const Address = () => <><br />Max Heinze<br />Drevesstraße 25<br />14473 Potsdam<br />Deutschland</>;

export default function Privacy() {
  const { language, prefix } = useRouteLanguage();
  const german = language === 'de';

  return (
    <main className="page article-page">
      <SEO title={german ? 'Datenschutzerklärung' : 'Privacy notice'} description={german ? 'Datenschutzerklärung für maxheinze.com.' : 'Privacy information for maxheinze.com.'} url={prefix + '/privacy'} />
      <header className="page-header">
        <p className="eyebrow">{german ? 'Datenschutz' : 'Privacy'}</p>
        <h1>{german ? 'Datenschutzerklärung' : 'Privacy notice'}</h1>
        <p className="page-lead">{german ? 'Informationen darüber, welche Daten beim Besuch dieser Website verarbeitet werden.' : 'Information about the data processed when you visit this website.'}</p>
      </header>
      <div className="prose">
        <h2>{german ? '1. Verantwortlicher' : '1. Data controller'}</h2>
        <p>{german ? 'Verantwortlich für die Datenverarbeitung auf dieser Website ist:' : 'The controller responsible for processing personal data on this website is:'}<Address /><br />E-Mail: <a href="mailto:maxheinze@gmail.com">maxheinze@gmail.com</a></p>
        <h2>{german ? '2. Hosting und Server-Protokolle' : '2. Hosting and server logs'}</h2>
        <p>{german ? 'Diese Website wird über Cloudflare Pages bereitgestellt. Beim Aufruf der Website verarbeitet Cloudflare technisch erforderliche Verbindungsdaten. Dazu können insbesondere IP-Adresse, Datum und Uhrzeit des Zugriffs, aufgerufene URL, Referrer, Browser- und Betriebssysteminformationen gehören. Die Verarbeitung ist erforderlich, um die Website sicher und zuverlässig auszuliefern.' : 'This website is delivered through Cloudflare Pages. When the site is accessed, Cloudflare processes connection data needed to provide the service. This may include the IP address, access date and time, requested URL, referrer, and browser and operating-system information. This processing is necessary to deliver the website securely and reliably.'}</p>
        <p>{german ? 'Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt im sicheren, stabilen und effizienten Betrieb dieser Website.' : 'The legal basis is Article 6(1)(f) GDPR. The legitimate interest is the secure, stable and efficient operation of this website.'}</p>
        <p>{german ? 'Weitere Informationen finden Sie in der ' : 'Further information is available in the '}<a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">{german ? 'Datenschutzerklärung von Cloudflare' : 'Cloudflare Privacy Policy'}</a>.</p>
        <h2>{german ? '3. Lokale Einstellungen' : '3. Local preferences'}</h2>
        <p>{german ? 'Die Website speichert Ihre Auswahl für das Farbschema im lokalen Speicher Ihres Browsers. Diese Information bleibt auf Ihrem Gerät und wird nicht an den Betreiber übertragen. Sie können sie jederzeit über die Website-Einstellungen ändern oder über die Browser-Einstellungen löschen.' : 'The site stores your colour-theme preference in your browser’s local storage. This information remains on your device and is not sent to the site operator. You can change it through the site controls or remove it in your browser settings.'}</p>
        <h2>{german ? '4. Eingebettete Videos' : '4. Embedded videos'}</h2>
        <p>{german ? 'Einige Projektseiten können Videos von YouTube im erweiterten Datenschutzmodus einbinden. Eine Verbindung zu YouTube wird erst hergestellt, nachdem Sie die Wiedergabe ausdrücklich starten. Ab diesem Zeitpunkt kann YouTube Verbindungs- und Nutzungsdaten verarbeiten. Anbieter ist Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.' : 'Some project pages can embed YouTube videos using privacy-enhanced mode. A connection to YouTube is made only after you explicitly start playback. From that point, YouTube may process connection and usage data. The provider is Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland.'}</p>
        <h2>{german ? '5. Externe Links' : '5. External links'}</h2>
        <p>{german ? 'Diese Website enthält Links zu externen Angeboten, etwa GitHub, LinkedIn, Discord und Itch.io. Daten werden an diese Anbieter erst übertragen, wenn Sie einem solchen Link folgen. Für die Datenverarbeitung auf den Zielseiten gelten deren jeweilige Datenschutzerklärungen.' : 'This website links to external services including GitHub, LinkedIn, Discord and Itch.io. Data is transferred to those providers only when you follow such a link. Their own privacy notices apply on the destination sites.'}</p>
        <h2>{german ? '6. Ihre Rechte' : '6. Your rights'}</h2>
        <p>{german ? 'Sie haben im Rahmen der gesetzlichen Voraussetzungen insbesondere das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren.' : 'Subject to the applicable legal requirements, you have rights including access, rectification, erasure, restriction of processing, data portability and objection. You may also lodge a complaint with a data-protection supervisory authority.'}</p>
        <p><small>{german ? 'Stand: 16. Oktober 2026' : 'Last updated: 16 October 2026'}</small></p>
      </div>
    </main>
  );
}
