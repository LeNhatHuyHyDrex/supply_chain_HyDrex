"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AddProduct from '@/components/AddProduct';
import TrackProduct from '@/components/TrackProduct';
import UpdateStatus from '@/components/UpdateStatus';
import AdminPanel from '@/components/AdminPanel';
import Dashboard from '@/components/Dashboard';
import Storefront from '@/components/Storefront';
import HeaderAuthControls from '@/components/HeaderAuthControls';
import InventoryManager from '@/components/InventoryManager';
import { Toaster } from 'react-hot-toast';
import { useUser } from '@/providers/UserProvider';

export default function Home() {
  const [activeTab, setActiveTab] = useState('storefront');
  const [trackId, setTrackId] = useState<string | null>(null);
  const { user } = useUser();
  const searchParams = useSearchParams();

  // Role resolution (default to CUSTOMER if unconnected)
  const role = user?.role || "CUSTOMER";

  // Handle QR code deep links: /?trace=123
  useEffect(() => {
    const traceId = searchParams.get('trace');
    if (traceId) {
      setTrackId(traceId);
      setActiveTab('consumer');
    }
  }, [searchParams]);

  // Access definitions
  const accessMap = {
    storefront: ['CUSTOMER', 'SHIPPER', 'SUPPLIER', 'ADMIN'],
    consumer: ['CUSTOMER', 'SHIPPER', 'SUPPLIER', 'ADMIN'],
    inventory: ['SUPPLIER', 'ADMIN'],
    logistics: ['SHIPPER', 'SUPPLIER', 'ADMIN'],
    producer: ['SUPPLIER', 'ADMIN'],
    admin: ['ADMIN'],
    dashboard: ['ADMIN'],
  };

  const hasAccess = (tab: keyof typeof accessMap) => accessMap[tab].includes(role);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white selection:bg-cyan-500/30">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              VKU Market
            </h1>
          </div>
          <HeaderAuthControls />
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Smart Inventory & Traceability
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Blockchain-verified product origins with real-time inventory management for VKU Market.
          </p>
        </div>
        
        <div className="flex justify-center mb-10">
          <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 inline-flex flex-wrap justify-center gap-1">
            {hasAccess('storefront') && (
              <button
                onClick={() => setActiveTab('storefront')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'storefront' 
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🏪 Product Catalog
              </button>
            )}
            {hasAccess('consumer') && (
              <button
                onClick={() => setActiveTab('consumer')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'consumer' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🔍 Trace Origin
              </button>
            )}
            {hasAccess('inventory') && (
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'inventory' 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                📦 Inventory
              </button>
            )}
            {hasAccess('producer') && (
              <button
                onClick={() => setActiveTab('producer')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'producer' 
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🌱 Producer Portal
              </button>
            )}
            {hasAccess('logistics') && (
              <button
                onClick={() => setActiveTab('logistics')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'logistics' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🚛 Logistics
              </button>
            )}
            {hasAccess('admin') && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'admin' 
                    ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🛡️ Admin
              </button>
            )}
            {hasAccess('dashboard') && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'dashboard' 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                📊 Dashboard
              </button>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto w-full">
          {!hasAccess(activeTab as keyof typeof accessMap) ? (
            <div className="p-12 bg-black/40 border border-red-500/30 rounded-3xl text-center shadow-2xl shadow-red-500/10">
              <div className="text-5xl mb-4">⛔</div>
              <h3 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h3>
              <p className="text-gray-400">You do not have the required permissions ({role}) to view this portal.</p>
            </div>
          ) : (
            <>
              {activeTab === 'storefront' && <Storefront onTrace={(id) => { setActiveTab('consumer'); setTrackId(id); }} />}
              {activeTab === 'consumer' && <TrackProduct initialId={trackId} />}
              {activeTab === 'inventory' && <InventoryManager />}
              {activeTab === 'producer' && <AddProduct />}
              {activeTab === 'logistics' && <UpdateStatus />}
              {activeTab === 'admin' && <AdminPanel />}
              {activeTab === 'dashboard' && <Dashboard onTrack={(id) => { setActiveTab('consumer'); setTrackId(id); }} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
