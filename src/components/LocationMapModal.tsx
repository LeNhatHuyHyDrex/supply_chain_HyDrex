import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const customIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background-color: #f43f5e; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px #f43f5e;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapEvents({ onLocationSelected }: { onLocationSelected: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface LocationMapModalProps {
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}

export default function LocationMapModal({ initialLat = 16.0470, initialLng = 108.2062, onConfirm, onClose }: LocationMapModalProps) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
          <h3 className="text-lg font-bold text-white">Pick Location from Map</h3>
          <button onClick={onClose} type="button" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="relative w-full h-[60vh]">
          <MapContainer center={[initialLat, initialLng]} zoom={5} scrollWheelZoom={true} className="w-full h-full z-0 relative">
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapEvents onLocationSelected={(lat, lng) => setPosition(new L.LatLng(lat, lng))} />
            {position && <Marker position={position} icon={customIcon} />}
          </MapContainer>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-400">
            {position ? (
              <span>Selected: <span className="text-white font-mono">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</span></span>
            ) : (
              <span>Click anywhere on the map to place a marker.</span>
            )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              Cancel
            </button>
            <button 
              type="button"
              onClick={() => position && onConfirm(position.lat, position.lng)}
              disabled={!position}
              className="flex-1 sm:flex-none px-6 py-2 rounded-xl text-white font-semibold bg-rose-500 hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
