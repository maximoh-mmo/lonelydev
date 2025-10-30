export default function Labyrinth4() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold mb-2">
        Phase 3: From Random Chaos to Structured Generation — Evolving the Labyrinth System
      </h1>
      <p className="text-gray-500 mb-8">Posted on October 29, 2025</p>

      <p className="mb-6">
        Following the progress in Phase 2, where the labyrinth grid first took shape through random
        tile placement and basic connection validation, the focus of this phase shifted toward
        structure, extensibility, and control. This was less about visual output, and more about
        engineering the system into something robust, testable, and expressive.
      </p>

      <h2 className="text-2xl font-semibold mb-4">🧱 Reassessing the Foundation</h2>
      <p className="mb-6">
        The earlier implementation achieved visual results quickly — it could fill a grid with tile
        prefabs and apply rotations to approximate connectivity. However, it became clear that the
        underlying design was too rigid. The generator’s logic was buried inside monolithic methods
        that directly instantiated <code>GameObjects</code>, which made experimentation difficult.
        Each design tweak risked breaking the system because generation, validation, and
        presentation were tightly coupled.
      </p>

      <blockquote className="border-l-4 border-gray-400 pl-4 italic mb-6">
        “Stop building tiles; start defining rules.”
      </blockquote>

      <h2 className="text-2xl font-semibold mb-4">🧩 Introducing the Constraint System</h2>
      <p className="mb-6">
        The first major architectural shift came with the introduction of the{" "}
        <code>ILabyrinthConstraint</code> interface — a lightweight abstraction that represents a
        rule applied during generation.
      </p>
      <p className="mb-6">
        Instead of hardcoding adjacency logic, the generator now queries a set of constraint objects
        that each implement a single validation rule. This approach allows constraints to be added,
        removed, or replaced without modifying the core generator.
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`public interface ILabyrinthConstraint
{
    bool Validate(TileConnection[,] grid, int x, int y, TileType type, int rotation, TileConnection mask);
}`}
      </pre>

      <p className="mb-6">
        The simplest example is the <code>ConnectionConstraint</code>, which ensures that each tile
        aligns correctly with its neighbors’ open paths:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`public class ConnectionConstraint : ILabyrinthConstraint
{
    public bool Validate(TileConnection[,] grid, int x, int y, TileType type, int rotation, TileConnection mask)
    {
        if (x > 0 && grid[x - 1, y] != 0)
        {
            var left = grid[x - 1, y];
            if (HasConnection(left, TileConnection.Right) != HasConnection(mask, TileConnection.Left))
                return false;
        }

        if (y > 0 && grid[x, y - 1] != 0)
        {
            var down = grid[x, y - 1];
            if (HasConnection(down, TileConnection.Up) != HasConnection(mask, TileConnection.Down))
                return false;
        }

        return true;
    }

    private static bool HasConnection(TileConnection mask, TileConnection dir)
        => (mask & dir) == dir;
}`}
      </pre>

      <p className="mb-8">
        With this in place, adjacency checks are no longer special-case logic inside the generator —
        they’re just one of many possible constraints. This unlocks powerful future flexibility:
        tile distribution rules, symmetry constraints, difficulty scaling, or even narrative layout
        logic can all be defined the same way.
      </p>

      <h2 className="text-2xl font-semibold mb-4">⚙️ A Cleaner API Layer</h2>
      <p className="mb-6">
        A second improvement came with the introduction of a dedicated entry point — the{" "}
        <code>LabyrinthGeneratorAPI</code>.
      </p>
      <p className="mb-6">
        Previously, generating a labyrinth required manually constructing the generator, adding
        constraints, and invoking its methods directly. That cluttered the gameplay code and made it
        harder to swap generation strategies later.
      </p>
      <p className="mb-6">
        The new API wraps this into a single clean call:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`public static Tile[,] Generate(
    int gridSize, 
    TileType[] tileTypes, 
    Func<TileType, Tile> spawnTile, 
    params ILabyrinthConstraint[] constraints)
{
    var generator = new LabyrinthGenerator(tileTypes, gridSize);
    foreach (var c in constraints) generator.AddConstraint(c);
    generator.AddConstraint(new Constraints.ConnectionConstraint());
    return generator.Generate(gridSize, tileTypes, spawnTile);
}`}
      </pre>

      <p className="mb-8">
        This pattern — lightweight factory on top of a modular generator — strikes a strong balance
        between ease of use and extensibility.
      </p>

      <h2 className="text-2xl font-semibold mb-4">🧠 Logical Generation Before Physical Instantiation</h2>
      <p className="mb-6">
        A key strength of the earlier implementation was that tile prefabs were never instantiated
        until the full grid was completed. This design already avoided one of Unity’s most common
        procedural pitfalls — the performance cost of constant creation and destruction cycles.
      </p>
      <p className="mb-6">
        However, even with that optimization, the process still treated visual tiles as the primary
        representation of the labyrinth. This phase introduced a conceptual shift: separating the
        logical grid from its visual layer.
      </p>
      <p className="mb-6">
        Now, the generator first operates on an abstract data structure of{" "}
        <code>TileConnection</code> masks. Each potential placement is validated purely in logic —
        applying constraints, rotations, and adjacency checks — before any GameObjects are spawned.
        Only once a tile type and rotation have been selected does the generator call the provided{" "}
        <code>spawnTile</code> delegate to create the prefab:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`var (type, rotation, connectionMask) = PickValidTile(x, y, logicalGrid, tileTypes);
logicalGrid[x, y] = connectionMask;

var tile = spawnTile(type);
tile.type = type;
tile.name = $"{type.name}_{x}_{y}";
tile.SetRotation(rotation);`}
      </pre>

      <p className="mb-8">
        This dramatically reduces overhead, allowing the generator to scale up to larger grids or
        more complex constraint sets without performance issues.
      </p>

      <h2 className="text-2xl font-semibold mb-4">🎮 Integration with the Gameplay Layer</h2>
      <p className="mb-6">
        On the gameplay side, the <code>LabyrinthGrid</code> <code>MonoBehaviour</code> was updated
        to integrate seamlessly with the new generation pipeline. It now uses the API directly,
        manages the spare tile mechanic, and handles shifting rows and columns with smooth
        coroutine-driven animation.
      </p>

      <p className="mb-6">
        A simple keyboard control scheme (<kbd>W</kbd>/<kbd>A</kbd>/<kbd>S</kbd>/<kbd>D</kbd>)
        triggers the grid shifts, and the system now tracks previous moves to prevent immediate
        reversals — a subtle but meaningful gameplay rule that enhances puzzle flow.
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-10 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`if (_hasPreviousMove && entryPoint == GetOppositePosition(_lastInsertPos))
{
    Debug.LogWarning("Cannot reverse previous insertion directly!");
    return;
}`}
      </pre>

      <h2 className="text-2xl font-semibold mb-4">🪞 Design Reflections</h2>
      <p className="mb-6">
        Phase 3 marks a clear evolution from procedural enthusiasm to intentional architecture.
      </p>

      <div className="bg-gray-100 text-gray-800 p-6 rounded-lg shadow mb-8">
        <p className="font-semibold mb-2">Before → Now</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Before:</strong> Generation was random, reactive, and hard to control.<br />
            <strong>Now:</strong> Generation is rule-based, modular, and extensible.
          </li>
          <li>
            <strong>Before:</strong> Gameplay and generation logic were intertwined.<br />
            <strong>Now:</strong> The generator is a self-contained system that can serve multiple
            gameplay contexts.
          </li>
        </ul>
      </div>

      <p className="mb-6">
        This phase also laid the foundation for more advanced features — dynamic difficulty
        adjustment, thematic tile grouping, or even procedural level progression. By framing
        everything around constraints and rules, future expansion becomes a matter of composition,
        not refactoring.
      </p>
    </main>
  );
}
