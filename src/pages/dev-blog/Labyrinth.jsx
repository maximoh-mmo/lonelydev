export default function Labyrinth() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <article className="prose prose-lg prose-gray max-w-none">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
          Building a Living Labyrinth: Procedural Mazes Inspired by <em>Verrückte Labyrinth</em>
        </h1>
        <p className="text-gray-500 mb-8 text-center italic">Posted on October 27, 2025</p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">🧩 A Classic Game Meets Code</h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          Last night, I was playing <em>Verrückte Labyrinth</em> (also known as <em>The aMAZEing Labyrinth</em>) with my
          daughter. As we slid tiles around the board and watched new paths appear, I couldn’t stop thinking — this
          mechanic would be perfect for exploring procedural generation and tile-based systems in Unity.
        </p>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          So, I’ve decided to turn that spark into a small side project (and blog series): <strong>Building a Living
            Labyrinth</strong> — a digital take on the board game’s ideas, built from the ground up with code, randomness,
          and a touch of design philosophy.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">🎯 Project Goal</h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          At its heart, <em>Verrückte Labyrinth</em> is about structure and change. The maze exists as a grid of tiles,
          but every turn the shape of that maze can shift — entire rows move, new passages open, and others close.
          That mix of stability and chaos makes it a rich playground for procedural design.
        </p>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          My goal for this series: <strong>Create a Unity prototype</strong> that procedurally generates and manipulates
          a tile-based labyrinth — inspired by the board game’s mechanics — and use it as a teaching tool for procedural
          generation.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">🧱 The Core Idea: Tiles and Connectivity</h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          The first concept to tackle is the tile system. Each tile in the game has a set of connections — pathways that
          can connect to other tiles. In the physical game, there are three archetypes:
        </p>

        <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
          <li><strong>Straight Tile</strong> — connects two opposite edges (│ or ─)</li>
          <li><strong>Corner Tile</strong> — connects two adjacent edges (┐, └, etc.)</li>
          <li><strong>T-Junction Tile</strong> — connects three edges (├, ┬, etc.)</li>
        </ul>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          Each tile’s rotation determines how it fits into the labyrinth. So rather than hardcoding orientations, I’ll
          represent tiles by the sides they connect to — for example:
        </p>

        <pre className="bg-gray-900 text-green-300 text-sm p-4 rounded-xl mb-8 overflow-x-auto text-left font-mono whitespace-pre leading-relaxed shadow-md">
          {`[Flags]
public enum TileConnection
{
    None = 0,
    Up = 1 << 0,
    Right = 1 << 1,
    Down = 1 << 2,
    Left = 1 << 3
}

// Example: a corner connecting Up and Right
TileConnection.Up | TileConnection.Right`}
        </pre>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          This gives us a flexible, data-driven system — we can rotate, check connections, or even generate new tile
          types procedurally later.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">♻️ The Grid and the “Spare” Tile</h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          The game board is a square grid — typically 7×7 — with an extra tile off to the side. Here’s the fun part: that
          “spare” tile can be inserted into any movable row or column, pushing the others forward and ejecting a tile on
          the opposite side.
        </p>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          That mechanic turns the maze into a living system — part grid, part queue — where some tiles are fixed in
          place, and others shift dynamically each turn.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">⚙️ What I’ll Build First</h2>
        <ul className="list-disc list-inside mb-8 text-lg text-gray-700 leading-relaxed space-y-2">
          <li><strong>Tile representation:</strong> Create prefabs or scriptable objects for each tile type.</li>
          <li><strong>Grid management:</strong> Build a simple GridManager to store tile states and positions.</li>
          <li><strong>Manual shifting:</strong> Let a player click to push tiles and animate the change.</li>
        </ul>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          That’s enough to recreate the feeling of the physical labyrinth. Once that’s working, I can start introducing
          procedural level generation — randomizing layouts while maintaining valid paths.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">🧭 Looking Ahead</h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">This is just the start. Here’s a rough roadmap for where I’d like to take this project:</p>

        <div className="overflow-x-auto my-4 mb-8">
          <table className="w-full border border-gray-300 text-left text-sm">
            <thead className="bg-gray-100 font-semibold">
              <tr>
                <th className="p-2 border-b">Phase</th>
                <th className="p-2 border-b">Focus</th>
                <th className="p-2 border-b">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border-b">1</td>
                <td className="p-2 border-b">Tile System</td>
                <td className="p-2 border-b">Represent and visualize tiles with rotation and connections</td>
              </tr>
              <tr>
                <td className="p-2 border-b">2</td>
                <td className="p-2 border-b">Grid Logic</td>
                <td className="p-2 border-b">Implement the shifting row/column mechanic</td>
              </tr>
              <tr>
                <td className="p-2 border-b">3</td>
                <td className="p-2 border-b">Procedural Generation</td>
                <td className="p-2 border-b">Randomly generate valid labyrinths</td>
              </tr>
              <tr>
                <td className="p-2 border-b">4</td>
                <td className="p-2 border-b">Pathfinding</td>
                <td className="p-2 border-b">Let a player (or AI) navigate the dynamic maze</td>
              </tr>
              <tr>
                <td className="p-2 border-b">5</td>
                <td className="p-2 border-b">Extensions</td>
                <td className="p-2 border-b">New maze rules, animations, and maybe an online demo</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">✨ Why This Matters</h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          What excites me about <em>Verrückte Labyrinth</em> as a programming project is that it blends data structures,
          procedural generation, and player interaction. It’s simple enough to code in a weekend, but deep enough to
          study for months.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">🧠 Next Time</h2>
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          In the next post, I’ll dive into the tile system itself — setting up the data model and rendering tiles
          dynamically in Unity. We’ll start with a simple grid of randomly oriented tiles, and by the end of it, you’ll
          be able to visualize the bones of your own living labyrinth.
        </p>

        <p className="text-lg text-blue-700 font-semibold mt-8 mb-8">
          Stay tuned — and if you have ideas for features or ways to visualize the shifting mechanic, I’d love to hear them!
        </p>
      </article>
    </main>
  );
}
