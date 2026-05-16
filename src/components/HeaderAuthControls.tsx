"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import { useUser } from "@/providers/UserProvider";

export default function HeaderAuthControls() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { user, refetchUser, requireOnboarding, setRequireOnboarding } = useUser();
  
  const [inputName, setInputName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSaveName = async () => {
    if (!inputName.trim()) {
      toast.error("Vui lòng nhập tên hiển thị");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          displayName: inputName.trim(),
        })
      });

      if (res.ok) {
        await refetchUser();
        toast.success("Đã cập nhật tên hiển thị!");
      } else {
        toast.error("Lỗi khi lưu tên hiển thị");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        {isConnected && user?.displayName && (
          <div className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
            <span className="text-sm font-semibold text-cyan-50">{user.displayName}</span>
            <span className="ml-2 px-2 py-0.5 bg-white/10 rounded text-[10px] font-bold text-gray-400 uppercase tracking-wider">{user.role}</span>
          </div>
        )}
        
        {isConnected && requireOnboarding && (
          <button 
            onClick={() => setRequireOnboarding(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-xl hover:from-orange-400 hover:to-red-400 transition-all shadow-lg shadow-orange-500/20"
          >
            Set Display Name
          </button>
        )}

        <ConnectButton showBalance={false} />
        
        {isConnected && (
          <button 
            onClick={() => disconnect()}
            className="px-3 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-all"
          >
            Disconnect
          </button>
        )}
      </div>

      {requireOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 text-white">Welcome!</h2>
            <p className="text-gray-400 mb-6 text-sm">
              Please enter a Display Name for your wallet address. This name will be visible to others when you update product tracking statuses.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="e.g. John Doe - Logistics"
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                }}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRequireOnboarding(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                disabled={isLoading}
              >
                Skip for now
              </button>
              <button
                onClick={handleSaveName}
                disabled={isLoading || !inputName.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-cyan-500 hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? "Saving..." : "Save Name"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
