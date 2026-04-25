"use client";

import { useState } from 'react';
import AddProduct from '@/components/AddProduct';
import TrackProduct from '@/components/TrackProduct';
import UpdateStatus from '@/components/UpdateStatus';
import AdminPanel from '@/components/AdminPanel';
import Dashboard from '@/components/Dashboard';
import HeaderAuthControls from '@/components/HeaderAuthControls';
import { Toaster } from 'react-hot-toast';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [trackId, setTrackId] = useState<string | null>(null);

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
              SupplyChain
            </h1>
          </div>
          <HeaderAuthControls />
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Transparent Product Tracking
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Interact with our Sepolia testnet Smart Contract to add new products and trace their journey across the supply chain.
          </p>
        </div>
        
        <div className="flex justify-center mb-10">
          <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 inline-flex flex-wrap justify-center gap-1">
            <button
              onClick={() => setActiveTab('producer')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'producer' 
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Producer Portal
            </button>
            <button
              onClick={() => setActiveTab('logistics')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'logistics' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Logistics & Retail
            </button>
            <button
              onClick={() => setActiveTab('consumer')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'consumer' 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Consumer Traceability
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'admin' 
                  ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Admin Panel
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Global Dashboard
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full">
          {activeTab === 'producer' && <AddProduct />}
          {activeTab === 'logistics' && <UpdateStatus />}
          {activeTab === 'consumer' && <TrackProduct initialId={trackId} />}
          {activeTab === 'admin' && <AdminPanel />}
          {activeTab === 'dashboard' && <Dashboard onTrack={(id) => { setActiveTab('consumer'); setTrackId(id); }} />}
        </div>
      </main>
    </div>
  );
}
