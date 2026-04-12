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

  // Small bounding box for embedded map (roughly a few km around center)
  const delta = 0.06;
  const minLat = centerLat - delta;
  const maxLat = centerLat + delta;
  const minLng = centerLng - delta;
  const maxLng = centerLng + delta;

  const embedHref = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    minLng,
  )}%2C${encodeURIComponent(minLat)}%2C${encodeURIComponent(
    maxLng,
  )}%2C${encodeURIComponent(maxLat)}&layer=mapnik&marker=${encodeURIComponent(
    centerLat,
  )}%2C${encodeURIComponent(centerLng)}`;

  // Approximate pixel radius for visual overlay (scaled by km)
  const baseRadiusPx = 120;
  const radiusScale = radiusKm / 15;
  const visualRadiusPx = Math.max(60, Math.min(220, baseRadiusPx * radiusScale));

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
        {/* Embedded OpenStreetMap minimap with radius overlay */}
        <div className="mt-4 h-40 rounded-lg border border-[#2d2d2d] overflow-hidden bg-black relative">
          <iframe
            title="Delivery zone map preview"
            src={embedHref}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ pointerEvents: 'none' }}
          />
          {/* Radius overlay centred on rider zone */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/45 bg-emerald-400/10 shadow-[0_0_32px_rgba(52,211,153,0.5)]"
            style={{ width: `${visualRadiusPx}px`, height: `${visualRadiusPx}px` }}
          />
        </div>
      </div>
    </div>
  );
}
