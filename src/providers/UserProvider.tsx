"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAccount } from "wagmi";

export type Role = "ADMIN" | "SUPPLIER" | "SHIPPER" | "CUSTOMER";

export interface User {
  walletAddress: string;
  displayName: string;
  role: Role;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  refetchUser: () => Promise<void>;
  requireOnboarding: boolean;
  setRequireOnboarding: (val: boolean) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  refetchUser: async () => {},
  requireOnboarding: false,
  setRequireOnboarding: () => {},
});

export const useUser = () => useContext(UserContext);

export function UserProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requireOnboarding, setRequireOnboarding] = useState(false);

  const fetchUser = async (wallet: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/user?wallet=${wallet}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setRequireOnboarding(false);
      } else if (res.status === 404) {
        setUser(null);
        setRequireOnboarding(true);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refetchUser = async () => {
    if (address && isConnected) {
      await fetchUser(address);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchUser(address);
    } else {
      setUser(null);
      setRequireOnboarding(false);
      setIsLoading(false);
    }
  }, [isConnected, address]);

  return (
    <UserContext.Provider value={{ user, isLoading, refetchUser, requireOnboarding, setRequireOnboarding }}>
      {children}
    </UserContext.Provider>
  );
}
