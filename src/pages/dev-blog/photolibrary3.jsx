import { useTranslation, Trans } from 'react-i18next';

export default function PhotoLibrary3() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('blog.posts.photoboss3.page.title')}
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">
        {t('blog.posts.photoboss3.page.postedOn', { date: '2025-12-10' })}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss3.page.sec1Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss3.page.sec1Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss3.page.sec1Para2')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss3.page.sec2Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss3.page.sec2Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss3.page.sec2Para2"
          components={{ em1: <em /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss3.page.sec2Para3"
          components={{
            em1: <em />,
            strong1: <strong />,
            code1: <code />,
          }}
        />
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss3.page.sec3Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss3.page.sec3Para1"
          components={{ strong1: <strong /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss3.page.sec3Para2"
          components={{
            code1: <code />,
            code2: <code />,
            code3: <code />,
          }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss3.page.sec3Para3"
          components={{ strong1: <strong /> }}
        />
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss3.page.sec4Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss3.page.sec4Para1')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.photoboss3.page.sec4Code')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss3.page.sec4Para2"
          components={{
            em1: <em />,
            code1: <code />,
          }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss3.page.sec4Para3"
          components={{ code1: <code /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss3.page.sec4Para4')}
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/parallel-working.png"
        alt={t('blog.posts.photoboss3.page.imgAlt')}
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
