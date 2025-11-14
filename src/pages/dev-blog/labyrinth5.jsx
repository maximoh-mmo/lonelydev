export default function Labyrinth5() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold mb-2">
        🧠 Phase 4 — Building a Real Constraint Solver for the Labyrinth
      </h1>
      <p className="text-gray-500 mb-8">Posted on November XX, 2025</p>

      <p className="mb-6">
        After several phases of visual output, shifting tiles, and gameplay
        mechanics, this week took a different turn. Instead of focusing on
        what the labyrinth <em>looks</em> like, the work shifted toward
        understanding how the generator <em>thinks</em>. This phase marked the
        beginning of a more deliberate approach to the problem — treating the
        Labyrinth as a <strong>constraint satisfaction problem</strong>
        rather than a random tile arranger.
      </p>

      <p className="mb-8">
        The goal? To create a robust system that can evaluate whether a tile
        placement is valid under a growing collection of rules, and eventually
        allow the labyrinth to be generated with intent, structure, and even
        difficulty.
      </p>

      <h2 className="text-2xl font-semibold mb-4">🎯 Why Constraint Satisfaction?</h2>
      <p className="mb-6">
        In Phase 3, the concept of modular constraints was introduced through
        the <code>ILabyrinthConstraint</code> interface. This was already a
        big improvement — adjacency checks, tile compatibility, and rotation
        validity were no longer hardcoded into the generator.
      </p>

      <p className="mb-6">
        But adding more constraints made the cracks show. Random tile
        placement works fine for simple rules, but becomes brittle as soon as
        additional structure is required. Before long, you end up with
        placement failures that are impossible to debug or reproduce.
      </p>

      <p className="mb-8">
        The solution was clear: move toward a proper constraint satisfaction
        model, where the generator evaluates <strong>feasible candidates</strong> rather than
        guessing until something fits.
      </p>

      <h2 className="text-2xl font-semibold mb-4">🧩 Introducing the Constraint Context</h2>
      <p className="mb-6">
        One of the first architectural improvements was the introduction of a
        dedicated <code>ConstraintContext</code> — a lightweight struct that
        carries all the information a constraint needs to evaluate a tile
        placement.
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">{`public readonly struct ConstraintContext
{
    public readonly TileConnection[,] grid;
    public readonly int x, y;
    public readonly TileType type;
    public readonly int rotation;
    public readonly TileConnection mask;

    public ConstraintContext(TileConnection[,] grid, int x, int y, TileType type, int rotation, TileConnection mask)
    {
        this.grid = grid;
        this.x = x;
        this.y = y;
        this.type = type;
        this.rotation = rotation;
        this.mask = mask;
    }
}`}</pre>

      <p className="mb-8">
        This change reduced method signatures dramatically and made constraint
        logic more consistent. Each rule now receives a single context object
        instead of multiple raw parameters, which makes adding new constraints
        far easier.
      </p>

      <h2 className="text-2xl font-semibold mb-4">✔️ A Unified Validation Pipeline</h2>
      <p className="mb-6">
        Another major addition was the creation of a single pipeline
        responsible for evaluating all active constraints. Instead of each
        constraint being checked in ad-hoc places, the generator now flows
        everything through a clear, composable validator.
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">{`public static bool ValidateAll(
    ConstraintContext ctx,
    IEnumerable<ILabyrinthConstraint> constraints,
    out List<ILabyrinthConstraint> failed)
{
    failed = new List<ILabyrinthConstraint>();

    foreach (var c in constraints)
    {
        if (!c.Validate(ctx))
            failed.Add(c);
    }

    return failed.Count == 0;
}`}</pre>

      <p className="mb-8">
        The generator can now not only determine whether a placement is valid,
        but also <strong>which constraints failed</strong>. This is invaluable for debugging,
        tweaking rules, or building editor tools later on.
      </p>

      <h2 className="text-2xl font-semibold mb-4">🔍 Evaluating Candidate Tiles</h2>
      <p className="mb-6">
        With the validation pipeline in place, the next step was to evaluate
        <em>all</em> possible combinations of tile types and rotations —
        selecting from only the candidates that satisfy all constraints.
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">{`var candidates = new List<(TileType, int, TileConnection)>();

foreach (var type in tileTypes)
{
    for (int rot = 0; rot < 4; rot++)
    {
        var mask = type.baseConnections.Rotate(rot);
        var ctx = new ConstraintContext(grid, x, y, type, rot, mask);

        if (ValidateAll(ctx, constraints, out _))
            candidates.Add((type, rot, mask));
    }
}`}</pre>

      <p className="mb-6">
        This effectively turns the generator into a simple constraint solver.
        Instead of hoping a tile fits, the system now understands <em>which</em>
        tiles fit and <em>why</em>.
      </p>

      <p className="mb-8">
        And because all logic happens before any GameObjects are spawned, the
        process remains lightweight and scalable.
      </p>

      <h2 className="text-2xl font-semibold mb-4">🎚️ Setting the Stage for Scored Generation</h2>
      <p className="mb-6">
        With the feasibility system working, the next step will be to
        introduce <strong>scoring</strong> — the ability to choose the
        <em>best</em> tile rather than the first valid one. This paves the way
        for:
      </p>

      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>difficulty biasing</li>
        <li>symmetry weighting</li>
        <li>thematic tile layouts</li>
        <li>or even soft constraints with penalties</li>
      </ul>

      <p className="mb-8">
        But even without scoring, the generator is now significantly more
        flexible, stable, and predictable than earlier versions.
      </p>

      <h2 className="text-2xl font-semibold mb-4">🧠 Design Reflections</h2>
      <p className="mb-6">
        Phase 4 represents a fundamental shift in how the labyrinth is built.
        The early stages were about rapid prototyping, visual feedback, and
        getting tiles on the board. This phase marks the transition from
        procedural enthusiasm to <strong>intentional architecture</strong>.
      </p>

      <p className="mb-6">
        Before: Generation was random, reactive, and hard to control.
        <br />
        Now: Generation is rule-based, modular, and extensible.
      </p>

      <p className="mb-6">
        Before: Gameplay and generation logic were tightly intertwined.
        <br />
        Now: The generator is a self-contained reasoning engine capable of
        supporting multiple gameplay contexts.
      </p>

      <p className="mb-8">
        This phase also laid the groundwork for more advanced features:
        dynamic difficulty, thematic tile clustering, or even procedural
        campaign progression. By reframing everything around constraints and
        rules, future expansion becomes a matter of <em>composition</em>, not
        refactoring.
      </p>

      <p className="mb-8 font-semibold">The labyrinth finally has a brain — next, we’ll teach it style.</p>
    </main>
  );
}
