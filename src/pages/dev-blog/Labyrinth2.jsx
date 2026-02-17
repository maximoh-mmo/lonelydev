export default function Labyrinth2() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
        Designing a Dynamic Maze Tile System in Unity
      </h1>
      <p className="text-gray-500 mb-8 text-center italic">Posted on October 27, 2025</p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        In the previous post, I introduced the idea of recreating{" "}
        <em>Verrückte Labyrinth</em> in Unity — a living, shifting maze that
        we can use to explore procedural generation.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Today, we start building it for real. Phase 1 is all about data and
        representation — defining what a tile is, how it connects to its
        neighbors, and making it appear in the scene as a small piece of a
        larger, living system.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">🧩 What We’re Building</h2>
      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Three tile archetypes: Straight, Corner, and T-Junction</li>
        <li>Rotations that affect connectivity</li>
        <li>A simple grid of randomized tiles displayed in Unity</li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 1 – Representing Tile Connections</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        The magic of the physical Labyrinth board is that each tile connects to
        others along its open paths. To capture that in code, we can use an enum
        with bit flags, one for each direction:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`[Flags]
public enum TileConnection
{
    None  = 0,
    Up    = 1 << 0,
    Right = 1 << 1,
    Down  = 1 << 2,
    Left  = 1 << 3
}`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        This lets us describe any tile shape compactly, for example:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`// A corner piece connecting Up and Right
TileConnection.Up | TileConnection.Right`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">It’s efficient to test:</p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`bool connectsUp = (connections & TileConnection.Up) != 0;`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        …and easy to rotate — which we’ll handle next.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 2 – Rotating Tiles</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Since each tile can be rotated 90° at a time, I wrote a simple helper to
        rotate the connection mask clockwise:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`public static class TileConnectionHelpers
{
    public static TileConnection Rotate(this TileConnection c)
    {
        TileConnection rotated = TileConnection.None;

        if (c.HasFlag(TileConnection.Up)) rotated |= TileConnection.Right;
        if (c.HasFlag(TileConnection.Right)) rotated |= TileConnection.Down;
        if (c.HasFlag(TileConnection.Down)) rotated |= TileConnection.Left;
        if (c.HasFlag(TileConnection.Left)) rotated |= TileConnection.Up;

        return rotated;
    }
}`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Now every tile can easily adjust its connectivity when rotated in the
        scene.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 3 – Defining Tile Types</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Each type of tile (Straight, Corner, T-Junction) can be represented by a{" "}
        <strong>ScriptableObject</strong> that defines its base shape and visual
        prefab. This way we can tweak them in the editor instead of hardcoding
        data.
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`[CreateAssetMenu(menuName = "Labyrinth/TileType")]
public class TileType : ScriptableObject
{
    public string displayName;
    public TileConnection baseConnections;
    public GameObject prefabVisualisation;
}`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">Example setup:</p>
      <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
        <li>Straight: Up + Down</li>
        <li>Corner: Up + Right</li>
        <li>T-Junction: Up + Left + Right</li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 4 – Creating the Tile Instance</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Each tile on the board is an instance of one of those TileTypes, with a
        rotation applied and a position in the grid:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`public class Tile : MonoBehaviour
{
    public TileType type;
    public int rotationSteps; // 0–3, each step = +90°

    public TileConnection Connections
    {
        get
        {
            TileConnection c = type.baseConnections;
            for (int i = 0; i < rotationSteps; i++)
                c = c.Rotate();
            return c;
        }
    }

    public void SetRotation(int steps)
    {
        rotationSteps = steps % 4;
        transform.rotation = Quaternion.Euler(0, 0, rotationSteps * 90);
    }
}`}
      </pre>

      {/* Class diagram image */}
      <img
        src="/images/labyrinth-tiles.png"
        alt="Tile class diagram"
        className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 mb-10 w-full object-contain"
      />

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 5 – Generating a Random Grid</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        To quickly test the system, create a small script that spawns a random
        layout:
      </p>

      <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
        {`public class TileGridTest : MonoBehaviour
{
    public int gridSize = 7;
    public TileType[] tileTypes;
    private float _offset;
    private InputAction _shuffle;
    void Start()
    {
        _offset = gridSize / 2f;
        InitGrid();
        _shuffle = new InputAction("Shuffle");
        _shuffle.AddBinding("<Keyboard>/Space");
        _shuffle.Enable();
    }
    private void Update()
    {
        if (_shuffle.WasPerformedThisFrame())
        {
            InitializeGrid();
        }
    }
    private void InitializeGrid()
    {
        DestroyGrid();
        InitGrid();
    }
    private void InitGrid()
    {
        for (int x = 0; x < gridSize; x++)
        {
            for (int y = 0; y < gridSize; y++)
            {
                TileType randomType = tileTypes[Random.Range(0, tileTypes.Length)];
                GameObject obj = Instantiate(randomType.prefabVisualisation);
                obj.transform.position = new Vector3(x - _offset, y - _offset, 0);
                obj.name = randomType.name;
                Tile tile = obj.GetComponent<Tile>();
                tile.type = randomType;
                tile.SetRotation(Random.Range(0, 4));
            }
        }
    }
    private void DestroyGrid()
    {
        var objects = FindObjectsByType<MeshFilter>(0);
        foreach (var obj in objects)
        {
            Destroy(obj.gameObject);
        }
    }
}`}
      </pre>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        When you press Play, you should see a 7×7 grid of randomly oriented
        tiles — your first procedural labyrinth taking shape.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Here’s a quick look at what my prototype currently generates:
      </p>

      {/* Animated video */}
      <div className="aspect-square mb-10 rounded-xl overflow-hidden shadow-md">
        <video
          className="w-full h-full object-cover"
          src="/video/grid-anim.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 6 – Reflections and Next Steps</h2>
      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        It’s always satisfying to get that first visual confirmation that the
        system is working. Seeing the random grid appear in Unity makes it feel
        tangible — and more importantly, we now have the foundation to build on.
      </p>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        Next time, I’ll be focusing on Phase 2: the grid logic — adding the
        classic Verrückte Labyrinth mechanic of pushing rows, tracking the spare
        tile, and watching the maze shift dynamically.
      </p>
    </main>
  );
}
