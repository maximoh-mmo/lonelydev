export default function Contact() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10">Contact</h1>
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
      <p className="text-gray-600 mb-4">
        If you'd like a more casual chat, I'm also on Discord: <strong><a href="https://discord.com/users/845675651315007549">maximoh</a></strong>.
      </p>
      <p className="text-gray-600 mb-4">
        You can also download my CV below.
      </p>
      <p>
        <a
          href="/CV_Max_Heinze.pdf"
          download
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition"
        >
          Download My CV
        </a>
      </p>
    </main>
  );
}