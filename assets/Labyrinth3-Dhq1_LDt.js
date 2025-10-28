import{j as e}from"./index-akp9ZBEU.js";function i(){return e.jsxs("main",{className:"max-w-3xl mx-auto px-6 py-12 text-gray-800",children:[e.jsx("h1",{className:"text-4xl font-bold mb-2",children:"Making the Labyrinth Shift!"}),e.jsx("p",{className:"text-gray-500 mb-8",children:"Posted on October 28, 2025"}),e.jsxs("p",{className:"mb-6",children:["Last time, we laid the groundwork for our digital version of ",e.jsx("em",{children:"The Crazy Labyrinth"})," — building the concept of a grid, tiles, and a spare tile that can slide into the maze to change its layout."]}),e.jsx("p",{className:"mb-8",children:"This week, we bring that concept to life. We now have a working Labyrinth grid in Unity, complete with tile movement, grid shifting, and a simple input system to control it — all in preparation for the procedural generation and gameplay phases ahead."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🎯 The Goal for This Phase"}),e.jsx("p",{className:"mb-6",children:"Our objectives for this step were:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Generate a grid of random tile types (Straight, Bend, or T-junction)"}),e.jsx("li",{children:"Keep track of the spare tile (the “one out” tile that will be pushed in)"}),e.jsx("li",{children:"Allow inserting the spare tile from any valid side of the grid"}),e.jsx("li",{children:"Have the inserted tile “push” a row or column, ejecting the opposite tile"}),e.jsx("li",{children:"Animate tile movement to visually represent the shifting labyrinth"}),e.jsx("li",{children:"Set up basic keyboard controls for shifting (W, A, S, D)"})]}),e.jsx("p",{className:"mb-8",children:"It’s a deceptively simple mechanic, but it’s the foundation that the whole labyrinth gameplay sits on."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🧩 Structuring the System"}),e.jsxs("p",{className:"mb-6",children:["The core of the project is the ",e.jsx("code",{children:"LabyrinthGrid"})," component, managing a 2D array of ",e.jsx("code",{children:"Tile"})," objects and the spare tile, along with logic to insert and shift them around the board."]}),e.jsxs("p",{className:"mb-6",children:["We also introduced a lightweight ",e.jsx("code",{children:"GridPosition"})," struct to represent coordinates — making it easier to reason about tile positions and equality checks without relying on raw integers."]}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`public struct GridPosition : IEquatable<GridPosition>
{
    private readonly int _x;
    private readonly int _y;
    public int X => _x;
    public int Y => _y;

    public static readonly GridPosition Invalid = new GridPosition(-1, -1);

    // Custom operators for clarity and convenience
    public static GridPosition operator +(GridPosition a, GridPosition b) =>
        new GridPosition(a._x + b._x, a._y + b._y);
}`}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🧭 Input and Movement"}),e.jsx("p",{className:"mb-6",children:"For player control, we’re using Unity’s Input System directly — just simple key bindings for now:"}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`_shiftUp = new InputAction("Shift Up");
_shiftUp.AddBinding("<Keyboard>/W");
_shiftUp.Enable();`}),e.jsx("p",{className:"mb-6",children:"When one of these is pressed, we insert the spare tile into the corresponding edge:"}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`if (_shiftUp.WasPerformedThisFrame())
    InsertTile(new GridPosition(3, 0));`}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🔄 Shifting the Grid"}),e.jsx("p",{className:"mb-6",children:"When we insert a tile, we determine which direction the shift should occur — up, down, left, or right — and perform the array manipulation:"}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`private Tile ShiftRowRight(int row)
{
    var ejected = _tiles[gridSize - 1, row];
    for (var x = gridSize - 1; x > 0; x--)
        _tiles[x, row] = _tiles[x - 1, row];
    _tiles[0, row] = _spareTile;
    return ejected;
}`}),e.jsx("p",{className:"mb-8",children:"This pattern applies for all directions, ejecting the opposite tile and updating the spare. To prevent undoing the last move, we track the previous insertion and disallow reversals."}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🌀 Visual Movement with Animation"}),e.jsx("p",{className:"mb-6",children:"We now animate every tile when the labyrinth shifts, so it looks fluid and satisfying. Instead of running dozens of separate coroutines, we batch the updates into one smooth animation coroutine:      "}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`private IEnumerator AnimateAllTiles(float duration = 0.5f)
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
}`}),e.jsx("div",{className:"aspect-square mb-10 rounded-lg overflow-hidden shadow-lg",children:e.jsx("video",{className:"w-full h-full object-cover",src:"/videos/grid-shift.mp4",autoPlay:!0,loop:!0,muted:!0,playsInline:!0})}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🧱 Quality of Life Additions"}),e.jsx("h3",{className:"text-xl font-semibold mb-2",children:"[ContextMenu] for Quick Testing"}),e.jsxs("p",{className:"mb-6",children:["Unity’s ",e.jsx("code",{children:"[ContextMenu]"})," allows triggering functions from the Inspector — no runtime code required. We applied it to ",e.jsx("code",{children:"InitializeGrid()"}),":"]}),e.jsx("pre",{className:"bg-gray-900 text-green-300 text-sm p-4 rounded-lg mb-6 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed",children:`[ContextMenu("Rebuild Grid")]
private void InitializeGrid() { ... }`}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🧩 The Result"}),e.jsx("div",{className:"w-full mb-10 rounded-lg overflow-hidden shadow-lg",children:e.jsx("img",{src:"/images/shifting-grid.png",alt:"Labyrinth grid shifting preview"})}),e.jsx("p",{className:"mb-6",children:"At this stage, the labyrinth:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Randomly generates a full grid of tiles"}),e.jsx("li",{children:"Has a spare tile ready for insertion"}),e.jsx("li",{children:"Responds to keyboard input (W, A, S, D)"}),e.jsx("li",{children:"Smoothly shifts tiles with animation"}),e.jsx("li",{children:"Prevents illegal reverse insertions"})]}),e.jsx("h2",{className:"text-2xl font-semibold mb-4",children:"🔮 Next Steps"}),e.jsx("p",{className:"mb-6",children:"In the next phase, we’ll focus on:"}),e.jsxs("ul",{className:"list-disc list-inside mb-8 space-y-1",children:[e.jsx("li",{children:"Introducing fixed tiles (corners)"}),e.jsx("li",{children:"Adding visual insertion indicators (clickable entry points)"}),e.jsx("li",{children:"Tracking paths and connectivity between tiles"})]}),e.jsx("p",{className:"mb-8",children:"Once these pieces are in place, we can add player tokens and objectives, transforming this demo into a playable Labyrinth game."})]})}export{i as default};
