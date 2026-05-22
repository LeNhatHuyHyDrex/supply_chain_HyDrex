"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

type Role = "ADMIN" | "SUPPLIER" | "SHIPPER" | "CUSTOMER";

interface User {
  walletAddress: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Role>("ADMIN");
  const [updatingWallet, setUpdatingWallet] = useState<string | null>(null);

  const roles: Role[] = ["ADMIN", "SUPPLIER", "SHIPPER", "CUSTOMER"];

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (walletAddress: string, newRole: Role) => {
    setUpdatingWallet(walletAddress);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, newRole }),
      });

      if (res.ok) {
        toast.success("User role updated successfully");
        fetchUsers(); // Refresh the list
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("An error occurred while updating");
    } finally {
      setUpdatingWallet(null);
    }
  };

  const filteredUsers = users.filter((u) => u.role === activeTab);

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp}>
      <div className="glass-card p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-heading">
              User Management
            </h2>
            <p className="text-[var(--muted)] mt-2 font-body text-sm">Manage roles and permissions across the DApp.</p>
          </div>
          <div className="glass-stat px-5 py-3 rounded-xl flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-heading">{users.length}</p>
              <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-body">Total Users</p>
            </div>
          </div>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-2 mb-6 pb-4 overflow-x-auto">
          {roles.map((role) => {
            const count = users.filter((u) => u.role === role).length;
            return (
              <button
                key={role}
                onClick={() => setActiveTab(role)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold font-body transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === role
                    ? "bg-fruit-emerald text-white shadow-lg shadow-fruit-emerald/20"
                    : "glass-stat text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {role}
                <span className={`px-2 py-0.5 rounded-md text-xs ${activeTab === role ? "bg-white/20" : "bg-[var(--surface)]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-fruit-emerald/20 border-t-fruit-emerald"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 glass-stat rounded-2xl">
            <p className="text-[var(--muted)] font-body">No users found with the {activeTab} role.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                  <th className="p-4 text-sm font-semibold text-[var(--muted)] font-body">Display Name</th>
                  <th className="p-4 text-sm font-semibold text-[var(--muted)] font-body">Wallet Address</th>
                  <th className="p-4 text-sm font-semibold text-[var(--muted)] font-body">Joined Date</th>
                  <th className="p-4 text-sm font-semibold text-[var(--muted)] font-body text-right">Actions (Role)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredUsers.map((u) => (
                  <tr key={u.walletAddress} className="hover:bg-[var(--surface)] transition-colors">
                    <td className="p-4">
                      <div className="font-medium flex items-center gap-2 font-body">
                        <div className="w-8 h-8 rounded-full bg-fruit-emerald/10 border border-fruit-emerald/20 flex items-center justify-center text-fruit-emerald font-bold text-sm">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        {u.displayName}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-sm text-[var(--muted)] bg-[var(--surface)] px-2 py-1 rounded-lg">
                        {truncateAddress(u.walletAddress)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--muted)] font-body">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <select
                        value={u.role}
                        disabled={updatingWallet === u.walletAddress}
                        onChange={(e) => handleRoleChange(u.walletAddress, e.target.value as Role)}
                        className="input-field !w-auto !py-1.5 !px-3 !text-sm !rounded-lg"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
