'use client';

import { User, X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface RiderGovernmentIdAvatarProps {
  /** Signed or public URL for the government ID image. When null, fallback to default avatar. */
  imageUrl: string | null;
  riderName: string;
  className?: string;
}

export function RiderGovernmentIdAvatar({
  imageUrl,
  riderName,
  className = '',
}: RiderGovernmentIdAvatarProps) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const showImage = imageUrl && !imgError;

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => showImage && setOpen(true)}
        className={`flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 text-zinc-400 shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] ${showImage ? 'cursor-zoom-in' : ''} ${className}`}
        aria-label={showImage ? 'View government ID' : 'No government ID'}
        title={showImage ? 'Click to expand' : undefined}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`Government ID for ${riderName}`}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <User className="h-8 w-8" />
        )}
      </button>

      {/* Expand modal */}
      {open && showImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
          onClick={handleClose}
          onKeyDown={(e) => e.key === 'Escape' && handleClose()}
          role="dialog"
          aria-modal="true"
          aria-label="Government ID document"
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
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
              src={imageUrl}
              alt={`Government ID document for ${riderName}`}
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
