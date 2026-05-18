"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/providers/UserProvider";
import { useCartStore } from "@/store/useCartStore";
import toast from "react-hot-toast";
import {
  Sun, Moon, ShoppingCart, ChevronDown, Menu, X, Copy, LogOut, User,
  Store, Search, Package, ClipboardList, Sprout, Truck, Shield, BarChart3, Home,
} from "lucide-react";

// ─── View Definitions ─────────────────────────────────────────────────────────
export type ViewKey = "home" | "storefront" | "consumer" | "inventory" | "orders" | "producer" | "logistics" | "admin" | "dashboard";

export interface NavItem { key: ViewKey; label: string; icon: React.ReactNode; access: string[]; desc: string; }

export const NAV_ITEMS: NavItem[] = [
  { key: "storefront", label: "Shop",       icon: <Store className="w-4 h-4" />,         access: ["CUSTOMER","SHIPPER","SUPPLIER","ADMIN"], desc: "Browse products" },
  { key: "consumer",   label: "Trace",      icon: <Search className="w-4 h-4" />,        access: ["CUSTOMER","SHIPPER","SUPPLIER","ADMIN"], desc: "Product traceability" },
  { key: "inventory",  label: "Inventory",  icon: <Package className="w-4 h-4" />,       access: ["SUPPLIER","ADMIN"],                      desc: "Warehouse & stock" },
  { key: "orders",     label: "Orders",     icon: <ClipboardList className="w-4 h-4" />, access: ["ADMIN","SUPPLIER"],                      desc: "Manage orders" },
  { key: "producer",   label: "Producer",   icon: <Sprout className="w-4 h-4" />,        access: ["SUPPLIER","ADMIN"],                      desc: "Register products" },
  { key: "logistics",  label: "Logistics",  icon: <Truck className="w-4 h-4" />,         access: ["SHIPPER","SUPPLIER","ADMIN"],             desc: "Update shipments" },
  { key: "admin",      label: "Admin",      icon: <Shield className="w-4 h-4" />,        access: ["ADMIN"],                                 desc: "User management" },
  { key: "dashboard",  label: "Analytics",  icon: <BarChart3 className="w-4 h-4" />,     access: ["ADMIN"],                                 desc: "Global overview" },
];

// ─── LogoMark ─────────────────────────────────────────────────────────────────
function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="url(#lg)"/><path d="M16 6L22 10V18L16 22L10 18V10L16 6Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><path d="M16 6V22M10 10L22 18M22 10L10 18" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/><defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#059669"/><stop offset="1" stopColor="#10b981"/></linearGradient></defs></svg>
  );
}

// ─── Dropdown animation ───────────────────────────────────────────────────────
const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.1, ease: "easeIn" } },
};

// ─── Truncate ─────────────────────────────────────────────────────────────────
const truncAddr = (a: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ isHero }: { isHero: boolean }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  if (!m) return <div className="w-9 h-9" />;
  const isDark = resolvedTheme === "dark";
  return (
    <button onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-xl bg-gradient-to-br from-white/25 via-white/10 to-transparent dark:from-black/40 dark:via-black/20 dark:to-transparent backdrop-blur-[30px] border border-white/20 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] hover:bg-white/30 dark:hover:bg-white/10 hover:shadow-[0_0_24px_4px_rgba(16,185,129,0.3)] transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
      title={isDark ? "Light Mode" : "Dark Mode"}>
      {isDark ? <Sun className="w-4 h-4 text-yellow-400 drop-shadow-md" /> : <Moon className="w-4 h-4 text-white drop-shadow-md" />}
    </button>
  );
}

// ─── User Profile Dropdown ────────────────────────────────────────────────────
function UserProfileDropdown({ isHero }: { isHero: boolean }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { user, refetchUser, requireOnboarding, setRequireOnboarding } = useUser();
  const [open, setOpen] = useState(false);
  const [inputName, setInputName] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleCopy = () => { if (address) { navigator.clipboard.writeText(address); toast.success("Address copied!"); } };

  const handleSaveName = async () => {
    if (!inputName.trim()) { toast.error("Please enter a display name"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress: address, displayName: inputName.trim() }) });
      if (res.ok) { await refetchUser(); toast.success("Display name saved!"); setRequireOnboarding(false); }
      else toast.error("Error saving name");
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  if (!mounted) return <div className="w-28 h-9" />;

  // Not connected → show ConnectButton
  if (!isConnected) {
    return <ConnectButton showBalance={false} />;
  }

  return (
    <>
      <div className="relative" ref={ref}>
        {/* ── Profile Pill ─────────────────────────────────────────── */}
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-white/25 via-white/10 to-transparent dark:from-black/40 dark:via-black/20 dark:to-transparent backdrop-blur-[30px] border border-white/20 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] hover:bg-white/30 dark:hover:bg-white/10 hover:shadow-[0_0_24px_4px_rgba(16,185,129,0.3)] transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]">
          {/* Avatar */}
          <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]">
            {user?.displayName ? (
              <span className="text-white drop-shadow-md text-[10px] font-bold">{user.displayName.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="w-3 h-3 text-white drop-shadow-md" />
            )}
          </div>
          <span className="text-xs font-mono text-white drop-shadow-md">
            {truncAddr(address || "")}
          </span>
          <ChevronDown className={`w-3 h-3 text-white drop-shadow-md transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {/* ── Dropdown ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {open && (
            <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
              className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#0A0A0B]/80 backdrop-blur-[40px] border border-slate-200 dark:border-white/10 p-0 shadow-2xl overflow-hidden" style={{ borderRadius: "1.25rem" }}>
              {/* User Info Header */}
              <div className="p-5 border-b border-[var(--border)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-fruit-emerald/15 border border-fruit-emerald/25 flex items-center justify-center">
                    {user?.displayName ? (
                      <span className="text-fruit-emerald font-bold text-sm">{user.displayName.charAt(0).toUpperCase()}</span>
                    ) : (
                      <User className="w-5 h-5 text-fruit-emerald" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold font-body text-sm truncate">{user?.displayName || "Unknown User"}</p>
                    <span className="badge badge-success !text-[9px]">{user?.role || "CUSTOMER"}</span>
                  </div>
                </div>
                {/* Wallet Address */}
                <button onClick={handleCopy}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] hover:bg-slate-100 dark:hover:bg-[var(--surface-hover)] transition-colors group">
                  <span className="text-xs font-mono text-slate-500 dark:text-[var(--muted)] truncate">{address}</span>
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-[var(--muted)] opacity-50 group-hover:opacity-100 shrink-0 ml-2 transition-opacity" />
                </button>
              </div>

              {/* Actions */}
              <div className="p-2">
                {requireOnboarding && (
                  <button onClick={() => { setOpen(false); setRequireOnboarding(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-body text-fruit-emerald hover:bg-fruit-emerald/5 transition-colors">
                    <User className="w-4 h-4" /> Set Display Name
                  </button>
                )}
                <button onClick={() => { disconnect(); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-body text-red-500 hover:bg-red-500/5 transition-colors">
                  <LogOut className="w-4 h-4" /> Disconnect Wallet
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Onboarding Modal (kept as-is) ────────────────────────── */}
      {requireOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 dark:bg-[var(--overlay-bg)] backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0A0A0B]/90 backdrop-blur-[40px] border border-slate-200 dark:border-white/10 shadow-2xl p-8 w-full max-w-md" style={{ borderRadius: "1.5rem" }}>
            <h2 className="font-heading text-2xl text-slate-900 dark:text-white mb-2">Welcome</h2>
            <p className="text-slate-500 dark:text-[var(--muted)] mb-6 text-sm font-body">
              Please enter a Display Name for your wallet. This will be visible when you update product statuses.
            </p>
            <div className="mb-6">
              <label className="block text-xs text-slate-500 dark:text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body">Display Name</label>
              <input type="text" value={inputName} onChange={e => setInputName(e.target.value)} placeholder="e.g. Huy - Admin"
                className="input-field !bg-slate-50 dark:!bg-black/20" autoFocus onKeyDown={e => { if (e.key === "Enter") handleSaveName(); }} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRequireOnboarding(false)} className="btn-ghost" disabled={saving}>Skip</button>
              <button onClick={handleSaveName} disabled={saving || !inputName.trim()} className="btn-primary">
                {saving ? "Saving..." : "Save Name"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface MasterHeaderProps {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  isHeroMode: boolean;
}

export default function MasterHeader({ activeView, onNavigate, isHeroMode }: MasterHeaderProps) {
  const { user } = useUser();
  const { toggleDrawer, totalItems } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const role = user?.role || "CUSTOMER";
  const visibleItems = NAV_ITEMS.filter(i => i.access.includes(role));
  const cartCount = mounted ? totalItems() : 0;
  const activeItem = NAV_ITEMS.find(n => n.key === activeView);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isHeroMode ? "bg-transparent border-b border-transparent" : "bg-white/80 dark:bg-black/40 backdrop-blur-[30px] border-b border-slate-200 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className={`flex items-center justify-between transition-all duration-300 ${isHeroMode ? "py-5" : "py-3"}`}>
          {/* ── LEFT: Logo ───────────────────────────────────────── */}
          <button onClick={() => onNavigate("home")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group">
            <LogoMark className="w-8 h-8 group-hover:scale-105 transition-transform" />
            <span className="font-heading text-lg tracking-tight text-white drop-shadow-md">VKU Market</span>
          </button>

          {/* ── MIDDLE: Nav Dropdown (replaces horizontal tabs) ─── */}
          <div className="relative" ref={navRef}>
            <button onClick={() => setNavOpen(!navOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-white/25 via-white/10 to-transparent dark:from-black/40 dark:via-black/20 dark:to-transparent backdrop-blur-[30px] border border-white/20 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] hover:bg-white/30 dark:hover:bg-white/10 hover:shadow-[0_0_24px_4px_rgba(16,185,129,0.3)] transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]">
              {navOpen ? <X className="w-4 h-4 text-white drop-shadow-md" /> : <Menu className="w-4 h-4 text-white drop-shadow-md" />}
              <span className="text-sm font-heading text-white drop-shadow-md hidden sm:inline">
                {activeItem ? activeItem.label : "Modules"}
              </span>
              <ChevronDown className={`w-3 h-3 text-white drop-shadow-md transition-transform ${navOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {navOpen && (
                <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-[#0A0A0B]/80 backdrop-blur-[40px] border border-slate-200 dark:border-white/10 shadow-[0_24px_48px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.6)] p-3 rounded-2xl z-50">
                  {/* Home */}
                  <button onClick={() => { onNavigate("home"); setNavOpen(false); }}
                    className={`w-full group relative flex items-center gap-4 p-3 rounded-xl transition-all duration-300 overflow-hidden cursor-pointer ${
                      activeView === "home" ? "bg-fruit-emerald text-white shadow-md" : "hover:bg-black/5 dark:hover:bg-white/10 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                    }`}>
                    <div className={`shrink-0 transition-transform duration-300 group-hover:translate-x-1.5 ${activeView === "home" ? "text-white" : "text-emerald-500 dark:text-emerald-400"}`}>
                      <Home className="w-4 h-4" />
                    </div>
                    <div className="text-left transition-transform duration-300 group-hover:translate-x-1.5">
                      <p className={`font-semibold text-sm ${activeView === "home" ? "text-white" : "text-gray-900 dark:text-white"}`}>Home</p>
                      <p className={`text-xs ${activeView === "home" ? "text-emerald-100" : "text-gray-500 dark:text-gray-400"}`}>Landing page</p>
                    </div>
                  </button>

                  <div className="h-px bg-black/10 dark:bg-white/10 my-2 mx-2" />

                  {/* RBAC items */}
                  {visibleItems.map(item => (
                    <button key={item.key} onClick={() => { onNavigate(item.key); setNavOpen(false); }}
                      className={`w-full group relative flex items-center gap-4 p-3 rounded-xl transition-all duration-300 overflow-hidden cursor-pointer ${
                        activeView === item.key ? "bg-fruit-emerald text-white shadow-md" : "hover:bg-black/5 dark:hover:bg-white/10 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                      }`}>
                      <div className={`shrink-0 transition-transform duration-300 group-hover:translate-x-1.5 ${activeView === item.key ? "text-white" : "text-emerald-500 dark:text-emerald-400"}`}>
                        {item.icon}
                      </div>
                      <div className="text-left transition-transform duration-300 group-hover:translate-x-1.5">
                        <p className={`font-semibold text-sm ${activeView === item.key ? "text-white" : "text-gray-900 dark:text-white"}`}>{item.label}</p>
                        <p className={`text-xs ${activeView === item.key ? "text-emerald-100" : "text-gray-500 dark:text-gray-400"}`}>{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT: Theme + Cart + User ────────────────────────── */}
          <div className="flex items-center gap-2">
            <ThemeToggle isHero={isHeroMode} />

            {/* Cart */}
            <button onClick={toggleDrawer}
              className="relative p-2 rounded-xl bg-gradient-to-br from-white/25 via-white/10 to-transparent dark:from-black/40 dark:via-black/20 dark:to-transparent backdrop-blur-[30px] border border-white/20 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] hover:bg-white/30 dark:hover:bg-white/10 hover:shadow-[0_0_24px_4px_rgba(16,185,129,0.3)] transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]">
              <ShoppingCart className="w-4 h-4 text-white drop-shadow-md" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-fruit-emerald text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] min-h-[18px] shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Profile */}
            <UserProfileDropdown isHero={isHeroMode} />
          </div>
        </div>
      </div>
    </header>
  );
}
