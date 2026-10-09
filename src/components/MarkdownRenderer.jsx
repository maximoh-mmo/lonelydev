import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function domProps(props) {
  const attributes = { ...props };
  delete attributes.node;
  return attributes;
}

export default function MarkdownRenderer({ content }) {
  return (
    <div className="markdown-content prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        // The article already owns the page H1. Keep body headings below it.
        h1: props => <h2 {...domProps(props)} />,
        pre: props => <pre {...domProps(props)} tabIndex={0} />,
        table: props => <div className="table-scroll" tabIndex={0}><table {...domProps(props)} /></div>,
        img: props => {
          const attributes = domProps(props);
          const logo = attributes.src?.startsWith('/logos/') || attributes.src?.includes('svg-api');
          return <img {...attributes} className={logo ? 'inline-icon' : undefined} loading="lazy" />;
        },
        a: props => {
          const attributes = domProps(props);
          const external = /^https?:\/\//.test(attributes.href || '');
          return <a {...attributes} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} />;
        },
        strong: props => {
          const text = props.children?.toString() || '';
          const match = text.match(/^:icon:(.+)$/);
          if (match) return <img src={'/logos/' + match[1].toLowerCase() + '.svg'} alt={match[1]} className="inline-icon" />;
          return <strong {...domProps(props)} />;
        },
      }}>{content}</ReactMarkdown>
    </div>
  );
}
