import { useCallback, useEffect, useRef } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useRouteLanguage from '../hooks/useRouteLanguage';
import SEO from './SEO';

const cvPath = '/CV_Max_Heinze.pdf';
export default function CVViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { prefix } = useRouteLanguage();
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const openerId = useRef(location.state?.cvOpenerId);
  const close = useCallback(() => {
    // An external browser history entry is not an in-site return destination.
    if (location.state?.cvReturnTo) navigate(-1);
    else navigate(prefix || '/', { replace: true });
  }, [navigate, prefix, location.state]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const returnFocusId = openerId.current;
    document.body.classList.add('cv-is-open');
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog.close();
      document.body.classList.remove('cv-is-open');
      requestAnimationFrame(() => {
        const visible = element => element?.isConnected && element.getClientRects().length > 0;
        const restoredOpener = document.getElementById(returnFocusId);
        const target = visible(restoredOpener) ? restoredOpener : visible(opener) && opener !== document.body ? opener
          : Array.from(document.querySelectorAll('[data-cv-link], .site-nav__menu')).find(visible);
        target?.focus();
      });
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="cv-viewer" aria-labelledby="cv-title" onCancel={event => { event.preventDefault(); close(); }}>
      <SEO title={t('nav.cv')} url={prefix + '/cv'} />
      <div className="cv-viewer__toolbar">
        <h1 id="cv-title">{t('cv.viewerTitle')}</h1>
        <div>
          <a className="cv-viewer__button" href={cvPath} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />{t('ui.openPDF')}<span className="sr-only"> {t('ui.newTab')}</span></a>
          <a className="cv-viewer__button" href={cvPath} download="Max_Heinze_CV.pdf"><Download aria-hidden="true" />{t('cv.download')}</a>
          <button ref={closeRef} className="cv-viewer__button" type="button" onClick={close} autoFocus><X aria-hidden="true" />{t('cv.close')}</button>
        </div>
      </div>
      <p className="cv-viewer__hint">{t('ui.pdfFallback')}</p>
      <iframe className="cv-viewer__document" src={cvPath + '#view=FitH'} title={t('cv.viewerTitle')} />
    </dialog>
  );
}
