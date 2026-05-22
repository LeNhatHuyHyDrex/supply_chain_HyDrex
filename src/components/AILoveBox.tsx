"use client";

import { useState, useEffect, useRef } from "react";
import { Sprout, RefreshCw } from "lucide-react";
import { useChangeLocale } from "@/providers/I18nProvider";

// Default: Da Nang coordinates
const DEFAULT_LAT = 16.0747;
const DEFAULT_LON = 108.2062;

export function TypewriterText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const textRef = useRef(text);
  const indexRef = useRef(0);

  useEffect(() => {
    // Only reset if the actual text content changes significantly
    if (textRef.current !== text) {
      textRef.current = text;
      indexRef.current = 0;
      setDisplayedText("");
    }

    if (!textRef.current) return;

    const intervalId = setInterval(() => {
      if (indexRef.current < textRef.current.length) {
        setDisplayedText(textRef.current.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(intervalId);
      }
    }, 25); // Typing speed

    return () => clearInterval(intervalId);
  }, [text]); // Re-evaluate only when 'text' prop changes

  return <span className="whitespace-pre-wrap">{displayedText}</span>;
}

export default function AILoveBox() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const coordsRef = useRef<{ lat: number; lon: number }>({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const geoResolvedRef = useRef(false);
  const { locale } = useChangeLocale();

  // ── Geolocation: resolve once on mount ──────────────────────────────
  useEffect(() => {
    if (geoResolvedRef.current) return;
    if (!navigator.geolocation) {
      geoResolvedRef.current = true;
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        geoResolvedRef.current = true;
      },
      () => {
        // Permission denied or error — keep Da Nang defaults
        geoResolvedRef.current = true;
      },
      { timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  const handleGetSuggestion = async () => {
    setIsLoading(true);
    setText("");
    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coordsRef.current.lat,
          lon: coordsRef.current.lon,
          lang: locale,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "API Request Failed");
      }
      
      console.log("FULL AI TEXT RECEIVED:", data.text);
      setText(data.text || "");
      if (data.text) {
        sessionStorage.setItem(`ai_recommend_${locale}`, data.text);
      }
    } catch (error) {
      const retryMsg = locale === "vi" ? "Đang thử kết nối lại..." : "Retrying...";
      setText(retryMsg);
      
      setTimeout(() => {
        const fallback = locale === "vi"
            ? "🍊 Hôm nay hãy bổ sung vitamin C với cam tươi ngon nhé! Trái cây tươi luôn sẵn sàng cho bạn."
            : "🍊 Refresh your day with fresh citrus fruits! VKU Market has the best selection for you.";
        setText(fallback);
        sessionStorage.setItem(`ai_recommend_${locale}`, fallback);
      }, 4000);
    } finally {
      setIsLoading(false);
    }
  };

  // Typewriter effect extracted to <TypewriterText />

  return (
    <div className="relative group">
      {/* ── Subtle emerald glow ────────────────────────────────────── */}
      <div className="absolute -inset-1 opacity-25 group-hover:opacity-45 rounded-[28px] blur-[35px] pointer-events-none transition-opacity duration-700 bg-gradient-to-r from-fruit-emerald/60 via-emerald-400/40 to-teal-500/60 animate-pulse" />

      {/* ── Glass Card ────────────────────────────────────────────── */}
      <div className="relative z-10 p-6 md:p-8 rounded-[24px] border border-slate-200 dark:border-white/10 backdrop-blur-[30px] bg-white/80 dark:bg-black/40 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:bg-white/90 dark:group-hover:bg-black/50">
        <div className="flex items-start gap-4">
          {/* ── Agri Icon ─────── */}
          <div className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-fruit-emerald to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Sprout className="w-5 h-5 text-white" />
          </div>

          {/* ── Content ─────── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5">
              <h3 className="text-sm font-bold font-body text-fruit-emerald">
                {locale === "vi" ? "Lão Nông Advisor" : "Lão Nông Advisor"}
              </h3>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-fruit-emerald/10 text-fruit-emerald font-bold uppercase tracking-wider border border-fruit-emerald/20">
                {locale === "vi" ? "Thần Nông AI" : "AgriSense"}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-fruit-emerald/50 animate-bounce" style={{ animationDelay: "0s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-fruit-emerald/50 animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-fruit-emerald/50 animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
                <span className="text-xs text-slate-500 dark:text-white/40 font-body">
                  {locale === "vi" ? "Lão Nông đang suy nghĩ..." : "The farmer is thinking..."}
                </span>
              </div>
            ) : text ? (
              <TypewriterText text={text} />
            ) : (
              <button 
                onClick={handleGetSuggestion} 
                className="px-4 py-2 mt-1 bg-gradient-to-r from-fruit-emerald to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all text-sm font-bold font-body flex items-center gap-2"
              >
                <Sprout className="w-4 h-4" />
                Nhận gợi ý từ Lão Nông
              </button>
            )}
          </div>

          {/* ── Refresh Button ─────── */}
          {text && (
            <button
              onClick={() => handleGetSuggestion()}
              disabled={isLoading}
              className="shrink-0 p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 hover:text-fruit-emerald transition-all disabled:opacity-30"
              title={locale === "vi" ? "Hỏi lại Lão Nông" : "Ask again"}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
