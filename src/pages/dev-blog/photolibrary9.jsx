import { useTranslation, Trans } from 'react-i18next';

export default function PhotoLibrary9() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('blog.posts.photoboss9.page.title')}
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">
        {t('blog.posts.photoboss9.page.postedOn', { date: '2026-04-17' })}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss9.page.introPara1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss9.page.introPara2')}
      </p>

      <hr className="my-12 border-gray-200" />

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss9.page.sec1Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-6 leading-relaxed">
        {t('blog.posts.photoboss9.page.sec1Para1')}
      </p>
      <ul className="list-disc list-inside text-lg text-gray-700 mb-8 space-y-4">
        <li>
          <Trans
            i18nKey="blog.posts.photoboss9.page.sec1List1"
            components={{ strong1: <strong /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="blog.posts.photoboss9.page.sec1List2"
            components={{ strong1: <strong /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="blog.posts.photoboss9.page.sec1List3"
            components={{ strong1: <strong /> }}
          />
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss9.page.sec2Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss9.page.sec2Para1"
          components={{ 
            code1: <code className="bg-gray-100 px-1 rounded" />, 
            strong1: <strong />,
            code2: <code className="bg-gray-100 px-1 rounded" />
          }}
        />
      </p>

      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {t('blog.posts.photoboss9.page.sec2TitleSub1')}
      </h3>
      <p className="text-lg text-gray-700 mb-4 leading-relaxed">
        {t('blog.posts.photoboss9.page.sec2ParaSub1_1')}
      </p>
      <p className="text-lg text-gray-700 mb-4 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss9.page.sec2ParaSub1_2"
          components={{ 
            strong1: <strong />,
            code1: <code className="bg-gray-100 px-1 rounded" />
          }}
        />
      </p>
      <p className="text-lg text-gray-700 mb-6 leading-relaxed">
        {t('blog.posts.photoboss9.page.sec2ParaSub1_3')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.photoboss9.page.sec2CodeSub1')}
      </pre>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        {t('blog.posts.photoboss9.page.sec2ParaSub1_4')}
      </p>

      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {t('blog.posts.photoboss9.page.sec2TitleSub2')}
      </h3>
      <p className="text-lg text-gray-700 mb-4 leading-relaxed">
        {t('blog.posts.photoboss9.page.sec2ParaSub2_1')}
      </p>
      <div className="bg-gray-50 p-4 rounded-lg mb-4 font-mono text-sm text-center italic text-gray-600">
        <Trans
          i18nKey="blog.posts.photoboss9.page.sec2ParaSub2_2"
          components={{ code1: <code /> }}
        />
      </div>
      <p className="text-lg text-gray-700 mb-4 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss9.page.sec2ParaSub2_3"
          components={{ 
            code1: <code className="bg-gray-100 px-1 rounded" />,
            code2: <code className="bg-gray-100 px-1 rounded" />
          }}
        />
      </p>
      <div className="bg-blue-50 p-4 rounded-lg mb-6 font-mono text-sm text-center font-bold text-blue-800 border-l-4 border-blue-500">
        <Trans
          i18nKey="blog.posts.photoboss9.page.sec2ParaSub2_4"
          components={{ code1: <code /> }}
        />
      </div>
      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss9.page.sec2ParaSub2_5"
          components={{ strong1: <strong /> }}
        />
      </p>

      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {t('blog.posts.photoboss9.page.sec2TitleSub3')}
      </h3>
      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss9.page.sec2ParaSub3_1"
          components={{ code1: <code className="bg-gray-100 px-1 rounded" /> }}
        />
      </p>

      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {t('blog.posts.photoboss9.page.sec2TitleSub4')}
      </h3>
      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        <Trans
          i18nKey="blog.posts.photoboss9.page.sec2ParaSub4_1"
          components={{ code1: <code className="bg-gray-100 px-1 rounded" /> }}
        />
      </p>

      <hr className="my-12 border-gray-200" />

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.photoboss9.page.sec3Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        {t('blog.posts.photoboss9.page.sec3Para1')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        {t('blog.posts.photoboss9.page.sec4Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.photoboss9.page.sec4Para1')}
      </p>

      <div className="space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-bold text-gray-900 mb-2">
            {t('blog.posts.photoboss9.page.sec4TitleSub1')}
          </h4>
          <p className="text-lg text-gray-700 leading-relaxed">
            <Trans
              i18nKey="blog.posts.photoboss9.page.sec4ParaSub1"
              components={{ strong1: <strong /> }}
            />
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-bold text-gray-900 mb-2">
            {t('blog.posts.photoboss9.page.sec4TitleSub2')}
          </h4>
          <p className="text-lg text-gray-700 leading-relaxed">
            {t('blog.posts.photoboss9.page.sec4ParaSub2')}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-bold text-gray-900 mb-2">
            {t('blog.posts.photoboss9.page.sec4TitleSub3')}
          </h4>
          <p className="text-lg text-gray-700 mb-4 leading-relaxed">
            {t('blog.posts.photoboss9.page.sec4ParaSub3_1')}
          </p>
          <ul className="list-disc list-inside text-lg text-gray-700 space-y-2">
            <li>
              <Trans
                i18nKey="blog.posts.photoboss9.page.sec4ParaSub3_2"
                components={{ strong1: <strong /> }}
              />
            </li>
            <li>
              <Trans
                i18nKey="blog.posts.photoboss9.page.sec4ParaSub3_3"
                components={{ strong1: <strong /> }}
              />
            </li>
          </ul>
          <p className="text-lg text-gray-700 mt-4 leading-relaxed">
            {t('blog.posts.photoboss9.page.sec4ParaSub3_4')}
          </p>
        </div>
      </div>

      <p className="text-xl font-medium text-gray-900 mt-16 text-center italic">
        {t('blog.posts.photoboss9.page.outro')}
      </p>
    </main>
  );
}
