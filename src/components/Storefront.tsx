"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { QRCodeSVG } from "qrcode.react";
import { useCartStore } from "@/store/useCartStore";
import { MapPin, ShoppingCart, QrCode, Leaf, Search } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface StorefrontProps {
  onTrace: (id: string) => void;
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
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function Storefront({ onTrace }: StorefrontProps) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [validBlockchainIds, setValidBlockchainIds] = useState<Set<string>>(new Set());
  const [templateByBlockchainId, setTemplateByBlockchainId] = useState<Record<string, TemplateInfo>>({});
  const [qrModal, setQrModal] = useState<string | null>(null);
  const { addToCart } = useCartStore();

  const { data: products, isLoading, isError, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getAllProducts",
  });

  useEffect(() => { if (isError && error) console.error("RPC Error:", error); }, [isError, error]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const data: TemplateInfo[] = await res.json();
          setTemplates(data);
          const idSet = new Set<string>();
          const lookup: Record<string, TemplateInfo> = {};
          data.forEach(t => { t.batches.forEach(b => { idSet.add(b.blockchainId); lookup[b.blockchainId] = t; }); });
          setValidBlockchainIds(idSet);
          setTemplateByBlockchainId(lookup);
        }
      } catch (error) { console.error("Failed to fetch templates:", error); }
    };
    fetchTemplates();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const handleAddToCart = (tmpl: TemplateInfo) => {
    if (!tmpl.price || tmpl.price <= 0) return;
    addToCart({ templateId: tmpl.id, name: tmpl.name, imageUrl: tmpl.imageUrl || null, origin: tmpl.origin, price: tmpl.price });
    toast.success(`${tmpl.name} added to cart`);
  };

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
        <p className="font-heading text-xl mb-2">Failed to load products</p>
        <p className="text-sm text-[var(--muted)] font-body">Please check your network connection.</p>
        <p className="text-xs font-mono mt-4 text-[var(--muted)] opacity-50 break-all">{error?.message || "Unknown error"}</p>
      </div>
    );
  }

  const allProducts = products ? (products as any[]).map(p => ({
    id: p.id.toString(), name: p.name, origin: p.origin,
    history: (p.history || []).map((h: any) => ({ status: Number(h.status), timestamp: h.timestamp.toString() }))
  })) : [];

  const safeProducts = allProducts.filter(p => validBlockchainIds.has(p.id));

  if (safeProducts.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Leaf className="w-12 h-12 mx-auto mb-4 text-fruit-emerald/30" />
        <h3 className="font-heading text-2xl mb-2">Product Catalog is Empty</h3>
        <p className="text-[var(--muted)] font-body">No products with valid templates have been registered yet.</p>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-3xl">Product Catalog</h2>
          <p className="text-sm text-[var(--muted)] font-body mt-1">Farm-fresh produce, verified on-chain</p>
        </div>
        <span className="badge badge-success">
          <Leaf className="w-3 h-3" /> {safeProducts.length} Products
        </span>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {safeProducts.map((product, i) => {
          const id = product.id;
          const tmpl = templateByBlockchainId[id];
          const inv = tmpl?.inventory;
          const imageUrl = tmpl?.imageUrl || null;
          const totalStock = inv ? (inv.inWarehouse + inv.onDisplay) : 0;
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
                  <img src={imageUrl} alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Leaf className="w-12 h-12 text-fruit-emerald/15" />
                  </div>
                )}

                {/* Status badge */}
                <div className="absolute top-3 left-3">
                  <span className={isInStock ? "badge badge-success" : "badge badge-error"}>
                    {isInStock ? `In Stock · ${totalStock}` : "Sold Out"}
                  </span>
                </div>

                {/* QR Code trigger */}
                <button onClick={() => setQrModal(id)}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-white/80 dark:bg-[var(--surface)] backdrop-blur-sm border border-[var(--border)] hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
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
                  <button onClick={() => onTrace(id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition-colors">
                    <Search className="w-3.5 h-3.5" /> Trace Origin
                  </button>
                  {canBuy && (
                    <button onClick={() => handleAddToCart(tmpl)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-full bg-fruit-emerald text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all">
                      <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── QR Modal ──────────────────────────────────────────────────── */}
      {qrModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--overlay-bg)] backdrop-blur-sm"
          onClick={() => setQrModal(null)}>
          <div className="glass-card p-8 text-center max-w-xs" onClick={e => e.stopPropagation()} style={{ borderRadius: '1.5rem' }}>
            <h3 className="font-heading text-xl mb-4">Product QR Code</h3>
            <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-lg">
              <QRCodeSVG value={`${baseUrl}/?trace=${qrModal}`} size={180} level="H" fgColor="#059669" />
            </div>
            <p className="text-xs text-[var(--muted)] font-body mt-4">Scan to trace this product&apos;s full journey</p>
            <p className="font-mono text-xs text-[var(--muted)] mt-1">ID: {qrModal}</p>
            <button onClick={() => setQrModal(null)} className="btn-ghost mt-4 w-full !text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
