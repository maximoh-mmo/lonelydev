import { useTranslation, Trans } from 'react-i18next';

export default function Labyrinth4() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left text-lg text-gray-700 leading-relaxed">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('blog.posts.labyrinth4.page.title')}
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">
        {t('blog.posts.labyrinth4.page.postedOn', { date: 'October 29, 2025' })}
      </p>

      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec1Para1')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth4.page.sec2Title')}
      </h2>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth4.page.sec2Para1"
          components={{ code1: <code /> }}
        />
      </p>
      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 mb-8">
        {t('blog.posts.labyrinth4.page.sec2Quote')}
      </blockquote>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth4.page.sec3Title')}
      </h2>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth4.page.sec3Para1"
          components={{ code1: <code /> }}
        />
      </p>
      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec3Para2')}
      </p>
      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth4.page.sec3Code1')}
      </pre>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth4.page.sec3Para3"
          components={{ code1: <code /> }}
        />
      </p>
      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth4.page.sec3Code2')}
      </pre>
      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec3Para4')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth4.page.sec4Title')}
      </h2>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth4.page.sec4Para1"
          components={{ code1: <code /> }}
        />
      </p>
      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec4Para2')}
      </p>
      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec4Para3')}
      </p>
      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth4.page.sec4Code')}
      </pre>
      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec4Para4')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth4.page.sec5Title')}
      </h2>
      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec5Para1')}
      </p>
      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec5Para2')}
      </p>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth4.page.sec5Para3"
          components={{ code1: <code />, code2: <code /> }}
        />
      </p>
      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth4.page.sec5Code')}
      </pre>
      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec5Para4')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth4.page.sec6Title')}
      </h2>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth4.page.sec6Para1"
          components={{ code1: <code />, code2: <code /> }}
        />
      </p>
      <p className="mb-8">
        <Trans
          i18nKey="blog.posts.labyrinth4.page.sec6Para2"
          components={{
            kbd1: <kbd className="bg-gray-100 border border-gray-300 px-1 rounded shadow-sm" />,
            kbd2: <kbd className="bg-gray-100 border border-gray-300 px-1 rounded shadow-sm" />,
            kbd3: <kbd className="bg-gray-100 border border-gray-300 px-1 rounded shadow-sm" />,
            kbd4: <kbd className="bg-gray-100 border border-gray-300 px-1 rounded shadow-sm" />,
          }}
        />
      </p>
      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth4.page.sec6Code')}
      </pre>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth4.page.sec7Title')}
      </h2>
      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec7Para1')}
      </p>
      <h3 className="text-xl font-medium text-gray-900 mb-2">
        {t('blog.posts.labyrinth4.page.sec7TitleSub')}
      </h3>
      <ul className="list-disc list-inside mb-8 space-y-2">
        <li>
          <Trans
            i18nKey="blog.posts.labyrinth4.page.sec7List1"
            components={{ strong1: <strong />, strong2: <strong /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="blog.posts.labyrinth4.page.sec7List2"
            components={{ strong1: <strong />, strong2: <strong /> }}
          />
        </li>
      </ul>
      <p className="mb-8">
        {t('blog.posts.labyrinth4.page.sec7Para2')}
      </p>
    </main>
  );
}
