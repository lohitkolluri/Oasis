'use client';

/**
 * ZoneMap — MapLibre GL powered zone visualisation with neon dark style.
 * Shows the rider's delivery zone as a neon-cyan shaded circle on a dark
 * OpenStreetMap basemap. Disruption event markers glow softly.
 */

import { buildCirclePolygon, zoneBbox } from '@/lib/utils/geo';
import { useEffect, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

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
  events = [],
}: ZoneMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: MapLibreMap;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      await import('maplibre-gl/dist/maplibre-gl.css');

      const bbox = zoneBbox(centerLat, centerLng, radiusKm);

      map = new maplibregl.Map({
        container: containerRef.current!,
        style: {
          version: 8,
          sources: {
            'osm-dark': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              maxzoom: 19,
            },
          },
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#0f0f0f' },
            },
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-dark',
              paint: {
                'raster-opacity': 0.18,
                'raster-saturation': -1,
                'raster-brightness-min': 0,
                'raster-brightness-max': 0.3,
              },
            },
          ],
        },
        center: [centerLng, centerLat],
        zoom: 11,
        attributionControl: false,
        cooperativeGestures: true,
      });

      map.fitBounds(
        [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
        { padding: 40, duration: 0 },
      );

      mapRef.current = map;

      map.on('load', () => {
        const circleGeoJson = buildCirclePolygon(centerLat, centerLng, radiusKm);

        map.addSource('zone-circle', { type: 'geojson', data: circleGeoJson });

        map.addLayer({
          id: 'zone-fill',
          type: 'fill',
          source: 'zone-circle',
          paint: {
            'fill-color': '#7dd3fc',
            'fill-opacity': 0.06,
          },
        });

        map.addLayer({
          id: 'zone-outline',
          type: 'line',
          source: 'zone-circle',
          paint: {
            'line-color': '#7dd3fc',
            'line-width': 1.5,
            'line-dasharray': [4, 3],
            'line-opacity': 0.5,
          },
        });

        // Center pin
        const centerEl = document.createElement('div');
        centerEl.style.cssText = `
          width: 10px; height: 10px; border-radius: 50%;
          background: #7dd3fc; border: 2px solid #0f0f0f;
          box-shadow: 0 0 12px rgba(125, 211, 252, 0.6);
        `;
        new maplibregl.Marker({ element: centerEl })
          .setLngLat([centerLng, centerLat])
          .setPopup(
            new maplibregl.Popup({ offset: 16 }).setHTML(
              `<div style="font-size:11px;color:#fff;background:#161616;padding:6px 10px;border-radius:8px;border:1px solid #2d2d2d;font-family:monospace">
                <span style="color:#7dd3fc">${zoneName ?? 'Delivery Zone'}</span><br/>
                <span style="color:#666666">${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}</span>
              </div>`,
            ),
          )
          .addTo(map);

        // Disruption event markers with glow
        events.forEach((evt) => {
          const isHigh = evt.severity >= 8;
          const isMed = evt.severity >= 5;
          const color = isHigh ? '#a78bfa' : isMed ? '#7dd3fc' : '#666666';
          const glow = isHigh
            ? 'rgba(167, 139, 250, 0.6)'
            : isMed
            ? 'rgba(125, 211, 252, 0.6)'
            : 'rgba(82, 82, 82, 0.4)';

          const el = document.createElement('div');
          el.style.cssText = `
            width: 10px; height: 10px; border-radius: 50%;
            background: ${color}; border: 2px solid #0f0f0f;
            box-shadow: 0 0 10px ${glow};
          `;
          new maplibregl.Marker({ element: el })
            .setLngLat([evt.lng, evt.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 12 }).setHTML(
                `<div style="font-size:11px;color:#fff;background:#161616;padding:6px 10px;border-radius:8px;border:1px solid #2d2d2d">
                  <strong style="color:${color}">${evt.type}</strong><br/>
                  <span style="color:#666666">Severity: ${evt.severity}/10</span>
                </div>`,
              ),
            )
            .addTo(map);
        });
      });
    })();

    return () => {
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[#2d2d2d] bg-[#0f0f0f] ${className}`}>
      {zoneName && (
        <div className="absolute top-3 left-3 z-10 bg-[#161616]/90 backdrop-blur-md border border-[#7dd3fc]/20 rounded-lg px-3 py-1.5 text-xs font-medium text-white flex items-center gap-2 shadow-neon-cyan-sm">
          <span className="h-2 w-2 rounded-full bg-[#7dd3fc] animate-neon-pulse inline-block" />
          {zoneName}
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
