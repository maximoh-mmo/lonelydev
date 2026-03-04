import { useTranslation, Trans } from 'react-i18next';

export default function Labyrinth() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <article className="prose prose-lg prose-gray max-w-none">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
          {t('blog.posts.labyrinth.page.title')}
        </h1>
        <p className="text-gray-500 mb-8 text-center italic">
          {t('blog.posts.labyrinth.page.postedOn', { date: 'October 27, 2025' })}
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('blog.posts.labyrinth.page.sec1Title')}
        </h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          <Trans
            i18nKey="blog.posts.labyrinth.page.sec1Para1"
            components={{ em1: <em />, em2: <em /> }}
          />
        </p>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          <Trans
            i18nKey="blog.posts.labyrinth.page.sec1Para2"
            components={{ strong1: <strong /> }}
          />
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('blog.posts.labyrinth.page.sec2Title')}
        </h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          <Trans
            i18nKey="blog.posts.labyrinth.page.sec2Para1"
            components={{ em1: <em /> }}
          />
        </p>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          <Trans
            i18nKey="blog.posts.labyrinth.page.sec2Para2"
            components={{ strong1: <strong /> }}
          />
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('blog.posts.labyrinth.page.sec3Title')}
        </h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          {t('blog.posts.labyrinth.page.sec3Para1')}
        </p>

        <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
          <li>
            <Trans
              i18nKey="blog.posts.labyrinth.page.sec3List1"
              components={{ strong1: <strong /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="blog.posts.labyrinth.page.sec3List2"
              components={{ strong1: <strong /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="blog.posts.labyrinth.page.sec3List3"
              components={{ strong1: <strong /> }}
            />
          </li>
        </ul>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          {t('blog.posts.labyrinth.page.sec3Para2')}
        </p>

        <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
          {t('blog.posts.labyrinth.page.sec3Code')}
        </pre>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          {t('blog.posts.labyrinth.page.sec3Para3')}
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('blog.posts.labyrinth.page.sec4Title')}
        </h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          {t('blog.posts.labyrinth.page.sec4Para1')}
        </p>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          {t('blog.posts.labyrinth.page.sec4Para2')}
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('blog.posts.labyrinth.page.sec5Title')}
        </h2>
        <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
          <li>
            <Trans
              i18nKey="blog.posts.labyrinth.page.sec5List1"
              components={{ strong1: <strong /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="blog.posts.labyrinth.page.sec5List2"
              components={{ strong1: <strong /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="blog.posts.labyrinth.page.sec5List3"
              components={{ strong1: <strong /> }}
            />
          </li>
        </ul>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          {t('blog.posts.labyrinth.page.sec5Para1')}
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('blog.posts.labyrinth.page.sec6Title')}
        </h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          {t('blog.posts.labyrinth.page.sec6Para1')}
        </p>

        <div className="overflow-x-auto my-4 mb-8">
          <table className="w-full border border-gray-300 text-left text-sm">
            <thead className="bg-gray-100 font-semibold">
              <tr>
                <th className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableH1')}</th>
                <th className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableH2')}</th>
                <th className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableH3')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR1C1')}</td>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR1C2')}</td>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR1C3')}</td>
              </tr>
              <tr>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR2C1')}</td>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR2C2')}</td>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR2C3')}</td>
              </tr>
              <tr>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR3C1')}</td>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR3C2')}</td>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR3C3')}</td>
              </tr>
              <tr>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR4C1')}</td>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR4C2')}</td>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR4C3')}</td>
              </tr>
              <tr>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR5C1')}</td>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR5C2')}</td>
                <td className="p-2 border-b">{t('blog.posts.labyrinth.page.sec6TableR5C3')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('blog.posts.labyrinth.page.sec7Title')}
        </h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          <Trans
            i18nKey="blog.posts.labyrinth.page.sec7Para1"
            components={{ em1: <em /> }}
          />
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('blog.posts.labyrinth.page.sec8Title')}
        </h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          {t('blog.posts.labyrinth.page.sec8Para1')}
        </p>

        <p className="text-lg text-blue-700 font-semibold mt-8 mb-8">
          {t('blog.posts.labyrinth.page.sec8Para2')}
        </p>
      </article>
    </main>
  );
}
