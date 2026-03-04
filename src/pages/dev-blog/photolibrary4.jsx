import { useTranslation, Trans } from 'react-i18next';

export default function PhotoLibrary4() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('blog.posts.photoboss4.page.title')}
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">
        {t('blog.posts.photoboss4.page.postedOn', { date: '2025-12-24' })}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss4.page.sec1Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss4.page.sec1Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss4.page.sec1Para2')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss4.page.sec1Para3')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss4.page.sec1Para4')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss4.page.sec2Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss4.page.sec2Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss4.page.sec2Para2"
          components={{
            strong1: <strong />,
            strong2: <strong />,
          }}
        />
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>
          <Trans
            i18nKey="blog.posts.photoboss4.page.sec2List1"
            components={{ strong1: <strong /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="blog.posts.photoboss4.page.sec2List2"
            components={{ strong1: <strong /> }}
          />
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss4.page.sec3Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss4.page.sec3Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss4.page.sec3Para2')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss4.page.sec3Para3')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss4.page.sec3Para4')}
      </p>

      {/* Placeholder image */}
      <img
        src="/images/photoboss/hash-worker-pool-diagram.png"
        alt={t('blog.posts.photoboss4.page.imgAlt')}
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />
    </main>
  );
}
