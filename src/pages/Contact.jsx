import { Mail, FileText, Download } from "lucide-react";

export default function Contact() {
  const contactLinks = [
    {
      name: "Email",
      value: "maxheinze@googlemail.com",
      href: "mailto:maxheinze@googlemail.com",
      icon: <Mail className="w-8 h-8" />,
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
      isDownload: false,
    },
    {
      name: "GitHub",
      value: "maximoh-mmo",
      href: "https://github.com/maximoh-mmo",
      icon: (
        <svg
          className="w-8 h-8"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.943 0-1.091.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.597 1.028 2.688 0 3.848-2.339 4.685-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
      color: "bg-gray-100 text-gray-900 hover:bg-gray-200",
      isDownload: false,
    },
    {
      name: "LinkedIn",
      value: "maxheinze",
      href: "https://www.linkedin.com/in/maxheinze/",
      icon: (
        <svg
          className="w-8 h-8"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
            clipRule="evenodd"
          />
        </svg>
      ),
      color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
      isDownload: false,
    },
    {
      name: "Discord",
      value: "maximoh",
      href: "https://discord.com/users/845675651315007549",
      icon: (
        <svg
          className="w-8 h-8"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-2.595-9.669-5.594-13.682a.072.072 0 00-.033-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"
          />
        </svg>
      ),
      color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
      isDownload: false,
    },
    {
      name: "Resume / CV",
      value: "Download PDF",
      href: "/CV_Max_Heinze.pdf",
      icon: <FileText className="w-8 h-8" />,
      color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
      isDownload: true,
    },
  ];

  return (
    <main className="max-w-5xl mx-auto px-6 py-20 text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">
        Let's Connect
      </h1>
      <p className="text-xl text-gray-600 mb-16 max-w-2xl mx-auto leading-relaxed">
        Looking for the next big problem to solve.
        If you need a passionate engineer for your team or project, let’s connect.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {contactLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target={link.isDownload ? undefined : "_blank"}
            rel={link.isDownload ? undefined : "noopener noreferrer"}
            download={link.isDownload}
            className={`flex flex-col items-center justify-center p-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border border-transparent hover:border-gray-200 ${link.color}`}
          >
            <div className="mb-4 p-3 bg-white rounded-full shadow-sm">
              {link.icon}
            </div>
            <h2 className="text-xl font-bold mb-1">{link.name}</h2>
            <p className="text-sm font-medium opacity-80">{link.value}</p>
            {link.isDownload && (
              <div className="mt-4 flex items-center text-xs font-bold uppercase tracking-wide opacity-70">
                <Download className="w-3 h-3 mr-1" />
                PDF
              </div>
            )}
          </a>
        ))}
      </div>
    </main>
  );
}