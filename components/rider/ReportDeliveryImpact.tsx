'use client';

import { isMobileForGps } from '@/lib/utils/device';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Flag, ImageIcon, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';

export interface ReportDeliveryImpactProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderTrigger?: boolean;
  triggerClassName?: string;
  /** `neutral` = quieter outline for dense layouts (e.g. home dashboard). */
  triggerTone?: 'accent' | 'neutral';
}

export function ReportDeliveryImpact({
  open: controlledOpen,
  onOpenChange,
  renderTrigger = true,
  triggerClassName,
  triggerTone = 'accent',
}: ReportDeliveryImpactProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isControlled = controlledOpen !== undefined && onOpenChange != null;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<
    'bad_weather' | 'traffic' | 'curfew' | 'unsafe_crowd' | 'other'
  >('bad_weather');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCamera) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }
    setCameraError(null);
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((err) => {
        setCameraError(err instanceof Error ? err.message : 'Camera access denied');
      });
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [showCamera]);

  function captureFromLive() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    // Keep uploads fast on mobile networks: downscale large photos client-side.
    const MAX_DIM = 1280;
    const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
    canvas.width = Math.max(1, Math.round(srcW * scale));
    canvas.height = Math.max(1, Math.round(srcH * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], 'report-live.jpg', { type: 'image/jpeg' });
        setPhoto(file);
        setShowCamera(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      },
      'image/jpeg',
      0.72,
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Add a short description of the disruption');
      return;
    }
    if (!photo) {
      toast.error('Please take a live photo (camera only)');
      return;
    }
    if (!isMobileForGps(navigator.userAgent)) {
      toast.error('Use a mobile device for precise location when reporting delivery issues.');
      return;
    }
    setLoading(true);
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.set('type', 'cant_deliver');
      formData.set('category', category);
      if (message.trim()) formData.set('message', message.trim());
      formData.append('photo', photo);

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        const { latitude, longitude, accuracy } = pos.coords;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          formData.set('gps_lat', String(latitude));
          formData.set('gps_lng', String(longitude));
          if (Number.isFinite(accuracy)) formData.set('gps_accuracy', String(accuracy));
        }
      } catch {
        // optional
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 45_000);
      const res = await fetch('/api/rider/report-delivery', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timeout));
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (!data.verified) {
          toast.error(data.reason ?? 'Report could not be verified by AI');
          return;
        }

        setSuccess(true);
        setMessage('');
        setPhoto(null);
        toast.success(
          (data.payout_initiated ?? data.payout_created)
            ? 'Report verified. Payout flow started. Complete location verification in Recent Payouts.'
            : 'Report verified, but payout could not be initiated for this policy week.',
        );
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
      } else {
        if (res.status === 401) toast.error('Please sign in again to submit a report');
        else if (res.status === 403)
          toast.error(data.error ?? 'This report must be submitted from a mobile device');
        else if (res.status === 429) toast.error(data.error ?? 'Too many attempts. Try later');
        else toast.error(data.error ?? 'Failed to submit report');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error('Taking too long. Check your network and try again');
      } else {
        toast.error('Failed to submit report');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {renderTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex w-full items-center justify-center gap-2 transition-all active:scale-[0.99] ${
            triggerTone === 'neutral'
              ? 'rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-200 min-h-[44px]'
              : 'rounded-2xl border-2 border-uber-yellow/50 bg-uber-yellow/15 px-4 py-3.5 text-sm font-semibold text-uber-yellow active:bg-uber-yellow/25 hover:bg-uber-yellow/25 min-h-[48px]'
          } ${triggerClassName ?? ''}`}
        >
          <Flag
            className={`h-4 w-4 shrink-0 ${triggerTone === 'neutral' ? 'text-zinc-500' : ''}`}
          />
          Report delivery issue
        </button>
      )}

      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70"
                onClick={() => !loading && setOpen(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'tween', duration: 0.28 }}
                  ref={scrollRef}
                  className="w-full max-w-md mx-auto min-w-0 rounded-t-3xl sm:rounded-2xl border-t sm:border border-zinc-700 bg-zinc-900 shadow-xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Drag indicator for mobile */}
                  <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
                    <div className="w-10 h-1 rounded-full bg-zinc-600" />
                  </div>

                  <div className="flex items-center justify-between px-5 pt-3 pb-3 sm:pt-5 shrink-0">
                    <h3 className="text-lg font-semibold text-zinc-100">Report delivery issue</h3>
                    <button
                      type="button"
                      onClick={() => !loading && setOpen(false)}
                      className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 active:bg-zinc-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 scroll-touch">
                    {success ? (
                      <div className="flex flex-col items-center gap-3 py-8">
                        <div className="w-12 h-12 rounded-full bg-uber-green/20 flex items-center justify-center">
                          <Flag className="h-5 w-5 text-uber-green" />
                        </div>
                        <p className="text-uber-green text-sm font-medium text-center">
                          Report approved. Your payout flow has been initiated.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={onSubmit} className="space-y-4">
                        <div className="rounded-2xl border border-uber-yellow/20 bg-uber-yellow/10 px-3.5 py-3">
                          <p className="text-xs font-medium text-zinc-200">
                            Use this only if Oasis missed a real delivery disruption.
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                            Add a clear description and a live photo as proof. The evidence is
                            verified strictly by AI, and payout is initiated only when the report is
                            judged to be genuine.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm text-zinc-500 mb-1">
                            Category <span className="text-red-400">(required)</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'bad_weather', label: 'Bad Weather (rain/heat)' },
                              { id: 'traffic', label: 'Road Blocked / Traffic' },
                              { id: 'curfew', label: 'Curfew / Strike' },
                              { id: 'unsafe_crowd', label: 'Unsafe Crowd' },
                              { id: 'other', label: 'Other external issue' },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setCategory(opt.id as typeof category)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border min-h-[32px] ${
                                  category === opt.id
                                    ? 'border-uber-yellow bg-uber-yellow/20 text-uber-yellow'
                                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label htmlFor="msg" className="block text-sm text-zinc-500 mb-1">
                            What happened? <span className="text-red-400">(required)</span>
                          </label>
                          <textarea
                            id="msg"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Describe the issue, where it happened, and how it stopped deliveries."
                            rows={3}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-[16px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-uber-yellow/50 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-zinc-500 mb-1.5">
                            Live photo <span className="text-red-400">(required, camera only)</span>
                          </label>
                          {!showCamera && !photo && (
                            <button
                              type="button"
                              onClick={() => setShowCamera(true)}
                              className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-uber-yellow/40 hover:bg-zinc-700/50 active:bg-zinc-700 transition-colors min-h-[48px]"
                            >
                              <Camera className="h-4 w-4 text-uber-yellow" />
                              Take live photo
                            </button>
                          )}
                          {showCamera && (
                            <div className="rounded-xl overflow-hidden border border-zinc-700">
                              <video
                                ref={videoRef}
                                className="w-full aspect-[4/3] bg-black object-cover"
                                playsInline
                                muted
                              />
                              {cameraError && (
                                <p className="text-xs text-red-400 px-3 py-2">{cameraError}</p>
                              )}
                              <div className="flex gap-2 p-2.5 bg-zinc-800/50">
                                <button
                                  type="button"
                                  onClick={captureFromLive}
                                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-uber-green text-white text-sm font-semibold shadow-md shadow-uber-green/20 active:scale-[0.98] transition-transform min-h-[44px]"
                                >
                                  <Camera className="h-4 w-4" />
                                  Capture
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowCamera(false)}
                                  className="py-2.5 px-4 rounded-xl text-zinc-400 hover:bg-zinc-700 active:bg-zinc-600 text-sm min-h-[44px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          {photo && !showCamera && (
                            <div className="flex items-center gap-2.5 rounded-xl border border-uber-green/30 bg-uber-green/5 px-3 py-2.5 mt-2">
                              <ImageIcon className="h-5 w-5 shrink-0 text-uber-green" />
                              <span className="min-w-0 truncate text-sm text-zinc-300">
                                {photo.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPhoto(null)}
                                className="ml-auto shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 active:bg-zinc-600 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                aria-label="Remove photo"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2.5 pt-2 pb-1">
                          <button
                            type="submit"
                            disabled={loading || !photo || !message.trim()}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-uber-yellow/20 px-4 py-3 text-sm font-semibold text-uber-yellow hover:bg-uber-yellow/30 active:bg-uber-yellow/35 disabled:opacity-40 transition-colors min-h-[48px]"
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Flag className="h-4 w-4" />
                            )}
                            Submit
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            className="rounded-xl border border-zinc-600 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-50 min-h-[48px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
