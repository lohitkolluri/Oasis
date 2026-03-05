"use client";

import { useState } from "react";
import { Flag, X, Loader2 } from "lucide-react";
import { gooeyToast } from "goey-toast";

export function ReportDeliveryImpact() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.set("type", "cant_deliver");
      if (message.trim()) formData.set("message", message.trim());
      if (photo) formData.append("photo", photo);

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20 transition-colors"
      >
        <Flag className="h-4 w-4" />
        Report impact
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !loading && setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
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
              <p className="text-emerald-400 text-sm">Report submitted. Thank you.</p>
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
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Optional photo</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-amber-500/20 file:px-3 file:py-1.5 file:text-amber-200"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
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
          </div>
        </div>
      )}
    </>
  );
}
