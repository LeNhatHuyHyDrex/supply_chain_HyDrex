"use client";

import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { motion } from "framer-motion";

interface DashboardProps {
  onTrack: (id: string) => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Dashboard({ onTrack }: DashboardProps) {
  const { data: allProducts, isLoading, isError, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getAllProducts",
  });

  const safeProducts = allProducts ? (allProducts as any[]).map(p => ({
    id: p.id.toString(),
    name: p.name,
    origin: p.origin,
    history: (p.history || []).map((h: any) => ({
      status: Number(h.status),
      timestamp: h.timestamp.toString(),
      updater: h.updater,
      locationData: h.locationData,
      latitude: h.latitude.toString(),
      longitude: h.longitude.toString(),
      condition: h.condition
    }))
  })) : [];

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp}>
      <div className="glass-card p-8 transition-all duration-300 h-full flex flex-col">
        <h2 className="text-2xl font-heading mb-6">
          Global Dashboard: All Products
        </h2>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-fruit-emerald/20 border-t-fruit-emerald rounded-full animate-spin"></div>
            <p className="mt-4 text-fruit-emerald font-medium font-body">Fetching global supply chain data...</p>
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 dark:text-red-400 font-body">
            Error loading products: {error?.message || "Unknown error"}
          </div>
        ) : safeProducts.length === 0 ? (
          <div className="p-8 text-center text-[var(--muted)] bg-[var(--surface)] rounded-xl border border-[var(--border)] font-body">
            No products found in the supply chain.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-[var(--surface)] text-[var(--muted)]">
                <tr>
                  <th scope="col" className="px-6 py-4 font-body">Product ID</th>
                  <th scope="col" className="px-6 py-4 font-body">Name</th>
                  <th scope="col" className="px-6 py-4 font-body">Origin</th>
                  <th scope="col" className="px-6 py-4 font-body">Current Status</th>
                  <th scope="col" className="px-6 py-4 text-right font-body">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...safeProducts].reverse().map((product, idx) => {
                  const history = product.history || [];
                  const latestUpdate = history.length > 0 ? history[history.length - 1] : null;
                  const status = latestUpdate ? latestUpdate.status : 0;
                  
                  let statusBadge = <span className="badge badge-info">Created</span>;
                  if (status === 1) statusBadge = <span className="badge badge-warning">In Transit</span>;
                  if (status === 2) statusBadge = <span className="badge badge-success">Delivered</span>;

                  return (
                    <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                      <td className="px-6 py-4 font-mono text-sm">{product.id}</td>
                      <td className="px-6 py-4 font-medium font-body">{product.name}</td>
                      <td className="px-6 py-4 text-[var(--muted)] font-body">{product.origin}</td>
                      <td className="px-6 py-4">{statusBadge}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onTrack(product.id)}
                          className="btn-primary !text-xs !py-2 !px-4"
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
    </motion.div>
  );
}
