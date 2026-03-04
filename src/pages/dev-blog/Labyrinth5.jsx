import { useTranslation, Trans } from 'react-i18next';

export default function Labyrinth5() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left text-lg text-gray-700 leading-relaxed">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('blog.posts.labyrinth5.page.title')}
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">
        {t('blog.posts.labyrinth5.page.postedOn', { date: 'November 14, 2025' })}
      </p>

      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth5.page.sec1Para1"
          components={{ em1: <em />, em2: <em />, strong1: <strong /> }}
        />
      </p>

      <p className="mb-8">
        {t('blog.posts.labyrinth5.page.sec1Para2')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth5.page.sec2Title')}
      </h2>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth5.page.sec2Para1"
          components={{ code1: <code /> }}
        />
      </p>
      <p className="mb-8">
        {t('blog.posts.labyrinth5.page.sec2Para2')}
      </p>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth5.page.sec2Para3"
          components={{ strong1: <strong /> }}
        />
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth5.page.sec3Title')}
      </h2>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth5.page.sec3Para1"
          components={{ code1: <code /> }}
        />
      </p>
      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth5.page.sec3Code')}
      </pre>
      <p className="mb-8">
        {t('blog.posts.labyrinth5.page.sec3Para2')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth5.page.sec4Title')}
      </h2>
      <p className="mb-8">
        {t('blog.posts.labyrinth5.page.sec4Para1')}
      </p>
      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth5.page.sec4Code')}
      </pre>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth5.page.sec4Para2"
          components={{ strong1: <strong /> }}
        />
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth5.page.sec5Title')}
      </h2>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth5.page.sec5Para1"
          components={{ em1: <em /> }}
        />
      </p>
      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth5.page.sec5Code')}
      </pre>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth5.page.sec5Para2"
          components={{ em1: <em />, em2: <em /> }}
        />
      </p>
      <p className="mb-8">
        {t('blog.posts.labyrinth5.page.sec5Para3')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth5.page.sec6Title')}
      </h2>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth5.page.sec6Para1"
          components={{ strong1: <strong />, em1: <em /> }}
        />
      </p>
      <ul className="list-disc list-inside mb-8 space-y-2">
        <li>{t('blog.posts.labyrinth5.page.sec6List1')}</li>
        <li>{t('blog.posts.labyrinth5.page.sec6List2')}</li>
        <li>{t('blog.posts.labyrinth5.page.sec6List3')}</li>
        <li>{t('blog.posts.labyrinth5.page.sec6List4')}</li>
      </ul>
      <p className="mb-8">
        {t('blog.posts.labyrinth5.page.sec6Para2')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth5.page.sec7Title')}
      </h2>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth5.page.sec7Para1"
          components={{ strong1: <strong /> }}
        />
      </p>
      <p className="mb-8">
        {t('blog.posts.labyrinth5.page.sec7Para2')}
      </p>
      <p className="mb-8">
        {t('blog.posts.labyrinth5.page.sec7Para3')}
      </p>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth5.page.sec7Para4"
          components={{ em1: <em /> }}
        />
      </p>
      <p className="mb-8">
        {t('blog.posts.labyrinth5.page.sec7Para5')}
      </p>
    </main>
  );
}
