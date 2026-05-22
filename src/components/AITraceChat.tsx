"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, Send, User, Leaf, Loader2 } from "lucide-react";
import { useChangeLocale } from "@/providers/I18nProvider";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function AITraceChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { locale } = useChangeLocale();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || isLoading) return;

    const userMsg: Message = { role: "user", text: query };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuery: query }),
      });
      const data = await res.json();
      const aiMsg: Message = { role: "assistant", text: data.answer || "Xin lỗi, tôi không thể trả lời lúc này." };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: "Có lỗi xảy ra khi kết nối. Vui lòng thử lại sau." },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const placeholderText = locale === "vi"
    ? "Hỏi về lô hàng, VD: Mã 102 đi qua đâu rồi?"
    : "Ask about shipments, e.g.: Where has batch 102 been?";

  const titleText = locale === "vi" ? "Provenance Guardian" : "Provenance Guardian";
  const subtitleText = locale === "vi"
    ? "Truy vấn trực tiếp dữ liệu blockchain — nguồn gốc, hành trình & tình trạng lô hàng"
    : "Query live blockchain data — origin, journey & batch status";

  return (
    <div className="mt-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-heading text-lg flex items-center gap-2 text-slate-900 dark:text-white">
            {titleText}
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider border border-emerald-500/20">
              {locale === "vi" ? "Thần Nông AI" : "AgriSense"}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-[var(--muted)] font-body">{subtitleText}</p>
        </div>
      </div>

      {/* ── Chat Container ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur-[20px] overflow-hidden shadow-sm">
        {/* ── Messages ─────────────────────────────────────────── */}
        <div ref={scrollRef} className="max-h-[360px] min-h-[120px] overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Leaf className="w-8 h-8 text-emerald-400/30 mb-3" />
              <p className="text-sm text-slate-500 dark:text-white/35 font-body max-w-xs leading-relaxed">
                {locale === "vi"
                  ? "Hãy hỏi tôi về bất kỳ lô hàng nào! Ví dụ: \"Lô 102 có nguồn gốc từ đâu?\" hoặc \"Tình trạng giao hàng của mã 105?\""
                  : "Ask me about any shipment! E.g.: \"Where does batch 102 come from?\" or \"Delivery status of ID 105?\""
                }
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mt-0.5 shadow-sm shadow-emerald-500/20">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-body leading-relaxed whitespace-pre-wrap break-all ${
                msg.role === "user"
                  ? "bg-fruit-emerald text-white rounded-br-lg shadow-sm"
                  : "bg-slate-100 dark:bg-white/8 text-slate-800 dark:text-white/80 rounded-bl-lg border border-slate-200 dark:border-white/5"
              }`}>
                {msg.text}
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 w-7 h-7 rounded-lg bg-fruit-emerald/15 border border-fruit-emerald/25 flex items-center justify-center mt-0.5">
                  <User className="w-3.5 h-3.5 text-fruit-emerald" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5">
              <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mt-0.5 shadow-sm shadow-emerald-500/20">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/5 px-4 py-3 rounded-2xl rounded-bl-lg flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                <span className="text-xs text-slate-500 dark:text-white/40 font-body">
                  {locale === "vi" ? "Đang truy vấn sổ cái blockchain..." : "Querying blockchain ledger..."}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Input Bar ────────────────────────────────────────── */}
        <div className="border-t border-slate-200 dark:border-white/10 p-3 bg-white/40 dark:bg-transparent">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-body text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-[1.03] active:scale-[0.97]"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
