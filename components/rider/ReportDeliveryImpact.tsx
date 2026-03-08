"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X, Loader2, Camera, Upload, ImageIcon } from "lucide-react";
import { gooeyToast } from "goey-toast";

export interface ReportDeliveryImpactProps {
  /** When provided, component is controlled and does not render its own trigger. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When false, only the modal is rendered (for use with FAB). Default true. */
  renderTrigger?: boolean;
}

export function ReportDeliveryImpact({
  open: controlledOpen,
  onOpenChange,
  renderTrigger = true,
}: ReportDeliveryImpactProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange != null;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      gooeyToast.error("Please add a photo (take or upload)");
      return;
    }
    setLoading(true);
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.set("type", "cant_deliver");
      if (message.trim()) formData.set("message", message.trim());
      formData.append("photo", photo);

      // Best-effort: capture device GPS to attach precise incident location.
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
          if (Number.isFinite(accuracy)) {
            formData.set("gps_accuracy", String(accuracy));
          }
        }
      } catch {
        // If user denies or GPS fails, still submit the report without coords.
      }

      const res = await fetch("/api/rider/report-delivery", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setSuccess(true);
        setMessage("");
        setPhoto(null);
        gooeyToast.success("Report submitted with your location (when available).");
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        gooeyToast.error(err.error ?? "Failed to submit report");
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
          className="inline-flex items-center gap-2 rounded-xl border border-uber-yellow/40 bg-uber-yellow/10 px-4 py-2 text-sm font-medium text-uber-yellow/90 hover:bg-uber-yellow/20 transition-colors"
        >
          <Flag className="h-4 w-4" />
          Report impact
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
              <h3 className="text-lg font-semibold text-zinc-100">I couldn&apos;t deliver in my zone</h3>
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
                <div>
                  <label htmlFor="msg" className="block text-sm text-zinc-500 mb-1">Optional message</label>
                  <textarea
                    id="msg"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What happened?"
                    rows={3}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-uber-yellow/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1.5">
                    Photo <span className="text-red-400">(required)</span>
                  </label>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPhoto(file);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPhoto(file);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700/50 hover:border-uber-yellow/40 transition-colors"
                    >
                      <Camera className="h-4 w-4 text-uber-yellow" />
                      Take photo
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700/50 hover:border-uber-yellow/40 transition-colors"
                    >
                      <Upload className="h-4 w-4 text-uber-yellow" />
                      Upload photo
                    </button>
                  </div>
                  {photo && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2">
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
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-uber-yellow/20 px-4 py-2.5 text-sm font-medium text-uber-yellow/90 hover:bg-uber-yellow/30 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
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
