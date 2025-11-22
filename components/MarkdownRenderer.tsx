import React from 'react';

// A lightweight markdown renderer with support for UPSC-specific highlighting
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  
  const parseLine = (line: string, index: number) => {
    // Headers
    if (line.startsWith('# ')) return <h1 key={index} className="text-3xl font-serif font-bold text-upsc-900 mt-8 mb-6 border-b border-upsc-200 pb-2">{line.replace('# ', '')}</h1>;
    if (line.startsWith('## ')) return <h2 key={index} className="text-xl font-serif font-bold text-upsc-800 mt-8 mb-3 flex items-center"><span className="w-2 h-8 bg-upsc-500 mr-2 rounded-sm inline-block"></span>{line.replace('## ', '')}</h2>;
    if (line.startsWith('### ')) return <h3 key={index} className="text-lg font-serif font-semibold text-upsc-700 mt-5 mb-2 ml-1">{line.replace('### ', '')}</h3>;

    // List items
    if (line.trim().startsWith('- ')) return <li key={index} className="ml-6 list-disc pl-1 mb-2 text-slate-700 leading-relaxed marker:text-upsc-400">{formatText(line.trim().replace('- ', ''))}</li>;
    if (line.trim().startsWith('* ')) return <li key={index} className="ml-6 list-disc pl-1 mb-2 text-slate-700 leading-relaxed marker:text-upsc-400">{formatText(line.trim().replace('* ', ''))}</li>;

    // Standard paragraph
    if (line.trim().length === 0) return <div key={index} className="h-3"></div>;
    
    return <p key={index} className="mb-3 text-slate-700 leading-relaxed text-[15px]">{formatText(line)}</p>;
  };

  const formatText = (text: string) => {
    // Regex breakdown:
    // 1. Highlights: ==text==
    // 2. Bold: **text**
    // 3. Italics: *text*
    // 4. Links: [text](url)
    const regex = /(\=\=.*?\=\=|\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g;
    
    const parts = text.split(regex);
    
    return parts.map((part, i) => {
      // Link: [text](url)
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
            <a 
                key={i} 
                href={linkMatch[2]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2 hover:bg-blue-50 rounded px-0.5 transition-colors"
            >
                {linkMatch[1]}
            </a>
        );
      }

      // Highlight: ==text==
      if (part.startsWith('==') && part.endsWith('==')) {
        return (
          <span key={i} className="bg-yellow-100 text-slate-900 px-1 rounded font-medium border-b-2 border-yellow-200 mx-0.5 box-decoration-clone">
            {part.slice(2, -2)}
          </span>
        );
      }
      // Bold: **text**
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-upsc-900">{part.slice(2, -2)}</strong>;
      }
      // Italics: *text* (single asterisk)
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-upsc-600 font-medium">{part.slice(1, -1)}</em>;
      }
      // Plain text
      return part;
    });
  };

  const lines = content.split('\n');

  return (
    <div className="prose-content font-sans max-w-none">
      {lines.map((line, idx) => parseLine(line, idx))}
    </div>
  );
};

export default MarkdownRenderer;