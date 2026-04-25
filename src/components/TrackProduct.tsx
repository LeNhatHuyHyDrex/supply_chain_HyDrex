"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import QRCode from "react-qr-code";
import dynamic from "next/dynamic";
import QRScannerModal from "./QRScannerModal";
import UpdaterName from "./UpdaterName";
import toast from "react-hot-toast";

const MapTrace = dynamic(() => import("./MapTrace"), { ssr: false });

const STATUS_MAP: Record<number, { label: string; color: string; dotColor: string }> = {
  0: { label: "Created / Manufactured", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", dotColor: "bg-blue-400" },
  1: { label: "In Transit", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", dotColor: "bg-amber-400" },
  2: { label: "Delivered", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dotColor: "bg-emerald-400" },
};

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface TrackProductProps {
  initialId?: string | null;
}

export default function TrackProduct({ initialId }: TrackProductProps = {}) {
  const [searchId, setSearchId] = useState(initialId || "");
  const [queryId, setQueryId] = useState<string | null>(initialId || null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (initialId) {
      setSearchId(initialId);
      setQueryId(initialId);
    }
  }, [initialId]);

  const { data, isError, isLoading, isFetching } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getProduct",
    args: queryId ? [BigInt(queryId)] : undefined,
    query: {
      enabled: !!queryId,
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId) return;
    setQueryId(searchId);
  };

  // The new ABI returns [id, name, origin, history[]]
  // history[] contains TrackingUpdate { status, timestamp, updater, locationData }
  const productData = data as readonly [
    bigint,
    string,
    string,
    readonly { status: number; timestamp: bigint; updater: string; locationData: string; latitude: bigint; longitude: bigint; condition: string }[]
  ] | undefined;

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:shadow-cyan-500/10">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
        Consumer Traceability: Track Product
      </h2>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="flex-1 flex gap-2">
          <input
            type="number"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Nhập ID sản phẩm..."
            className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white placeholder-gray-500 transition-all outline-none"
          />
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/30 transition-all flex items-center gap-2 font-medium"
          >
            <span className="text-lg">📷</span>
            Quét QR
          </button>
        </div>
        <button
          type="submit"
          className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          Truy xuất
        </button>
      </form>

      {(isLoading || isFetching) && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-400">
          Product not found or error occurred while fetching.
        </div>
      )}

      {productData && productData[1] !== "" && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-sm text-gray-400 mb-1">Product ID</p>
                <p className="text-lg font-semibold text-white">{productData[0].toString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-sm text-gray-400 mb-1">Name</p>
                <p className="text-lg font-semibold text-white">{productData[1]}</p>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 col-span-2">
                <p className="text-sm text-gray-400 mb-1">Origin</p>
                <p className="text-lg font-semibold text-white">{productData[2]}</p>
              </div>
            </div>
            
            <div className="w-full md:w-56 shrink-0 flex flex-col items-center justify-center p-6 rounded-xl bg-black/20 border border-white/5">
              <div className="p-3 bg-white rounded-xl mb-4 shadow-xl">
                 <QRCode value={productData[0].toString()} size={140} />
              </div>
              <div className="flex items-center gap-2 text-cyan-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">Verified Product</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-xl font-bold text-white mb-6">Journey Map</h3>
            <MapTrace history={productData[3]} />
          </div>

          <div className="mt-10">
            <h3 className="text-xl font-bold text-white mb-6">Tracking History</h3>
            <div className="relative border-l-2 border-white/10 ml-4 space-y-8">
              {productData[3].map((update, index) => {
                const mapInfo = STATUS_MAP[update.status] || { label: `Status: ${update.status}`, color: "text-gray-400 bg-gray-400/10 border-gray-400/20", dotColor: "bg-gray-400" };
                return (
                  <div key={index} className="relative pl-8">
                    <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-4 border-[#0f172a] ${mapInfo.dotColor}`}></div>
                    
                    <div className="bg-black/30 hover:bg-black/40 transition-colors p-5 rounded-xl border border-white/5 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide w-fit ${mapInfo.color}`}>
                          {mapInfo.label}
                        </div>
                        <div className="text-sm text-gray-400 font-medium">
                          {new Date(Number(update.timestamp) * 1000).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="text-white">{update.locationData}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-sm text-gray-500">
                            Người cập nhật: <UpdaterName address={update.updater} />
                          </p>
                        </div>

                        {update.condition && (
                          <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">Tình trạng</p>
                            <p className="text-sm text-gray-200 italic">"{update.condition}"</p>
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
         <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-amber-400">
         No product exists with this ID.
       </div>
      )}
      {isScannerOpen && (
        <QRScannerModal
          onScanSuccess={(val) => {
            setSearchId(val);
            setQueryId(val);
            setIsScannerOpen(false);
            toast.success("Đã truy xuất mã QR: " + val);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}
