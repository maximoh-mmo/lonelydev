import { useTranslation, Trans } from 'react-i18next';

export default function Labyrinth3() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('blog.posts.labyrinth3.page.title')}
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">
        {t('blog.posts.labyrinth3.page.postedOn', { date: 'October 28, 2025' })}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.labyrinth3.page.sec1Para1"
          components={{ em1: <em /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec1Para2')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth3.page.sec2Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec2Para1')}
      </p>

      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>{t('blog.posts.labyrinth3.page.sec2List1')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec2List2')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec2List3')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec2List4')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec2List5')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec2List6')}</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec2Para2')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth3.page.sec3Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.labyrinth3.page.sec3Para1"
          components={{ code1: <code />, code2: <code /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.labyrinth3.page.sec3Para2"
          components={{ code1: <code /> }}
        />
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth3.page.sec3Code')}
      </pre>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth3.page.sec4Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec4Para1')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth3.page.sec4Code1')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec4Para2')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth3.page.sec4Code2')}
      </pre>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth3.page.sec5Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec5Para1')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth3.page.sec5Code')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec5Para2')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth3.page.sec6Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec6Para1')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth3.page.sec6Code')}
      </pre>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth3.page.sec7Title')}
      </h2>
      <h3 className="text-xl font-medium text-gray-900 mb-2">
        {t('blog.posts.labyrinth3.page.sec7TitleSub')}
      </h3>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.labyrinth3.page.sec7Para1"
          components={{ code1: <code />, code2: <code /> }}
        />
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth3.page.sec7Code')}
      </pre>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth3.page.sec8Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec8Para1')}
      </p>
      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>{t('blog.posts.labyrinth3.page.sec8List1')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec8List2')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec8List3')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec8List4')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec8List5')}</li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth3.page.sec9Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec9Para1')}
      </p>
      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>{t('blog.posts.labyrinth3.page.sec9List1')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec9List2')}</li>
        <li>{t('blog.posts.labyrinth3.page.sec9List3')}</li>
      </ul>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth3.page.sec9Para2')}
      </p>
    </main>
  );
}
