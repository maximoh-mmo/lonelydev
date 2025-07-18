import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">
        Game Programmer. Maker. Problem Solver.
      </h1>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        From gameplay prototypes to handcrafted <Link
  to="/Kumiko" className="inline-block transition-transform duration-200 hover:scale-[1.03]"

>
  <strong>Kumiko panels</strong>
</Link> and <Link to="/Keyboard" className="inline-block transition-transform duration-200 hover:scale-[1.03]">split ergonomic keyboards</Link> —
        I build things that work beautifully.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I pivoted from leading teams in hospitality and public service into the world of game development,
        earning fluency in <strong>C++</strong>, <strong>C#</strong>, and <strong>Unreal Engine</strong> at Games Academy Berlin.
        Now, I apply precision and creativity across digital and physical projects that challenge both logic and design.
      </p>

      <div className="text-left sm:text-center space-y-4 mb-10">
        <p className="text-gray-800 text-base">
          🕹️ <Link to="/Projects" className="inline-block transition-transform duration-200 hover:scale-[1.03]"><strong>Explore</strong></Link> semester games that simulate real studio workflows.
        </p>
        <p className="text-gray-800 text-base">
          🔧 <Link to="/Keyboards" className="inline-block transition-transform duration-200 hover:scale-[1.03]"><strong>Peek behind the curtain</strong></Link> into hardware builds and custom electronics.
        </p>
        <p className="text-gray-800 text-base">
          🧗 <strong>Discover</strong> how climbing, coding, and crafting converge.
        </p>
      </div>

      <p className="text-xl font-semibold text-blue-700">
        <Link to="/Contact" className="inline-block transition-transform duration-200 hover:scale-[1.03]">Let’s make something remarkable.</Link>
      </p>
    </main>
  );
}