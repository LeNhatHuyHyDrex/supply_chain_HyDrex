"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { QRCodeSVG } from "qrcode.react";

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "Created", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  1: { label: "In Transit", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  2: { label: "Delivered", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
};

interface StorefrontProps {
  onTrace: (id: string) => void;
}

interface TemplateInfo {
  id: string;
  name: string;
  origin: string;
  imageUrl: string;
  batches: { blockchainId: string }[];
  inventory: { inWarehouse: number; onDisplay: number; sold: number } | null;
}

export default function Storefront({ onTrace }: StorefrontProps) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [validBlockchainIds, setValidBlockchainIds] = useState<Set<string>>(new Set());
  const [templateByBlockchainId, setTemplateByBlockchainId] = useState<Record<string, TemplateInfo>>({});

  const { data: products, isLoading, isError, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getAllProducts",
  });

  useEffect(() => {
    if (isError && error) {
      console.error("RPC Error fetching products:", error);
    }
  }, [isError, error]);

  // Fetch templates (which include batches & inventory)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const data: TemplateInfo[] = await res.json();
          setTemplates(data);

          // Build a set of valid blockchain IDs and a lookup map
          const idSet = new Set<string>();
          const lookup: Record<string, TemplateInfo> = {};
          data.forEach(t => {
            t.batches.forEach(b => {
              idSet.add(b.blockchainId);
              lookup[b.blockchainId] = t;
            });
          });
          setValidBlockchainIds(idSet);
          setTemplateByBlockchainId(lookup);
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
    };
    fetchTemplates();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-red-400">
        <p className="font-bold mb-2">Failed to load products.</p>
        <p className="text-sm opacity-80">Please check your network connection or switch RPC endpoints.</p>
        <p className="text-xs font-mono mt-4 opacity-50 break-all">{error?.message || "Unknown error"}</p>
      </div>
    );
  }

  // Map blockchain data, then FILTER to only show products with a valid ProductTemplate
  const allProducts = products ? (products as any[]).map(p => ({
    id: p.id.toString(),
    name: p.name,
    origin: p.origin,
    history: (p.history || []).map((h: any) => ({
      status: Number(h.status),
      timestamp: h.timestamp.toString(),
    }))
  })) : [];

  // Task 3: Filter out legacy/orphaned blockchain products
  const safeProducts = allProducts.filter(p => validBlockchainIds.has(p.id));

  if (safeProducts.length === 0) {
    return (
      <div className="p-12 bg-white/5 border border-white/10 rounded-3xl text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-2xl font-bold text-white mb-2">Product Catalog is Empty</h3>
        <p className="text-gray-400">No products with valid templates have been registered yet.</p>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
          VKU Market — Product Catalog
        </h2>
        <span className="text-sm text-gray-400 font-medium">{safeProducts.length} Products</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {safeProducts.map((product) => {
          const id = product.id;
          const latestHistory = product.history.length > 0 ? product.history[product.history.length - 1] : null;
          const statusVal = latestHistory ? latestHistory.status : 0;
          const statusInfo = STATUS_MAP[statusVal] || { label: "Unknown", color: "text-gray-400 bg-gray-400/10 border-gray-400/20" };

          // Task 2: Get inventory from template (not from old productId-based lookup)
          const tmpl = templateByBlockchainId[id];
          const inv = tmpl?.inventory;
          const imageUrl = tmpl?.imageUrl || null;
          const totalStock = inv ? (inv.inWarehouse + inv.onDisplay) : 0;
          const isInStock = totalStock > 0;

          return (
            <div key={id} className="group flex flex-col bg-black/40 backdrop-blur-md border border-white/10 hover:border-cyan-500/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10">
              {/* Product Image */}
              <div className="h-48 relative overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500 bg-[#1A1A1A]">
                {imageUrl ? (
                  <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <img src="https://placehold.co/600x400/1A1A1A/00E5FF?text=No+Image" alt="No image" className="w-full h-full object-cover opacity-50" />
                )}
                <div className="absolute top-4 left-4">
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide backdrop-blur-md ${statusInfo.color}`}>
                    {statusInfo.label}
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold backdrop-blur-md ${
                    isInStock
                      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                      : "text-red-400 bg-red-400/10 border-red-400/20"
                  }`}>
                    {isInStock ? `In Stock (${totalStock})` : "Sold Out"}
                  </div>
                </div>
              </div>

              {/* Product Info + QR */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white leading-tight group-hover:text-cyan-400 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {product.origin}
                    </p>
                  </div>
                  {/* QR Code */}
                  <div className="ml-3 p-2 bg-white rounded-lg shadow-md shrink-0" title="Scan to trace this product">
                    <QRCodeSVG
                      value={`${baseUrl}/?trace=${id}`}
                      size={64}
                      level="M"
                    />
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-white/5">
                  <button 
                    onClick={() => onTrace(id)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Trace Origin
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
