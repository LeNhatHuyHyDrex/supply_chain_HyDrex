"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

interface OrderData {
  id: string;
  buyerWallet: string | null;
  customerName: string;
  address: string;
  items: Array<{ templateId: string; quantity: number; price: number; name?: string }>;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

const STATUS_FLOW = ["PENDING_APPROVAL", "PREPARING", "SHIPPED", "DELIVERED"];

const STATUS_BADGES: Record<string, string> = {
  PENDING_APPROVAL: "badge-warning",
  PREPARING: "badge-info",
  SHIPPED: "badge-info",
  DELIVERED: "badge-success",
  PAID: "badge-success",
  CANCELLED: "badge-error",
};

const PAYMENT_ICONS: Record<string, string> = { WALLET: "⬡", QR: "📱", CASH: "💵" };

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function OrderManager() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const fetchOrders = async () => {
    try {
      const url = filterStatus === "ALL" ? "/api/orders" : `/api/orders?status=${filterStatus}`;
      const res = await fetch(url);
      if (res.ok) setOrders(await res.json());
    } catch (err) { console.error("Failed to fetch orders:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [filterStatus]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, newStatus }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to update status"); return; }
      toast.success(newStatus === "DELIVERED" ? "Order delivered! Inventory auto-updated ✓" : `Order status → ${newStatus}`);
      await fetchOrders();
    } catch { toast.error("Network error"); }
    finally { setActionLoading(null); }
  };

  const getNextStatus = (current: string): string | null => {
    const idx = STATUS_FLOW.indexOf(current);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[idx + 1];
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  if (loading) {
    return <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-2 border-fruit-emerald/30 border-t-fruit-emerald"></div></div>;
  }

  const pendingCount = orders.filter(o => o.status === "PENDING_APPROVAL").length;
  const preparingCount = orders.filter(o => o.status === "PREPARING").length;
  const shippedCount = orders.filter(o => o.status === "SHIPPED").length;
  const deliveredCount = orders.filter(o => o.status === "DELIVERED" || o.status === "PAID").length;

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp}>
      <div className="space-y-6">
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-heading text-3xl">Order Management</h2>
              <p className="text-sm text-[var(--muted)] font-body mt-1">Approve, prepare, ship, and deliver orders</p>
            </div>
            <div className="flex gap-2">
              {[
                { label: "Pending", count: pendingCount },
                { label: "Preparing", count: preparingCount },
                { label: "Shipped", count: shippedCount },
                { label: "Done", count: deliveredCount },
              ].map(s => (
                <div key={s.label} className="glass-stat px-3 py-2 text-center rounded-xl">
                  <p className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-wider">{s.label}</p>
                  <p className="text-lg font-heading">{s.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 mb-6 flex-wrap">
            {["ALL", ...STATUS_FLOW, "PAID", "CANCELLED"].map(s => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setLoading(true); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-body transition-all ${
                  filterStatus === s ? "bg-fruit-emerald text-white shadow-md shadow-fruit-emerald/20" : "glass-stat text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>

          {orders.length === 0 ? (
            <div className="glass-stat p-12 rounded-xl text-center">
              <div className="text-4xl mb-4 opacity-30">📭</div>
              <h3 className="font-heading text-xl mb-2">No Orders Found</h3>
              <p className="text-[var(--muted)] font-body text-sm">{filterStatus === "ALL" ? "No orders have been placed yet." : `No orders with status "${filterStatus}".`}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const nextStatus = getNextStatus(order.status);
                const isCOD = order.paymentMethod === "CASH";
                const isPaid = order.status === "PAID";

                return (
                  <div key={order.id} className="glass-stat rounded-xl p-5 hover:border-[var(--border-hover)] transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold font-body">{order.customerName}</h3>
                          <span className="text-sm">{PAYMENT_ICONS[order.paymentMethod] || "💰"}</span>
                          <span className={`badge ${STATUS_BADGES[order.status] || "badge"}`}>{order.status.replace("_", " ")}</span>
                          {isCOD && <span className="badge badge-warning">COD</span>}
                          {isPaid && <span className="badge badge-success">CRYPTO ✓</span>}
                        </div>
                        <p className="text-[11px] text-[var(--muted)] opacity-50 font-mono">ID: {order.id.slice(0, 8)}...</p>
                        <p className="text-xs text-[var(--muted)] mt-1 font-body">📍 {order.address}</p>
                        {order.buyerWallet && <p className="text-[11px] text-[var(--muted)] opacity-50 font-mono mt-1">Wallet: {order.buyerWallet.slice(0, 6)}...{order.buyerWallet.slice(-4)}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-xl">{formatCurrency(order.totalAmount)}</p>
                        <p className="text-[11px] text-[var(--muted)] opacity-50 mt-1">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mb-4 p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                      <p className="text-[9px] text-[var(--muted)] opacity-50 uppercase font-bold tracking-wider mb-2">Items</p>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm font-body">
                            <span className="text-[var(--muted)]">{item.name || item.templateId.slice(0, 8)} × {item.quantity}</span>
                            <span className="opacity-80">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && order.status !== "PAID" && (
                      <div className="flex gap-2">
                        {nextStatus && (
                          <button
                            onClick={() => handleStatusChange(order.id, nextStatus)}
                            disabled={actionLoading === order.id}
                            className={nextStatus === "DELIVERED" ? "btn-primary flex-1" : "btn-ghost flex-1"}
                          >
                            {actionLoading === order.id ? "Processing..." : nextStatus === "DELIVERED" && isCOD ? "💵 Payment Received & Delivered" : nextStatus === "DELIVERED" ? "✓ Mark as Delivered" : `→ Move to ${nextStatus}`}
                          </button>
                        )}
                        <button onClick={() => handleStatusChange(order.id, "CANCELLED")} disabled={actionLoading === order.id} className="btn-danger">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
