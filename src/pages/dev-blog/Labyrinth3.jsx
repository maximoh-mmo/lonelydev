export default function Labyrinth3() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold mb-2">Making the Labyrinth Shift!</h1>
      <p className="text-gray-500 mb-8">Posted on October 28, 2025</p>

      <p className="mb-6">
        Last time, we laid the groundwork for our digital version of <em>The Crazy Labyrinth</em> —
        building the concept of a grid, tiles, and a spare tile that can slide into the maze to change its layout.
      </p>

      <p className="mb-8">
        This week, we bring that concept to life. We now have a working Labyrinth grid in Unity,
        complete with tile movement, grid shifting, and a simple input system to control it — all in
        preparation for the procedural generation and gameplay phases ahead.
      </p>

      <h2 className="text-2xl font-semibold mb-4">🎯 The Goal for This Phase</h2>
      <p className="mb-6">Our objectives for this step were:</p>
      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Generate a grid of random tile types (Straight, Bend, or T-junction)</li>
        <li>Keep track of the spare tile (the “one out” tile that will be pushed in)</li>
        <li>Allow inserting the spare tile from any valid side of the grid</li>
        <li>Have the inserted tile “push” a row or column, ejecting the opposite tile</li>
        <li>Animate tile movement to visually represent the shifting labyrinth</li>
        <li>Set up basic keyboard controls for shifting (W, A, S, D)</li>
      </ul>
      <p className="mb-8">It’s a deceptively simple mechanic, but it’s the foundation that the whole labyrinth gameplay sits on.</p>

      <h2 className="text-2xl font-semibold mb-4">🧩 Structuring the System</h2>
      <p className="mb-6">
        The core of the project is the <code>LabyrinthGrid</code> component, managing a 2D array of <code>Tile</code> objects
        and the spare tile, along with logic to insert and shift them around the board.
      </p>
      <p className="mb-6">
        We also introduced a lightweight <code>GridPosition</code> struct to represent coordinates — making it easier to reason
        about tile positions and equality checks without relying on raw integers.
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`public struct GridPosition : IEquatable<GridPosition>
{
    private readonly int _x;
    private readonly int _y;
    public int X => _x;
    public int Y => _y;

    public static readonly GridPosition Invalid = new GridPosition(-1, -1);

    // Custom operators for clarity and convenience
    public static GridPosition operator +(GridPosition a, GridPosition b) =>
        new GridPosition(a._x + b._x, a._y + b._y);
}`}
      </pre>

      <h2 className="text-2xl font-semibold mb-4">🧭 Input and Movement</h2>
      <p className="mb-6">For player control, we’re using Unity’s Input System directly — just simple key bindings for now:</p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`_shiftUp = new InputAction("Shift Up");
_shiftUp.AddBinding("<Keyboard>/W");
_shiftUp.Enable();`}
      </pre>

      <p className="mb-6">When one of these is pressed, we insert the spare tile into the corresponding edge:</p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`if (_shiftUp.WasPerformedThisFrame())
    InsertTile(new GridPosition(3, 0));`}
      </pre>

      <h2 className="text-2xl font-semibold mb-4">🔄 Shifting the Grid</h2>
      <p className="mb-6">
        When we insert a tile, we determine which direction the shift should occur — up, down, left, or right — and perform the array manipulation:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`private Tile ShiftRowRight(int row)
{
    var ejected = _tiles[gridSize - 1, row];
    for (var x = gridSize - 1; x > 0; x--)
        _tiles[x, row] = _tiles[x - 1, row];
    _tiles[0, row] = _spareTile;
    return ejected;
}`}
      </pre>

      <p className="mb-8">
        This pattern applies for all directions, ejecting the opposite tile and updating the spare. To prevent undoing the last move, we track the previous insertion and disallow reversals.
      </p>

      <h2 className="text-2xl font-semibold mb-4">🌀 Visual Movement with Animation</h2>
      <p className="mb-6">
        We now animate every tile when the labyrinth shifts, so it looks fluid and satisfying.
        Instead of running dozens of separate coroutines, we batch the updates into one smooth
        animation coroutine:      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`private IEnumerator AnimateAllTiles(float duration = 0.5f)
{
    var startPositions = new Dictionary<Tile, Vector3>();
    var targetPositions = new Dictionary<Tile, Vector3>();

    // Record start and target positions
    for (var x = 0; x < gridSize; x++)
        for (var y = 0; y < gridSize; y++)
            if (_tiles[x, y])
            {
                startPositions[_tiles[x, y]] = _tiles[x, y].transform.position;
                targetPositions[_tiles[x, y]] = new Vector3(x - _offset, y - _offset, 0);
            }

    // Smooth interpolation
    float elapsed = 0f;
    while (elapsed < duration)
    {
        float t = elapsed / duration;
        foreach (var kvp in startPositions)
            kvp.Key.transform.position = Vector3.Lerp(kvp.Value, targetPositions[kvp.Key], t);
        elapsed += Time.deltaTime;
        yield return null;
    }

    foreach (var kvp in targetPositions)
        kvp.Key.transform.position = kvp.Value;
}`}
      </pre>

      <h2 className="text-2xl font-semibold mb-4">🧱 Quality of Life Additions</h2>
      <h3 className="text-xl font-semibold mb-2">[ContextMenu] for Quick Testing</h3>
      <p className="mb-6">
        Unity’s <code>[ContextMenu]</code> allows triggering functions from the Inspector — no runtime code required. We applied it to <code>InitializeGrid()</code>:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed">
{`[ContextMenu("Rebuild Grid")]
private void InitializeGrid() { ... }`}
      </pre>

      <h2 className="text-2xl font-semibold mb-4">🧩 The Result</h2>

{/* Video */}
      <div className="aspect-[4/3] mb-10 rounded-lg overflow-hidden shadow-lg">
        <video
          className="w-full h-full object-cover"
          src="/video/grid-shift.mp4"
          autoPlay
          loop
          muted
          playsInline
          alt="Labyrinth grid shifting preview"
        />
      </div>
      <p className="mb-6">At this stage, the labyrinth:</p>
      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Randomly generates a full grid of tiles</li>
        <li>Has a spare tile ready for insertion</li>
        <li>Responds to keyboard input (W, A, S, D)</li>
        <li>Smoothly shifts tiles with animation</li>
        <li>Prevents illegal reverse insertions</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4">🔮 Next Steps</h2>
      <p className="mb-6">In the next phase, we’ll focus on:</p>
      <ul className="list-disc list-inside mb-8 space-y-1">
        <li>Introducing fixed tiles (corners)</li>
        <li>Adding visual insertion indicators (clickable entry points)</li>
        <li>Tracking paths and connectivity between tiles</li>
      </ul>

      <p className="mb-8">
        Once these pieces are in place, we can add player tokens and objectives, transforming this demo into a playable Labyrinth game.
      </p>
    </main>
  );
}
