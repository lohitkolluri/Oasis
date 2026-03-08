"use client";

import { useState } from "react";
import { isMobileForGps } from "@/lib/utils/device";
import { MapPin, Loader2, CheckCircle, AlertCircle, Smartphone } from "lucide-react";

interface ClaimVerificationPromptProps {
  claimId: string;
  zoneName?: string;
}

export function ClaimVerificationPrompt({ claimId, zoneName = "the affected zone" }: ClaimVerificationPromptProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [verifiedOutside, setVerifiedOutside] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onVerifySuccess = (data: { status?: string }) => {
    if (data.status === "outside_geofence") {
      setVerifiedOutside(true);
    } else {
      setDone(true);
    }
  };

  const handleVerify = async () => {
    if (typeof navigator !== "undefined" && !isMobileForGps(navigator.userAgent)) {
      setError("Use a mobile device for precise location verification.");
      return;
    }
    setLoading(true);
    setError(null);
    setVerifiedOutside(false);
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
      onVerifySuccess(data);
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
    if (typeof navigator !== "undefined" && !isMobileForGps(navigator.userAgent)) {
      setError("Use a mobile device for precise location verification.");
      e.target.value = "";
      return;
    }
    setLoading(true);
    setError(null);
    setVerifiedOutside(false);
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
      onVerifySuccess(data);
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
      <div className="flex items-center gap-2 text-uber-green text-sm">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>Location verified</span>
      </div>
    );
  }

  if (verifiedOutside) {
    return (
      <div className="rounded-xl border border-uber-yellow/30 bg-uber-yellow/5 p-3 space-y-2">
        <div className="flex items-start gap-2 text-uber-yellow/90">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Location recorded outside event zone</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Your claim is under review. Re-verify below (e.g. from the affected area) or contact support for payout.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVerifiedOutside(false); }}
            className="inline-flex items-center gap-2 rounded-lg bg-uber-yellow/20 px-3 py-1.5 text-sm font-medium text-uber-yellow/90 hover:bg-amber-500/30"
          >
            <MapPin className="h-4 w-4" />
            Verify again
          </button>
        </div>
      </div>
    );
  }

  const fileInputId = `claim-verify-proof-${claimId}`;
  const isMobile =
    typeof navigator !== "undefined" ? isMobileForGps(navigator.userAgent) : true;

  return (
    <div className="rounded-xl border border-uber-yellow/30 bg-uber-yellow/5 p-3 space-y-2">
      {!isMobile && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 text-amber-200/90 text-xs">
          <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Zone verification uses GPS. Please use a mobile device for precise location.</span>
        </div>
      )}
      <p className="text-sm text-uber-yellow/90">
        Verify you were in {zoneName} during this disruption
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Verification options">
        <button
          type="button"
          disabled={!isMobile || loading}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVerify();
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-uber-yellow/20 px-3 py-1.5 text-sm font-medium text-uber-yellow/90 hover:bg-amber-500/30 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          Verify location
        </button>
        <label
          htmlFor={fileInputId}
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-2 rounded-lg border border-uber-yellow/40 px-3 py-1.5 text-sm font-medium text-uber-yellow/90 hover:bg-uber-yellow/10 ${isMobile ? "cursor-pointer" : "cursor-not-allowed opacity-50 pointer-events-none"}`}
        >
          <input
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              e.stopPropagation();
              handleVerifyWithProof(e);
            }}
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
