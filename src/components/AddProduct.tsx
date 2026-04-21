"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";
import LocationPicker from "./LocationPicker";

export default function AddProduct() {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const { data: hash, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    if (isConfirmed && submittedId) {
      toast.success("Product Added Successfully!");
      setCreatedProductId(submittedId);
      setId("");
      setName("");
      setOrigin("");
      setLocation("");
      setLatitude("");
      setLongitude("");
    }
  }, [isConfirmed, submittedId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name || !origin || !location || !latitude || !longitude || isPending || isConfirming) return;

    setSubmittedId(id);
    setCreatedProductId(null); // Reset previous QR code

    const scaledLat = BigInt(Math.floor(Number(latitude) * 1000000));
    const scaledLng = BigInt(Math.floor(Number(longitude) * 1000000));

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "addProduct",
      args: [BigInt(id), name, origin, location, scaledLat, scaledLng],
    });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:shadow-emerald-500/10">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
        Producer Portal: Add New Product
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="productId">
            Product ID
          </label>
          <input
            id="productId"
            type="number"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. 101"
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-white placeholder-gray-500 transition-all outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="productName">
            Product Name
          </label>
          <input
            id="productName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Organic Coffee Beans"
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-white placeholder-gray-500 transition-all outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="origin">
            Origin
          </label>
          <input
            id="origin"
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="e.g. Colombia"
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-white placeholder-gray-500 transition-all outline-none"
            required
          />
        </div>

        <LocationPicker
          location={location}
          setLocation={setLocation}
          latitude={latitude}
          setLatitude={setLatitude}
          longitude={longitude}
          setLongitude={setLongitude}
          theme="emerald"
        />

        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isPending ? "Confirming in Wallet..." : isConfirming ? "Transaction Pending..." : "Add Product"}
        </button>
      </form>

      {isConfirmed && createdProductId && (
        <div className="mt-8 p-6 bg-black/40 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-4 text-center">
          <div className="p-3 bg-white rounded-xl">
            <QRCode value={createdProductId} size={150} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-400 mb-1">Product Added Successfully!</h3>
            <p className="text-sm text-gray-400 mb-3">
              Attach this QR Code to Product ID: <span className="text-white font-mono">{createdProductId}</span>
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 text-sm bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
              >
                Print QR Code
              </button>
              <a 
                href={`https://sepolia.etherscan.io/tx/${hash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm bg-white/5 text-gray-300 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              >
                View on Etherscan ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
