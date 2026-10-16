import EnglishContentNotice from '../components/EnglishContentNotice';
import SEO from '../components/SEO';
import CareerActions from '../components/CareerActions';
import useRouteLanguage from '../hooks/useRouteLanguage';
export default function Kumiko() {
  const { prefix } = useRouteLanguage();
  return (
    <main className="page legacy-page" lang="en">
      <SEO title="Kumiko Joinery" description="A hands-on study of precision, iteration, and traditional wooden pattern-making." image="https://maxheinze.com/images/small-panel.webp" url="/kumiko" noindex={Boolean(prefix)} localized={false} />
      <EnglishContentNotice />
      <p className="eyebrow">Personal practice · Woodwork</p>
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10">
        Precision in Pattern: Exploring Kumiko Joinery
      </h1>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed italic text-left">
        A study in patience, precision, and the quiet intersection of craft and code.
      </p>

      <p className="text-lg text-gray-700 mb-10 leading-relaxed">
        Kumiko joinery — the traditional Japanese art of assembling intricate wooden
        patterns without nails or glue — fascinated me the moment I discovered it.
        It’s a discipline defined by geometry, iteration, and a calm respect for
        process — qualities that feel deeply familiar from programming.
      </p>

      <p className="text-lg text-gray-700 mb-12 leading-relaxed">
        What began as a curiosity about pattern and structure evolved into a
        hands-on exploration of precision and flow — learning how small adjustments
        compound, how rhythm emerges from repetition, and how order takes shape
        through patience.
      </p>

      {/* --- First Attempt --- */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        First Attempt — Learning the Language of Wood
      </h2>
      <p className="text-gray-700 mb-6 leading-relaxed">
        My introduction to Kumiko began with a simple <strong>square-grid Asanoha pattern</strong>,
        hand-cut from leftover scrap wood. I later discovered that material was
        <strong> basswood</strong> — soft and prone to tearing under the chisel,
        which made it challenging to achieve the crisp lines the pattern relies on.
      </p>
      <p className="text-gray-700 mb-8 leading-relaxed">
        Even so, the process was revealing. Every tiny deviation — a slightly off
        angle, a cut a fraction too deep — propagated across the grid, breaking the
        visual harmony. It was a direct, tactile lesson in how small errors
        compound through a system — something I know well from programming.
      </p>

      <figure className="mb-12">
        <img
          src="/images/first-attempt.webp"
          srcSet="/images/first-attempt-800.webp 800w, /images/first-attempt-1200.webp 1200w, /images/first-attempt.webp 2000w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="2000"
          height="1861"
          decoding="async"
          loading="lazy"
          alt="First attempt — square-grid Asanoha pattern cut from basswood scrap."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <figcaption className="text-sm text-gray-500 mt-2">
          First attempt — square-grid Asanoha pattern cut from basswood scrap.
        </figcaption>
      </figure>

      {/* --- Refinement --- */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Refinement — Finding the Right Materials
      </h2>
      <p className="text-gray-700 mb-6 leading-relaxed">
        After that first experiment, I began using <strong>limewood</strong>,{" "}
        <strong>beech</strong>, and <strong>walnut</strong> — each with distinct
        grain and resistance that suited different parts of the pattern. The denser
        woods held cleaner edges and offered beautiful contrast when combined in a
        single piece.
      </p>
      <p className="text-gray-700 mb-8 leading-relaxed">
        Choosing materials became its own design language — matching mechanical
        properties with visual goals, like balancing performance and aesthetics in
        a game system.
      </p>

      <figure className="mb-12">
        <img
          src="/images/small-panel-wip.webp"
          srcSet="/images/small-panel-wip-800.webp 800w, /images/small-panel-wip-1200.webp 1200w, /images/small-panel-wip.webp 1816w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="1816"
          height="2000"
          decoding="async"
          loading="lazy"
          alt="Small panel work in progress — switching to limewood and testing precision fit."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <figcaption className="text-sm text-gray-500 mt-2">
          Small panel work in progress — switching to limewood and testing precision fit.
        </figcaption>
      </figure>

      {/* --- Iteration and Improvement --- */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Iteration and Improvement
      </h2>
      <p className="text-gray-700 mb-8 leading-relaxed">
        With better materials came better results. I built a{" "}
        <strong>small decorative panel</strong>, cutting every strip and joint
        entirely by hand. Each iteration improved the accuracy of my jigs and the
        consistency of my workflow — a very real-world form of iterative problem
        solving.
      </p>
      <p className="text-gray-700 mb-8 leading-relaxed">
        Once I found the rhythm — cut, test, adjust, repeat — the process became
        meditative. It required the same quiet focus and steady iteration as
        refining a gameplay mechanic or debugging a tricky system.
      </p>

      <figure className="mb-12">
        <img
          src="/images/small-panel.webp"
          srcSet="/images/small-panel-800.webp 800w, /images/small-panel-1200.webp 1200w, /images/small-panel.webp 2000w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="2000"
          height="1506"
          decoding="async"
          loading="lazy"
          alt="Small panel nearing completion — precise hand-fit lattice."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <figcaption className="text-sm text-gray-500 mt-2">
          Small panel nearing completion — precise hand-fit lattice, trimmed to size.
        </figcaption>
      </figure>

      {/* --- Finishing and Framing --- */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Finishing and Framing
      </h2>
      <p className="text-gray-700 mb-6 leading-relaxed">
        When the <strong>small panel</strong> was finished and trimmed to size, the
        geometry came alive in light and shadow. To display it properly, I designed
        and built a <strong>custom frame</strong>, experimenting with tight miters
        and contrasting tones of beech and walnut.
      </p>
      <p className="text-gray-700 mb-8 leading-relaxed">
        Seeing the panel mounted for the first time felt like seeing a finished
        prototype come together — all the tiny adjustments and tests aligning in
        one clean final form.
      </p>
      <figure className="mb-12">
        <img
          src="/images/small-frame.webp"
          srcSet="/images/small-frame-800.webp 800w, /images/small-frame-1200.webp 1200w, /images/small-frame.webp 2000w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="2000"
          height="1506"
          decoding="async"
          loading="lazy"
          alt="Custom frame assembly — miter joints and color contrast."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <figcaption className="text-sm text-gray-500 mt-2">
          Finished Frame, ready for Kumiko panel.
        </figcaption>
      </figure>

      <figure className="mb-12">
        <img
          src="/images/small-panel-framed.webp"
          srcSet="/images/small-panel-framed-800.webp 800w, /images/small-panel-framed-1200.webp 1200w, /images/small-panel-framed.webp 1506w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="1506"
          height="2000"
          decoding="async"
          loading="lazy"
          alt="Final framed Kumiko panel — precise geometry and warm tone balance."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <figcaption className="text-sm text-gray-500 mt-2">
          Final framed Kumiko panel — precise geometry and warm tone balance.
        </figcaption>
      </figure>

      {/* --- Larger Wall Panel --- */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Scaling Up — A Larger Wall Panel
      </h2>
      <p className="text-gray-700 mb-8 leading-relaxed">
        Encouraged by that success, I started a <strong>larger wall-mounted panel</strong>,
        again working entirely by hand. Scaling up added new challenges: keeping
        spacing uniform, aligning subframes, and managing wood movement over a
        bigger surface.
      </p>

      <figure className="mb-12">
        <img
          src="/images/wall-panel-wip.webp"
          srcSet="/images/wall-panel-wip-800.webp 800w, /images/wall-panel-wip-1200.webp 1200w, /images/wall-panel-wip.webp 1644w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="1644"
          height="2000"
          decoding="async"
          loading="lazy"
          alt="Larger wall panel — work in progress, sub-grids preparation for assembly."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <figcaption className="text-sm text-gray-500 mt-2">
          Larger wall panel — work in progress, sub-grids preparation for assembly.
        </figcaption>
      </figure>

      <figure className="mb-12">
        <img
          src="/images/wall-panel-detail.webp"
          srcSet="/images/wall-panel-detail-800.webp 800w, /images/wall-panel-detail-1200.webp 1200w, /images/wall-panel-detail.webp 1506w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="1506"
          height="2000"
          decoding="async"
          loading="lazy"
          alt="Larger wall panel — detail showing contrasting wood selections."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <figcaption className="text-sm text-gray-500 mt-2">
          Larger wall panel — detail view.
        </figcaption>
      </figure>

      <figure className="mb-12">
        <img
          src="/images/wall-panel.webp"
          srcSet="/images/wall-panel-800.webp 800w, /images/wall-panel-1200.webp 1200w, /images/wall-panel.webp 1906w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="1906"
          height="2000"
          decoding="async"
          loading="lazy"
          alt="Larger wall panel — finished, unframed, untrimmed wall panel."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <figcaption className="text-sm text-gray-500 mt-2">
          Larger wall panel — finished panel, awaiting trimming and framing.
        </figcaption>
      </figure>

      {/* --- The Kumiko Box --- */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        A Different Form — The Kumiko Box
      </h2>
      <p className="text-gray-700 mb-6 leading-relaxed">
        Once I’d mastered the basic patterns, I wanted to bring the technique into another direction.
        That led to a <strong>small Kumiko box</strong>, combining
        traditional joinery for the structure with fine decorative patterned panels on
        the lid.
      </p>
      <p className="text-gray-700 mb-8 leading-relaxed">
        Each element demanded forward planning: ensuring the decorative inserts
        would fit perfectly within the frame without stressing the joints.
      </p>

      <div className="grid sm:grid-cols-2 gap-6 mb-12">
        <img
          src="/images/box-sides.webp"
          srcSet="/images/box-sides-800.webp 800w, /images/box-sides-1200.webp 1200w, /images/box-sides.webp 2000w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="2000"
          height="1398"
          decoding="async"
          loading="lazy"
          alt="Box body — work in progress, box body."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <img
          src="/images/box-lid-wip.webp"
          srcSet="/images/box-lid-wip-800.webp 800w, /images/box-lid-wip-1200.webp 1200w, /images/box-lid-wip.webp 2000w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="2000"
          height="1470"
          decoding="async"
          loading="lazy"
          alt="Box lid — adding contrasting elements."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <img
          src="/images/box-kumiko-wip.webp"
          srcSet="/images/box-kumiko-wip-800.webp 800w, /images/box-kumiko-wip-1200.webp 1200w, /images/box-kumiko-wip.webp 2000w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="2000"
          height="1405"
          decoding="async"
          loading="lazy"
          alt="Box body — work in progress, kumiko pattern."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <img
          src="/images/box-finished.webp"
          srcSet="/images/box-finished-800.webp 800w, /images/box-finished-1200.webp 1200w, /images/box-finished.webp 2000w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="2000"
          height="1472"
          decoding="async"
          loading="lazy"
          alt="Box finished — kumiko pattern on lid, box body."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
      </div>

      <figure className="mb-12">
        <img
          src="/images/box-wip.webp"
          srcSet="/images/box-wip-800.webp 800w, /images/box-wip-1200.webp 1200w, /images/box-wip.webp 2000w"
          sizes="(max-width: 1040px) calc(100vw - 2.5rem), 1000px"
          width="2000"
          height="1506"
          decoding="async"
          loading="lazy"
          alt="Workbench view — box assembly surrounded by hand tools and templates."
          className="rounded-xl shadow-md mx-auto transform transition-transform duration-300"
        />
        <figcaption className="text-sm text-gray-500 mt-2">
          Workbench view — box assembly surrounded by hand tools and templates.
        </figcaption>
      </figure>

      {/* --- What I Learned --- */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">What I Learned</h2>
      <p className="text-gray-700 mb-8 leading-relaxed">
        Working entirely by hand made Kumiko a study in control, patience, and
        iterative learning. Every improvement — sharper chisel angles, steadier
        cuts, more precise jigs — was earned through repetition and self-correction.
      </p>

      <ul className="list-disc list-inside text-gray-700 mb-12 space-y-2">
        <li>Understanding tolerance and cumulative error — the physical equivalent of debugging.</li>
        <li>Iterative refinement through testing and adjustment.</li>
        <li>Modular design thinking — how each component supports the whole.</li>
        <li>Material understanding — matching properties to purpose.</li>
        <li>Developing custom tools and processes to improve workflow efficiency.</li>
      </ul>

      {/* --- Why It Matters --- */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Why It Matters</h2>
      <p className="text-gray-700 mb-8 leading-relaxed">
        Kumiko, at its core, is about harmony — between precision and intuition,
        form and function. Those same principles guide my approach to game
        development: creating systems that are elegant, efficient, and expressive.
      </p>
      <p className="text-gray-700 mb-8 leading-relaxed">
        Both disciplines reward patience and iterative thinking. Both demand
        understanding not just <em>what</em> you’re building, but <em>how</em> each
        small decision affects the whole. Whether it’s code, circuits, or wood, I’m
        drawn to the same challenge — <strong>bringing order and beauty out of complexity.</strong>
      </p>
      <footer className="legacy-page__cta">
        <p>Making these pieces exercises the same patience, tooling, and systems thinking I bring to technical work.</p>
        <CareerActions />
      </footer>
    </main>
  );
}
