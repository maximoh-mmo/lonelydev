import { useCallback, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function CVViewer() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const close = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  }, [navigate]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') close();
    };
    document.body.classList.add('cv-is-open');
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.classList.remove('cv-is-open');
      window.removeEventListener('keydown', handleKey);
    };
  }, [close]);

  return (
    <div className="cv-viewer" role="dialog" aria-modal="true" aria-label={t('cv.viewerTitle')}>
      <div className="cv-viewer__toolbar">
        <span>{t('cv.viewerTitle')}</span>
        <div>
          <a className="cv-viewer__button" href="/CV_Max_Heinze.pdf" download>
            <Download aria-hidden="true" /> {t('cv.download')}
          </a>
          <button className="cv-viewer__button" type="button" onClick={close} autoFocus>
            <X aria-hidden="true" /> {t('cv.close')}
          </button>
        </div>
      </div>
      <iframe className="cv-viewer__document" src="/CV_Max_Heinze.pdf#view=FitH" title={t('cv.viewerTitle')} />
    </div>
  );
}
