'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Hospital } from '@/types/domain';

// Fix the default-icon path issue with Leaflet + bundlers
// (we'll use CircleMarker so this is mostly belt-and-suspenders)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

export default function HospitalMap({
  center,
  hospitals
}: {
  center: { lat: number; lng: number };
  hospitals: Hospital[];
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      style={{ height: 360, width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[center.lat, center.lng]} radius={8} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.6 }}>
        <Popup>Patient location</Popup>
      </CircleMarker>
      {hospitals.map((h, i) => (
        <CircleMarker
          key={h.id}
          center={[h.lat, h.lng]}
          radius={i === 0 ? 12 : 8}
          pathOptions={{
            color: i === 0 ? '#16a34a' : '#dc2626',
            fillColor: i === 0 ? '#16a34a' : '#dc2626',
            fillOpacity: 0.7
          }}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{h.name}</p>
              <p>{h.address}</p>
              <p>{h.beds_available}/{h.beds_total} beds available</p>
              <p>{h.distance_km?.toFixed(1)} km away</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
