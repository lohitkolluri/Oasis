"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X, Loader2, Camera, ImageIcon } from "lucide-react";
import { gooeyToast } from "goey-toast";
import { isMobileForGps } from "@/lib/utils/device";

export interface ReportDeliveryImpactProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderTrigger?: boolean;
  /** Optional class for the trigger button when renderTrigger is true */
  triggerClassName?: string;
}

export function ReportDeliveryImpact({
  open: controlledOpen,
  onOpenChange,
  renderTrigger = true,
  triggerClassName,
}: ReportDeliveryImpactProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange != null;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Live camera only: start stream when showCamera is true
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
      ?.getUserMedia({ video: { facingMode: "environment" } })
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
        setCameraError(err instanceof Error ? err.message : "Camera access denied");
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
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "report-live.jpg", { type: "image/jpeg" });
        setPhoto(file);
        setShowCamera(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      },
      "image/jpeg",
      0.9,
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      gooeyToast.error("Please take a live photo (camera only)");
      return;
    }
    if (!isMobileForGps(navigator.userAgent)) {
      gooeyToast.error("Use a mobile device for precise location when reporting delivery issues.");
      return;
    }
    setLoading(true);
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.set("type", "cant_deliver");
      if (message.trim()) formData.set("message", message.trim());
      formData.append("photo", photo);

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        const { latitude, longitude, accuracy } = pos.coords;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          formData.set("gps_lat", String(latitude));
          formData.set("gps_lng", String(longitude));
          if (Number.isFinite(accuracy)) formData.set("gps_accuracy", String(accuracy));
        }
      } catch {
        // optional
      }

      const res = await fetch("/api/rider/report-delivery", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess(true);
        setMessage("");
        setPhoto(null);
        gooeyToast.success(
          data.payout_created
            ? "Report verified. Payout credited to your wallet."
            : "Report verified. Verify your location in the app (Recent Payouts) to receive your payout.",
        );
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
      } else {
        gooeyToast.error(data.error ?? "Failed to submit report");
      }
    } catch {
      gooeyToast.error("Failed to submit report");
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
          className={`inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-uber-yellow/50 bg-uber-yellow/15 px-4 py-3 text-sm font-semibold text-uber-yellow active:scale-[0.98] hover:bg-uber-yellow/25 transition-colors ${triggerClassName ?? ""}`}
        >
          <Flag className="h-4 w-4 shrink-0" />
          Report delivery issue
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70"
            onClick={() => !loading && setOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border-t sm:border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-100">Report delivery issue</h3>
                <button
                  type="button"
                  onClick={() => !loading && setOpen(false)}
                  className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {success ? (
                <p className="text-uber-green text-sm">Report submitted. Thank you.</p>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <p className="text-xs text-zinc-500">
                    For when disruption wasn’t detected. Add details and a live photo; we’ll verify
                    and process your payout if approved.
                  </p>
                  <div>
                    <label htmlFor="msg" className="block text-sm text-zinc-500 mb-1">
                      What happened?
                    </label>
                    <textarea
                      id="msg"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. Road blocked, weather, curfew..."
                      rows={2}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-uber-yellow/50"
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
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:border-uber-yellow/40 hover:bg-zinc-700/50 transition-colors"
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
                        <div className="flex gap-2 p-2 bg-zinc-800/50">
                          <button
                            type="button"
                            onClick={captureFromLive}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-uber-yellow/20 text-uber-yellow/90 text-sm font-medium"
                          >
                            <Camera className="h-4 w-4" />
                            Capture
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCamera(false)}
                            className="py-2 px-3 rounded-lg text-zinc-400 hover:bg-zinc-700 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {photo && !showCamera && (
                      <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 mt-2">
                        <ImageIcon className="h-5 w-5 shrink-0 text-uber-yellow" />
                        <span className="min-w-0 truncate text-sm text-zinc-300">{photo.name}</span>
                        <button
                          type="button"
                          onClick={() => setPhoto(null)}
                          className="ml-auto shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                          aria-label="Remove photo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading || !photo}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-uber-yellow/20 px-4 py-2.5 text-sm font-medium text-uber-yellow/90 hover:bg-uber-yellow/30 disabled:opacity-50"
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
                      className="rounded-xl border border-zinc-600 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
