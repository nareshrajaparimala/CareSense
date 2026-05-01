'use client';

import { useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  Polyline,
  Tooltip,
  ZoomControl
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Hospital } from '@/types/domain';

// Pin SVG used for hospital markers — tinted per priority. Inline so we don't
// depend on Leaflet's bundled icon paths (which break under Next.js bundling).
function pinIcon(color: string, size = 36): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round">
      <path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.6" fill="#ffffff" stroke="none"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: 'caresense-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 2],
    popupAnchor: [0, -size + 6]
  });
}

const COLOR = {
  recommended: '#16a34a',
  hospital: '#dc2626',
  patient: '#2563eb'
};

function gMapsUrl(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`;
}

function bedRatio(h: Hospital): number {
  return h.beds_total > 0 ? h.beds_available / h.beds_total : 0;
}

function bedTone(h: Hospital): string {
  const r = bedRatio(h);
  if (r >= 0.3) return 'text-emerald-600';
  if (r >= 0.1) return 'text-amber-600';
  return 'text-rose-600';
}

export default function HospitalMap({
  center,
  hospitals
}: {
  center: { lat: number; lng: number };
  hospitals: Hospital[];
}) {
  const recommended = hospitals[0];

  // Auto-fit bounds: include patient + all hospitals so the map always frames everyone.
  const bounds = useMemo<L.LatLngBoundsExpression>(() => {
    const pts: [number, number][] = [
      [center.lat, center.lng],
      ...hospitals.map<[number, number]>((h) => [h.lat, h.lng])
    ];
    return L.latLngBounds(pts).pad(0.25);
  }, [center, hospitals]);

  return (
    <div className="space-y-2">
      <MapContainer
        bounds={bounds}
        zoom={13}
        zoomControl={false}
        style={{ height: 380, width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
        scrollWheelZoom={true}
      >
        {/* Carto Voyager — clearer labels & road hierarchy than default OSM */}
        <TileLayer
          attribution='&copy; OpenStreetMap, &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />
        <ZoomControl position="topright" />

        {/* Patient: pulsing blue dot with persistent tooltip */}
        <CircleMarker
          center={[center.lat, center.lng]}
          radius={10}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: COLOR.patient, fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]} className="caresense-tooltip">
            Patient
          </Tooltip>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">Patient location</p>
              <p className="text-xs text-muted-foreground">
                {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
              </p>
            </div>
          </Popup>
        </CircleMarker>

        {/* Route line: patient → recommended hospital */}
        {recommended && (
          <Polyline
            positions={[
              [center.lat, center.lng],
              [recommended.lat, recommended.lng]
            ]}
            pathOptions={{
              color: COLOR.recommended,
              weight: 4,
              opacity: 0.7,
              dashArray: '8 6'
            }}
          >
            <Tooltip sticky direction="top" className="caresense-tooltip">
              {recommended.distance_km?.toFixed(1)} km · best match
            </Tooltip>
          </Polyline>
        )}

        {/* Hospital markers */}
        {hospitals.map((h, i) => {
          const isRec = i === 0;
          const icon = pinIcon(isRec ? COLOR.recommended : COLOR.hospital, isRec ? 42 : 32);
          return (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={icon}>
              <Tooltip direction="top" offset={[0, -28]} className="caresense-tooltip">
                {isRec ? '★ ' : ''}
                {h.name} · {h.distance_km?.toFixed(1)} km
              </Tooltip>
              <Popup minWidth={240}>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold leading-tight">
                        {isRec && '★ '}
                        {h.name}
                      </p>
                      {h.rating != null && (
                        <p className="text-xs text-amber-600">★ {h.rating.toFixed(1)} / 5</p>
                      )}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold">
                      {h.distance_km?.toFixed(1)} km
                    </span>
                  </div>

                  {h.address && <p className="text-xs text-muted-foreground">{h.address}</p>}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Beds</p>
                      <p className={`font-semibold ${bedTone(h)}`}>
                        {h.beds_available}/{h.beds_total} free
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ETA*</p>
                      <p className="font-semibold">~{Math.round(((h.distance_km ?? 0) / 30) * 60)} min</p>
                    </div>
                  </div>

                  {h.specialty?.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">Specialties: </span>
                      {h.specialty.join(', ')}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={gMapsUrl(center, { lat: h.lat, lng: h.lng })}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                    >
                      Directions
                    </a>
                    {h.phone && (
                      <a
                        href={`tel:${h.phone.replace(/\s/g, '')}`}
                        className="rounded-md border px-2.5 py-1 text-[11px] font-semibold hover:bg-accent"
                      >
                        Call {h.phone}
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] italic text-muted-foreground">
                    *ETA assumes ~30 km/h average urban traffic.
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map legend */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
          Patient
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600 ring-2 ring-white" />
          Recommended hospital
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
          Other hospital
        </span>
        <span className="inline-flex items-center gap-1.5 ml-auto">
          <span className="inline-block h-0.5 w-5 rounded-full bg-emerald-500" style={{ borderTop: '2px dashed' }} />
          Suggested route
        </span>
      </div>
    </div>
  );
}
