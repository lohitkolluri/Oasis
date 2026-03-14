'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/Card';
import { Lock, ShieldCheck, X, ZoomIn } from 'lucide-react';
import { useCallback, useState } from 'react';

interface AdminRiderGovIdCardProps {
  riderId: string;
  riderName: string;
  /** True if rider has uploaded a gov ID (even if we don't have a URL yet). */
  hasGovId: boolean;
  /** When provided, the ID image is shown as thumbnail; click zooms. Omit to load on demand. */
  imageUrl?: string | null;
  governmentIdVerified?: boolean | null;
}

export function AdminRiderGovIdCard({
  riderId,
  riderName,
  hasGovId,
  imageUrl: initialImageUrl = null,
  governmentIdVerified,
}: AdminRiderGovIdCardProps) {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const openZoom = useCallback(async () => {
    if (initialImageUrl) {
      setZoomUrl(initialImageUrl);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/rider/${riderId}/government-id`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setZoomUrl(data.url);
      } else {
        setFetchError(data.error ?? 'Could not load');
      }
    } catch {
      setFetchError('Request failed');
    } finally {
      setLoading(false);
    }
  }, [riderId, initialImageUrl]);

  const closeZoom = useCallback(() => {
    setZoomUrl(null);
    setFetchError(null);
  }, []);

  return (
    <>
      <Card variant="default" padding="lg" className="border-[#2d2d2d] h-full flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#7dd3fc] shrink-0" />
            <h2 className="text-sm font-semibold text-white">Government ID (KYC)</h2>
          </div>
          {governmentIdVerified && (
            <Badge
              variant="secondary"
              className="rounded-full border-[#22c55e]/25 bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-semibold"
            >
              Verified
            </Badge>
          )}
        </div>

        {!hasGovId ? (
          <div
            className="w-full h-[200px] flex flex-col items-center justify-center rounded-xl border border-[#2d2d2d] bg-[#1a1a1a] text-center shrink-0"
            aria-hidden
          >
            <Lock className="h-10 w-10 text-[#3a3a3a] mb-2" />
            <p className="text-sm text-[#555]">No ID on file</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={openZoom}
            disabled={loading}
            className="group relative w-full h-[200px] rounded-xl border border-[#2d2d2d] bg-[#1a1a1a] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd3fc]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616] hover:border-[#3a3a3a] transition-colors shrink-0"
            aria-label="View government ID (click to zoom)"
          >
            {initialImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={initialImageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain object-center"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-10 w-10 text-white" />
                </span>
              </>
            ) : loading ? (
              <span className="text-sm text-[#555]">Loading…</span>
            ) : fetchError ? (
              <span className="text-sm text-[#ef4444] px-2">{fetchError}</span>
            ) : (
              <span className="text-sm text-[#555]">Click to view</span>
            )}
          </button>
        )}
      </Card>

      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95"
          onClick={closeZoom}
          onKeyDown={(e) => e.key === 'Escape' && closeZoom()}
          role="dialog"
          aria-modal="true"
          aria-label="Government ID — zoomed"
        >
          <button
            type="button"
            onClick={closeZoom}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative max-w-full max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomUrl}
              alt={`Government ID for ${riderName}`}
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
