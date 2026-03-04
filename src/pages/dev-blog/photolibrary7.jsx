import { useTranslation, Trans } from 'react-i18next';

export default function PhotoLibrary7() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('blog.posts.photoboss7.page.title')}
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">
        {t('blog.posts.photoboss7.page.postedOn', { date: '2026-01-27' })}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss7.page.sec1Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec1Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec1Para2')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.photoboss7.page.sec1Code1')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec1Para3')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec1Para4')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.photoboss7.page.sec1Code2')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec1Para5')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec1Para6')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.photoboss7.page.sec1Code3')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss7.page.sec1Para7"
          components={{ code1: <code /> }}
        />
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss7.page.sec2Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec2Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss7.page.sec2Para2"
          components={{ strong1: <strong /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec2Para3')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss7.page.sec2Para4"
          components={{ strong1: <strong /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec2Para5')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss7.page.sec3Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec3Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss7.page.sec3Para2"
          components={{ em1: <em /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss7.page.sec3Para3')}
      </p>
    </main>
  );
}
