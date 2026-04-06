"use client";

import { useEffect, useState } from "react";
import { isMobileForGps } from "@/lib/utils/device";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, CheckCircle, AlertCircle, Smartphone } from "lucide-react";

interface ClaimVerificationPromptProps {
  claimId: string;
  zoneName?: string;
}

type MotionCaptureResult = {
  imu_variance: number | null;
  samples: number;
  permission: "granted" | "denied" | "unavailable" | "unknown";
};

export function ClaimVerificationPrompt({ claimId, zoneName = "the affected zone" }: ClaimVerificationPromptProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [verifiedOutside, setVerifiedOutside] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoAttempted, setAutoAttempted] = useState(false);

  const onVerifySuccess = (data: { status?: string; payout_initiated?: boolean }) => {
    if (data.status === "outside_geofence") {
      setVerifiedOutside(true);
      router.refresh();
      return;
    }

    if (data.status === "already_paid" || data.payout_initiated) {
      router.refresh();
    }

    if (data.status === "inside_geofence" || data.status === "already_paid") {
      setDone(true);
    }
  };

  const captureImuVariance = async (durationMs: number): Promise<MotionCaptureResult> => {
    if (typeof window === "undefined") {
      return { imu_variance: null, samples: 0, permission: "unavailable" };
    }

    const motionEvent = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    let permission: MotionCaptureResult["permission"] = "unknown";
    if (typeof motionEvent?.requestPermission === "function") {
      try {
        const r = await motionEvent.requestPermission();
        permission = r;
      } catch {
        permission = "denied";
      }
    } else {
      permission = "unavailable";
    }

    // Even without explicit permission API, many Android browsers allow DeviceMotionEvent.
    const samples: number[] = [];
    const handler = (evt: DeviceMotionEvent) => {
      const a = evt.accelerationIncludingGravity;
      const ax = a?.x ?? null;
      const ay = a?.y ?? null;
      const az = a?.z ?? null;
      if (ax == null || ay == null || az == null) return;
      // Use magnitude; good enough for spoofing heuristics.
      const mag = Math.sqrt(ax * ax + ay * ay + az * az);
      if (Number.isFinite(mag)) samples.push(mag);
    };

    window.addEventListener("devicemotion", handler, { passive: true });
    await new Promise((r) => setTimeout(r, durationMs));
    window.removeEventListener("devicemotion", handler);

    if (samples.length < 5) {
      return { imu_variance: null, samples: samples.length, permission };
    }

    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    const variance =
      samples.reduce((s, v) => s + (v - mean) * (v - mean), 0) /
      Math.max(1, samples.length - 1);

    return {
      imu_variance: Number.isFinite(variance) ? Number(variance.toFixed(4)) : null,
      samples: samples.length,
      permission,
    };
  };

  const submitVerification = async (proof?: File) => {
    const [pos, motion] = await Promise.all([
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      }),
      captureImuVariance(2000),
    ]);
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const speedKmh =
      pos.coords.speed != null && Number.isFinite(pos.coords.speed)
        ? Number((pos.coords.speed * 3.6).toFixed(2))
        : null;

    const formData = new FormData();
    formData.set("claim_id", claimId);
    formData.set("lat", String(lat));
    formData.set("lng", String(lng));
    formData.set("declaration", "true");
    if (speedKmh != null) formData.set("speed_kmh", String(speedKmh));
    if (motion.imu_variance != null) {
      formData.set("imu_variance", String(motion.imu_variance));
    }
    // Not available in web PWAs (kept for schema compatibility).
    // formData.set("gnss_snr_variance", ...)
    // formData.set("play_integrity_pass", ...)
    // formData.set("os_signature_valid", ...)
    // formData.set("rooted_device", ...)
    formData.set(
      "device_attestation",
      JSON.stringify({
        client: "pwa",
        motion_permission: motion.permission,
        motion_samples: motion.samples,
        ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
      }),
    );
    if (proof) formData.append("proof", proof);

    const res = await fetch("/api/claims/verify-location", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Verification failed");
    }
    onVerifySuccess(data);
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
      await submitVerification();
    } catch (err) {
      const msg =
        (err as { code?: number; message?: string })?.code === 1
          ? "Location access denied"
          : (err as { message?: string })?.message ?? "Verification failed";
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
      await submitVerification(file);
    } catch (err) {
      const msg =
        (err as { code?: number; message?: string })?.code === 1
          ? "Location access denied"
          : (err as { message?: string })?.message ?? "Verification failed";
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

  useEffect(() => {
    if (!isMobile || loading || done || verifiedOutside || autoAttempted) return;

    // Try once automatically when the rider opens the dashboard with a pending claim.
    const storageKey = `oasis-auto-verify:${claimId}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(storageKey) === "1") {
      setAutoAttempted(true);
      return;
    }

    setAutoAttempted(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }

    handleVerify();
  }, [autoAttempted, claimId, done, isMobile, loading, verifiedOutside]);

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
