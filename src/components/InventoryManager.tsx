"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useUser } from "@/providers/UserProvider";
import { CldUploadWidget } from "next-cloudinary";

interface InventoryData {
  templateId: string;
  inWarehouse: number;
  onDisplay: number;
  sold: number;
  template: {
    id: string;
    name: string;
    origin: string;
    imageUrl: string;
  };
}

interface BatchInfo {
  blockchainId: string;
  quantity: number;
  isDelivered: boolean;
}

export default function InventoryManager() {
  const [inventoryList, setInventoryList] = useState<InventoryData[]>([]);
  const [batchMap, setBatchMap] = useState<Record<string, BatchInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [imageUpdating, setImageUpdating] = useState<string | null>(null);
  const { user } = useUser();

  const canEditImage = user?.role === "ADMIN" || user?.role === "SUPPLIER";

  const fetchData = async () => {
    try {
      const [invRes, batchRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/batches"),
      ]);
      if (invRes.ok) {
        const data = await invRes.json();
        if (Array.isArray(data)) setInventoryList(data);
      }
      if (batchRes.ok) {
        const batches = await batchRes.json();
        if (Array.isArray(batches)) {
          const map: Record<string, BatchInfo[]> = {};
          batches.forEach((b: any) => {
            if (!map[b.templateId]) map[b.templateId] = [];
            map[b.templateId].push({ blockchainId: b.blockchainId, quantity: b.quantity, isDelivered: b.isDelivered });
          });
          setBatchMap(map);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (templateId: string, action: string) => {
    const qty = quantities[`${templateId}-${action}`] || 1;
    if (qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    setActionLoading(`${templateId}-${action}`);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, action, quantity: qty }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }

      toast.success(
        action === "shelf" ? `${qty} moved to display shelf` : `${qty} recorded as sold`
      );
      await fetchData();
      setQuantities(prev => ({ ...prev, [`${templateId}-${action}`]: 1 }));
    } catch (err) {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleImageUpdate = async (templateId: string, newImageUrl: string) => {
    setImageUpdating(templateId);
    try {
      const res = await fetch("/api/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, newImageUrl }),
      });
      if (res.ok) {
        toast.success("Product image updated!");
        await fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update image");
      }
    } catch (err) {
      toast.error("Network error updating image");
    } finally {
      setImageUpdating(null);
    }
  };

  const getQty = (templateId: string, action: string) => quantities[`${templateId}-${action}`] ?? 1;
  const setQty = (templateId: string, action: string, val: number) =>
    setQuantities(prev => ({ ...prev, [`${templateId}-${action}`]: Math.max(1, val) }));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  if (inventoryList.length === 0) {
    return (
      <div className="p-12 bg-white/5 border border-white/10 rounded-3xl text-center">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-2xl font-bold text-white mb-2">No Inventory Yet</h3>
        <p className="text-gray-400">Register products via the Producer Portal, then deliver them via Logistics to populate inventory.</p>
      </div>
    );
  }

  const totalWarehouse = inventoryList.reduce((s, i) => s + i.inWarehouse, 0);
  const totalDisplay = inventoryList.reduce((s, i) => s + i.onDisplay, 0);
  const totalSold = inventoryList.reduce((s, i) => s + i.sold, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              📦 Inventory Manager
            </h2>
            <p className="text-sm text-gray-500 mt-1">VKU Market — Warehouse auto-filled by logistics delivery</p>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
              <p className="text-xs text-blue-400 font-bold">WAREHOUSE</p>
              <p className="text-lg font-bold text-white">{totalWarehouse}</p>
            </div>
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
              <p className="text-xs text-emerald-400 font-bold">ON SHELF</p>
              <p className="text-lg font-bold text-white">{totalDisplay}</p>
            </div>
            <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
              <p className="text-xs text-purple-400 font-bold">SOLD</p>
              <p className="text-lg font-bold text-white">{totalSold}</p>
            </div>
          </div>
        </div>

        {/* Automation Hint */}
        <div className="mb-6 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl flex items-center gap-3">
          <span className="text-lg">⚡</span>
          <p className="text-xs text-gray-400">
            <span className="text-cyan-400 font-semibold">Warehouse stock is automated.</span> When Logistics marks a batch as &quot;Delivered&quot;, the quantity is auto-added here. Use the buttons below to move stock to shelves and record sales.
          </p>
        </div>

        <div className="space-y-4">
          {inventoryList.map(inv => {
            const totalStock = inv.inWarehouse + inv.onDisplay;
            const batches = batchMap[inv.templateId] || [];
            const isExpanded = expandedTemplate === inv.templateId;

            return (
              <div key={inv.templateId} className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/30 transition-all">
                {/* Product Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {inv.template.imageUrl ? (
                        <img src={inv.template.imageUrl} alt={inv.template.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-xs">N/A</div>
                      )}
                      <div>
                        <h3 className="font-bold text-white text-lg">{inv.template.name}</h3>
                        <span className="text-sm text-gray-500">{inv.template.origin}</span>
                      </div>
                      {/* Edit Image Button — ADMIN/SUPPLIER only */}
                      {canEditImage && (
                        <CldUploadWidget
                          uploadPreset="supply_chain_app"
                          onSuccess={(result: any) => {
                            const url = result?.info?.secure_url;
                            if (url) handleImageUpdate(inv.templateId, url);
                          }}
                        >
                          {({ open }) => (
                            <button
                              type="button"
                              onClick={() => open()}
                              disabled={imageUpdating === inv.templateId}
                              className="ml-2 px-3 py-1.5 bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 rounded-lg text-xs font-medium text-gray-400 hover:text-cyan-400 transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {imageUpdating === inv.templateId ? (
                                <span className="animate-spin">⏳</span>
                              ) : (
                                <span>📷</span>
                              )}
                              Edit Image
                            </button>
                          )}
                        </CldUploadWidget>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        totalStock > 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {totalStock > 0 ? `${totalStock} In Stock` : "Out of Stock"}
                      </div>
                      <button
                        onClick={() => setExpandedTemplate(isExpanded ? null : inv.templateId)}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {batches.length} batch{batches.length !== 1 ? "es" : ""} {isExpanded ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {/* Inventory Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-center">
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Warehouse</p>
                      <p className="text-2xl font-bold text-white mt-1">{inv.inWarehouse}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">On Display</p>
                      <p className="text-2xl font-bold text-white mt-1">{inv.onDisplay}</p>
                    </div>
                    <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-center">
                      <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Sold</p>
                      <p className="text-2xl font-bold text-white mt-1">{inv.sold}</p>
                    </div>
                  </div>

                  {/* Quick Actions: Shelf + Sell only */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Move to Shelf */}
                    <div className="flex gap-2">
                      <input type="number" min={1} value={getQty(inv.templateId, "shelf")}
                        onChange={e => setQty(inv.templateId, "shelf", parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
                      <button
                        onClick={() => handleAction(inv.templateId, "shelf")}
                        disabled={actionLoading === `${inv.templateId}-shelf` || inv.inWarehouse < 1}
                        className="flex-1 py-2 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 transition-all disabled:opacity-50">
                        {actionLoading === `${inv.templateId}-shelf` ? "..." : "🏪 Move to Shelf"}
                      </button>
                    </div>

                    {/* Record Sale */}
                    <div className="flex gap-2">
                      <input type="number" min={1} value={getQty(inv.templateId, "sell")}
                        onChange={e => setQty(inv.templateId, "sell", parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                      <button
                        onClick={() => handleAction(inv.templateId, "sell")}
                        disabled={actionLoading === `${inv.templateId}-sell` || inv.onDisplay < 1}
                        className="flex-1 py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-bold rounded-lg border border-purple-500/20 transition-all disabled:opacity-50">
                        {actionLoading === `${inv.templateId}-sell` ? "..." : "💰 Record Sale"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Batch History */}
                {isExpanded && batches.length > 0 && (
                  <div className="px-6 pb-6 pt-2 border-t border-white/5">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">Batch Shipment History</p>
                    <div className="space-y-2">
                      {batches.map(b => (
                        <div key={b.blockchainId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-gray-500 bg-black/30 px-2 py-0.5 rounded">#{b.blockchainId}</span>
                            <span className="text-sm text-white">{b.quantity} units</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.isDelivered
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {b.isDelivered ? "✓ Delivered" : "⏳ In Transit"}
                          </span>
                        </div>
                      ))}
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
