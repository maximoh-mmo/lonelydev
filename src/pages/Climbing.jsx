import EnglishContentNotice from '../components/EnglishContentNotice';
import SEO from '../components/SEO';
import CareerActions from '../components/CareerActions';
import useRouteLanguage from '../hooks/useRouteLanguage';
import { useState } from 'react';

export default function Climbing() {
  const { prefix } = useRouteLanguage();
  // State to track image loading errors
  const [imageErrors, setImageErrors] = useState({});

  // Function to handle image loading errors
  const handleImageError = (imageId) => {
    setImageErrors(prev => ({
      ...prev,
      [imageId]: true
    }));
  };

  // Fallback image or placeholder
  const fallbackImageStyle = {
    backgroundColor: 'var(--surface-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--muted)',
    fontStyle: 'italic'
  };

  return (
    <main className="page legacy-page" lang="en">
      <SEO title="Climbing: Craft, Challenge, and Creative Flow" description="Climbing as a practice in focus, iteration, problem-solving, and trust." image="https://maxheinze.com/images/climbing-banner.webp" url="/climbing" noindex={Boolean(prefix)} localized={false} />
      <EnglishContentNotice />
      {/* Hero Section */}
      <div className="legacy-hero-media">
        {imageErrors.banner ? (
          <div style={fallbackImageStyle} className="w-full h-full">
            <p>Climbing image unavailable</p>
          </div>
        ) : (
          <img
            src="/images/climbing-banner.webp"
            srcSet="/images/climbing-banner-800.webp 800w, /images/climbing-banner-1200.webp 1200w, /images/climbing-banner.webp 2000w"
            sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
            width="2000"
            height="789"
            decoding="async"
            fetchPriority="high"
            alt="Alpine Vista"
            className="w-full h-full object-cover"
            onError={() => handleImageError('banner')}
          />
        )}
      </div>

      {/* Intro */}
      <header className="legacy-page__header">
        <p className="eyebrow">Personal practice · Movement</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-10 text-gray-900">
          Climbing: Craft, Challenge, and Creative Flow
        </h1>
        <p className="page-lead">
          Whether scaling icy alpine slopes or solving bouldering problems indoors, climbing has become one of my
          most meaningful pursuits. It's a practice that blends physical challenge, mental focus, and creative
          problem-solving — much like game development.
        </p>
      </header>

      {/* Why I Climb */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Why I Climb</h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          Climbing offers a rare kind of clarity. Every move demands presence — reading the wall, trusting your body,
          and adapting in real time. It's a dialogue between intention and environment — and that's something I find
          deeply satisfying.
        </p>
        <p className="text-gray-700 leading-relaxed mb-8">
          From high-altitude mountaineering to indoor bouldering, I'm drawn to the variety of movement, the technical
          nuance, and the resilience it builds. It's not just about reaching the top — it's about how you get there.
        </p>

        <div className="aspect-video overflow-hidden rounded-xl shadow-md">
          {imageErrors.bouldering ? (
            <div style={fallbackImageStyle} className="w-full h-full">
              <p>Bouldering image unavailable</p>
            </div>
          ) : (
            <img
              src="/images/bouldering.webp"
              srcSet="/images/bouldering-800.webp 800w, /images/bouldering-1200.webp 1200w, /images/bouldering.webp 1506w"
              sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
              width="1506"
              height="2000"
              decoding="async"
              loading="lazy"
              alt="Indoor bouldering session"
              className="w-full h-full object-cover"
              onError={() => handleImageError('bouldering')}
            />
          )}
        </div>
      </section>

      {/* Parallels with Programming */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">
          Parallels with Programming & Game Development
        </h2>

        <ul className="space-y-6">
          <li>
            <span className="font-semibold text-gray-900">🧩 Problem-Solving:</span>{' '}
            Each climbing route is a puzzle. You analyze, experiment, and iterate — just like debugging or designing
            gameplay systems.
          </li>
          <li>
            <span className="font-semibold text-gray-900">🌊 Flow State:</span>{' '}
            Both climbing and programming reward deep focus. Hours can pass unnoticed when you're immersed in a
            complex mechanic or a tricky overhang.
          </li>
          <li>
            <span className="font-semibold text-gray-900">⚙️ Precision & Craft:</span>{' '}
            Whether placing a foot or structuring a class, small decisions have big consequences. Attention to detail
            matters.
          </li>
          <li>
            <span className="font-semibold text-gray-900">🤝 Collaboration:</span>{' '}
            Climbing often involves trust — in your belayer, your gear, your team. Game development is no different:
            it thrives on collaboration and shared goals.
          </li>
          <li>
            <span className="font-semibold text-gray-900">🔁 Iteration & Adaptability:</span>{' '}
            You rarely send a route on the first try. You learn, adapt, and try again — a mindset that's essential in
            agile development.
          </li>
        </ul>

        <div className="aspect-video overflow-hidden rounded-xl shadow-md mt-10">
          {imageErrors.iceclimb ? (
            <div style={fallbackImageStyle} className="w-full h-full">
              <p>Ice climbing image unavailable</p>
            </div>
          ) : (
            <img
              src="/images/iceclimb.webp"
              srcSet="/images/iceclimb-800.webp 800w, /images/iceclimb-1200.webp 1200w, /images/iceclimb.webp 2000w"
              sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
              width="2000"
              height="1125"
              decoding="async"
              loading="lazy"
              alt="Ice climbing in alpine environment"
              className="w-full h-full object-cover"
              onError={() => handleImageError('iceclimb')}
            />
          )}
        </div>
      </section>

      {/* Gallery */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">
          Moments from the Wall
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Gallery images with error handling */}
          {[
            { id: 'climb1', src: '/images/climb1.webp', srcSet: '/images/climb1-800.webp 800w, /images/climb1-1200.webp 1200w, /images/climb1.webp 1506w', alt: 'Climbing 1', width: 1506, height: 2000 },
            { id: 'climb2', src: '/images/climb2.webp', srcSet: '/images/climb2-800.webp 800w, /images/climb2-1200.webp 1200w, /images/climb2.webp 2000w', alt: 'Climbing 2', width: 2000, height: 1125 },
            { id: 'climb3', src: '/images/climb3.webp', srcSet: '/images/climb3-800.webp 800w, /images/climb3.webp 1200w', alt: 'Climbing 3', width: 1200, height: 1600 }
          ].map((image) => (
            imageErrors[image.id] ? (
              <div
                key={image.id}
                style={fallbackImageStyle}
                className="rounded-lg shadow-md w-full h-64 flex items-center justify-center"
              >
                <p>{image.alt} unavailable</p>
              </div>
            ) : (
              <img
                key={image.id}
                src={image.src}
                srcSet={image.srcSet}
                sizes="(max-width: 640px) calc(100vw - 2.5rem), 33vw"
                alt={image.alt}
                width={image.width}
                height={image.height}
                loading="lazy"
                decoding="async"
                className="rounded-lg shadow-md object-cover w-full h-64 transform transition duration-300"
                onError={() => handleImageError(image.id)}
              />
            )
          ))}
        </div>
      </section>
      <footer className="legacy-page__cta">
        <p>Climbing is part of how I practise focus, iteration, and calm problem-solving away from the screen.</p>
        <CareerActions />
      </footer>
    </main>
  );
}
