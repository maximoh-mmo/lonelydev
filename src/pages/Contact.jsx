export default function Contact() {
  return (
    <section className="mt-20 text-center">
      <h2 className="text-3xl font-semibold mb-6">Contact</h2>
      <p className="text-gray-600 mb-4">
        I’d love to hear from you! Reach out via email{" "}
        <a href="mailto:maxheinze@googlemail.com" className="underline">
          maxheinze@googlemail.com
        </a>
        , connect on{" "}
        <a
          href="https://github.com/maximoh-mmo"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          GitHub
        </a>
        , or find me on{" "}
        <a
          href="https://www.linkedin.com/in/maxheinze/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          LinkedIn
        </a>.
      </p>
      <p className="text-gray-600">
        If you’d like a more casual chat, I’m also on Discord: <strong>maximoh</strong>.
      </p>
    </section>
  );
}