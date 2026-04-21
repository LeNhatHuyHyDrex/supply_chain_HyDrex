"use client";

import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";

interface DashboardProps {
  onTrack: (id: string) => void;
}

export default function Dashboard({ onTrack }: DashboardProps) {
  const { data: allProducts, isLoading, isError, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getAllProducts",
  });

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:shadow-orange-500/10 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
        Global Dashboard: All Products
      </h2>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-orange-400 font-medium">Fetching global supply chain data...</p>
        </div>
      ) : isError ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          Error loading products: {error?.message || "Unknown error"}
        </div>
      ) : !allProducts || (allProducts as any[]).length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-black/20 rounded-xl border border-white/5">
          No products found in the supply chain.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-black/40 text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-4">Product ID</th>
                <th scope="col" className="px-6 py-4">Name</th>
                <th scope="col" className="px-6 py-4">Origin</th>
                <th scope="col" className="px-6 py-4">Current Status</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* To display newest first, we reverse the array */}
              {[...(allProducts as any[])].reverse().map((product, idx) => {
                const history = product.history || [];
                const latestUpdate = history.length > 0 ? history[history.length - 1] : null;
                const status = latestUpdate ? latestUpdate.status : 0;
                
                let statusBadge = <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs border border-blue-500/30">Created</span>;
                if (status === 1) statusBadge = <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs border border-orange-500/30">In Transit</span>;
                if (status === 2) statusBadge = <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs border border-green-500/30">Delivered</span>;

                return (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-white">{product.id.toString()}</td>
                    <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                    <td className="px-6 py-4">{product.origin}</td>
                    <td className="px-6 py-4">{statusBadge}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onTrack(product.id.toString())}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white rounded-lg transition-colors text-xs font-semibold shadow-lg shadow-orange-500/20"
                      >
                        Track ↗
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
