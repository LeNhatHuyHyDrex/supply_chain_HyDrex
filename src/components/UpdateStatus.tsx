"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import toast from "react-hot-toast";
import LocationPicker from "./LocationPicker";
import QRScannerModal from "./QRScannerModal";

export default function UpdateStatus() {
  const [id, setId] = useState("");
  const [status, setStatus] = useState("1");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [condition, setCondition] = useState("Tốt");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);

  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const resetForm = () => { setId(""); setStatus("1"); setLocation(""); setLatitude(""); setLongitude(""); setCondition("Tốt"); setSubmittedId(null); setSubmittedStatus(null); };

  useEffect(() => {
    if (!isConfirmed || !submittedId) return;
    toast.success("Status Updated on Blockchain!");
    if (submittedStatus === "2") {
      const automate = async () => {
        try {
          const res = await fetch("/api/inventory/automate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockchainId: submittedId }) });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success(`Delivery confirmed! ${data.quantity} items of "${data.productName}" added to warehouse.`, { duration: 5000, icon: "📦" });
          } else if (data.alreadyDelivered) {
            toast("This batch was already processed.", { icon: "ℹ️" });
          } else if (!res.ok) {
            console.warn("Inventory automate skipped:", data.error);
            toast("No batch record found for auto-inventory.", { icon: "ℹ️" });
          }
        } catch (err) { console.error("Inventory automate failed:", err); toast.error("Blockchain updated but inventory automation failed."); }
      };
      automate();
    }
    resetForm();
  }, [isConfirmed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !status || !location || !latitude || !longitude || isPending || isConfirming) return;
    setSubmittedId(id);
    setSubmittedStatus(status);
    try {
      const scaledLat = BigInt(Math.floor(Number(latitude) * 1000000));
      const scaledLng = BigInt(Math.floor(Number(longitude) * 1000000));
      await writeContractAsync({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "updateProductStatus", args: [BigInt(id), BigInt(status), location, scaledLat, scaledLng, condition] });
    } catch (error: any) {
      console.error("Contract Call Failed:", error);
      if (error?.message?.toLowerCase().includes("rejected") || error?.message?.toLowerCase().includes("denied")) { toast.error("Transaction cancelled by user."); }
      else { toast.error("Transaction failed. Check console for details."); }
      setSubmittedId(null); setSubmittedStatus(null);
    }
  };

  return (
    <div className="glass-card p-8 h-full flex flex-col">
      <h2 className="font-heading text-3xl mb-2">Logistics & Retail</h2>
      <p className="text-sm text-[var(--muted)] font-body mb-6">
        When you set status to <span className="opacity-70 font-semibold">&quot;Delivered&quot;</span>, inventory is automatically updated.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body" htmlFor="updateProductId">Product ID (Blockchain)</label>
          <div className="flex gap-2">
            <input id="updateProductId" type="number" value={id} onChange={e => setId(e.target.value)} placeholder="Enter Product ID..." className="input-field flex-1" required />
            <button type="button" onClick={() => setIsScannerOpen(true)} className="btn-ghost flex items-center gap-2 !px-4">
              <span>📷</span> Scan QR
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body" htmlFor="condition">Condition Notes</label>
          <textarea id="condition" value={condition} onChange={e => setCondition(e.target.value)} placeholder="e.g. Items intact, clean packaging..." className="input-field resize-none h-20" required />
        </div>

        <div>
          <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body" htmlFor="newStatus">New Status</label>
          <div className="relative">
            <select id="newStatus" value={status} onChange={e => setStatus(e.target.value)} className="input-field appearance-none" required>
              <option value="0">Created / Manufactured</option>
              <option value="1">In Transit</option>
              <option value="2">✅ Delivered (auto-updates inventory)</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-[var(--muted)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          {status === "2" && (
            <p className="mt-2 text-xs text-[var(--muted)] glass-stat rounded-lg px-3 py-2 font-body">
              📦 Setting &quot;Delivered&quot; will auto-add the batch quantity to VKU Market warehouse inventory.
            </p>
          )}
        </div>

        <LocationPicker location={location} setLocation={setLocation} latitude={latitude} setLatitude={setLatitude} longitude={longitude} setLongitude={setLongitude} theme="purple" />

        <div className="mt-auto pt-6">
          <button type="submit" disabled={isPending || isConfirming} className="btn-primary w-full !py-3.5">
            {isPending ? "Confirming in Wallet..." : isConfirming ? "Transaction Pending..." : "Update Status"}
          </button>
        </div>
      </form>

      {isConfirmed && (
        <div className="mt-6 p-4 glass-stat rounded-xl flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium opacity-80 font-body">Status Updated!</p>
            <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--muted)] hover:text-[var(--muted)] transition-colors font-body">View on Etherscan ↗</a>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <QRScannerModal onScanSuccess={(val) => { setId(val); setIsScannerOpen(false); toast.success("Scanned ID: " + val); }} onClose={() => setIsScannerOpen(false)} />
      )}
    </div>
  );
}
