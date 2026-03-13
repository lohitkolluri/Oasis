'use client';

/**
 * ZoneMap — lightweight zone summary panel.
 *
 * NOTE: We intentionally avoid map libraries here. Some ESM bundles (e.g. MapLibre)
 * can trigger Turbopack runtime helper issues in Next.js dev. For the admin console,
 * a compact zone summary + maps deep-link is more reliable and faster to scan.
 */

import { ExternalLink, MapPin } from 'lucide-react';

export interface ZoneMapEvent {
  id: string;
  lat: number;
  lng: number;
  severity: number;
  type: string;
}

interface ZoneMapProps {
  centerLat: number;
  centerLng: number;
  radiusKm?: number;
  zoneName?: string;
  className?: string;
  events?: ZoneMapEvent[];
}

export function ZoneMap({
  centerLat,
  centerLng,
  radiusKm = 15,
  zoneName,
  className = '',
}: ZoneMapProps) {
  const mapsHref = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
    centerLat,
  )}&mlon=${encodeURIComponent(centerLng)}#map=14/${encodeURIComponent(
    centerLat,
  )}/${encodeURIComponent(centerLng)}`;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[#2d2d2d] bg-[#0f0f0f] ${className}`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#7dd3fc]" />
              {zoneName ?? 'Delivery zone'}
            </p>
            <p className="text-[11px] text-[#555] mt-1 font-mono tabular-nums">
              {centerLat.toFixed(4)}, {centerLng.toFixed(4)} · r={radiusKm}km
            </p>
          </div>
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#7dd3fc] hover:text-white transition-colors shrink-0"
          >
            Open map
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-[#2d2d2d] bg-[#161616] px-3 py-2">
            <p className="text-[10px] text-[#555] uppercase tracking-[0.12em]">Center</p>
            <p className="text-xs text-[#9ca3af] font-mono tabular-nums mt-1">
              {centerLat.toFixed(2)},{centerLng.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-[#2d2d2d] bg-[#161616] px-3 py-2">
            <p className="text-[10px] text-[#555] uppercase tracking-[0.12em]">Radius</p>
            <p className="text-xs text-white tabular-nums mt-1">{radiusKm} km</p>
          </div>
          <div className="rounded-lg border border-[#2d2d2d] bg-[#161616] px-3 py-2">
            <p className="text-[10px] text-[#555] uppercase tracking-[0.12em]">Events</p>
            <p className="text-xs text-white tabular-nums mt-1">—</p>
          </div>
        </div>
      </div>
    </div>
  );
}
