import { Link } from 'react-router-dom';

export default function About() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        About Me
      </h1>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed italic">
        Game programmer, maker, and perpetual tinkerer, fascinated by systems and
        the process of creation.
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        I’m a game programmer who loves building things — whether that’s a
        gameplay system, a hand-cut <Link to="/Kumiko" className="inline-block transition-transform duration-200 hover:scale-[1.03]">
          <strong>Kumiko</strong></Link> panel, or a custom <Link to="/Keyboard" className="inline-block transition-transform duration-200 hover:scale-[1.03]"><strong>Bluetooth keyboards</strong></Link>.
        For me, the joy is in seeing something move from concept to working reality,
        understanding the systems beneath the surface, and refining them until they
        feel effortless.
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        Before moving into game development, I spent several years leading teams
        in hospitality and public service in the UK. Later, I relocated to Germany,
        where I had the chance to enjoy my daughter’s early years while learning
        German to a C1 proficiency and retraining in a new field. That period of
        change taught me a lot about patience, adaptability, and the value of
        continuous learning — qualities that underpin everything I build now.
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        I trained at <a href="https://games-academy.de/" className="inline-block transition-transform duration-200 hover:scale-[1.03]"><strong>Games Academy</strong></a> Berlin, focusing on C# C++, Unity and Unreal,
        learning not only how to write clean, performant code but also how to think
        like a developer in a multidisciplinary team. That environment taught me
        how to connect technical work with creative goals — to make code serve the
        feel and flow of play.
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        Outside of programming, I’ve always kept my hands busy. Designing and
        fabricating custom hardware (like my wireless per-key RGB keyboard) and
        crafting Kumiko joinery have become creative outlets that strengthen my
        attention to precision and design thinking. Both disciplines — digital and
        physical — share the same heartbeat: iteration, structure, and a quiet
        respect for detail.
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        I’m motivated by curiosity and the challenge of making systems — mechanical,
        digital, or human — work beautifully together. In a team, I bring patience,
        clarity, and a genuine enthusiasm for seeing others’ ideas take shape.
        Whether it’s gameplay logic or joinery geometry, I love the process of
        solving problems collaboratively and making something that feels right.
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        I build things because I’m endlessly curious about how the world works —
        how different systems, whether in design, mechanics, electronics, or code,
        interact and create meaningful results. I see every project as an opportunity
        to learn new skills, refine existing ones, and grow through the people,
        experiences, and ideas I encounter along the way. For me, building isn’t just
        about making; it’s about understanding, experimenting, and enjoying the process
        as much as the outcome.
      </p>
    </main>
  );
}
