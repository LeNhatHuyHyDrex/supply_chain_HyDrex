"use client";

import { useState, useEffect, useCallback } from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { QRCodeSVG } from "qrcode.react";
import dynamic from "next/dynamic";
import QRScannerModal from "./QRScannerModal";
import UpdaterName from "./UpdaterName";
import AITraceChat from "./AITraceChat";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

const MapTrace = dynamic(() => import("./MapTrace"), { ssr: false });

const STATUS_MAP: Record<number, { label: string; badgeClass: string; dotColor: string }> = {
  0: { label: "Created / Manufactured", badgeClass: "badge-info", dotColor: "bg-white/40" },
  1: { label: "In Transit", badgeClass: "badge-warning", dotColor: "bg-white/60" },
  2: { label: "Delivered", badgeClass: "badge-success", dotColor: "bg-white" },
};

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface TrackProductProps { initialId?: string | null; isFocusMode?: boolean; onBack?: () => void; }

export default function TrackProduct({ initialId, isFocusMode, onBack }: TrackProductProps = {}) {
  const searchParams = useSearchParams();
  const batchIdParam = searchParams.get("batchId");
  const activeId = initialId || batchIdParam || "";

  const [searchId, setSearchId] = useState(activeId);
  const [queryId, setQueryId] = useState<string | null>(activeId || null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const { data: batchData, isError: isBatchError, isLoading: isBatchLoading, isFetching: isBatchFetching } = useQuery<any>({
    queryKey: ["batchDetails", queryId],
    queryFn: async () => {
      if (!queryId) return null;
      const res = await fetch(`/api/batches?blockchainId=${queryId}`);
      if (!res.ok) throw new Error("Failed to fetch batch details");
      return res.json();
    },
    enabled: !!queryId,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const nextId = initialId || batchIdParam || "";
    if (nextId) {
      setSearchId(nextId);
      setQueryId(nextId);
    }
  }, [initialId, batchIdParam]);

  const imageUrl = batchData?.template?.imageUrl || null;
  const siblingBatches = batchData?.template?.batches || [];
  const inventoryData = batchData?.template?.inventory || null;

  const { data, isError, isLoading, isFetching } = useReadContract({
    address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getProduct",
    args: queryId ? [BigInt(queryId)] : undefined, query: { enabled: !!queryId },
  });

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchId) {
      setQueryId(searchId);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set("batchId", searchId);
        window.history.pushState({}, '', url.pathname + url.search);
      }
    }
  }, [searchId]);

  const productData = data as readonly [
    bigint, string, string,
    readonly { status: number; timestamp: bigint; updater: string; locationData: string; latitude: bigint; longitude: bigint; condition: string }[]
  ] | undefined;

  return (
    <div className={`glass-card overflow-hidden mx-auto ${isFocusMode ? 'w-full min-h-screen rounded-none border-none p-4 md:p-6' : 'w-full max-w-2xl p-4 md:p-8 min-h-screen'}`}>
      <button onClick={() => window.location.reload()} className="md:hidden text-emerald-500 font-bold mb-4 flex items-center gap-2">
        ← Về trang chủ
      </button>
      {isFocusMode && onBack && (
        <button onClick={onBack} className="text-emerald-500 pb-6 font-bold flex items-center gap-2">
          <ArrowLeft className="w-5 h-5"/> Về trang chủ
        </button>
      )}
      <h2 className="font-heading text-3xl mb-6">Traceability</h2>

      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 mb-8">
        <input type="number" value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Enter Product ID..." className="input-field flex-1 w-full" />
        <div className="flex gap-2 w-full md:w-auto">
          <button type="button" onClick={() => setIsScannerOpen(true)} className="btn-ghost flex-1 md:flex-none flex items-center justify-center gap-2 !px-4">
            <span className="text-base">📷</span> Scan QR
          </button>
          <button type="submit" className="btn-primary flex-1 md:flex-none">Trace</button>
        </div>
      </form>

      {/* ── AI Blockchain Assistant ────────────────────────── */}
      <AITraceChat />

      {/* ── Batch Selection Dropdown ────────────────────────── */}
      {siblingBatches.length > 0 && (
        <div className="my-6 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] opacity-80 mb-2.5 flex items-center gap-1.5">
            <span>📦</span> Batch Selection
          </label>
          <div className="relative">
            <select
              value={queryId || ""}
              onChange={(e) => {
                const val = e.target.value;
                setSearchId(val);
                setQueryId(val);
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set("batchId", val);
                  window.history.pushState({}, '', url.pathname + url.search);
                }
              }}
              className="input-field w-full cursor-pointer appearance-none pr-10"
            >
              {siblingBatches.map((b: any) => (
                <option key={b.blockchainId} value={b.blockchainId} className="bg-slate-900 text-white">
                  Batch {b.blockchainId} - {b.quantity}kg {b.blockchainId === queryId ? "★ Active" : ""}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-emerald-500 font-bold">
              ▼
            </div>
          </div>
        </div>
      )}

      {(isLoading || isFetching) && (
        <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/20"></div></div>
      )}

      {isError && (
        <div className="p-4 text-center text-red-500">Không tìm thấy thông tin lô hàng này.</div>
      )}

      {productData && productData[1] !== "" && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row gap-5">
            <div className="flex-1 flex flex-col gap-4">
              <div className="w-full h-64 relative overflow-hidden rounded-2xl shadow-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                {imageUrl ? (
                  <Image src={imageUrl} alt={productData[1]} fill sizes="(max-width: 768px) 100vw, 50vw" priority className="object-cover" />
                ) : (
                  <div className="text-[var(--muted)] opacity-30 text-4xl">📦</div>
                )}
                <div className="absolute top-3 right-3 badge z-10">ID: {productData[0].toString()}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--muted)] opacity-60 uppercase tracking-wider font-body">Name</p>
                  <p className="font-heading text-lg">{productData[1]}</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--muted)] opacity-60 uppercase tracking-wider font-body">Origin</p>
                  <p className="font-heading text-lg">{productData[2]}</p>
                </div>
              </div>
            </div>
            <div className="w-full md:w-52 shrink-0 flex flex-col items-center justify-center p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="p-3 bg-white rounded-xl mb-4 shadow-lg">
                <QRCodeSVG value={productData[0].toString()} size={120} />
              </div>
              <div className="flex items-center gap-1.5 text-[var(--muted)]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs font-body">Verified Product</p>
              </div>
            </div>
          </div>

          {/* Inventory */}
          {inventoryData && (
            <div className="glass-stat p-4 rounded-xl">
              <h3 className="font-heading text-lg mb-3">Stock Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { label: "Warehouse", val: inventoryData.inWarehouse },
                  { label: "On Display", val: inventoryData.onDisplay },
                  { label: "Sold", val: inventoryData.sold },
                ].map(s => (
                  <div key={s.label} className="p-3 bg-[var(--surface)] rounded-lg text-center border border-[var(--border)]">
                    <p className="text-[9px] text-[var(--muted)] opacity-60 font-bold uppercase tracking-wider">{s.label}</p>
                    <p className="text-xl font-heading mt-1">{s.val}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <span className={(inventoryData.inWarehouse + inventoryData.onDisplay) > 0 ? "badge badge-success" : "badge badge-error"}>
                  {(inventoryData.inWarehouse + inventoryData.onDisplay) > 0 ? "✅ In Stock" : "❌ Sold Out"}
                </span>
              </div>
            </div>
          )}

          {/* Map */}
          <div>
            <h3 className="font-heading text-xl mb-4">Journey Map</h3>
            <MapTrace history={productData[3]} />
          </div>

          {/* Timeline */}
          <div className="mt-4">
            <h3 className="font-heading text-xl mb-6">Tracking History</h3>
            <div className="relative border-l border-[var(--border)] ml-4 space-y-6">
              {productData[3].map((update, index) => {
                const mapInfo = STATUS_MAP[update.status] || { label: `Status: ${update.status}`, badgeClass: "badge", dotColor: "bg-white/20" };
                return (
                  <div key={index} className="relative pl-8">
                    <div className={`absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full ${mapInfo.dotColor}`}></div>
                    <div className="glass-stat p-4 rounded-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <span className={`badge ${mapInfo.badgeClass}`}>{mapInfo.label}</span>
                        <span className="text-xs text-[var(--muted)] opacity-60 font-body">{new Date(Number(update.timestamp) * 1000).toLocaleString()}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-[var(--muted)] opacity-50 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <p className="text-sm opacity-80 font-body break-words overflow-hidden w-full">{update.locationData}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[var(--muted)] opacity-50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          <p className="text-xs text-[var(--muted)] font-body break-words overflow-hidden w-full">Updater: <UpdaterName address={update.updater} /></p>
                        </div>
                        {update.condition && (
                          <div className="mt-2 p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg w-full overflow-hidden">
                            <p className="text-[9px] text-[var(--muted)] opacity-50 mb-1 uppercase font-bold tracking-wider">Condition</p>
                            <p className="text-sm text-[var(--muted)] italic font-body break-words w-full">&quot;{update.condition}&quot;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {productData && productData[1] === "" && (
        <div className="p-4 text-center text-red-500">Không tìm thấy thông tin lô hàng này.</div>
      )}

      {isScannerOpen && (
        <QRScannerModal onScanSuccess={(val) => { setSearchId(val); setQueryId(val); setIsScannerOpen(false); toast.success("QR scanned: " + val); }} onClose={() => setIsScannerOpen(false)} />
      )}
    </div>
  );
}
