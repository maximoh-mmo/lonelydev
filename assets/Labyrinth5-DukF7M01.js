import{j as e}from"./index-6dUpgJH4.js";function a(){return e.jsxs("main",{className:"max-w-3xl mx-auto px-6 py-12 text-gray-800",children:[e.jsx("h1",{className:"text-4xl font-bold mb-2",children:"🧠 Phase 4 — Building a Real Constraint Solver for the Labyrinth"}),e.jsx("p",{className:"text-gray-500 mb-8",children:"Posted on November 14, 2025"}),e.jsxs("p",{className:"mb-6",children:["After several phases of visual output, shifting tiles, and gameplay mechanics, this week took a different turn. Instead of focusing on what the labyrinth ",e.jsx("em",{children:"looks"})," like, the work shifted toward understanding how the generator ",e.jsx("em",{children:"thinks"}),". This phase marked the beginning of a more deliberate approach to the problem — treating the Labyrinth as a ",e.jsx("strong",{children:"constraint satisfaction problem "}),"rather than a random tile arranger."]}),e.jsx("p",{className:"mb-8",children:"The goal? To create a robust system that can evaluate whether a tile placement is valid under a growing collection of rules, and eventually allow the labyrinth to be generated with intent, structure, and even difficulty."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🎯 Why Constraint Satisfaction?"}),e.jsxs("p",{className:"mb-6",children:["In Phase 3, the concept of modular constraints was introduced through the ",e.jsx("code",{children:"ILabyrinthConstraint"})," interface. This was already a big improvement — adjacency checks, tile compatibility, and rotation validity were no longer hardcoded into the generator."]}),e.jsx("p",{className:"mb-6",children:"But adding more constraints made the cracks show. Random tile placement works fine for simple rules, but becomes brittle as soon as additional structure is required. Before long, you end up with placement failures that are impossible to debug or reproduce."}),e.jsxs("p",{className:"mb-8",children:["The solution was clear: move toward a proper constraint satisfaction model, where the generator evaluates ",e.jsx("strong",{children:"feasible candidates"})," rather than guessing until something fits."]}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🧩 Introducing the Constraint Context"}),e.jsxs("p",{className:"mb-6",children:["One of the first architectural improvements was the introduction of a dedicated ",e.jsx("code",{children:"ConstraintContext"})," — a lightweight struct that carries all the information a constraint needs to evaluate a tile placement."]}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`public readonly struct ConstraintContext
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
}`}),e.jsx("p",{className:"mb-8",children:"This change reduced method signatures dramatically and made constraint logic more consistent. Each rule now receives a single context object instead of multiple raw parameters, which makes adding new constraints far easier."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"✔️ A Unified Validation Pipeline"}),e.jsx("p",{className:"mb-6",children:"Another major addition was the creation of a single pipeline responsible for evaluating all active constraints. Instead of each constraint being checked in ad-hoc places, the generator now flows everything through a clear, composable validator."}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`public static bool ValidateAll(
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
}`}),e.jsxs("p",{className:"mb-8",children:["The generator can now not only determine whether a placement is valid, but also ",e.jsx("strong",{children:"which constraints failed"}),". This is invaluable for debugging, tweaking rules, or building editor tools later on."]}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🔍 Evaluating Candidate Tiles"}),e.jsxs("p",{className:"mb-6",children:["With the validation pipeline in place, the next step was to evaluate",e.jsx("em",{children:"all"})," possible combinations of tile types and rotations — selecting from only the candidates that satisfy all constraints."]}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`var candidates = new List<(TileType, int, TileConnection)>();

foreach (var type in tileTypes)
{
    for (int rot = 0; rot < 4; rot++)
    {
        var mask = type.baseConnections.Rotate(rot);
        var ctx = new ConstraintContext(grid, x, y, type, rot, mask);

        if (ValidateAll(ctx, constraints, out _))
            candidates.Add((type, rot, mask));
    }
}`}),e.jsxs("p",{className:"mb-6",children:["This effectively turns the generator into a simple constraint solver. Instead of hoping a tile fits, the system now understands ",e.jsx("em",{children:"which"}),"tiles fit and ",e.jsx("em",{children:"why"}),"."]}),e.jsx("p",{className:"mb-8",children:"And because all logic happens before any GameObjects are spawned, the process remains lightweight and scalable."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🎚️ Setting the Stage for Scored Generation"}),e.jsxs("p",{className:"mb-6",children:["With the feasibility system working, the next step will be to introduce ",e.jsx("strong",{children:"scoring"})," — the ability to choose the",e.jsx("em",{children:"best"})," tile rather than the first valid one. This paves the way for:"]}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"difficulty biasing"}),e.jsx("li",{children:"symmetry weighting"}),e.jsx("li",{children:"thematic tile layouts"}),e.jsx("li",{children:"or even soft constraints with penalties"})]}),e.jsx("p",{className:"mb-8",children:"But even without scoring, the generator is now significantly more flexible, stable, and predictable than earlier versions."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🧠 Design Reflections"}),e.jsxs("p",{className:"mb-6",children:["Phase 4 represents a fundamental shift in how the labyrinth is built. The early stages were about rapid prototyping, visual feedback, and getting tiles on the board. This phase marks the transition from procedural enthusiasm to ",e.jsx("strong",{children:"intentional architecture"}),"."]}),e.jsxs("p",{className:"mb-6",children:["Before: Generation was random, reactive, and hard to control.",e.jsx("br",{}),"Now: Generation is rule-based, modular, and extensible."]}),e.jsxs("p",{className:"mb-6",children:["Before: Gameplay and generation logic were tightly intertwined.",e.jsx("br",{}),"Now: The generator is a self-contained reasoning engine capable of supporting multiple gameplay contexts."]}),e.jsxs("p",{className:"mb-8",children:["This phase also laid the groundwork for more advanced features: dynamic difficulty, thematic tile clustering, or even procedural campaign progression. By reframing everything around constraints and rules, future expansion becomes a matter of ",e.jsx("em",{children:"composition"}),", not refactoring."]}),e.jsx("p",{className:"mb-8 font-semibold",children:"The labyrinth finally has a brain — next, we’ll teach it style."})]})}export{a as default};
