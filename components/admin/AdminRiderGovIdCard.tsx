'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Lock, X, Eye } from 'lucide-react';
import { useCallback, useState } from 'react';

interface AdminRiderGovIdCardProps {
  riderId: string;
  riderName: string;
  hasGovId: boolean;
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
      <div className="h-full flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="border-b border-zinc-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-white">KYC Verification</h2>
          </div>
          {governmentIdVerified ? (
            <Badge
              variant="secondary"
              className="rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold"
            >
              Verified
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-400 text-[10px] font-semibold"
            >
              Not Verified
            </Badge>
          )}
        </div>

        <div className="p-5 space-y-3">
          <p className="text-[13px] text-zinc-400">
            {hasGovId
              ? 'Government ID document is on file.'
              : 'No government ID has been uploaded yet.'}
          </p>

          {hasGovId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openZoom}
              disabled={loading}
              className="w-full gap-2 border-zinc-700 text-zinc-300 hover:bg-white/[0.04] hover:text-white hover:border-zinc-600 transition-colors duration-150"
            >
              <Eye className="h-3.5 w-3.5" />
              {loading ? 'Loading…' : 'View ID Document'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-zinc-600 text-xs py-1">
              <Lock className="h-3.5 w-3.5" />
              <span>No ID on file</span>
            </div>
          )}

          {fetchError && (
            <p className="text-xs text-red-400 mt-1">{fetchError}</p>
          )}
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
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
