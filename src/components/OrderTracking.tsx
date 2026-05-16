"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/providers/UserProvider";
import dynamic from "next/dynamic";

// Dynamically import the map component to avoid SSR issues with Leaflet
const OrderMap = dynamic(() => import("./OrderMap"), { ssr: false });

interface Order {
  id: string;
  buyerWallet: string;
  productIds: string;
  shippingAddress: string;
  buyerLat: number | null;
  buyerLng: number | null;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PROCESSING: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  SHIPPED: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  DELIVERED: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const STATUS_ICONS: Record<string, string> = {
  PROCESSING: "📦",
  SHIPPED: "🚚",
  DELIVERED: "✅",
};

export default function OrderTracking() {
  const { user } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (user?.walletAddress) {
      fetch(`/api/orders?wallet=${user.walletAddress}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setOrders(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-12 bg-white/5 border border-white/10 rounded-3xl text-center">
        <div className="text-6xl mb-4">🔗</div>
        <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Please connect your wallet to view your orders.</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-12 bg-white/5 border border-white/10 rounded-3xl text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-2xl font-bold text-white mb-2">No Orders Yet</h3>
        <p className="text-gray-400">Browse the Storefront and place your first order!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default Shipping Address Banner */}
      {user.shippingAddress ? (
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
            <span className="text-lg">📍</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-0.5">Default Shipping Address</p>
            <p className="text-sm text-white">{user.shippingAddress}</p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <span className="text-lg">⚠️</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-400">No default shipping address set</p>
            <p className="text-xs text-gray-400 mt-0.5">Set your shipping address in your profile (click your display name) to enable 1-click checkout.</p>
          </div>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          My Orders & Delivery Tracking
        </h2>
        <p className="text-sm text-gray-500 mb-8">Track your orders from the Retail Hub to your doorstep.</p>
      
      <div className="space-y-6">
        {orders.map(order => {
          const isExpanded = expandedOrder === order.id;
          const statusColor = STATUS_COLORS[order.status] || STATUS_COLORS.PROCESSING;
          const statusIcon = STATUS_ICONS[order.status] || "📦";
          let productList: string[] = [];
          try { productList = JSON.parse(order.productIds); } catch { productList = []; }

          return (
            <div key={order.id} className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-500/30">
              {/* Order Header */}
              <button
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{statusIcon}</div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Order #{order.id.slice(0, 8)}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString("vi-VN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 border rounded-full text-xs font-bold tracking-wide ${statusColor}`}>
                    {order.status}
                  </span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4">
                  {/* Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Destination</p>
                      <p className="text-sm text-white">{order.shippingAddress}</p>
                      {order.buyerLat && order.buyerLng && (
                        <p className="text-xs font-mono text-gray-500 mt-1">
                          📍 {order.buyerLat.toFixed(4)}, {order.buyerLng.toFixed(4)}
                        </p>
                      )}
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Products</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {productList.map((pid, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-xs font-mono">
                            #{pid}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Delivery Route Map */}
                  {order.buyerLat && order.buyerLng ? (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <span className="text-lg">🗺️</span> Delivery Route
                      </p>
                      <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
                        <OrderMap
                          buyerLat={order.buyerLat}
                          buyerLng={order.buyerLng}
                          buyerAddress={order.shippingAddress}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-6 bg-white/5 rounded-xl border border-white/10 text-center">
                      <p className="text-sm text-gray-400">📍 No coordinates available for map tracking.</p>
                      <p className="text-xs text-gray-600 mt-1">This order was placed without geocoded location data.</p>
                    </div>
                  )}

                  {/* Status Timeline */}
                  <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">Delivery Progress</p>
                    <div className="flex items-center gap-2">
                      {["PROCESSING", "SHIPPED", "DELIVERED"].map((step, i) => {
                        const isActive = step === order.status;
                        const isPast = ["PROCESSING", "SHIPPED", "DELIVERED"].indexOf(order.status) >= i;
                        return (
                          <div key={step} className="flex items-center gap-2 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                              isPast ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/30" : "bg-white/10 text-gray-500"
                            } ${isActive ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#111]" : ""}`}>
                              {isPast ? "✓" : i + 1}
                            </div>
                            {i < 2 && (
                              <div className={`flex-1 h-0.5 rounded-full ${isPast ? "bg-cyan-500" : "bg-white/10"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-2">
                      {["Processing", "Shipped", "Delivered"].map(label => (
                        <span key={label} className="text-[10px] text-gray-500 font-medium">{label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
