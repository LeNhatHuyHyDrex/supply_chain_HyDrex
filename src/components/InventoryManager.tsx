"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useUser } from "@/providers/UserProvider";
import { CldUploadWidget } from "next-cloudinary";
import { motion } from "framer-motion";

interface InventoryData {
  templateId: string;
  inWarehouse: number;
  onDisplay: number;
  sold: number;
  template: { id: string; name: string; origin: string; imageUrl: string; price: number | null };
}

interface BatchInfo { blockchainId: string; quantity: number; isDelivered: boolean; }

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

export default function InventoryManager() {
  const [inventoryList, setInventoryList] = useState<InventoryData[]>([]);
  const [batchMap, setBatchMap] = useState<Record<string, BatchInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [imageUpdating, setImageUpdating] = useState<string | null>(null);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [priceSaving, setPriceSaving] = useState<string | null>(null);
  const { user } = useUser();

  const canEditImage = user?.role === "ADMIN" || user?.role === "SUPPLIER";
  const canEditPrice = user?.role === "ADMIN";

  const fetchData = async () => {
    try {
      const [invRes, batchRes] = await Promise.all([fetch("/api/inventory"), fetch("/api/batches")]);
      if (invRes.ok) {
        const data = await invRes.json();
        if (Array.isArray(data)) {
          setInventoryList(data);
          const prices: Record<string, string> = {};
          data.forEach((inv: InventoryData) => { prices[inv.templateId] = inv.template.price != null ? String(inv.template.price) : ""; });
          setPriceInputs(prices);
        }
      }
      if (batchRes.ok) {
        const batches = await batchRes.json();
        if (Array.isArray(batches)) {
          const map: Record<string, BatchInfo[]> = {};
          batches.forEach((b: any) => { if (!map[b.templateId]) map[b.templateId] = []; map[b.templateId].push({ blockchainId: b.blockchainId, quantity: b.quantity, isDelivered: b.isDelivered }); });
          setBatchMap(map);
        }
      }
    } catch (err) { console.error("Failed to fetch data:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (templateId: string, action: string) => {
    const qty = quantities[`${templateId}-${action}`] || 1;
    if (qty < 1) { toast.error("Quantity must be at least 1"); return; }
    setActionLoading(`${templateId}-${action}`);
    try {
      const res = await fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId, action, quantity: qty }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Action failed"); return; }
      toast.success(action === "shelf" ? `${qty} moved to display shelf` : `${qty} recorded as sold`);
      await fetchData();
      setQuantities(prev => ({ ...prev, [`${templateId}-${action}`]: 1 }));
    } catch { toast.error("Network error"); }
    finally { setActionLoading(null); }
  };

  const handleImageUpdate = async (templateId: string, newImageUrl: string) => {
    setImageUpdating(templateId);
    try {
      const res = await fetch("/api/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId, newImageUrl }) });
      if (res.ok) { toast.success("Image updated!"); await fetchData(); }
      else { const data = await res.json(); toast.error(data.error || "Failed to update image"); }
    } catch { toast.error("Network error"); }
    finally { setImageUpdating(null); }
  };

  const handlePriceSave = async (templateId: string) => {
    const priceStr = priceInputs[templateId];
    const price = priceStr === "" ? null : parseFloat(priceStr);
    if (price !== null && (isNaN(price) || price < 0)) { toast.error("Invalid price"); return; }
    setPriceSaving(templateId);
    try {
      const res = await fetch("/api/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId, price }) });
      if (res.ok) { toast.success(price ? `Price set to ${formatCurrency(price)}` : "Price cleared"); await fetchData(); }
      else { const data = await res.json(); toast.error(data.error || "Failed"); }
    } catch { toast.error("Network error"); }
    finally { setPriceSaving(null); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  const getQty = (templateId: string, action: string) => quantities[`${templateId}-${action}`] ?? 1;
  const setQty = (templateId: string, action: string, val: number) => setQuantities(prev => ({ ...prev, [`${templateId}-${action}`]: Math.max(1, val) }));

  if (loading) return <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-2 border-fruit-emerald/30 border-t-fruit-emerald"></div></div>;

  if (inventoryList.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="text-5xl mb-4 opacity-30">📦</div>
        <h3 className="font-heading text-2xl mb-2">No Inventory Yet</h3>
        <p className="text-[var(--muted)] font-body">Register products via the Producer Portal, then deliver them via Logistics.</p>
      </div>
    );
  }

  const totalWarehouse = inventoryList.reduce((s, i) => s + i.inWarehouse, 0);
  const totalDisplay = inventoryList.reduce((s, i) => s + i.onDisplay, 0);
  const totalSold = inventoryList.reduce((s, i) => s + i.sold, 0);

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp}>
      <div className="space-y-6">
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-heading text-3xl">Inventory Manager</h2>
              <p className="text-sm text-[var(--muted)] font-body mt-1">Warehouse auto-filled by logistics delivery</p>
            </div>
            <div className="flex gap-2">
              {[
                { label: "Warehouse", val: totalWarehouse },
                { label: "On Shelf", val: totalDisplay },
                { label: "Sold", val: totalSold },
              ].map(s => (
                <div key={s.label} className="glass-stat px-4 py-2 text-center rounded-xl">
                  <p className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-wider">{s.label}</p>
                  <p className="text-lg font-heading">{s.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-hint */}
          <div className="mb-6 p-3 glass-stat rounded-xl flex items-center gap-3">
            <span className="text-base">⚡</span>
            <p className="text-xs text-[var(--muted)] font-body">
              <span className="opacity-70 font-semibold">Warehouse stock is automated.</span> When Logistics marks a batch as &quot;Delivered&quot;, the quantity is auto-added here.
            </p>
          </div>

          <div className="space-y-3">
            {inventoryList.map(inv => {
              const totalStock = inv.inWarehouse + inv.onDisplay;
              const batches = batchMap[inv.templateId] || [];
              const isExpanded = expandedTemplate === inv.templateId;

              return (
                <div key={inv.templateId} className="glass-stat rounded-xl overflow-hidden hover:border-[var(--border-hover)] transition-all">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {inv.template.imageUrl ? (
                          <img src={inv.template.imageUrl} alt={inv.template.name} className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[var(--surface)] flex items-center justify-center text-[var(--muted)] opacity-50 text-xs">N/A</div>
                        )}
                        <div>
                          <h3 className="font-heading text-lg">{inv.template.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--muted)] font-body">{inv.template.origin}</span>
                            {inv.template.price && inv.template.price > 0 ? (
                              <span className="badge badge-success">{formatCurrency(inv.template.price)}</span>
                            ) : (
                              <span className="badge">No price set</span>
                            )}
                          </div>
                        </div>
                        {canEditImage && (
                          <CldUploadWidget uploadPreset="supply_chain_app" onSuccess={(result: any) => { const url = result?.info?.secure_url; if (url) handleImageUpdate(inv.templateId, url); }}>
                            {({ open }) => (
                              <button type="button" onClick={() => open()} disabled={imageUpdating === inv.templateId} className="btn-ghost !text-[11px] !py-1.5 !px-3 ml-2">
                                {imageUpdating === inv.templateId ? "⏳" : "📷"} Edit Image
                              </button>
                            )}
                          </CldUploadWidget>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={totalStock > 0 ? "badge badge-success" : "badge badge-error"}>{totalStock > 0 ? `${totalStock} In Stock` : "Out of Stock"}</span>
                        <button onClick={() => setExpandedTemplate(isExpanded ? null : inv.templateId)} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-xs font-body">
                          {batches.length} batch{batches.length !== 1 ? "es" : ""} {isExpanded ? "▲" : "▼"}
                        </button>
                      </div>
                    </div>

                    {/* Pricing — ADMIN only */}
                    {canEditPrice && (
                      <div className="mb-4 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                        <p className="text-[9px] text-[var(--muted)] uppercase font-bold tracking-wider mb-2">💰 Set Price (VND)</p>
                        <div className="flex gap-2">
                          <input type="number" min={0} step={1000} placeholder="e.g. 50000" value={priceInputs[inv.templateId] || ""} onChange={e => setPriceInputs(prev => ({ ...prev, [inv.templateId]: e.target.value }))} className="input-field flex-1 !py-2 !text-sm" />
                          <button onClick={() => handlePriceSave(inv.templateId)} disabled={priceSaving === inv.templateId} className="btn-primary !text-xs !py-2 !px-4">
                            {priceSaving === inv.templateId ? "..." : "Save"}
                          </button>
                        </div>
                        <p className="text-[10px] text-[var(--muted)] opacity-50 mt-1.5 font-body">Leave empty or 0 to hide &quot;Buy&quot; button</p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: "Warehouse", val: inv.inWarehouse },
                        { label: "On Display", val: inv.onDisplay },
                        { label: "Sold", val: inv.sold },
                      ].map(s => (
                        <div key={s.label} className="p-3 bg-[var(--surface)] rounded-lg text-center border border-[var(--border)]">
                          <p className="text-[9px] text-[var(--muted)] opacity-60 font-bold uppercase tracking-wider">{s.label}</p>
                          <p className="text-xl font-heading mt-1">{s.val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "shelf", label: "🏪 Move to Shelf", disabled: inv.inWarehouse < 1 },
                        { key: "sell", label: "💰 Record Sale", disabled: inv.onDisplay < 1 },
                      ].map(a => (
                        <div key={a.key} className="flex gap-1.5">
                          <input type="number" min={1} value={getQty(inv.templateId, a.key)} onChange={e => setQty(inv.templateId, a.key, parseInt(e.target.value) || 1)} className="input-field !w-14 !py-2 !text-center !text-sm" />
                          <button onClick={() => handleAction(inv.templateId, a.key)} disabled={actionLoading === `${inv.templateId}-${a.key}` || a.disabled} className="btn-ghost flex-1 !text-[11px] !py-2">
                            {actionLoading === `${inv.templateId}-${a.key}` ? "..." : a.label}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Batch History */}
                  {isExpanded && batches.length > 0 && (
                    <div className="px-5 pb-5 pt-2 border-t border-[var(--border)]">
                      <p className="text-[9px] text-[var(--muted)] opacity-50 uppercase font-bold tracking-wider mb-3">Batch Shipment History</p>
                      <div className="space-y-1.5">
                        {batches.map(b => (
                          <div key={b.blockchainId} className="flex items-center justify-between p-2.5 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-mono text-[var(--muted)] opacity-50 bg-[var(--surface)] px-2 py-0.5 rounded">#{b.blockchainId}</span>
                              <span className="text-sm opacity-70 font-body">{b.quantity} units</span>
                            </div>
                            <span className={b.isDelivered ? "badge badge-success" : "badge badge-warning"}>{b.isDelivered ? "✓ Delivered" : "⏳ In Transit"}</span>
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
    </motion.div>
  );
}
