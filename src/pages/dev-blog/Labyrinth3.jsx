export default function Labyrinth3() {
  return (
    <article className="prose prose-invert mx-auto">
      <h1>Making the Labyrinth Shift!</h1>
      <p>
        Last time, we laid the groundwork for our digital version of <em>The Crazy Labyrinth</em> —
        building the concept of a grid, tiles, and a spare tile that can slide into the maze to
        change its layout.
      </p>
      <p>
        This week, we bring that concept to life. We now have a working Labyrinth grid in Unity,
        complete with tile movement, grid shifting, and a simple input system to control it — all in
        preparation for the procedural generation and gameplay phases ahead.
      </p>

      <h2>🎯 The Goal for This Phase</h2>
      <p>Our objectives for this step were:</p>
      <ul>
        <li>Generate a grid of random tile types (Straight, Bend, or T-junction)</li>
        <li>Keep track of the spare tile (the “one out” tile that will be pushed in)</li>
        <li>Allow inserting the spare tile from any valid side of the grid</li>
        <li>Have the inserted tile “push” a row or column, ejecting the opposite tile</li>
        <li>Animate tile movement to visually represent the shifting labyrinth</li>
        <li>Set up basic keyboard controls for shifting (W, A, S, D)</li>
      </ul>
      <p>
        It’s a deceptively simple mechanic, but it’s the foundation that the whole labyrinth
        gameplay sits on.
      </p>

      <h2>🧩 Structuring the System</h2>
      <p>
        The core of the project is the new <code>LabyrinthGrid</code> component. It manages a 2D
        array of <code>Tile</code> objects and the spare tile, along with the logic to insert and
        shift them around the board.
      </p>
      <p>
        We also introduced a lightweight <code>GridPosition</code> struct to represent coordinates —
        making it easier to reason about tile positions and equality checks without relying on raw
        integers.
      </p>

      <pre>
        <code className="language-csharp">{`public struct GridPosition : IEquatable<GridPosition>
{
    private readonly int _x;
    private readonly int _y;
    public int X => _x;
    public int Y => _y;

    public static readonly GridPosition Invalid = new GridPosition(-1, -1);

    // Custom operators for clarity and convenience
    public static GridPosition operator +(GridPosition a, GridPosition b) =>
        new GridPosition(a._x + b._x, a._y + b._y);
}`}</code>
      </pre>

      <p>
        It’s small, but it keeps our grid logic clean and clear, especially when preventing illegal
        or reversed moves.
      </p>

      <h2>🧭 Input and Movement</h2>
      <p>For player control, we’re using Unity’s Input System directly — just simple key bindings for now:</p>

      <pre>
        <code className="language-csharp">{`_shiftUp = new InputAction("Shift Up");
_shiftUp.AddBinding("<Keyboard>/W");
_shiftUp.Enable();`}</code>
      </pre>

      <p>When one of these is pressed, we insert the spare tile into the corresponding edge:</p>

      <pre>
        <code className="language-csharp">{`if (_shiftUp.WasPerformedThisFrame())
    InsertTile(new GridPosition(3, 0));`}</code>
      </pre>

      <p>
        Later on, we’ll expand this to handle all valid insert points and UI interaction (think
        glowing arrows you can click or tap).
      </p>

      <h2>🔄 Shifting the Grid</h2>
      <p>
        Here’s where the fun happens. When we insert a tile, we determine which direction the shift
        should occur — up, down, left, or right — and perform the appropriate array manipulation:
      </p>

      <pre>
        <code className="language-csharp">{`private Tile ShiftRowRight(int row)
{
    var ejected = _tiles[gridSize - 1, row];
    for (var x = gridSize - 1; x > 0; x--)
        _tiles[x, row] = _tiles[x - 1, row];
    _tiles[0, row] = _spareTile;
    return ejected;
}`}</code>
      </pre>

      <p>
        This same pattern applies for shifting left or vertically — the tile on the opposite side is
        “ejected,” becoming the new spare tile.
      </p>
      <p>
        To prevent the player from just undoing their last move (as per the board game’s rules), we
        also store the last insertion point and disallow a direct reversal.
      </p>

      <h2>🌀 Visual Movement with Animation</h2>
      <p>
        We now animate every tile when the labyrinth shifts, so it looks fluid and satisfying.
        Instead of running dozens of separate coroutines, we batch the updates into one smooth
        animation coroutine:
      </p>

      <pre>
        <code className="language-csharp">{`private IEnumerator AnimateAllTiles(float duration = 0.5f)
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

    // Smoothly interpolate positions
    float elapsed = 0f;
    while (elapsed < duration)
    {
        float t = elapsed / duration;
        foreach (var kvp in startPositions)
            kvp.Key.transform.position = Vector3.Lerp(kvp.Value, targetPositions[kvp.Key], t);
        elapsed += Time.deltaTime;
        yield return null;
    }

    // Snap to final position
    foreach (var kvp in targetPositions)
        kvp.Key.transform.position = kvp.Value;
}`}</code>
      </pre>

      <p>
        This gives us a smooth sliding motion for every tile in the grid, while keeping everything
        perfectly aligned at the end.
      </p>

      <div className="aspect-square mb-10 rounded-lg overflow-hidden shadow-lg">
        <video
          className="w-full h-full object-cover"
          src="/videos/grid-shift.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      <h2>🧱 Quality of Life Additions</h2>
      <h3>[ContextMenu] for Quick Testing</h3>
      <p>
        Unity has a neat feature called <code>[ContextMenu]</code>, which lets you trigger functions
        right from the Inspector — no runtime code needed.
      </p>
      <p>We added this to <code>InitializeGrid()</code> so we can rebuild the maze instantly in edit mode:</p>

      <pre>
        <code className="language-csharp">{`[ContextMenu("Rebuild Grid")]
private void InitializeGrid() { ... }`}</code>
      </pre>

      <p>
        Now we can quickly test random layouts or new tile sets without restarting Play Mode — a big
        time-saver during iteration.
      </p>

      <h2>🧩 The Result</h2>
      <div className="w-full mb-10 rounded-lg overflow-hidden shadow-lg">
        <img src="/images/shifting-grid.png" alt="Labyrinth grid shifting preview" />
      </div>
      <p>At this stage, the labyrinth:</p>
      <ul>
        <li>Randomly generates a full grid of tiles</li>
        <li>Has a spare tile ready for insertion</li>
        <li>Responds to keyboard input (W, A, S, D)</li>
        <li>Smoothly shifts tiles with animation</li>
        <li>Prevents illegal reverse insertions</li>
      </ul>
      <p>
        It’s starting to feel like the real <em>Labyrinth</em> — and seeing the maze physically move
        around as you press the keys is pretty magical.
      </p>

      <h2>🔮 Next Steps</h2>
      <p>In the next phase, we’ll focus on:</p>
      <ul>
        <li>Introducing fixed tiles (like the corners in the board game)</li>
        <li>Adding visual insertion indicators (clickable entry points)</li>
        <li>Tracking paths and connectivity between tiles</li>
      </ul>
      <p>
        Once those pieces are in place, we’ll finally be able to introduce player tokens and
        objectives, and start turning this from a grid demo into a real game.
      </p>
    </article>
  );
}