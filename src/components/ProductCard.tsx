"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ShoppingCart, QrCode, Leaf, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface ProductCardProps {
  product: any;
  tmpl: any;
  i: number;
  onTrack: (product: any) => void;
  onAddToCart: (tmpl: any) => void;
  onOpenQr: (id: string) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: i * 0.08,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

function ProductCard({ product, tmpl, i, onTrack, onAddToCart, onOpenQr }: ProductCardProps) {
  const t = useTranslations("storefront");
  const id = product.id;
  const imageUrl = tmpl?.imageUrl || null;
  const totalStock = Math.round(product.totalStock);
  const isInStock = totalStock > 0;
  const hasPrice = tmpl?.price && tmpl.price > 0;
  const canBuy = isInStock && hasPrice;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  return (
    <motion.div
      custom={i}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={cardVariants}
      className="product-card group flex flex-col bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden transition-all duration-300 shadow-lg dark:shadow-none hover:shadow-xl hover:shadow-slate-200 dark:hover:shadow-fruit-emerald/5"
    >
      {/* ── Image Area ─────────────────────────────────────────── */}
      <div className="aspect-[4/3] relative overflow-hidden bg-[var(--surface)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={i < 3}
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
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
        <button
          onClick={() => onOpenQr(id)}
          className="absolute top-3 right-3 p-2 rounded-xl bg-white/80 dark:bg-[var(--surface)] backdrop-blur-sm border border-[var(--border)] hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10"
          title="View QR Code"
        >
          <QrCode className="w-4 h-4 text-fruit-emerald" />
        </button>
      </div>

      {/* ── Content Area ────────────────────────────────────────── */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-heading text-xl leading-tight tracking-tight text-slate-900 dark:text-white">
          {product.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-body mt-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {product.origin}
        </p>

        {hasPrice && (
          <p className="font-heading text-2xl text-fruit-emerald mt-3">
            {formatCurrency(tmpl.price!)}
          </p>
        )}

        {/* Actions */}
        <div className="mt-auto pt-5 flex gap-2">
          <button
            onClick={() => onTrack(product)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition-colors"
          >
            <Search className="w-3.5 h-3.5" /> {t("traceOrigin")}
          </button>
          {canBuy && (
            <button
              onClick={() => onAddToCart(tmpl)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-full bg-fruit-emerald text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> {t("addToCart")}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default React.memo(ProductCard);
