export default function Climbing() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16 text-gray-800">
      {/* Hero Section */}
      <div className="aspect-[3/1] overflow-hidden rounded-2xl shadow-lg mb-12">
        <img
          src="/images/climbing-banner.jpg"
          alt="Climber silhouetted against the sky"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Intro */}
      <section className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-gray-900">
          Climbing: Craft, Challenge, and Creative Flow
        </h1>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          Whether scaling icy alpine slopes or solving bouldering problems indoors, climbing has become one of my
          most meaningful pursuits. It’s a practice that blends physical challenge, mental focus, and creative
          problem-solving — much like game development.
        </p>
      </section>

      {/* Why I Climb */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Why I Climb</h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          Climbing offers a rare kind of clarity. Every move demands presence — reading the wall, trusting your body,
          and adapting in real time. It’s a dialogue between intention and environment — and that’s something I find
          deeply satisfying.
        </p>
        <p className="text-gray-700 leading-relaxed mb-8">
          From high-altitude mountaineering to indoor bouldering, I’m drawn to the variety of movement, the technical
          nuance, and the resilience it builds. It’s not just about reaching the top — it’s about how you get there.
        </p>

        <div className="aspect-video overflow-hidden rounded-xl shadow-md">
          <img
            src="/images/bouldering.jpg"
            alt="Indoor bouldering session"
            className="w-full h-full object-cover"
          />
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
            Both climbing and programming reward deep focus. Hours can pass unnoticed when you’re immersed in a
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
            You rarely send a route on the first try. You learn, adapt, and try again — a mindset that’s essential in
            agile development.
          </li>
        </ul>

        <div className="aspect-video overflow-hidden rounded-xl shadow-md mt-10">
          <img
            src="/images/iceclimb.jpg"
            alt="Ice climbing in alpine environment"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Gallery */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">
          Moments from the Wall
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <img
            src="/images/climb1.jpg"
            alt="Climbing 1"
            className="rounded-lg shadow-md object-cover w-full h-64 transform hover:scale-[1.02] transition duration-300"
          />
          <img
            src="/images/climb2.jpg"
            alt="Climbing 2"
            className="rounded-lg shadow-md object-cover w-full h-64 transform hover:scale-[1.02] transition duration-300"
          />
          <img
            src="/images/climb3.jpg"
            alt="Climbing 3"
            className="rounded-lg shadow-md object-cover w-full h-64 transform hover:scale-[1.02] transition duration-300"
          />
        </div>
      </section>
    </main>
  );
}