import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock = ({ code, language }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="doc-code-block mb-4 group">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      {language && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">
          {language}
        </span>
      )}
      <pre className="text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
