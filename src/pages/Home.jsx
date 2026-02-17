import { Link } from 'react-router-dom';

export default function Home() {
  const BlueLink = ({ to, children }) => (
    <Link
      to={to}
      className="inline-block text-blue-700 hover:text-blue-900 font-bold border-b-2 border-transparent hover:border-blue-700 transition-all duration-300 hover:scale-[1.02]"
    >
      {children}
    </Link>
  );

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">
        Game Programmer. Maker. Problem Solver.
      </h1>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        From gameplay prototypes to handcrafted <BlueLink to="/Kumiko">Kumiko panels</BlueLink> and <BlueLink to="/Keyboard">split ergonomic keyboards</BlueLink> —
        <br></br>I build things that work beautifully.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        I pivoted from leading teams in hospitality and public service into the world of game development,
        earning fluency in <strong>C++</strong>, <strong>C#</strong>, proficiency working in both <strong>Unity</strong> and <strong>Unreal</strong> at Games Academy Berlin.
        Now, I apply precision and creativity across digital and physical projects that challenge both logic and design.
      </p>

      <div className="text-left sm:text-center space-y-4 mb-10">
        <p className="text-gray-800 text-base">
          🕹️ <BlueLink to="/Projects">Explore</BlueLink> semester games that simulate real studio workflows.
        </p>
        <p className="text-gray-800 text-base">
          🔧 <BlueLink to="/Keyboard">Peek behind the curtain</BlueLink> into hardware builds and custom electronics.
        </p>
        <p className="text-gray-800 text-base">
          🧗 <BlueLink to="/Climbing">Discover</BlueLink> how climbing, coding, and crafting converge.
        </p>
      </div>

      <p className="text-xl font-semibold">
        <BlueLink to="/Contact">Let’s make something remarkable.</BlueLink>
      </p>
    </main>
  );
}
