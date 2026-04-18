import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownRenderer = ({ content }) => {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Header 1: Centered, extra bold (Page Title style)
          h1: ({ node, ...props }) => (
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center" {...props} />
          ),
          // Header 2: Section Heading style
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12" {...props} />
          ),
          // Header 3: Sub-section heading 
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-8" {...props} />
          ),
          // Paragraphs: Large, readable, relaxed line height
          p: ({ node, ...props }) => (
            <p className="text-lg text-gray-700 mb-8 leading-relaxed" {...props} />
          ),
          // Lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside text-lg text-gray-700 mb-8 space-y-4" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside text-lg text-gray-700 mb-8 space-y-4" {...props} />
          ),
          // Images: Shadow, rounded corners, zoom effect
          img: ({ node, ...props }) => {
            const src = props.src || '';
            const isLogo = src.startsWith('/logos/') || src.includes('svg-api');
            if (isLogo) {
              return (
                <img
                  className="inline w-8 h-8 mx-1"
                  {...props}
                />
              );
            }
            return (
              <div className="my-10 text-center">
                <img
                  className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105 max-w-full h-auto"
                  {...props}
                />
                {props.alt && (
                  <p className="text-sm text-gray-500 mt-2 text-center italic">
                    {props.alt}
                  </p>
                )}
              </div>
            );
          },
          // Links: Professional blue style
          a: ({ node, ...props }) => (
            <a
              className="inline-block text-blue-700 hover:text-blue-900 font-bold border-b-2 border-transparent hover:border-blue-700 transition-all duration-300 hover:scale-[1.02]"
              {...props}
            />
          ),
          // Code: Classic console look
          code: ({ node, inline, className, children, ...props }) => {
            if (!className) {
              return <span className="text-green-400 font-mono text-base bg-gray-900 px-1.5 py-0.5 rounded">{children}</span>;
            }
            return (
              <div className="my-8 relative group">
                <div className="absolute -top-3 left-4 bg-gray-800 text-green-400 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold border border-green-900/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  {className?.replace('language-', '') || 'code'}
                </div>
                <pre className="bg-gray-900 text-green-400 rounded-xl p-6 font-mono text-sm overflow-x-auto border border-green-900/30 shadow-lg">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          // Horizontal Rules
          hr: ({ node, ...props }) => (
            <hr className="my-12 border-gray-200" {...props} />
          ),
          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 italic text-gray-600 bg-gray-50 rounded-r-lg mb-8" {...props} />
          ),
          // Icon shortcode {:icon:Name}
          strong: ({ node, ...props }) => {
            const text = props.children?.toString() || '';
            const match = text.match(/^:icon:(.+)$/);
            if (match) {
              const iconName = match[1].toLowerCase();
              return (
                <img 
                  src={`/logos/${iconName}.svg`} 
                  alt={iconName}
                  className="inline w-6 h-6 mr-2 align-middle" 
                />
              );
            }
            return <strong {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
