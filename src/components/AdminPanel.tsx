"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import toast from "react-hot-toast";

export default function AdminPanel() {
  const { address } = useAccount();
  const [supplierAddress, setSupplierAddress] = useState("");
  const [action, setAction] = useState<"add" | "remove" | null>(null);

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "owner",
  });

  const { data: hash, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    if (isConfirmed) {
      toast.success(`Supplier ${action === "add" ? "Added" : "Removed"} Successfully!`);
      setSupplierAddress("");
      setAction(null);
    }
  }, [isConfirmed, action]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierAddress || isPending || isConfirming) return;
    setAction("add");
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "addSupplier",
      args: [supplierAddress as `0x${string}`],
    });
  };

  const handleRemove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierAddress || isPending || isConfirming) return;
    setAction("remove");
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "removeSupplier",
      args: [supplierAddress as `0x${string}`],
    });
  };

  const isOwner = owner === address;

  if (!isOwner) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
        <div className="text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400">You must be the contract owner to view this panel.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:shadow-orange-500/10 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
        Admin Panel: Manage Suppliers
      </h2>
      
      <div className="space-y-5 flex-1 flex flex-col">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="supplierAddress">
            Supplier Ethereum Address
          </label>
          <input
            id="supplierAddress"
            type="text"
            value={supplierAddress}
            onChange={(e) => setSupplierAddress(e.target.value)}
            placeholder="e.g. 0x123..."
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 text-white placeholder-gray-500 transition-all outline-none"
            required
          />
        </div>

        <div className="flex gap-4 mt-auto pt-6">
          <button
            onClick={handleAdd}
            disabled={isPending || isConfirming || !supplierAddress}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isPending && action === "add" ? "Confirming..." : isConfirming && action === "add" ? "Pending..." : "Add Supplier"}
          </button>
          
          <button
            onClick={handleRemove}
            disabled={isPending || isConfirming || !supplierAddress}
            className="flex-1 py-3.5 px-4 bg-black/40 border border-red-500/30 hover:bg-red-500/10 text-red-400 font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isPending && action === "remove" ? "Confirming..." : isConfirming && action === "remove" ? "Pending..." : "Remove Supplier"}
          </button>
        </div>
      </div>
    </div>
  );
}
