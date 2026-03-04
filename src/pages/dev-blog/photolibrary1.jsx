import { useTranslation, Trans } from 'react-i18next';

export default function PhotoLibrary1() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('blog.posts.photoboss1.page.title')}
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">
        {t('blog.posts.photoboss1.page.postedOn', { date: '2025-11-12' })}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss1.page.sec1Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss1.page.sec1Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss1.page.sec1Para2')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss1.page.sec1Para3"
          components={{
            code1: <code />,
            code2: <code />,
          }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed font-semibold">
        {t('blog.posts.photoboss1.page.sec1Para4')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss1.page.sec2Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss1.page.sec2Para1"
          components={{ em: <em /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss1.page.sec2Para2"
          components={{ strong: <strong /> }}
        />
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>
          <Trans
            i18nKey="blog.posts.photoboss1.page.sec2List1"
            components={{ strong: <strong /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="blog.posts.photoboss1.page.sec2List2"
            components={{ strong: <strong /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="blog.posts.photoboss1.page.sec2List3"
            components={{ strong: <strong /> }}
          />
        </li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss1.page.sec2Para3"
          components={{
            em: <em />,
            code1: <code />,
            code2: <code />,
            em2: <em />,
          }}
        />
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss1.page.sec3Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss1.page.sec3Para1"
          components={{ strong: <strong /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss1.page.sec3Para2')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss1.page.sec4Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss1.page.sec4Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss1.page.sec4Para2')}
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/photo-library-sprawl.png"
        alt={t('blog.posts.photoboss1.page.imgAlt')}
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
