"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import toast from "react-hot-toast";
import LocationPicker from "./LocationPicker";
import QRScannerModal from "./QRScannerModal";

export default function UpdateStatus() {
  const [id, setId] = useState("");
  const [status, setStatus] = useState("1"); // Default to "In Transit"
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [condition, setCondition] = useState("Tốt");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);

  const { data: hash, isPending, writeContractAsync } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const resetForm = () => {
    setId("");
    setStatus("1");
    setLocation("");
    setLatitude("");
    setLongitude("");
    setCondition("Tốt");
    setSubmittedId(null);
    setSubmittedStatus(null);
  };

  useEffect(() => {
    if (!isConfirmed || !submittedId) return;

    toast.success("Status Updated on Blockchain!");

    // If status was set to "Delivered" (2), auto-trigger inventory automation
    if (submittedStatus === "2") {
      const automate = async () => {
        try {
          const res = await fetch("/api/inventory/automate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blockchainId: submittedId }),
          });
          const data = await res.json();

          if (res.ok && data.success) {
            toast.success(
              `Delivery confirmed! ${data.quantity} items of "${data.productName}" automatically added to VKU Market Warehouse.`,
              { duration: 5000, icon: "📦" }
            );
          } else if (data.alreadyDelivered) {
            toast("This batch was already processed.", { icon: "ℹ️" });
          } else if (!res.ok) {
            // Batch not found — this blockchain ID might not have a batch record
            // This is fine, not all blockchain products are batch-tracked
            console.warn("Inventory automate skipped:", data.error);
            toast("No batch record found for auto-inventory. Manual receive may be needed.", { icon: "ℹ️" });
          }
        } catch (err) {
          console.error("Inventory automate failed:", err);
          toast.error("Blockchain updated but inventory automation failed.");
        }
      };
      automate();
    }

    resetForm();
  }, [isConfirmed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !status || !location || !latitude || !longitude || isPending || isConfirming) return;

    // Save these for the post-confirm effect
    setSubmittedId(id);
    setSubmittedStatus(status);

    try {
      const scaledLat = BigInt(Math.floor(Number(latitude) * 1000000));
      const scaledLng = BigInt(Math.floor(Number(longitude) * 1000000));

      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "updateProductStatus",
        args: [BigInt(id), BigInt(status), location, scaledLat, scaledLng, condition],
      });
    } catch (error: any) {
      console.error("Contract Call Failed:", error);
      if (error?.message?.toLowerCase().includes("rejected") || error?.message?.toLowerCase().includes("denied")) {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error("Transaction failed. Check console for details.");
      }
      setSubmittedId(null);
      setSubmittedStatus(null);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:shadow-purple-500/10 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        🚛 Logistics & Retail: Update Status
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        When you set status to <span className="text-emerald-400 font-semibold">"Delivered"</span>, inventory is automatically updated.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="updateProductId">
            Product ID (Blockchain)
          </label>
          <div className="flex gap-2">
            <input
              id="updateProductId"
              type="number"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Nhập ID sản phẩm..."
              className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-white placeholder-gray-500 transition-all outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/30 transition-all flex items-center gap-2 font-medium"
            >
              <span className="text-lg">📷</span>
              Quét QR
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="condition">
            Ghi chú tình trạng
          </label>
          <textarea
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="e.g. Hàng nguyên vẹn, bao bì sạch sẽ..."
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-white placeholder-gray-500 transition-all outline-none h-20 resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="newStatus">
            New Status
          </label>
          <div className="relative">
            <select
              id="newStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-white transition-all outline-none appearance-none"
              required
            >
              <option value="0" className="bg-zinc-900">Created / Manufactured</option>
              <option value="1" className="bg-zinc-900">In Transit</option>
              <option value="2" className="bg-zinc-900">✅ Delivered (auto-updates inventory)</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {status === "2" && (
            <p className="mt-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              📦 Setting "Delivered" will auto-add the batch quantity to VKU Market warehouse inventory.
            </p>
          )}
        </div>

        <LocationPicker
          location={location}
          setLocation={setLocation}
          latitude={latitude}
          setLatitude={setLatitude}
          longitude={longitude}
          setLongitude={setLongitude}
          theme="purple"
        />

        <div className="mt-auto pt-6">
          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isPending ? "Confirming in Wallet..." : isConfirming ? "Transaction Pending..." : "Update Status"}
          </button>
        </div>
      </form>

      {isConfirmed && (
        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-purple-400">Status Updated!</p>
            <a 
              href={`https://sepolia.etherscan.io/tx/${hash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-purple-300 transition-colors"
            >
              View on Etherscan ↗
            </a>
          </div>
        </div>
      )}
      {isScannerOpen && (
        <QRScannerModal
          onScanSuccess={(val) => {
            setId(val);
            setIsScannerOpen(false);
            toast.success("Đã quét thành công ID: " + val);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}
