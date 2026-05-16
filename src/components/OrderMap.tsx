"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Retail Hub icon (purple)
const hubIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background-color: #a855f7; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 12px #a855f7;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Customer destination icon (green)
const customerIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="background-color: #22c55e; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 12px #22c55e;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Default Retail Hub location (Ho Chi Minh City center as example)
const HUB_LAT = 10.7769;
const HUB_LNG = 106.7009;
const HUB_NAME = "Retail Distribution Hub";

interface OrderMapProps {
  buyerLat: number;
  buyerLng: number;
  buyerAddress: string;
}

export default function OrderMap({ buyerLat, buyerLng, buyerAddress }: OrderMapProps) {
  const hubPos: [number, number] = [HUB_LAT, HUB_LNG];
  const customerPos: [number, number] = [buyerLat, buyerLng];

  // Calculate center between hub and customer
  const center: [number, number] = useMemo(() => [
    (HUB_LAT + buyerLat) / 2,
    (HUB_LNG + buyerLng) / 2,
  ], [buyerLat, buyerLng]);

  // Calculate zoom level based on distance
  const zoom = useMemo(() => {
    const latDiff = Math.abs(HUB_LAT - buyerLat);
    const lngDiff = Math.abs(HUB_LNG - buyerLng);
    const maxDiff = Math.max(latDiff, lngDiff);
    if (maxDiff > 10) return 5;
    if (maxDiff > 5) return 6;
    if (maxDiff > 2) return 8;
    if (maxDiff > 0.5) return 10;
    if (maxDiff > 0.1) return 12;
    return 13;
  }, [buyerLat, buyerLng]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: "280px", width: "100%" }}
      className="rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Retail Hub Marker */}
      <Marker position={hubPos} icon={hubIcon}>
        <Popup>
          <div className="text-sm">
            <strong>🏭 {HUB_NAME}</strong>
            <br />
            <span className="text-gray-500">Origin</span>
          </div>
        </Popup>
      </Marker>

      {/* Customer Destination Marker */}
      <Marker position={customerPos} icon={customerIcon}>
        <Popup>
          <div className="text-sm">
            <strong>🏠 Delivery Destination</strong>
            <br />
            <span className="text-gray-500">{buyerAddress}</span>
          </div>
        </Popup>
      </Marker>

      {/* Route Line */}
      <Polyline
        positions={[hubPos, customerPos]}
        pathOptions={{
          color: "#06b6d4",
          weight: 3,
          opacity: 0.8,
          dashArray: "10, 8",
        }}
      />
    </MapContainer>
  );
}
