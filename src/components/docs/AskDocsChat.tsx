import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AskDocsChatProps {
  projectId: string;
  settings: DesignSettings;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-docs`;

const AskDocsChat = ({ projectId, settings: s }: AskDocsChatProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, projectId }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to connect" }));
        setMessages((prev) => [...prev, { role: "assistant", content: err.error || "Something went wrong." }]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            // Skip malformed JSON lines instead of re-buffering (prevents infinite loop)
            console.warn("Skipping malformed SSE data:", jsonStr);
          }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        style={{ backgroundColor: `hsl(${s.primaryColor})`, color: `hsl(${s.primaryForegroundColor})` }}
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[520px] rounded-2xl shadow-2xl border flex flex-col overflow-hidden"
      style={{
        backgroundColor: `hsl(${s.backgroundColor})`,
        borderColor: `hsl(${s.borderColor})`,
        fontFamily: `'${s.bodyFont}', sans-serif`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: `hsl(${s.borderColor})` }}
      >
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" style={{ color: `hsl(${s.primaryColor})` }} />
          <span className="font-semibold text-sm">Ask Docs</span>
        </div>
        <button onClick={() => setOpen(false)} className="hover:opacity-70">
          <X className="h-4 w-4" style={{ color: `hsl(${s.mutedForegroundColor})` }} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[360px]">
        {messages.length === 0 && (
          <div className="text-center py-8" style={{ color: `hsl(${s.mutedForegroundColor})`, fontSize: `${s.baseFontSize - 2}px` }}>
            <Bot className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Ask anything about this documentation.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                style={{ backgroundColor: `hsl(${s.accentColor})` }}>
                <Bot className="h-3 w-3" style={{ color: `hsl(${s.primaryColor})` }} />
              </div>
            )}
            <div
              className="rounded-xl px-3 py-2 max-w-[280px] text-sm leading-relaxed whitespace-pre-wrap"
              style={
                msg.role === "user"
                  ? { backgroundColor: `hsl(${s.primaryColor})`, color: `hsl(${s.primaryForegroundColor})` }
                  : { backgroundColor: `hsl(${s.accentColor})`, color: undefined }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `hsl(${s.accentColor})` }}>
              <Bot className="h-3 w-3" style={{ color: `hsl(${s.primaryColor})` }} />
            </div>
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: `hsl(${s.accentColor})` }}>
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: `hsl(${s.mutedForegroundColor})` }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-1 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: `hsl(${s.borderColor})` }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ fontSize: `${s.baseFontSize - 1}px` }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="shrink-0 disabled:opacity-30"
            style={{ color: `hsl(${s.primaryColor})` }}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AskDocsChat;
