import React, { useState } from 'react';

interface TexCodeProps {
  code: string;
}

export default function TexCode({ code }: TexCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setCopied(false);
    }
  };

  return (
    <div className="relative bg-gray-900 rounded-lg shadow p-4 mt-2 h-64">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 text-gray-300 hover:text-white transition z-10"
        title="Copy to clipboard"
        aria-label="Copy code"
      >
        {copied ? (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
        )}
      </button>
      <pre className="overflow-auto text-sm leading-relaxed mt-2 h-full pr-12">
        <code className="language-latex text-green-200">
          {highlightLatex(code)}
        </code>
      </pre>
    </div>
  );
}

// Simple LaTeX highlighter for common commands and math
function highlightLatex(code: string): React.ReactNode {
  if (!code) return null;
  // Highlight LaTeX commands (\command), math ($...$), and comments (%)
  const regex = /(\\[a-zA-Z]+|\$[^$]*\$|%.*?$)/gm;
  const parts = code.split(regex);
  return parts.map((part, i) => {
    if (/^\\[a-zA-Z]+$/.test(part)) {
      return <span key={i} className="text-blue-400">{part}</span>;
    }
    if (/^\$[^$]*\$$/.test(part)) {
      return <span key={i} className="text-yellow-300">{part}</span>;
    }
    if (/^%.*$/.test(part)) {
      return <span key={i} className="text-gray-400 italic">{part}</span>;
    }
    return part;
  });
}
