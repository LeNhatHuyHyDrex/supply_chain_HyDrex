"use client";

import { useCartStore } from "@/store/useCartStore";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import CheckoutModal from "./CheckoutModal";

export default function CartDrawer() {
  const { items, isDrawerOpen, setDrawerOpen, updateQuantity, removeFromCart, totalAmount, totalItems } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const itemCount = totalItems();
  const total = totalAmount();
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  return (
    <>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] bg-[var(--overlay-bg)] backdrop-blur-sm transition-opacity" onClick={() => setDrawerOpen(false)} />
      )}

      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[var(--background)] border-l border-[var(--border)] z-[101] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-xl">{t("title")}</h2>
            <span className="badge">{itemCount} {tCommon("items")}</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] space-y-4">
              <span className="text-5xl opacity-30">🛒</span>
              <p className="font-body">{t("empty")}</p>
              <button onClick={() => setDrawerOpen(false)} className="btn-ghost !text-xs">{t("continueShopping")}</button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.templateId} className="flex gap-3 p-3 glass-stat rounded-xl">
                <div className="w-16 h-16 rounded-lg bg-[var(--surface)] overflow-hidden shrink-0 flex items-center justify-center">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-lg opacity-30">📦</span>}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-semibold text-sm line-clamp-1 font-body">{item.name}</h3>
                      <p className="text-[11px] text-[var(--muted)]">{item.origin}</p>
                      <p className="text-sm font-heading mt-0.5">{formatCurrency(item.price)}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.templateId)} className="p-1 text-[var(--muted)] opacity-50 hover:text-red-400 transition-colors" title={tCommon("delete")}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center glass-stat rounded-lg overflow-hidden">
                      <button onClick={() => updateQuantity(item.templateId, -1)} className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors text-sm">-</button>
                      <span className="w-7 text-center text-xs font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.templateId, 1)} className="w-7 h-7 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors text-sm">+</button>
                    </div>
                    <span className="text-xs font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-[var(--border)] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--muted)] text-sm font-body">{t("subtotal", { count: itemCount })}</span>
              <span className="font-heading text-xl">{formatCurrency(total)}</span>
            </div>
            <button onClick={() => setIsCheckoutOpen(true)} className="btn-primary w-full !py-3.5 flex justify-center items-center gap-2">
              {t("checkout")} — {formatCurrency(total)}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        )}
      </div>

      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
    </>
  );
}
