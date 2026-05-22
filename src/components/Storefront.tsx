"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { QRCodeSVG } from "qrcode.react";
import { useCartStore } from "@/store/useCartStore";
import { MapPin, ShoppingCart, QrCode, Leaf, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface StorefrontProps {
  onTrace?: (id: string) => void;
}

interface TemplateInfo {
  id: string;
  name: string;
  origin: string;
  imageUrl: string;
  price: number | null;
  batches: { blockchainId: string }[];
  inventory: { inWarehouse: number; onDisplay: number; sold: number } | null;
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

export default function Storefront({ onTrace }: StorefrontProps) {
  const router = useRouter();
  const [qrModal, setQrModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const { addToCart } = useCartStore();
  const t = useTranslations("storefront");

  const { data: products, isLoading, isError, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getAllProducts",
  });

  useEffect(() => { if (isError && error) console.error("RPC Error:", error); }, [isError, error]);

  // Reset pagination when search query changes
  useEffect(() => {
    setVisibleCount(6);
  }, [searchQuery]);

  // ── Fetch dynamic QR base URL (LAN IP) with React Query ──────────
  const { data: qrUrlData } = useQuery<{ baseUrl: string }>({
    queryKey: ["qr-url"],
    queryFn: async () => {
      const res = await fetch("/api/qr-url");
      if (!res.ok) throw new Error("Failed to fetch QR base URL");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch product templates with React Query ──────────────────────
  const { data: templates } = useQuery<TemplateInfo[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  // ── Memoized Lookups ──────────────────────────────────────────────
  const { validBlockchainIds, templateByBlockchainId } = useMemo(() => {
    const idSet = new Set<string>();
    const lookup: Record<string, TemplateInfo> = {};
    if (templates) {
      templates.forEach(t => {
        if ((t as any).status === 'REJECTED') return;
        t.batches.forEach(b => {
          if (!b.blockchainId || b.blockchainId === "null" || b.blockchainId === "undefined") return;
          idSet.add(b.blockchainId);
          lookup[b.blockchainId] = t;
        });
      });
    }
    return { validBlockchainIds: idSet, templateByBlockchainId: lookup };
  }, [templates]);

  const allProducts = useMemo(() => {
    if (!products) return [];
    return (products as any[])
      .map(p => ({
        id: p.id ? p.id.toString() : "",
        name: p.name,
        origin: p.origin,
        status: p.status || "",
        history: (p.history || []).map((h: any) => ({
          status: Number(h.status),
          timestamp: h.timestamp.toString(),
        })),
      }))
      .filter(p => p.id && p.id !== "null" && p.id !== "undefined" && p.status !== 'REJECTED');
  }, [products]);

  const safeProducts = useMemo(() => {
    return allProducts.filter(p => validBlockchainIds.has(p.id));
  }, [allProducts, validBlockchainIds]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return safeProducts;
    return safeProducts.filter(p => {
      const tmpl = templateByBlockchainId[p.id];
      return p.name.toLowerCase().includes(q) ||
             p.origin.toLowerCase().includes(q) ||
             (tmpl?.name?.toLowerCase().includes(q)) ||
             (tmpl?.origin?.toLowerCase().includes(q));
    });
  }, [safeProducts, searchQuery, templateByBlockchainId]);

  const productsWithStock = useMemo(() => {
    return filteredProducts.map(p => {
      const tmpl = templateByBlockchainId[p.id];
      const inv = tmpl?.inventory;
      const totalStock = inv ? (inv.inWarehouse + inv.onDisplay) : 0;
      const sameNameProducts = filteredProducts.filter(fp => fp.name === p.name && fp.origin === p.origin);
      const numBatches = sameNameProducts.length || 1;
      const stock = totalStock / numBatches;
      return { ...p, stock };
    });
  }, [filteredProducts, templateByBlockchainId]);

  // Group by name AND origin so that products of different origins appear as distinct cards
  const groupedProducts = useMemo(() => {
    const grouped = productsWithStock.reduce((acc: any[], curr: any) => {
      const existing = acc.find(item => item.name === curr.name && item.origin === curr.origin);
      if (existing) {
        existing.totalStock += curr.stock;
        existing.batches.push(curr);
      } else {
        acc.push({ ...curr, totalStock: curr.stock, batches: [curr] });
      }
      return acc;
    }, []);

    return grouped.map(gp => {
      const sortedBatches = [...gp.batches].sort((a, b) => Number(b.id) - Number(a.id));
      const latestBatchId = sortedBatches[0]?.id || gp.id;
      return { ...gp, batchId: latestBatchId };
    });
  }, [productsWithStock]);

  const displayedProducts = useMemo(() => {
    return groupedProducts.slice(0, visibleCount);
  }, [groupedProducts, visibleCount]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const handleAddToCart = useCallback((tmpl: TemplateInfo) => {
    if (!tmpl.price || tmpl.price <= 0) return;
    addToCart({ templateId: tmpl.id, name: tmpl.name, imageUrl: tmpl.imageUrl || null, origin: tmpl.origin, price: tmpl.price });
    toast.success(t("addedToCart", { name: tmpl.name }));
  }, [addToCart, t]);

  const handleTrack = useCallback((product: any) => {
    // Sort batches descending by numerical blockchain ID to find the latest
    const sortedBatches = [...product.batches].sort((a, b) => Number(b.id) - Number(a.id));
    const latestBatchId = sortedBatches[0]?.id || product.id;

    if (onTrace) {
      onTrace(latestBatchId);
    }
    router.push(`/tracking?batchId=${latestBatchId}`);
  }, [onTrace, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-fruit-emerald/30 border-t-fruit-emerald"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="font-heading text-xl mb-2">{t("failedTitle")}</p>
        <p className="text-sm text-[var(--muted)] font-body">{t("failedDesc")}</p>
        <p className="text-xs font-mono mt-4 text-[var(--muted)] opacity-50 break-all">{error?.message || "Unknown error"}</p>
      </div>
    );
  }

  if (safeProducts.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Leaf className="w-12 h-12 mx-auto mb-4 text-fruit-emerald/30" />
        <h3 className="font-heading text-2xl mb-2">{t("emptyTitle")}</h3>
        <p className="text-[var(--muted)] font-body">{t("emptyDesc")}</p>
      </div>
    );
  }

  const baseUrl = qrUrlData?.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const q = searchQuery.toLowerCase().trim();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-3xl">{t("title")}</h2>
          <p className="text-sm text-[var(--muted)] font-body mt-1">{t("subtitle")}</p>
        </div>
        <span className="badge badge-success">
          <Leaf className="w-3 h-3" /> {groupedProducts.length} {t("title")}
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t("title") === "Product Catalog" ? "Search products by name or origin..." : "Tìm kiếm sản phẩm theo tên hoặc xuất xứ..."}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-body text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-fruit-emerald/30 focus:border-fruit-emerald/30 transition-all shadow-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* No Results */}
      {groupedProducts.length === 0 && q && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-white/15" />
          <p className="font-body text-sm text-slate-500 dark:text-white/40">
            {t("title") === "Product Catalog" ? "No matching products found" : "Không tìm thấy sản phẩm phù hợp"}
          </p>
          <p className="text-xs text-slate-400 dark:text-white/20 mt-1 font-body">&ldquo;{searchQuery}&rdquo;</p>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedProducts.map((product, i) => {
          const id = product.id;
          const tmpl = templateByBlockchainId[id];
          const imageUrl = tmpl?.imageUrl || null;
          const totalStock = Math.round(product.totalStock);
          const isInStock = totalStock > 0;
          const hasPrice = tmpl?.price && tmpl.price > 0;
          const canBuy = isInStock && hasPrice;

          return (
            <motion.div
              key={id}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="group flex flex-col bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden transition-all duration-300 shadow-lg dark:shadow-none hover:shadow-xl hover:shadow-slate-200 dark:hover:shadow-fruit-emerald/5"
            >
              {/* ── Image Area ─────────────────────────────────────────── */}
              <div className="aspect-[4/3] relative overflow-hidden bg-[var(--surface)]">
                {imageUrl ? (
                  <Image src={imageUrl} alt={product.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={i < 3} className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Leaf className="w-12 h-12 text-fruit-emerald/15" />
                  </div>
                )}

                {/* Status badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className={isInStock ? "badge badge-success" : "badge badge-error"}>
                    {isInStock ? `${t("inStock")} · ${totalStock}` : t("soldOut")}
                  </span>
                </div>

                {/* QR Code trigger */}
                <button onClick={() => setQrModal(id)}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-white/80 dark:bg-[var(--surface)] backdrop-blur-sm border border-[var(--border)] hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="View QR Code">
                  <QrCode className="w-4 h-4 text-fruit-emerald" />
                </button>
              </div>

              {/* ── Content Area ────────────────────────────────────────── */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-heading text-xl leading-tight tracking-tight text-slate-900 dark:text-white">{product.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-body mt-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {product.origin}
                </p>

                {hasPrice && (
                  <p className="font-heading text-2xl text-fruit-emerald mt-3">{formatCurrency(tmpl.price!)}</p>
                )}

                {/* Actions */}
                <div className="mt-auto pt-5 flex gap-2">
                  <Link href={`/tracking?batchId=${product.batchId}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition-colors">
                    <Search className="w-3.5 h-3.5" /> {t("traceOrigin")}
                  </Link>
                  {canBuy && (
                    <button onClick={() => handleAddToCart(tmpl)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-full bg-fruit-emerald text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all">
                      <ShoppingCart className="w-3.5 h-3.5" /> {t("addToCart")}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Load More Button */}
      {visibleCount < groupedProducts.length && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => setVisibleCount(prev => prev + 6)}
            className="btn-primary flex items-center gap-2 !px-8 !py-3 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
          >
            <span>🔄</span> Load More Products
          </button>
        </div>
      )}

      {/* ── QR Modal ──────────────────────────────────────────────────── */}
      {qrModal && (() => {
        const tmplInfo = templateByBlockchainId[qrModal];
        const qrUrl = `${baseUrl}?batchId=${qrModal}`;
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--overlay-bg)] backdrop-blur-sm"
            onClick={() => setQrModal(null)}>
            <div className="glass-card p-8 text-center max-w-sm" onClick={e => e.stopPropagation()} style={{ borderRadius: '1.5rem' }}>
              <h3 className="font-heading text-xl mb-1">{t("qrTitle")}</h3>
              {tmplInfo && (
                <p className="text-sm text-slate-600 dark:text-white/50 font-body mb-4">
                  {tmplInfo.name} — {tmplInfo.origin}
                </p>
              )}
              <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-lg">
                <QRCodeSVG value={qrUrl} size={200} level="H" fgColor="#059669" />
              </div>
              <p className="text-xs text-[var(--muted)] font-body mt-4">{t("qrDesc")}</p>
              <p className="font-mono text-[10px] text-[var(--muted)] mt-2 break-all px-2 opacity-60">{qrUrl}</p>
              <button onClick={() => setQrModal(null)} className="btn-ghost mt-4 w-full !text-sm">
                {t("title") === "Product Catalog" ? "Close" : "Đóng"}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
