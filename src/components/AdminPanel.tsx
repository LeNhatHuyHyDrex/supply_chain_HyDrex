"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

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
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-red-400 to-rose-500 bg-clip-text text-transparent">
            User Management Dashboard
          </h2>
          <p className="text-gray-400 mt-2">Manage roles and permissions across the DApp.</p>
        </div>
        <div className="px-4 py-2 bg-black/40 rounded-xl border border-white/10 flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{users.length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Users</p>
          </div>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
        {roles.map((role) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <button
              key={role}
              onClick={() => setActiveTab(role)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === role
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {role}
              <span className={`px-2 py-0.5 rounded-md text-xs ${activeTab === role ? "bg-white/20" : "bg-black/50"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 bg-black/20 rounded-2xl border border-white/5">
          <p className="text-gray-500">No users found with the {activeTab} role.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 text-sm font-semibold text-gray-300">Display Name</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Wallet Address</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Joined Date</th>
                <th className="p-4 text-sm font-semibold text-gray-300 text-right">Actions (Role)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((u) => (
                <tr key={u.walletAddress} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-white flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                        {u.displayName.charAt(0).toUpperCase()}
                      </div>
                      {u.displayName}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-sm text-gray-400 bg-white/5 px-2 py-1 rounded-lg">
                      {truncateAddress(u.walletAddress)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <select
                      value={u.role}
                      disabled={updatingWallet === u.walletAddress}
                      onChange={(e) => handleRoleChange(u.walletAddress, e.target.value as Role)}
                      className="px-3 py-1.5 bg-black/60 border border-white/10 rounded-lg text-sm font-medium text-gray-300 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
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
  );
}
