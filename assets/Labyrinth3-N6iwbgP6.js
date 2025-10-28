import{j as e}from"./index-ugAddjc1.js";function t(){return e.jsxs("article",{className:"prose prose-invert mx-auto",children:[e.jsx("h1",{children:"Making the Labyrinth Shift!"}),e.jsxs("p",{children:["Last time, we laid the groundwork for our digital version of ",e.jsx("em",{children:"The Crazy Labyrinth"})," — building the concept of a grid, tiles, and a spare tile that can slide into the maze to change its layout."]}),e.jsx("p",{children:"This week, we bring that concept to life. We now have a working Labyrinth grid in Unity, complete with tile movement, grid shifting, and a simple input system to control it — all in preparation for the procedural generation and gameplay phases ahead."}),e.jsx("h2",{children:"🎯 The Goal for This Phase"}),e.jsx("p",{children:"Our objectives for this step were:"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Generate a grid of random tile types (Straight, Bend, or T-junction)"}),e.jsx("li",{children:"Keep track of the spare tile (the “one out” tile that will be pushed in)"}),e.jsx("li",{children:"Allow inserting the spare tile from any valid side of the grid"}),e.jsx("li",{children:"Have the inserted tile “push” a row or column, ejecting the opposite tile"}),e.jsx("li",{children:"Animate tile movement to visually represent the shifting labyrinth"}),e.jsx("li",{children:"Set up basic keyboard controls for shifting (W, A, S, D)"})]}),e.jsx("p",{children:"It’s a deceptively simple mechanic, but it’s the foundation that the whole labyrinth gameplay sits on."}),e.jsx("h2",{children:"🧩 Structuring the System"}),e.jsxs("p",{children:["The core of the project is the new ",e.jsx("code",{children:"LabyrinthGrid"})," component. It manages a 2D array of ",e.jsx("code",{children:"Tile"})," objects and the spare tile, along with the logic to insert and shift them around the board."]}),e.jsxs("p",{children:["We also introduced a lightweight ",e.jsx("code",{children:"GridPosition"})," struct to represent coordinates — making it easier to reason about tile positions and equality checks without relying on raw integers."]}),e.jsx("pre",{children:e.jsx("code",{className:"language-csharp",children:`public struct GridPosition : IEquatable<GridPosition>
{
    private readonly int _x;
    private readonly int _y;
    public int X => _x;
    public int Y => _y;

    public static readonly GridPosition Invalid = new GridPosition(-1, -1);

    // Custom operators for clarity and convenience
    public static GridPosition operator +(GridPosition a, GridPosition b) =>
        new GridPosition(a._x + b._x, a._y + b._y);
}`})}),e.jsx("p",{children:"It’s small, but it keeps our grid logic clean and clear, especially when preventing illegal or reversed moves."}),e.jsx("h2",{children:"🧭 Input and Movement"}),e.jsx("p",{children:"For player control, we’re using Unity’s Input System directly — just simple key bindings for now:"}),e.jsx("pre",{children:e.jsx("code",{className:"language-csharp",children:`_shiftUp = new InputAction("Shift Up");
_shiftUp.AddBinding("<Keyboard>/W");
_shiftUp.Enable();`})}),e.jsx("p",{children:"When one of these is pressed, we insert the spare tile into the corresponding edge:"}),e.jsx("pre",{children:e.jsx("code",{className:"language-csharp",children:`if (_shiftUp.WasPerformedThisFrame())
    InsertTile(new GridPosition(3, 0));`})}),e.jsx("p",{children:"Later on, we’ll expand this to handle all valid insert points and UI interaction (think glowing arrows you can click or tap)."}),e.jsx("h2",{children:"🔄 Shifting the Grid"}),e.jsx("p",{children:"Here’s where the fun happens. When we insert a tile, we determine which direction the shift should occur — up, down, left, or right — and perform the appropriate array manipulation:"}),e.jsx("pre",{children:e.jsx("code",{className:"language-csharp",children:`private Tile ShiftRowRight(int row)
{
    var ejected = _tiles[gridSize - 1, row];
    for (var x = gridSize - 1; x > 0; x--)
        _tiles[x, row] = _tiles[x - 1, row];
    _tiles[0, row] = _spareTile;
    return ejected;
}`})}),e.jsx("p",{children:"This same pattern applies for shifting left or vertically — the tile on the opposite side is “ejected,” becoming the new spare tile."}),e.jsx("p",{children:"To prevent the player from just undoing their last move (as per the board game’s rules), we also store the last insertion point and disallow a direct reversal."}),e.jsx("h2",{children:"🌀 Visual Movement with Animation"}),e.jsx("p",{children:"We now animate every tile when the labyrinth shifts, so it looks fluid and satisfying. Instead of running dozens of separate coroutines, we batch the updates into one smooth animation coroutine:"}),e.jsx("pre",{children:e.jsx("code",{className:"language-csharp",children:`private IEnumerator AnimateAllTiles(float duration = 0.5f)
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
}`})}),e.jsx("p",{children:"This gives us a smooth sliding motion for every tile in the grid, while keeping everything perfectly aligned at the end."}),e.jsx("div",{className:"aspect-square mb-10 rounded-lg overflow-hidden shadow-lg",children:e.jsx("video",{className:"w-full h-full object-cover",src:"/videos/grid-shift.mp4",autoPlay:!0,loop:!0,muted:!0,playsInline:!0})}),e.jsx("h2",{children:"🧱 Quality of Life Additions"}),e.jsx("h3",{children:"[ContextMenu] for Quick Testing"}),e.jsxs("p",{children:["Unity has a neat feature called ",e.jsx("code",{children:"[ContextMenu]"}),", which lets you trigger functions right from the Inspector — no runtime code needed."]}),e.jsxs("p",{children:["We added this to ",e.jsx("code",{children:"InitializeGrid()"})," so we can rebuild the maze instantly in edit mode:"]}),e.jsx("pre",{children:e.jsx("code",{className:"language-csharp",children:`[ContextMenu("Rebuild Grid")]
private void InitializeGrid() { ... }`})}),e.jsx("p",{children:"Now we can quickly test random layouts or new tile sets without restarting Play Mode — a big time-saver during iteration."}),e.jsx("h2",{children:"🧩 The Result"}),e.jsx("div",{className:"w-full mb-10 rounded-lg overflow-hidden shadow-lg",children:e.jsx("img",{src:"/images/shifting-grid.png",alt:"Labyrinth grid shifting preview"})}),e.jsx("p",{children:"At this stage, the labyrinth:"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Randomly generates a full grid of tiles"}),e.jsx("li",{children:"Has a spare tile ready for insertion"}),e.jsx("li",{children:"Responds to keyboard input (W, A, S, D)"}),e.jsx("li",{children:"Smoothly shifts tiles with animation"}),e.jsx("li",{children:"Prevents illegal reverse insertions"})]}),e.jsxs("p",{children:["It’s starting to feel like the real ",e.jsx("em",{children:"Labyrinth"})," — and seeing the maze physically move around as you press the keys is pretty magical."]}),e.jsx("h2",{children:"🔮 Next Steps"}),e.jsx("p",{children:"In the next phase, we’ll focus on:"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Introducing fixed tiles (like the corners in the board game)"}),e.jsx("li",{children:"Adding visual insertion indicators (clickable entry points)"}),e.jsx("li",{children:"Tracking paths and connectivity between tiles"})]}),e.jsx("p",{children:"Once those pieces are in place, we’ll finally be able to introduce player tokens and objectives, and start turning this from a grid demo into a real game."})]})}export{t as default};
