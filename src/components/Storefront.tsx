"use client";

import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "Created", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  1: { label: "In Transit", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  2: { label: "Delivered", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
};

interface StorefrontProps {
  onTrace: (id: string) => void;
}

export default function Storefront({ onTrace }: StorefrontProps) {
  const { data: products, isLoading, isError } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getAllProducts",
  });

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
        Failed to load marketplace products. Please check your network connection.
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="p-12 bg-white/5 border border-white/10 rounded-3xl text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h3 className="text-2xl font-bold text-white mb-2">Marketplace is Empty</h3>
        <p className="text-gray-400">No products have been registered on the blockchain yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
          Featured Products
        </h2>
        <span className="text-sm text-gray-400 font-medium">{products.length} Items Available</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const id = product.id.toString();
          const latestHistory = product.history.length > 0 ? product.history[product.history.length - 1] : null;
          const statusVal = latestHistory ? latestHistory.status : 0;
          const statusInfo = STATUS_MAP[statusVal] || { label: "Unknown", color: "text-gray-400 bg-gray-400/10 border-gray-400/20" };

          return (
            <div key={id} className="group flex flex-col bg-black/40 backdrop-blur-md border border-white/10 hover:border-cyan-500/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10">
              {/* Product Image Placeholder */}
              <div className="h-48 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <span className="text-5xl drop-shadow-2xl">📦</span>
                <div className="absolute top-4 right-4">
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide backdrop-blur-md ${statusInfo.color}`}>
                    {statusInfo.label}
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-white leading-tight group-hover:text-cyan-400 transition-colors">
                    {product.name}
                  </h3>
                  <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded-lg">#{id}</span>
                </div>
                
                <p className="text-sm text-gray-400 mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {product.origin}
                </p>

                <div className="mt-auto pt-4 flex gap-3 border-t border-white/5">
                  <button 
                    onClick={() => onTrace(id)}
                    className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-cyan-400 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5 hover:border-cyan-500/30"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Trace
                  </button>
                  <button className="flex-1 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Buy
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
