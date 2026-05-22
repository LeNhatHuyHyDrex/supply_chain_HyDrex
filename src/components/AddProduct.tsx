"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import LocationPicker from "./LocationPicker";
import { CldUploadWidget } from "next-cloudinary";

interface Template { id: string; name: string; origin: string; imageUrl: string; }
type Mode = "create" | "restock";

export default function AddProduct() {
  const [mode, setMode] = useState<Mode>("create");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [restockBlockchainId, setRestockBlockchainId] = useState("");
  const [restockQuantity, setRestockQuantity] = useState("1");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    fetch("/api/templates").then(res => res.json()).then(data => { if (Array.isArray(data)) setTemplates(data); }).catch(err => console.error("Failed to fetch templates:", err));
  }, []);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  useEffect(() => {
    if (!isConfirmed || !submittedId) return;
    const saveData = async () => {
      try {
        if (mode === "create") {
          const tmplRes = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, origin, imageUrl }) });
          const tmpl = await tmplRes.json();
          if (!tmplRes.ok) throw new Error(tmpl.error);
          const batchRes = await fetch("/api/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockchainId: submittedId, templateId: tmpl.id, quantity: Number(quantity) }) });
          if (!batchRes.ok) { const err = await batchRes.json(); throw new Error(err.error); }
          toast.success(`Product template created + Batch #${submittedId} saved!`);
          setCreatedProductId(submittedId);
          resetCreateForm();
          const freshRes = await fetch("/api/templates");
          const freshData = await freshRes.json();
          if (Array.isArray(freshData)) setTemplates(freshData);
        } else {
          const batchRes = await fetch("/api/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockchainId: submittedId, templateId: selectedTemplateId, quantity: Number(restockQuantity) }) });
          if (!batchRes.ok) { const err = await batchRes.json(); throw new Error(err.error); }
          toast.success(`Restock batch #${submittedId} saved for "${selectedTemplate?.name}"!`);
          setCreatedProductId(submittedId);
          resetRestockForm();
        }
      } catch (err: any) { console.error("Post-tx save error:", err); toast.error(err.message || "Error saving after blockchain tx"); }
    };
    saveData();
    setSubmittedId(null);
  }, [isConfirmed]);

  const resetCreateForm = () => { setId(""); setName(""); setOrigin(""); setImageUrl(""); setQuantity("1"); setLocation(""); setLatitude(""); setLongitude(""); };
  const resetRestockForm = () => { setRestockBlockchainId(""); setRestockQuantity("1"); setLocation(""); setLatitude(""); setLongitude(""); };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name || !origin || !location || !latitude || !longitude || isPending || isConfirming) return;
    setSubmittedId(id); setCreatedProductId(null);
    try {
      const scaledLat = BigInt(Math.floor(Number(latitude) * 1000000));
      const scaledLng = BigInt(Math.floor(Number(longitude) * 1000000));
      await writeContractAsync({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "addProduct", args: [BigInt(id), name, origin, location, scaledLat, scaledLng] });
    } catch (error: any) {
      console.error("Blockchain Transaction Error:", error);
      
      const errMsg = error?.message?.toLowerCase() || "";
      
      if (errMsg.includes("user rejected") || error?.code === 4001 || errMsg.includes("denied")) {
        toast.error("Giao dịch đã bị hủy bởi người dùng.");
      } else if (errMsg.includes("gas") || errMsg.includes("revert") || errMsg.includes("execution reverted")) {
        toast.error("Lỗi Blockchain: Không thể ước tính phí Gas. Khả năng cao Blockchain ID này ĐÃ TỒN TẠI hoặc dữ liệu không hợp lệ. Vui lòng thử một ID khác.", { duration: 6000 });
      } else {
        toast.error("Đã xảy ra lỗi khi tương tác với Blockchain. Vui lòng thử lại.");
      }
    } finally {
      setSubmittedId(null);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockBlockchainId || !selectedTemplateId || !selectedTemplate || !location || !latitude || !longitude || isPending || isConfirming) return;
    setSubmittedId(restockBlockchainId); setCreatedProductId(null);
    try {
      const scaledLat = BigInt(Math.floor(Number(latitude) * 1000000));
      const scaledLng = BigInt(Math.floor(Number(longitude) * 1000000));
      await writeContractAsync({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "addProduct", args: [BigInt(restockBlockchainId), selectedTemplate.name, selectedTemplate.origin, location, scaledLat, scaledLng] });
    } catch (error: any) {
      console.error("Blockchain Transaction Error:", error);

      const errMsg = error?.message?.toLowerCase() || "";

      if (errMsg.includes("user rejected") || error?.code === 4001 || errMsg.includes("denied")) {
        toast.error("Giao dịch đã bị hủy bởi người dùng.");
      } else if (errMsg.includes("gas") || errMsg.includes("revert") || errMsg.includes("execution reverted")) {
        toast.error("Lỗi Blockchain: Không thể ước tính phí Gas. Khả năng cao Blockchain ID này ĐÃ TỒN TẠI hoặc dữ liệu không hợp lệ. Vui lòng thử một ID khác.", { duration: 6000 });
      } else {
        toast.error("Đã xảy ra lỗi khi tương tác với Blockchain. Vui lòng thử lại.");
      }
    } finally {
      setSubmittedId(null);
    }
  };

  return (
    <div className="glass-card p-8">
      <h2 className="font-heading text-3xl mb-2">Producer Portal</h2>
      <p className="text-sm text-[var(--muted)] font-body mb-6">Register new products or restock existing templates on the blockchain.</p>

      {/* Mode Switcher */}
      <div className="flex gap-1.5 mb-8 glass-stat p-1.5 rounded-xl">
        <button type="button" onClick={() => { setMode("create"); setCreatedProductId(null); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold font-body transition-all ${mode === "create" ? "bg-fruit-emerald text-white shadow-md shadow-fruit-emerald/20" : "text-[var(--muted)] hover:opacity-80"}`}>
          ➕ Create New Product
        </button>
        <button type="button" onClick={() => { setMode("restock"); setCreatedProductId(null); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold font-body transition-all ${mode === "restock" ? "bg-fruit-emerald text-white shadow-md shadow-fruit-emerald/20" : "text-[var(--muted)] hover:opacity-80"}`}>
          🔄 Restock Existing
        </button>
      </div>

      {/* CREATE MODE */}
      {mode === "create" && (
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body">Blockchain ID</label>
              <input type="number" value={id} onChange={e => setId(e.target.value)} placeholder="e.g. 101" className="input-field" required />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body">Batch Quantity</label>
              <input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 50" className="input-field" required />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body">Product Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Organic Coffee Beans" className="input-field" required />
          </div>

          <div>
            <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body">Origin</label>
            <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Colombia" className="input-field" required />
          </div>

          <div>
            <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body">Product Image</label>
            <CldUploadWidget uploadPreset="supply_chain_app" onSuccess={(result: any) => { setImageUrl(result?.info?.secure_url); toast.success("Image uploaded!"); }}>
              {({ open }) => (
                <div className="flex flex-col gap-3">
                  <button type="button" onClick={() => open()} className="btn-ghost w-full flex items-center justify-center gap-3 !py-3 !border-dashed">
                    <span className="text-lg">📷</span> {imageUrl ? "Change Image" : "Upload Image"}
                  </button>
                  {imageUrl && (
                    <div className="relative w-48 h-32 rounded-xl overflow-hidden border border-[var(--border)]">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setImageUrl("")} className="absolute top-2 right-2 p-1 bg-[var(--surface)] hover:bg-red-500/80 rounded-lg backdrop-blur-sm transition-colors text-xs">✕</button>
                    </div>
                  )}
                </div>
              )}
            </CldUploadWidget>
          </div>

          <LocationPicker location={location} setLocation={setLocation} latitude={latitude} setLatitude={setLatitude} longitude={longitude} setLongitude={setLongitude} theme="emerald" />

          <button type="submit" disabled={isPending || isConfirming} className="btn-primary w-full !py-3.5">
            {isPending ? "Confirming in Wallet..." : isConfirming ? "Transaction Pending..." : "Create Product + Send to Chain"}
          </button>
        </form>
      )}

      {/* RESTOCK MODE */}
      {mode === "restock" && (
        <form onSubmit={handleRestockSubmit} className="space-y-5">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body">Select Product Template</label>
            <div className="relative">
              <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="input-field appearance-none" required>
                <option value="">-- Choose a product --</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.origin})</option>)}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-[var(--muted)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {selectedTemplate && (
            <div className="p-4 glass-stat rounded-xl flex items-center gap-4">
              {selectedTemplate.imageUrl && <img src={selectedTemplate.imageUrl} alt={selectedTemplate.name} className="w-14 h-14 rounded-lg object-cover border border-[var(--border)]" />}
              <div>
                <p className="font-heading">{selectedTemplate.name}</p>
                <p className="text-xs text-[var(--muted)] font-body">Origin: {selectedTemplate.origin}</p>
                <p className="text-[11px] text-[var(--muted)] mt-1 font-body">✓ Image & metadata reused from template</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body">New Blockchain ID</label>
              <input type="number" value={restockBlockchainId} onChange={e => setRestockBlockchainId(e.target.value)} placeholder="e.g. 105" className="input-field" required />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body">Batch Quantity</label>
              <input type="number" min={1} value={restockQuantity} onChange={e => setRestockQuantity(e.target.value)} placeholder="e.g. 100" className="input-field" required />
            </div>
          </div>

          <LocationPicker location={location} setLocation={setLocation} latitude={latitude} setLatitude={setLatitude} longitude={longitude} setLongitude={setLongitude} theme="emerald" />

          <button type="submit" disabled={isPending || isConfirming || !selectedTemplateId} className="btn-primary w-full !py-3.5">
            {isPending ? "Confirming in Wallet..." : isConfirming ? "Transaction Pending..." : "Restock → Send Batch to Chain"}
          </button>
        </form>
      )}

      {/* Success QR */}
      {isConfirmed && createdProductId && (
        <div className="mt-8 p-6 glass-stat rounded-xl flex flex-col items-center gap-4 text-center">
          <div className="p-3 bg-white rounded-xl shadow-lg">
            <QRCodeSVG value={createdProductId} size={150} />
          </div>
          <div>
            <h3 className="font-heading text-lg mb-1">{mode === "create" ? "Product Created!" : "Restock Batch Registered!"}</h3>
            <p className="text-sm text-[var(--muted)] font-body mb-3">Blockchain ID: <span className="font-mono font-semibold">{createdProductId}</span></p>
            <div className="flex justify-center gap-3">
              <button onClick={() => window.print()} className="btn-ghost !text-xs">Print QR Code</button>
              <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="btn-ghost !text-xs">View on Etherscan ↗</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
