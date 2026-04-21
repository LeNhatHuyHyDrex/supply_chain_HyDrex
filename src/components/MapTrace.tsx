"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Define a function to return dynamic icons based on status
const getCustomIcon = (status: number) => {
  let color = "#3b82f6"; // Blue for Created
  if (status === 1) color = "#f59e0b"; // Yellow/Orange for In Transit
  if (status === 2) color = "#10b981"; // Green for Delivered
  
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px ${color};"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

export interface TrackingUpdate {
  status: number;
  timestamp: bigint;
  updater: string;
  locationData: string;
  latitude: bigint;
  longitude: bigint;
}

export default function MapTrace({ history }: { history: readonly TrackingUpdate[] }) {
  const [positions, setPositions] = useState<[number, number][]>([]);

  useEffect(() => {
    if (history && history.length > 0) {
      const coords = history.map((update) => {
        const lat = Number(update.latitude) / 1000000;
        const lng = Number(update.longitude) / 1000000;
        return [lat, lng] as [number, number];
      });
      setPositions(coords);
    }
  }, [history]);

  if (!positions || positions.length === 0) {
    return <div className="text-gray-400">No location data available.</div>;
  }

  // Determine bounds to auto-zoom the map
  const center = positions[positions.length - 1];

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative z-0">
      <MapContainer center={center} zoom={5} scrollWheelZoom={true} className="w-full h-full">
        {/* Dark theme map tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {positions.map((pos, idx) => (
          <Marker key={idx} position={pos} icon={getCustomIcon(history[idx].status)}>
            <Popup className="dark-popup">
              <div className="text-gray-800 font-medium">
                {history[idx].locationData}
                <br />
                <span className="text-xs text-gray-500">
                  {new Date(Number(history[idx].timestamp) * 1000).toLocaleString()}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        <Polyline positions={positions} color="#06b6d4" weight={4} opacity={0.7} dashArray="10, 10" />
      </MapContainer>
    </div>
  );
}
