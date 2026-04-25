"use client";

import { useState, useEffect } from "react";

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface UpdaterNameProps {
  address: string;
}

export default function UpdaterName({ address }: UpdaterNameProps) {
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    
    let isMounted = true;
    
    const fetchName = async () => {
      try {
        const res = await fetch(`/api/user?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setDisplayName(data.displayName);
        }
      } catch (error) {
        console.error("Error fetching display name:", error);
      }
    };

    fetchName();

    return () => {
      isMounted = false;
    };
  }, [address]);

  if (displayName) {
    return (
      <span className="font-semibold text-cyan-400">
        {displayName} <span className="text-gray-500 font-mono text-xs">({truncateAddress(address)})</span>
      </span>
    );
  }

  return (
    <span className="text-gray-500 font-mono">
      {truncateAddress(address)}
    </span>
  );
}
