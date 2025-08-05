import React, { useState } from 'react';

interface JSONCodeProps {
  code: string;
}

export default function JSONCode({ code }: JSONCodeProps) {
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
    <div className="relative bg-gray-900 rounded-lg shadow p-4 mt-2">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 text-gray-300 hover:text-white transition"
        title="Copy to clipboard"
        aria-label="Copy code"
      >
        {copied ? (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
        )}
      </button>
      <pre className="overflow-x-auto text-sm leading-relaxed mt-2">
        <code className="language-json text-green-200">
          {highlightJSON(code)}
        </code>
      </pre>
    </div>
  );
}

// Simple JSON highlighter for keys, strings, numbers, booleans, and null
function highlightJSON(code: string): React.ReactNode {
  if (!code) return null;
  // Regex to match keys, strings, numbers, booleans, null
  const regex = /("[^"]+":)|("(?:\\.|[^"\\])*?")|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(true|false|null)/g;
  let lastIndex = 0;
  let match;
  const result: React.ReactNode[] = [];
  while ((match = regex.exec(code)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      result.push(code.slice(lastIndex, match.index));
    }
    if (match[1]) {
      // Key
      result.push(<span key={match.index} className="text-blue-400">{match[1]}</span>);
    } else if (match[2]) {
      // String value
      result.push(<span key={match.index} className="text-green-400">{match[2]}</span>);
    } else if (match[3]) {
      // Number
      result.push(<span key={match.index} className="text-yellow-300">{match[3]}</span>);
    } else if (match[4]) {
      // Boolean or null
      result.push(<span key={match.index} className="text-pink-400">{match[4]}</span>);
    }
    lastIndex = regex.lastIndex;
  }
  // Add remaining text
  if (lastIndex < code.length) {
    result.push(code.slice(lastIndex));
  }
  return result;
}
