export default function Keyboard() {
  return (
    <section className="mt-20 text-center">
      <h2 className="text-3xl font-semibold mb-6">Keyboard</h2>
      <p className="text-gray-600 max-w-xl mx-auto mb-10">
        A showcase of my custom wireless keyboard project based on the BastardKB Charybdis.
      </p>

      <article className="project-post text-left mx-auto max-w-4xl px-4">
        <header>
          <h1>Making the Charybdis Wireless — and Then Taking It Further</h1>
          <p className="subtitle">
            A personal hardware–software adventure: building a wireless, per-key RGB keyboard and writing custom firmware drivers.
          </p>
        </header>

        <section>
          <p>
            I’ve always liked to tinker with the tools I use every day, and the keyboard is one of the most hands-on pieces of hardware we interact with. When I discovered the open-source{" "}
            <strong>bastardkb Charybdis</strong> split ergonomic keyboard, I saw a perfect opportunity to merge my interests in{" "}
            <strong>hardware, firmware, and software design</strong>.
          </p>
          <p>
            The goal: <strong>turn a wired Charybdis into a fully wireless, battery-powered, per-key RGB keyboard — and then push it even further.</strong>
          </p>
        </section>

        <section>
          <h2>Rebuilding the Charybdis in EasyEDA</h2>
          <p>
            The original Charybdis design was wired, relying on a USB connection and a controller that wasn’t meant for Bluetooth. I redesigned the electronics in{" "}
            <strong>EasyEDA</strong>, replacing the controller with a{" "}
            <strong>SuperMini nRF52840</strong> module — a compact board with built-in Bluetooth 5.0, Li-ion charging, and power management.
          </p>
          <p>That made life a lot easier. The module handled RF and charging circuitry internally, leaving me to focus on:</p>
          <ul className="list-disc ml-6">
            <li>Re-routing the keyboard matrix</li>
            <li>Integrating per-key RGB LEDs</li>
            <li>Managing battery power distribution across both halves</li>
          </ul>
          <p>
            EasyEDA’s workflow made it simple to iterate and tweak the design, and the first manufactured PCBs worked right out of the gate.
          </p>

          <figure className="my-6">
            <img
              src="/images/easyeda-pcb-view.jpg"
              alt="EasyEDA PCB view of the Charybdis redesign"
              className="rounded-lg shadow-md mx-auto"
            />
            <figcaption className="text-sm text-gray-400 text-center">
              PCB layout in EasyEDA showing the SuperMini nRF52840 and RGB LED routing.
            </figcaption>
          </figure>
        </section>

        <section>
          <h2>Lighting It Up — Per-Key RGB</h2>
          <p>
            Each switch got its own <strong>SK6812 Mini-E</strong> LED, daisy-chained across the board. That meant juggling power constraints and logic level mismatches,
            since the LEDs expect 5V but the keyboard runs from a 3.3V Li-ion setup.
          </p>
          <ul className="list-disc ml-6">
            <li>Used a logic-level shifter to translate the 3.3V data signal reliably</li>
            <li>Firmware-side brightness limits to manage current draw</li>
          </ul>
          <p>
            The first successful power-up — with every key glowing and responding — was incredibly satisfying.
          </p>

          <figure className="my-6">
            <img
              src="/images/rgb-keyboard-lit.jpg"
              alt="Per-key RGB lighting on the custom wireless Charybdis"
              className="rounded-lg shadow-md mx-auto"
            />
            <figcaption className="text-sm text-gray-400 text-center">
              Per-key RGB lighting powered by SK6812 Mini-E LEDs, driven at 3.3V logic.
            </figcaption>
          </figure>
        </section>

        <section>
          <h2>Firmware and Bluetooth — ZMK</h2>
          <p>
            For firmware, I used <strong>ZMK</strong>, a modern open-source keyboard firmware built on <strong>Zephyr RTOS</strong> that supports Bluetooth out of the box.
          </p>
          <p>Defining a new board involved:</p>
          <ul className="list-disc ml-6">
            <li>Creating a custom device tree overlay</li>
            <li>Mapping GPIOs for the key matrix</li>
            <li>Configuring RGB LEDs and power pins</li>
            <li>Tuning sleep behaviour for battery life</li>
          </ul>
          <p>Once it paired over BLE and typed its first sentence, the project officially crossed from idea to reality.</p>

          <figure className="my-6">
            <img
              src="/images/zmk-config.jpg"
              alt="ZMK firmware configuration screenshot"
              className="rounded-lg shadow-md mx-auto"
            />
            <figcaption className="text-sm text-gray-400 text-center">
              Custom ZMK configuration and keymap setup for the nRF52840 board.
            </figcaption>
          </figure>
        </section>

        <section>
          <h2>Going Further — The Trackball Experiment</h2>
          <p>
            With the keyboard working perfectly, I wanted to add an integrated <strong>trackball</strong>, similar to the higher-end BastardKB models. That’s when things got… complicated.
          </p>
          <p>
            Because my board runs at 3.3V, not 5V like the original wired Charybdis, the existing BastardKB sensor setup wasn’t directly compatible. I sourced a different optical sensor that
            supported 3.3V operation, redesigned the PCB again to simplify the circuitry — and then hit the real challenge:{" "}
            <strong>there were no working firmware drivers for this particular sensor.</strong>
          </p>
        </section>

        <section>
          <h2>Writing My Own Trackball Drivers</h2>
          <p>
            The sensor communicated over SPI, but the datasheet was vague and ZMK didn’t have built-in support. I ended up implementing the driver from scratch:
          </p>
          <ul className="list-disc ml-6">
            <li>Configured SPI transactions within the Zephyr framework</li>
            <li>Implemented register-level reads/writes to retrieve delta-X and delta-Y data</li>
            <li>Calibrated CPI (counts per inch) for consistent motion</li>
            <li>Debugged timing issues from voltage and clock mismatches</li>
          </ul>
          <p>
            It was a crash course in embedded device integration — balancing timing, protocol reliability, and clean data flow into ZMK’s pointer input system. Even though the sensor may have been
            faulty, the experience of writing and testing my own firmware driver was incredibly rewarding.
          </p>

          <figure className="my-6">
            <img
              src="/images/trackball-pcb.jpg"
              alt="Custom trackball PCB and sensor module"
              className="rounded-lg shadow-md mx-auto"
            />
            <figcaption className="text-sm text-gray-400 text-center">
              Trackball PCB iteration featuring the 3.3V-compatible sensor and SPI interface.
            </figcaption>
          </figure>
        </section>

        <section>
          <h2>What I Learned</h2>
          <p>This project became far more than “make my keyboard wireless.” It turned into a full-stack learning experience.</p>

          <h3>Technical takeaways</h3>
          <ul className="list-disc ml-6">
            <li>PCB design and routing in EasyEDA</li>
            <li>Embedded firmware configuration in ZMK/Zephyr</li>
            <li>Bluetooth HID and battery-powered peripheral design</li>
            <li>Writing custom SPI sensor drivers</li>
            <li>Debugging low-voltage logic and timing issues</li>
            <li>Power budgeting for per-key RGB</li>
          </ul>

          <h3>Broader lessons</h3>
          <ul className="list-disc ml-6">
            <li>Iterative problem solving and design refinement</li>
            <li>Patience with hardware debugging</li>
            <li>Bridging the physical and digital — from keypress to user experience</li>
          </ul>
        </section>

        <section>
          <h2>Where It’s At Now</h2>
          <p>
            My <strong>wireless, per-key RGB Charybdis</strong> is fully functional and my daily driver. The trackball remains a work in progress, waiting for a new sensor and another PCB revision.
          </p>
          <p>Even without it, the project achieved its core goals:</p>
          <ul className="list-disc ml-6">
            <li>Fully wireless Bluetooth connectivity</li>
            <li>Battery operation</li>
            <li>Per-key RGB lighting</li>
            <li>Modular, upgradable hardware</li>
          </ul>
        </section>

        <section>
          <h2>Why It Matters</h2>
          <p>
            For me, this project sits right at the intersection of <strong>engineering, design, and interactivity</strong> — the same intersection that defines great game programming. It’s about
            building systems that respond to input, managing complexity, and refining performance — whether that’s pixels on a screen or electrons on a PCB.
          </p>
        </section>

        <section>
          <h2>Gallery</h2>
          <figure className="my-6">
            <img
              src="/images/final-keyboard.jpg"
              alt="Finished wireless RGB Charybdis keyboard"
              className="rounded-lg shadow-md mx-auto"
            />
            <figcaption className="text-sm text-gray-400 text-center">
              The finished wireless, per-key RGB Charybdis — functional, bright, and entirely untethered.
            </figcaption>
          </figure>
          <figure className="my-6">
            <img
              src="/images/debugging-session.jpg"
              alt="Firmware debugging output"
              className="rounded-lg shadow-md mx-auto"
            />
            <figcaption className="text-sm text-gray-400 text-center">
              Firmware debugging session during custom SPI driver development.
            </figcaption>
          </figure>
        </section>

        <footer className="mt-10 text-gray-500 italic">
          <p>
            What started as “can I make this keyboard wireless?” evolved into writing my own firmware drivers, rethinking power design, and bridging hardware with software — exactly the kind of
            curiosity and persistence I aim to bring to game development.
          </p>
        </footer>
      </article>
    </section>
  );
}
