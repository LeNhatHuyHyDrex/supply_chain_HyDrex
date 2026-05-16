"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useUser } from "@/providers/UserProvider";
import toast from "react-hot-toast";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

export default function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { items, clearCart, setDrawerOpen, setPendingNavigation } = useCartStore();
  const { user, refetchUser } = useUser();
  const [address, setAddress] = useState(user?.shippingAddress || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    if (user?.shippingAddress) {
      setAddress(user.shippingAddress);
    }
  }, [user?.shippingAddress]);

  // Reset geocoding state when address changes
  useEffect(() => {
    setGeoResult(null);
    setGeoError(false);
  }, [address]);

  if (!isOpen) return null;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleVerifyLocation = async () => {
    if (!address.trim()) {
      toast.error("Please enter an address first");
      return;
    }

    setIsGeocoding(true);
    setGeoError(false);
    setGeoResult(null);

    try {
      const encoded = encodeURIComponent(address.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
        { headers: { "User-Agent": "SupplyChainDApp/1.0" } }
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const result = data[0];
        setGeoResult({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          displayName: result.display_name,
        });
        toast.success("Location verified!");
      } else {
        setGeoError(true);
        toast.error("Address not found. You can still place the order without coordinates.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setGeoError(true);
      toast.error("Geocoding failed. You can still place the order.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleConfirm = async () => {
    if (!address.trim()) {
      toast.error("Please provide a shipping address");
      return;
    }

    if (!user) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!geoResult && !geoError) {
      toast.error("Please verify your location first");
      return;
    }

    setIsLoading(true);
    try {
      const productIds = items.map(i => i.id);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerWallet: user.walletAddress,
          productIds,
          shippingAddress: address,
          buyerLat: geoResult?.lat ?? null,
          buyerLng: geoResult?.lng ?? null,
        })
      });

      if (!res.ok) throw new Error("Failed to create order");

      // Save address to user profile if changed
      if (address !== user.shippingAddress) {
        await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: user.walletAddress,
            displayName: user.displayName,
            shippingAddress: address
          })
        });
        await refetchUser();
      }

      toast.success("Order placed! You can track your delivery here.");
      clearCart();
      setDrawerOpen(false);
      setPendingNavigation("orders");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error creating order");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">✕</button>
        <h2 className="text-2xl font-bold mb-6 text-white">Checkout</h2>
        
        {/* Order Summary */}
        <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="font-semibold text-gray-300 mb-3">Order Summary</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-400">{item.name} (x{item.quantity})</span>
                <span className="text-white font-medium">#{item.id}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between font-bold">
            <span className="text-gray-300">Total Items:</span>
            <span className="text-cyan-400">{totalItems}</span>
          </div>
        </div>

        {/* Shipping Address + Geocoding */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Shipping Address *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 456 Web3 Ave, Crypto City"
              className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
            <button
              type="button"
              onClick={handleVerifyLocation}
              disabled={isGeocoding || !address.trim()}
              className="px-4 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/30 transition-all text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeocoding ? "Verifying..." : "📍 Verify"}
            </button>
          </div>
        </div>

        {/* Geocoding Result */}
        {geoResult && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-sm font-semibold text-emerald-400">Location Verified</span>
            </div>
            <p className="text-xs text-gray-400 mb-1 line-clamp-2">{geoResult.displayName}</p>
            <p className="text-xs font-mono text-gray-500">
              {geoResult.lat.toFixed(6)}, {geoResult.lng.toFixed(6)}
            </p>
          </div>
        )}

        {geoError && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-amber-400">⚠️ Location not found</span>
            </div>
            <p className="text-xs text-gray-400">
              The address could not be geocoded. Your order will be created without map coordinates. You can still proceed.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={isLoading} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !address.trim() || items.length === 0 || (!geoResult && !geoError)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "Confirm Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
