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

  useEffect(() => { setMounted(true); }, []);

  const handleSaveName = async () => {
    if (!inputName.trim()) { toast.error("Please enter a display name"); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress: address, displayName: inputName.trim() }) });
      if (res.ok) { await refetchUser(); toast.success("Display name saved!"); }
      else { toast.error("Error saving display name"); }
    } catch (error) { console.error("Error saving profile:", error); toast.error("An error occurred"); }
    finally { setIsLoading(false); }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {isConnected && user?.displayName && (
          <div className="glass-stat px-3 py-1.5 rounded-xl flex items-center gap-2" style={{ borderRadius: '0.75rem' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-fruit-emerald animate-pulse"></div>
            <span className="text-sm font-body opacity-70">{user.displayName}</span>
            <span className="ml-1 badge !text-[9px]">{user.role}</span>
          </div>
        )}
        
        {isConnected && requireOnboarding && (
          <button onClick={() => setRequireOnboarding(true)} className="btn-primary !text-xs !py-2 !px-3">
            Set Display Name
          </button>
        )}

        <ConnectButton showBalance={false} />
        
        {isConnected && (
          <button onClick={() => disconnect()} className="btn-ghost !text-xs !py-2 !px-3 hover:!text-red-400 hover:!border-red-500/20">
            Disconnect
          </button>
        )}
      </div>

      {requireOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--overlay-bg)] backdrop-blur-sm">
          <div className="glass-card p-8 w-full max-w-md" style={{ borderRadius: '1.5rem' }}>
            <h2 className="font-heading text-2xl mb-2">Welcome</h2>
            <p className="text-[var(--muted)] mb-6 text-sm font-body">
              Please enter a Display Name for your wallet address. This name will be visible to others when you update product tracking statuses.
            </p>
            
            <div className="mb-6">
              <label className="block text-xs text-[var(--muted)] mb-1.5 uppercase tracking-wider font-body">Display Name</label>
              <input
                type="text"
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                placeholder="e.g. John Doe - Logistics"
                className="input-field"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setRequireOnboarding(false)} className="btn-ghost" disabled={isLoading}>Skip for now</button>
              <button onClick={handleSaveName} disabled={isLoading || !inputName.trim()} className="btn-primary">
                {isLoading ? "Saving..." : "Save Name"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
