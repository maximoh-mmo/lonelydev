export default function Keyboard() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-left">
      <header className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
          Making the Charybdis Wireless — and Then Taking It Further
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A personal hardware–software adventure: building a wireless, per-key RGB keyboard and writing custom firmware drivers.
        </p>
      </header>

      <section className="space-y-6 mb-12">
        <p>
          I’ve always liked to tinker with the tools I use every day, and the keyboard is one of the most hands-on pieces of hardware we interact with. When I discovered the open-source 
          <strong> bastardkb Charybdis</strong> split ergonomic keyboard, I saw a perfect opportunity to merge my interests in 
          <strong> hardware, firmware, and software design</strong>.
        </p>
        <p>
          The goal: <strong>turn a wired Charybdis into a fully wireless, battery-powered, per-key RGB keyboard — and then push it even further.</strong>
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Rebuilding the Charybdis in EasyEDA</h2>
        <p>
          The original Charybdis design was wired, relying on a USB connection and a controller that wasn’t meant for Bluetooth. 
          I redesigned the electronics in <strong>EasyEDA</strong>, replacing the controller with a 
          <strong> SuperMini nRF52840</strong> module — a compact board with built-in 
          Bluetooth 5.0, Li-ion charging, and power management.
        </p>
        <ul className="list-disc list-inside my-4 space-y-1">
          <li>Re-routing the keyboard matrix</li>
          <li>Integrating per-key RGB LEDs</li>
          <li>Managing battery power distribution across both halves</li>
        </ul>
        <figure className="my-6">
          <img
            src="images/keyboard-schematic.png"
            alt="EasyEDA PCB view of the Charybdis redesign"
            className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105"
          />
          <figcaption className="text-sm text-gray-500 mt-2 text-center">
            PCB layout in EasyEDA showing the SuperMini nRF52840 pinout schematic and connections.
          </figcaption>
        </figure>
         <figure className="my-6">
          <img
            src="images/trackball-schematic.png"
            alt="EasyEDA PCB view of the Trackball redesign"
            className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105"
          />
          <figcaption className="text-sm text-gray-500 mt-2 text-center">
            PCB layout in EasyEDA showing the trackball schematic.
          </figcaption>
        </figure>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Lighting It Up — Per-Key RGB</h2>
        <p>
          Each switch got its own <strong>SK6812 Mini-E</strong> LED, daisy-chained across the board. That meant juggling power constraints 
          and logic level mismatches, since the LEDs expect 5V but the keyboard runs from a 3.3V Li-ion setup.
        </p>
        <ul className="list-disc list-inside my-4 space-y-1">
          <li>Used a logic-level shifter to translate the 3.3V data signal reliably</li>
          <li>Firmware-side brightness limits to manage current draw</li>
        </ul>
        <figure className="my-6">
          <img
            src="images/keyboard-rgb.jpg"
            alt="Per-key RGB lighting on the custom wireless Charybdis"
            className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105"
          />
          <figcaption className="text-sm text-gray-500 mt-2 text-center">
            Per-key RGB lighting powered by SK6812 Mini-E LEDs, driven at 3.3V logic.
          </figcaption>
        </figure>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Firmware and Bluetooth — ZMK</h2>
        <p>
          For firmware, I used <strong>ZMK</strong>, a modern open-source keyboard firmware built on <strong>Zephyr RTOS</strong> that supports Bluetooth out of the box.
        </p>
        <ul className="list-disc list-inside my-4 space-y-1">
          <li>Creating a custom device tree overlay</li>
          <li>Mapping GPIOs for the key matrix</li>
          <li>Configuring RGB LEDs and power pins</li>
          <li>Tuning sleep behaviour for battery life</li>
        </ul>
        <figure className="my-6">
          <img
            src="images/zmk.png"
            alt="ZMK firmware configuration screenshot"
            className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105"
          />
          <figcaption className="text-sm text-gray-500 mt-2 text-center">
            Custom ZMK configuration and keymap setup for the nRF52840 board.
          </figcaption>
        </figure>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Going Further — The Trackball Experiment</h2>
        <p>
          With the keyboard working perfectly, I wanted to add an integrated <strong>trackball</strong>, similar to the higher-end BastardKB models. 
          Because my board runs at 3.3V, not 5V like the original wired Charybdis, the existing sensor setup wasn’t directly compatible.
        </p>
        <p className="mt-4">
          I sourced a new optical sensor that supported 3.3V, redesigned the PCB to simplify the circuitry — and then hit the real challenge: 
          <strong> there were no working firmware drivers for this sensor.</strong>
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Writing My Own Trackball Drivers</h2>
        <p>
          The sensor communicated over SPI, but the datasheet was vague and ZMK didn’t have built-in support. I ended up implementing the driver from scratch:
        </p>
        <ul className="list-disc list-inside my-4 space-y-1">
          <li>Configured SPI transactions within Zephyr</li>
          <li>Implemented register-level reads/writes to retrieve delta data</li>
          <li>Calibrated CPI for consistent motion</li>
          <li>Debugged timing issues from voltage mismatches</li>
        </ul>
        <figure className="my-6">
          <img
            src="images/trackball-pcb-layout.png"
            alt="Custom trackball PCB and sensor module"
            className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105"
          />
          <figcaption className="text-sm text-gray-500 mt-2 text-center">
            Trackball PCB iteration featuring the 3.3V-compatible sensor and SPI interface.
          </figcaption>
        </figure>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">What I Learned</h2>
        <h3 className="text-lg font-semibold text-gray-800 mt-4">Technical takeaways</h3>
        <ul className="list-disc list-inside my-4 space-y-1">
          <li>PCB design and routing in EasyEDA</li>
          <li>Embedded firmware in ZMK/Zephyr</li>
          <li>Bluetooth HID and power management</li>
          <li>Writing custom SPI sensor drivers</li>
          <li>Debugging low-voltage logic issues</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mt-6">Broader lessons</h3>
        <ul className="list-disc list-inside my-4 space-y-1">
          <li>Iterative problem solving and design refinement</li>
          <li>Patience with hardware debugging</li>
          <li>Bridging hardware and software perspectives</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Where It’s At Now</h2>
        <p>
          My <strong>wireless, per-key RGB Charybdis</strong> is fully functional and my daily driver. 
          The trackball remains a work in progress, waiting for a new sensor and another PCB revision.
        </p>
        <ul className="list-disc list-inside my-4 space-y-1">
          <li>Fully wireless Bluetooth connectivity</li>
          <li>Battery operation</li>
          <li>Per-key RGB lighting</li>
          <li>Modular, upgradable hardware</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Why It Matters</h2>
        <p>
          This project sits right at the intersection of <strong>engineering, design, and interactivity</strong> — the same intersection that defines great game programming. 
          It’s about building systems that respond to input, managing complexity, and refining performance — whether that’s pixels on a screen or electrons on a PCB.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4 text-center">Gallery</h2>
        <div className="space-y-8">
          <figure>
            <img
              src="images/keyboard.jpg"
              alt="Finished wireless RGB Charybdis keyboard"
              className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105"
            />
            <figcaption className="text-sm text-gray-500 mt-2 text-center">
              The finished wireless, per-key RGB Charybdis — functional, bright, and entirely untethered.
            </figcaption>
          </figure>
          <figure>
            <img
              src="images/keyboard-main-pcb.png"
              alt="Firmware debugging output"
              className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105"
            />
            <figcaption className="text-sm text-gray-500 mt-2 text-center">
              Keyboard PCB Design.
            </figcaption>
          </figure>
          <figure>
            <img
              src="images/keyboard-wiring.jpg"
              alt="Firmware debugging output"
              className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105"
            />
            <figcaption className="text-sm text-gray-500 mt-2 text-center">
              Wired up PCB with RGB and key switch connections
            </figcaption>
          </figure>
          <figure>
            <img
              src="images/trackball-prototype.jpg"
              alt="Firmware debugging output"
              className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105"
            />
            <figcaption className="text-sm text-gray-500 mt-2 text-center">
              Trackball WIP Prototype
            </figcaption>
          </figure>
        </div>
      </section>

      <footer className="border-t border-gray-200 pt-8 mt-12 text-center">
        <p className="italic text-gray-600">
          What started as “can I make this keyboard wireless?” evolved into writing my own firmware drivers, 
          rethinking power design, and bridging hardware with software — exactly the kind of curiosity and persistence I aim to bring to game development.
        </p>
      </footer>
    </main>
  );
}
