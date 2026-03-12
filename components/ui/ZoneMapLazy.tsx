'use client';

import dynamic from 'next/dynamic';
import type { ZoneMapEvent } from './ZoneMap';

const ZoneMap = dynamic(() => import('./ZoneMap').then((m) => m.ZoneMap), {
  ssr: false,
  loading: () => <div className="h-72 rounded-xl bg-[#161616] animate-pulse" />,
});

interface ZoneMapLazyProps {
  centerLat: number;
  centerLng: number;
  radiusKm?: number;
  zoneName?: string;
  className?: string;
  events?: ZoneMapEvent[];
}

export function ZoneMapLazy(props: ZoneMapLazyProps) {
  return <ZoneMap {...props} />;
}
