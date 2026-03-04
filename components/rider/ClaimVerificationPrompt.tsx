"use client";

import { useState } from "react";
import { MapPin, Loader2, CheckCircle } from "lucide-react";

interface ClaimVerificationPromptProps {
  claimId: string;
  zoneName?: string;
}

export function ClaimVerificationPrompt({ claimId, zoneName = "the affected zone" }: ClaimVerificationPromptProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const formData = new FormData();
      formData.set("claim_id", claimId);
      formData.set("lat", String(lat));
      formData.set("lng", String(lng));
      formData.set("declaration", "true");

      const res = await fetch("/api/claims/verify-location", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        return;
      }
      setDone(true);
    } catch (err) {
      const msg = (err as { code?: number })?.code === 1 ? "Location access denied" : "Verification failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWithProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const formData = new FormData();
      formData.set("claim_id", claimId);
      formData.set("lat", String(lat));
      formData.set("lng", String(lng));
      formData.set("declaration", "true");
      formData.append("proof", file);

      const res = await fetch("/api/claims/verify-location", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        return;
      }
      setDone(true);
    } catch (err) {
      const msg = (err as { code?: number })?.code === 1 ? "Location access denied" : "Verification failed";
      setError(msg);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-sm">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>Location verified</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
      <p className="text-sm text-amber-200/90">
        Verify you were in {zoneName} during this disruption
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          Verify location
        </button>
        <label className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-3 py-1.5 text-sm font-medium text-amber-200 cursor-pointer hover:bg-amber-500/10 disabled:opacity-50">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleVerifyWithProof}
            disabled={loading}
            className="hidden"
          />
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload proof"}
        </label>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-zinc-500">
        I confirm I was actively delivering in {zoneName} during this disruption. (Captured with verification)
      </p>
    </div>
  );
}
