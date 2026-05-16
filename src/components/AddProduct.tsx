"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import LocationPicker from "./LocationPicker";
import { CldUploadWidget } from "next-cloudinary";

interface Template {
  id: string;
  name: string;
  origin: string;
  imageUrl: string;
}

type Mode = "create" | "restock";

export default function AddProduct() {
  const [mode, setMode] = useState<Mode>("create");

  // Create New fields
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [quantity, setQuantity] = useState("1");

  // Restock fields
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [restockBlockchainId, setRestockBlockchainId] = useState("");
  const [restockQuantity, setRestockQuantity] = useState("1");

  // Shared
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Fetch existing templates for restock dropdown
  useEffect(() => {
    fetch("/api/templates")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(err => console.error("Failed to fetch templates:", err));
  }, []);

  // Auto-fill restock fields when a template is selected
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // After blockchain tx confirms: save template + batch
  useEffect(() => {
    if (!isConfirmed || !submittedId) return;

    const saveData = async () => {
      try {
        if (mode === "create") {
          // Step 1: Create ProductTemplate
          const tmplRes = await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, origin, imageUrl }),
          });
          const tmpl = await tmplRes.json();
          if (!tmplRes.ok) throw new Error(tmpl.error);

          // Step 2: Create BatchRecord
          const batchRes = await fetch("/api/batches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blockchainId: submittedId,
              templateId: tmpl.id,
              quantity: Number(quantity),
            }),
          });
          if (!batchRes.ok) {
            const err = await batchRes.json();
            throw new Error(err.error);
          }

          toast.success(`Product template created + Batch #${submittedId} saved!`);
          setCreatedProductId(submittedId);
          resetCreateForm();
          // Refresh templates list
          const freshRes = await fetch("/api/templates");
          const freshData = await freshRes.json();
          if (Array.isArray(freshData)) setTemplates(freshData);
        } else {
          // Restock: only create BatchRecord
          const batchRes = await fetch("/api/batches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blockchainId: submittedId,
              templateId: selectedTemplateId,
              quantity: Number(restockQuantity),
            }),
          });
          if (!batchRes.ok) {
            const err = await batchRes.json();
            throw new Error(err.error);
          }

          toast.success(`Restock batch #${submittedId} saved for "${selectedTemplate?.name}"!`);
          setCreatedProductId(submittedId);
          resetRestockForm();
        }
      } catch (err: any) {
        console.error("Post-tx save error:", err);
        toast.error(err.message || "Error saving to database after blockchain tx");
      }
    };

    saveData();
    setSubmittedId(null);
  }, [isConfirmed]);

  const resetCreateForm = () => {
    setId(""); setName(""); setOrigin(""); setImageUrl(""); setQuantity("1");
    setLocation(""); setLatitude(""); setLongitude("");
  };

  const resetRestockForm = () => {
    setRestockBlockchainId(""); setRestockQuantity("1");
    setLocation(""); setLatitude(""); setLongitude("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name || !origin || !location || !latitude || !longitude || isPending || isConfirming) return;

    setSubmittedId(id);
    setCreatedProductId(null);

    try {
      const scaledLat = BigInt(Math.floor(Number(latitude) * 1000000));
      const scaledLng = BigInt(Math.floor(Number(longitude) * 1000000));

      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "addProduct",
        args: [BigInt(id), name, origin, location, scaledLat, scaledLng],
      });
    } catch (error: any) {
      console.error("Contract call failed:", error);
      if (error?.message?.toLowerCase().includes("rejected") || error?.message?.toLowerCase().includes("denied")) {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error("Transaction failed. Check console for details.");
      }
      setSubmittedId(null);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockBlockchainId || !selectedTemplateId || !selectedTemplate || !location || !latitude || !longitude || isPending || isConfirming) return;

    setSubmittedId(restockBlockchainId);
    setCreatedProductId(null);

    try {
      const scaledLat = BigInt(Math.floor(Number(latitude) * 1000000));
      const scaledLng = BigInt(Math.floor(Number(longitude) * 1000000));

      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "addProduct",
        args: [BigInt(restockBlockchainId), selectedTemplate.name, selectedTemplate.origin, location, scaledLat, scaledLng],
      });
    } catch (error: any) {
      console.error("Contract call failed:", error);
      if (error?.message?.toLowerCase().includes("rejected") || error?.message?.toLowerCase().includes("denied")) {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error("Transaction failed. Check console for details.");
      }
      setSubmittedId(null);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:shadow-emerald-500/10">
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
        🌱 Producer Portal
      </h2>
      <p className="text-sm text-gray-500 mb-6">Register new products or restock existing templates on the blockchain.</p>

      {/* Mode Switcher */}
      <div className="flex gap-2 mb-8 bg-black/30 p-1 rounded-xl border border-white/5">
        <button
          type="button"
          onClick={() => { setMode("create"); setCreatedProductId(null); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            mode === "create"
              ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          ➕ Create New Product
        </button>
        <button
          type="button"
          onClick={() => { setMode("restock"); setCreatedProductId(null); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            mode === "restock"
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          🔄 Restock Existing
        </button>
      </div>

      {/* ============ CREATE NEW MODE ============ */}
      {mode === "create" && (
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Blockchain ID</label>
              <input type="number" value={id} onChange={e => setId(e.target.value)} placeholder="e.g. 101"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 text-white placeholder-gray-500 transition-all outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Batch Quantity</label>
              <input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 50"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 text-white placeholder-gray-500 transition-all outline-none" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Product Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Organic Coffee Beans"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 text-white placeholder-gray-500 transition-all outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Origin</label>
            <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Colombia"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 text-white placeholder-gray-500 transition-all outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Product Image</label>
            <CldUploadWidget uploadPreset="supply_chain_app" onSuccess={(result: any) => { setImageUrl(result?.info?.secure_url); toast.success("Image uploaded!"); }}>
              {({ open }) => (
                <div className="flex flex-col gap-3">
                  <button type="button" onClick={() => open()}
                    className="w-full px-6 py-3 bg-white/5 border border-white/10 border-dashed rounded-xl text-gray-300 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-3 font-medium">
                    <span className="text-xl">📷</span>
                    {imageUrl ? "Change Image" : "Upload Image"}
                  </button>
                  {imageUrl && (
                    <div className="relative w-48 h-32 rounded-xl overflow-hidden border border-white/10">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setImageUrl("")}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 rounded-lg text-white backdrop-blur-sm transition-colors">✕</button>
                    </div>
                  )}
                </div>
              )}
            </CldUploadWidget>
          </div>

          <LocationPicker location={location} setLocation={setLocation} latitude={latitude} setLatitude={setLatitude} longitude={longitude} setLongitude={setLongitude} theme="emerald" />

          <button type="submit" disabled={isPending || isConfirming}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
            {isPending ? "Confirming in Wallet..." : isConfirming ? "Transaction Pending..." : "Create Product + Send to Chain"}
          </button>
        </form>
      )}

      {/* ============ RESTOCK MODE ============ */}
      {mode === "restock" && (
        <form onSubmit={handleRestockSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Select Product Template</label>
            <div className="relative">
              <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/50 text-white transition-all outline-none appearance-none" required>
                <option value="" className="bg-zinc-900">-- Choose a product --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id} className="bg-zinc-900">{t.name} ({t.origin})</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Auto-filled Template Info */}
          {selectedTemplate && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center gap-4">
              {selectedTemplate.imageUrl && (
                <img src={selectedTemplate.imageUrl} alt={selectedTemplate.name} className="w-16 h-16 rounded-lg object-cover border border-white/10" />
              )}
              <div>
                <p className="font-bold text-white">{selectedTemplate.name}</p>
                <p className="text-sm text-gray-400">Origin: {selectedTemplate.origin}</p>
                <p className="text-xs text-amber-400 mt-1">✓ Image & metadata will be reused from template</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">New Blockchain ID</label>
              <input type="number" value={restockBlockchainId} onChange={e => setRestockBlockchainId(e.target.value)} placeholder="e.g. 105"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/50 text-white placeholder-gray-500 transition-all outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Batch Quantity</label>
              <input type="number" min={1} value={restockQuantity} onChange={e => setRestockQuantity(e.target.value)} placeholder="e.g. 100"
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/50 text-white placeholder-gray-500 transition-all outline-none" required />
            </div>
          </div>

          <LocationPicker location={location} setLocation={setLocation} latitude={latitude} setLatitude={setLatitude} longitude={longitude} setLongitude={setLongitude} theme="emerald" />

          <button type="submit" disabled={isPending || isConfirming || !selectedTemplateId}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
            {isPending ? "Confirming in Wallet..." : isConfirming ? "Transaction Pending..." : "Restock → Send Batch to Chain"}
          </button>
        </form>
      )}

      {/* Success QR Code */}
      {isConfirmed && createdProductId && (
        <div className="mt-8 p-6 bg-black/40 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-4 text-center">
          <div className="p-3 bg-white rounded-xl">
            <QRCodeSVG value={createdProductId} size={150} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-400 mb-1">
              {mode === "create" ? "Product Created!" : "Restock Batch Registered!"}
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Blockchain ID: <span className="text-white font-mono">{createdProductId}</span>
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => window.print()}
                className="px-4 py-2 text-sm bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">
                Print QR Code
              </button>
              <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 text-sm bg-white/5 text-gray-300 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                View on Etherscan ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
