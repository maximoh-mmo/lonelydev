import { useTranslation, Trans } from 'react-i18next';

export default function Labyrinth2() {
  const { t } = useTranslation();

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        {t('blog.posts.labyrinth2.page.title')}
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">
        {t('blog.posts.labyrinth2.page.postedOn', { date: 'October 27, 2025' })}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.labyrinth2.page.sec1Para1"
          components={{ em1: <em /> }}
        />
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec1Para2')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth2.page.sec2Title')}
      </h2>
      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>{t('blog.posts.labyrinth2.page.sec2List1')}</li>
        <li>{t('blog.posts.labyrinth2.page.sec2List2')}</li>
        <li>{t('blog.posts.labyrinth2.page.sec2List3')}</li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth2.page.sec3Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec3Para1')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth2.page.sec3Code1')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec3Para2')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth2.page.sec3Code2')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec3Para3')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth2.page.sec3Code3')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec3Para4')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth2.page.sec4Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec4Para1')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth2.page.sec4Code')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec4Para2')}
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth2.page.sec5Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        <Trans
          i18nKey="blog.posts.labyrinth2.page.sec5Para1"
          components={{ strong1: <strong /> }}
        />
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth2.page.sec5Code')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec5Para2')}
      </p>
      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>{t('blog.posts.labyrinth2.page.sec5List1')}</li>
        <li>{t('blog.posts.labyrinth2.page.sec5List2')}</li>
        <li>{t('blog.posts.labyrinth2.page.sec5List3')}</li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth2.page.sec6Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec6Para1')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth2.page.sec6Code')}
      </pre>

      {/* Class diagram image */}
      <img
        src="/images/labyrinth-tiles.png"
        alt={t('blog.posts.labyrinth2.page.sec6ImgAlt')}
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth2.page.sec7Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec7Para1')}
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {t('blog.posts.labyrinth2.page.sec7Code')}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec7Para2')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec7Para3')}
      </p>

      {/* Animated video */}
      <div className="aspect-square mb-10 rounded-xl overflow-hidden shadow-md">
        <video
          className="w-full h-full object-cover"
          src="/video/grid-anim.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {t('blog.posts.labyrinth2.page.sec8Title')}
      </h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec8Para1')}
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {t('blog.posts.labyrinth2.page.sec8Para2')}
      </p>
    </main>
  );
}
