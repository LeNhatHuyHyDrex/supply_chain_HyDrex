"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

const LocationMapModal = dynamic(() => import("./LocationMapModal"), { ssr: false });

const PREDEFINED_LOCATIONS = [
  { name: "Dak Lak Farm", lat: "12.6667", lng: "108.0383" },
  { name: "Da Nang Warehouse", lat: "16.0471", lng: "108.2062" },
  { name: "HCMC Port", lat: "10.7626", lng: "106.6602" },
  { name: "VKU-Mart", lat: "15.9753", lng: "108.2532" },
];

interface LocationPickerProps {
  location: string;
  setLocation: (val: string) => void;
  latitude: string;
  setLatitude: (val: string) => void;
  longitude: string;
  setLongitude: (val: string) => void;
  theme?: "emerald" | "purple";
}

export default function LocationPicker({
  location,
  setLocation,
  latitude,
  setLatitude,
  longitude,
  setLongitude,
  theme = "emerald",
}: LocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const ringColor = theme === "purple" ? "focus:ring-purple-500/50 focus:border-purple-500/50" : "focus:ring-emerald-500/50 focus:border-emerald-500/50";
  const btnColor = theme === "purple" ? "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30";
  const spinnerColor = theme === "purple" ? "border-purple-400" : "border-emerald-400";

  const handlePredefinedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    if (!selectedName) return;
    const loc = PREDEFINED_LOCATIONS.find((l) => l.name === selectedName);
    if (loc) {
      setLocation(loc.name);
      setLatitude(loc.lat);
      setLongitude(loc.lng);
    }
  };

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocation("Current GPS Location");
        setIsLocating(false);
        toast.success("Location found!");
      },
      (error) => {
        setIsLocating(false);
        toast.error("Failed to get location. Please allow GPS permissions.");
      }
    );
  };

  return (
    <div className="space-y-4 p-5 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden group">
      {/* Decorative gradient blob */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full pointer-events-none transition-all duration-500 group-hover:scale-150 ${theme === 'purple' ? 'bg-purple-500' : 'bg-emerald-500'}`}></div>
      
      <div className="flex flex-col sm:flex-row gap-3 items-end relative z-10">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="presetLocation">
            Quick Select (Preset)
          </label>
          <div className="relative">
            <select
              id="presetLocation"
              onChange={handlePredefinedChange}
              className={`w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none appearance-none transition-all ${ringColor}`}
              defaultValue=""
            >
              <option value="" disabled className="bg-zinc-900">-- Choose Preset Location --</option>
              {PREDEFINED_LOCATIONS.map((loc) => (
                <option key={loc.name} value={loc.name} className="bg-zinc-900">
                  {loc.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAutoLocate}
          disabled={isLocating}
          className={`w-full sm:w-auto px-5 py-3 border rounded-xl transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${btnColor}`}
        >
          {isLocating ? (
            <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${spinnerColor}`}></div>
          ) : (
            <span className="text-lg">📍</span>
          )}
          {isLocating ? "Locating..." : "Auto-Locate"}
        </button>
        <button
          type="button"
          onClick={() => setIsMapOpen(true)}
          className={`w-full sm:w-auto px-5 py-3 border rounded-xl transition-all font-medium flex items-center justify-center gap-2 ${btnColor}`}
        >
          <span className="text-lg">🗺️</span>
          Pick from Map
        </button>
      </div>

      <div className="relative z-10">
        <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="manualLocation">
          Location Name (Manual Override)
        </label>
        <input
          id="manualLocation"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Factory in Da Nang"
          className={`w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 transition-all outline-none ${ringColor}`}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="manualLatitude">
            Latitude
          </label>
          <input
            id="manualLatitude"
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="e.g. 16.0471"
            className={`w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 transition-all outline-none ${ringColor}`}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="manualLongitude">
            Longitude
          </label>
          <input
            id="manualLongitude"
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="e.g. 108.2062"
            className={`w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 transition-all outline-none ${ringColor}`}
            required
          />
        </div>
      </div>

      {isMapOpen && (
        <LocationMapModal
          initialLat={latitude ? parseFloat(latitude) : 16.0470}
          initialLng={longitude ? parseFloat(longitude) : 108.2062}
          onClose={() => setIsMapOpen(false)}
          onConfirm={(lat, lng) => {
            setLatitude(lat.toFixed(6));
            setLongitude(lng.toFixed(6));
            setLocation("Map Selected Location");
            setIsMapOpen(false);
          }}
        />
      )}
    </div>
  );
}
