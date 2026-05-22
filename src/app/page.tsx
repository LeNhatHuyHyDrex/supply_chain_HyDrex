"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Leaf, ShieldCheck, Truck, Globe, Package } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useTranslations } from "next-intl";
import gsap from "gsap";

// ─── App Shell Components ─────────────────────────────────────────────────────
import MasterHeader, { type ViewKey } from "@/components/MasterHeader";
import GlowingGlassCard from "@/components/GlowingGlassCard";
import Storefront from "@/components/Storefront";
import TrackProduct from "@/components/TrackProduct";
import InventoryManager from "@/components/InventoryManager";
import OrderManager from "@/components/OrderManager";
import AddProduct from "@/components/AddProduct";
import UpdateStatus from "@/components/UpdateStatus";
import AdminPanel from "@/components/AdminPanel";
import Dashboard from "@/components/Dashboard";
import CartDrawer from "@/components/CartDrawer";
import AILoveBox from "@/components/AILoveBox";
import { useUser } from "@/providers/UserProvider";

// ─── VIDEO SOURCE ─────────────────────────────────────────────────────────────
const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_080827_a9e5ad52-b6ee-4e79-b393-d936f179cfd7.mp4";

// ─── Animation Variants ───────────────────────────────────────────────────────
const viewTransition = {
  initial: { opacity: 0, y: 20, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  exit: { opacity: 0, y: -10, filter: "blur(4px)", transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

// ─── BlurText ─────────────────────────────────────────────────────────────────
function BlurText({ text }: { text: string }) {
  return (
    <span>
      {text.split("").map((char, i) => (
        <span key={i} className="blur-text-char" style={{ animationDelay: `${i * 0.03 + 0.5}s` }}>
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

// ─── LogoMark (footer) ────────────────────────────────────────────────────────
function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="url(#lgft)" /><path d="M16 6L22 10V18L16 22L10 18V10L16 6Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none" /><path d="M16 6V22M10 10L22 18M22 10L10 18" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" /><defs><linearGradient id="lgft" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#059669" /><stop offset="1" stopColor="#10b981" /></linearGradient></defs></svg>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
function FaqItem({ item, isOpen, toggle }: { item: { q: string; a: string }; isOpen: boolean; toggle: () => void }) {
  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden transition-colors hover:border-slate-300 dark:hover:border-white/20">
      <button onClick={toggle} className="w-full flex items-center justify-between p-5 text-left">
        <span className="font-body font-semibold text-sm pr-4 text-slate-900 dark:text-white">{item.q}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-fruit-emerald" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400 dark:text-white/40" />}
      </button>
      <div className="faq-content" style={{ maxHeight: isOpen ? "200px" : "0px", opacity: isOpen ? 1 : 0 }}>
        <p className="px-5 pb-5 text-sm text-slate-600 dark:text-white/60 font-body leading-relaxed">{item.a}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function HomeView({ onNavigate }: { onNavigate: (view: ViewKey) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<ImageData[]>([]);
  const frameIndexRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);
  const rafRef = useRef<number>(0);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);

  const [framesReady, setFramesReady] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");

  const FAQ_DATA = [
    { q: t("faq1q"), a: t("faq1a") },
    { q: t("faq2q"), a: t("faq2a") },
    { q: t("faq3q"), a: t("faq3a") },
    { q: t("faq4q"), a: t("faq4a") },
  ];

  // Frame Capture
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!offCtx) return;
    let capturing = false;
    const captureFrame = () => {
      if (!capturing) return;
      if (video.paused || video.ended) { if (framesRef.current.length > 0) setFramesReady(true); return; }
      offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
      framesRef.current.push(offCtx.getImageData(0, 0, offscreen.width, offscreen.height));
      requestAnimationFrame(captureFrame);
    };
    const onCanPlay = () => { offscreen.width = video.videoWidth; offscreen.height = video.videoHeight; capturing = true; video.play().catch(() => { }); };
    const onPlay = () => { captureFrame(); };
    const onEnded = () => { capturing = false; if (framesRef.current.length > 0) setFramesReady(true); };
    video.addEventListener("canplaythrough", onCanPlay);
    video.addEventListener("play", onPlay);
    video.addEventListener("ended", onEnded);
    return () => { capturing = false; video.removeEventListener("canplaythrough", onCanPlay); video.removeEventListener("play", onPlay); video.removeEventListener("ended", onEnded); };
  }, []);

  // Boomerang Render
  useEffect(() => {
    if (!framesReady || framesRef.current.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frames = framesRef.current;
    canvas.width = frames[0].width; canvas.height = frames[0].height;
    const renderLoop = () => {
      const frame = frames[frameIndexRef.current];
      if (frame) ctx.putImageData(frame, 0, 0);
      frameIndexRef.current += directionRef.current;
      if (frameIndexRef.current >= frames.length - 1) { directionRef.current = -1; frameIndexRef.current = frames.length - 1; }
      else if (frameIndexRef.current <= 0) { directionRef.current = 1; frameIndexRef.current = 0; }
      rafRef.current = requestAnimationFrame(renderLoop);
    };
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [framesReady]);

  // Parallax
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const strength = 20; const lerp = 0.06;
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetX.current = ((e.clientX - rect.left - rect.width / 2) / rect.width) * strength;
      targetY.current = ((e.clientY - rect.top - rect.height / 2) / rect.height) * strength;
    };
    const animateParallax = () => {
      currentX.current += (targetX.current - currentX.current) * lerp;
      currentY.current += (targetY.current - currentY.current) * lerp;
      gsap.set(canvas, { x: currentX.current, y: currentY.current });
      requestAnimationFrame(animateParallax);
    };
    window.addEventListener("mousemove", onMouseMove);
    const raf = requestAnimationFrame(animateParallax);
    return () => { window.removeEventListener("mousemove", onMouseMove); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => { const t = setTimeout(() => setHeroVisible(true), 300); return () => clearTimeout(t); }, []);

  return (
    <>
      {/* ═══ SECTION 1: CINEMATIC HERO ══════════════════════════════════════ */}
      <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-black -mt-[72px]">
        <video ref={videoRef} src={VIDEO_SRC} muted playsInline crossOrigin="anonymous" preload="auto"
          className={`absolute inset-0 w-full h-full object-cover ${framesReady ? "hidden" : "opacity-60"}`} />
        <canvas ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${framesReady ? "opacity-60" : "opacity-0"}`}
          style={{ objectFit: "cover" }} />
        <div className="absolute inset-0 bg-white/60 dark:bg-transparent dark:bg-gradient-to-b dark:from-black/40 dark:via-black/20 dark:to-black/70 z-[1]" />

        <div className={`absolute inset-0 z-[5] flex flex-col items-center justify-center transition-all duration-1000 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h1 className="font-heading text-slate-900 dark:text-white text-center select-none" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            <BlurText text={t("heroTitle1")} /><br /><BlurText text={t("heroTitle2")} />
          </h1>
          <p className="text-slate-600 dark:text-white/50 text-lg md:text-xl mt-6 font-light tracking-wide max-w-xl text-center font-body">
            {t("heroSubtitle")}
          </p>
          <div className="flex items-center gap-4 mt-10">
            <button onClick={() => onNavigate("storefront")}
              className="px-8 py-3.5 bg-fruit-emerald text-white font-bold text-sm rounded-full shadow-2xl shadow-fruit-emerald/30 hover:shadow-fruit-emerald/50 transition-all hover:scale-105 active:scale-95">
              {t("startShopping")}
            </button>
            <button onClick={() => onNavigate("consumer")}
              className="px-8 py-3.5 text-slate-900 dark:text-white font-semibold text-sm hover:scale-105 transition-all bg-white/50 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-full">
              {t("viewTraceability")}
            </button>
          </div>
        </div>

        <div className={`absolute bottom-8 left-0 right-0 z-[5] px-8 flex items-end justify-between transition-all duration-1000 delay-500 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <p className="text-slate-500 dark:text-white/40 text-xs leading-relaxed font-body max-w-xs">{t("heroFooter")}<br />{t("heroFooter2")}</p>
          <div className="flex items-center gap-3 text-slate-500 dark:text-white/30 text-xs font-body">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> {tCommon("verified")}</span>
            <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {tCommon("tracked")}</span>
            <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {tCommon("decentralized")}</span>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: WHY VKU MARKET? ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/background/Blackground2.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/70 dark:bg-black/80 backdrop-blur-sm dark:backdrop-blur-none" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
          <motion.div className="text-center mb-20" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
            <span className="badge badge-success mb-4 inline-flex"><Leaf className="w-3 h-3" /> {t("whyChooseUs")}</span>
            <h2 className="font-heading text-4xl md:text-5xl tracking-tight text-slate-900 dark:text-white drop-shadow-lg">{t("whyTitle")}</h2>
            <p className="text-slate-600 dark:text-white/50 font-body mt-3 max-w-lg mx-auto">
              {t("whySubtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlowingGlassCard
              icon={<ShieldCheck className="w-7 h-7" />}
              title={t("pillar1Title")}
              description={t("pillar1Desc")}
              glowGradient="linear-gradient(137deg, #10B981 0%, #06b6d4 100%)"
              delay={0}
            />
            <GlowingGlassCard
              icon={<Leaf className="w-7 h-7" />}
              title={t("pillar2Title")}
              description={t("pillar2Desc")}
              glowGradient="linear-gradient(137deg, #F59E0B 0%, #F87171 100%)"
              delay={0.15}
            />
            <GlowingGlassCard
              icon={<Package className="w-7 h-7" />}
              title={t("pillar3Title")}
              description={t("pillar3Desc")}
              glowGradient="linear-gradient(137deg, #8B5CF6 0%, #EC4899 100%)"
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3: STOREFRONT ══════════════════════════ */}
      <section className="relative w-full py-24 bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/background/Blackground4..jpg')" }}>
        <div className="absolute inset-0 bg-white/75 dark:bg-[#0A0A0B]/70 backdrop-blur-[2px] z-0 transition-colors duration-500"></div>
        <motion.div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
          <div className="text-center mb-16">
            <span className="badge badge-success mb-4 inline-flex"><Leaf className="w-3 h-3" /> {t("freshCollection")}</span>
            <h2 className="font-heading text-4xl md:text-5xl tracking-tight text-slate-900 dark:text-white">{t("productCatalog")}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-body mt-3 max-w-lg mx-auto">
              {t("productCatalogDesc")}
            </p>
          </div>
          {/* AI Recommendation Box */}
          <div className="mb-12">
            <AILoveBox />
          </div>
          <Storefront onTrace={(id) => onNavigate("consumer")} />
        </motion.div>
      </section>

      {/* ═══ SECTION 4: CTA + FAQ ════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/background/Blackground3.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/70 dark:bg-black/80 backdrop-blur-sm dark:backdrop-blur-none" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CTA Card */}
              <div className="animated-gradient-bg relative overflow-hidden min-h-[420px] flex flex-col justify-end p-10">
                <div className="absolute inset-0 bg-white/80 dark:bg-black/50 z-0" />
                <div className="relative z-10">
                  <h3 className="font-heading text-4xl text-slate-900 dark:text-white mb-4 leading-tight">
                    {t("ctaTitle1")}<br />{t("ctaTitle2")}
                  </h3>
                  <p className="text-slate-700 dark:text-white/70 font-body text-sm mb-8 max-w-sm">
                    {t("ctaDesc")}
                  </p>
                  <button onClick={() => onNavigate("storefront")}
                    className="inline-flex px-8 py-3.5 bg-slate-900 text-white dark:bg-white dark:text-black font-bold text-sm rounded-full hover:scale-105 transition-all shadow-2xl">
                    {t("startShopping")} →
                  </button>
                </div>
              </div>

              {/* FAQ */}
              <div className="flex flex-col justify-center">
                <h3 className="font-heading text-3xl mb-6 text-slate-900 dark:text-white">{t("faqTitle")}</h3>
                <div className="space-y-3">
                  {FAQ_DATA.map((item, i) => (
                    <FaqItem key={i} item={item} isOpen={openFaq === i} toggle={() => setOpenFaq(openFaq === i ? null : i)} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 5: FOOTER ══════════════════════════════════════════════ */}
      <footer className="border-t border-[var(--border)] bg-[var(--background)] transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4"><LogoMark className="w-8 h-8" /><span className="font-heading text-xl">VKU Market</span></div>
              <p className="text-sm text-[var(--muted)] font-body max-w-sm leading-relaxed">
                {t("footerDesc")}
              </p>
            </div>
            <div>
              <h4 className="font-body font-bold text-xs uppercase tracking-wider text-[var(--muted)] mb-4">{t("footerPlatform")}</h4>
              <div className="space-y-2.5">
                {([["shop", "storefront"], ["trace", "consumer"], ["inventory", "inventory"], ["orders", "orders"]] as [string, ViewKey][]).map(([labelKey, view]) => (
                  <button key={view} onClick={() => onNavigate(view)} className="block text-sm font-body hover:text-fruit-emerald transition-colors text-[var(--muted)]">{tNav(labelKey)}</button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-body font-bold text-xs uppercase tracking-wider text-[var(--muted)] mb-4">{t("footerTechnology")}</h4>
              <div className="space-y-2.5">
                {["Ethereum Sepolia", "Next.js 16", "Wagmi + RainbowKit", "Prisma ORM"].map(tech => (
                  <p key={tech} className="text-sm font-body text-[var(--muted)]">{tech}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--muted)] font-body text-center leading-relaxed">
              {t("footerCopyright")}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP-LINK LOADING OVERLAY (Frosted-glass spinner for QR scan entry)
// ═══════════════════════════════════════════════════════════════════════════════
function DeepLinkLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/80 dark:bg-[#0A0A0B]/90 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-fruit-emerald/20" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-fruit-emerald animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-heading text-lg text-slate-900 dark:text-white">Đang truy xuất nguồn gốc...</p>
          <p className="text-sm text-slate-500 dark:text-white/40 font-body mt-1">Verifying blockchain provenance</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// URL QUERY HANDLER (Isolated to safely wrap in Suspense boundary)
// ═══════════════════════════════════════════════════════════════════════════════
function URLQueryHandler({ onTrack }: { onTrack: (id: string) => void }) {
  const searchParams = useSearchParams();
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (!searchParams) return;
    
    const batchIdStr = searchParams.get('batchId');
    if (batchIdStr) {
      // 1. Cast to strict Number for Prisma/Smart Contract safety
      const numericId = parseInt(batchIdStr, 10);
      
      if (!isNaN(numericId)) {
        console.log("Valid QR ID found:", numericId);
        initialized.current = true;
        setDeepLinkLoading(true);
        onTrack(numericId.toString());
        
        // 2. WIPE THE URL CLEAN immediately to prevent infinite re-renders
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => setDeepLinkLoading(false), 1500);
      }
    }
  }, [searchParams, onTrack]);

  if (deepLinkLoading) return <DeepLinkLoadingOverlay />;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("home");
  return (
    <div className="min-h-[calc(100vh-72px)] pt-6 bg-slate-50 dark:bg-[#0A0A0B] transition-colors">
      <div className="max-w-6xl mx-auto px-6 pb-16">{children}</div>
      <footer className="border-t border-[var(--border)] transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-xs text-[var(--muted)] font-body text-center leading-relaxed">
            {t("footerCopyright")}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP SHELL (Inner — requires Suspense boundary from parent)
// ═══════════════════════════════════════════════════════════════════════════════
function AppShellInner() {
  const [activeView, setActiveView] = useState<ViewKey>("home");
  const [trackId, setTrackId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [isQRFocusMode, setIsQRFocusMode] = useState(false);
  const { user } = useUser();
  const tDenied = useTranslations("accessDenied");
  const role = user?.role || "CUSTOMER";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHeroMode = activeView === "home" && !scrolled;

  const handleNavigate = (view: ViewKey) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasAccess = (view: ViewKey): boolean => {
    if (view === "home" || view === "storefront" || view === "consumer") return true;
    const map: Record<string, string[]> = {
      inventory: ["SUPPLIER", "ADMIN"], orders: ["ADMIN", "SUPPLIER"], producer: ["SUPPLIER", "ADMIN"],
      logistics: ["SHIPPER", "SUPPLIER", "ADMIN"], admin: ["ADMIN"], dashboard: ["ADMIN"],
    };
    return map[view]?.includes(role) ?? false;
  };

  return (
    <div className="bg-slate-50 text-slate-900 dark:bg-[#0A0A0B] dark:text-white font-body selection:bg-fruit-emerald/20 transition-colors duration-300 min-h-screen">
      <Toaster position="top-right" toastOptions={{
        className: "font-body",
        style: { background: "var(--card-bg)", color: "var(--foreground)", border: "1px solid var(--card-border)", backdropFilter: "blur(12px)", fontFamily: "'Inter', sans-serif" },
      }} />

      {/* Deep-link URL parameter processing securely wrapped in Suspense */}
      <Suspense fallback={<div className="p-6 text-emerald-500 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-xl">Đang thiết lập cổng kết nối phi tập trung...</div>}>
        <URLQueryHandler onTrack={(id) => {
          setTrackId(id);
          setActiveView("consumer");
          setIsQRFocusMode(true);
        }} />
      </Suspense>

      {!isQRFocusMode && <MasterHeader activeView={activeView} onNavigate={handleNavigate} isHeroMode={isHeroMode} />}
      {!isQRFocusMode && !isHeroMode && <div className="h-[72px]" />}

      <main className={`flex-1 ${isQRFocusMode ? 'p-0 m-0 w-full h-screen overflow-y-auto bg-slate-50 dark:bg-[#0A0A0B]' : 'w-full'}`}>
        <AnimatePresence mode="wait">
        {activeView === "home" && (
          <motion.div key="home" {...viewTransition}><HomeView onNavigate={handleNavigate} /></motion.div>
        )}
        {activeView === "storefront" && (
          <motion.div key="storefront" {...viewTransition}><DashboardShell><Storefront onTrace={(id) => { setTrackId(id); handleNavigate("consumer"); }} /></DashboardShell></motion.div>
        )}
        {activeView === "consumer" && (
          <motion.div key="consumer" {...viewTransition}>
            {isQRFocusMode ? (
              <TrackProduct 
                initialId={trackId} 
                isFocusMode={isQRFocusMode} 
                onBack={() => { setIsQRFocusMode(false); setActiveView("home"); }} 
              />
            ) : (
              <DashboardShell>
                <TrackProduct 
                  initialId={trackId} 
                  isFocusMode={isQRFocusMode} 
                  onBack={() => { setIsQRFocusMode(false); setActiveView("home"); }} 
                />
              </DashboardShell>
            )}
          </motion.div>
        )}
        {activeView === "inventory" && hasAccess("inventory") && (
          <motion.div key="inventory" {...viewTransition}><DashboardShell><InventoryManager /></DashboardShell></motion.div>
        )}
        {activeView === "orders" && hasAccess("orders") && (
          <motion.div key="orders" {...viewTransition}><DashboardShell><OrderManager /></DashboardShell></motion.div>
        )}
        {activeView === "producer" && hasAccess("producer") && (
          <motion.div key="producer" {...viewTransition}><DashboardShell><AddProduct /></DashboardShell></motion.div>
        )}
        {activeView === "logistics" && hasAccess("logistics") && (
          <motion.div key="logistics" {...viewTransition}><DashboardShell><UpdateStatus /></DashboardShell></motion.div>
        )}
        {activeView === "admin" && hasAccess("admin") && (
          <motion.div key="admin" {...viewTransition}><DashboardShell><AdminPanel /></DashboardShell></motion.div>
        )}
        {activeView === "dashboard" && hasAccess("dashboard") && (
          <motion.div key="dashboard" {...viewTransition}><DashboardShell><Dashboard onTrack={(id) => { setTrackId(id); handleNavigate("consumer"); }} /></DashboardShell></motion.div>
        )}
        {activeView !== "home" && !hasAccess(activeView) && (
          <motion.div key="denied" {...viewTransition}>
            <DashboardShell>
              <div className="glass-card p-12 text-center">
                <div className="text-5xl mb-4">⛔</div>
                <h3 className="font-heading text-2xl mb-2">{tDenied("title")}</h3>
                <p className="text-[var(--muted)] font-body">{tDenied("message", { role })}</p>
                <button onClick={() => handleNavigate("home")} className="btn-primary mt-6">{tDenied("backHome")}</button>
              </div>
            </DashboardShell>
          </motion.div>
        )}
      </AnimatePresence>
      </main>

      {!isQRFocusMode && <CartDrawer />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUSPENSE-WRAPPED EXPORT (prevents useSearchParams hydration crash)
// ═══════════════════════════════════════════════════════════════════════════════
export default function AppShell() {
  return (
    <Suspense fallback={<div className="p-6 text-emerald-500 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-xl fixed inset-0 m-auto w-max h-max">Đang thiết lập cổng kết nối phi tập trung...</div>}>
      <AppShellInner />
    </Suspense>
  );
}
