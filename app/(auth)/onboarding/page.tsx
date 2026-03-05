'use client';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { createClient } from '@/lib/supabase/client';
import type { PlatformType } from '@/lib/types/database';
import { gooeyToast } from 'goey-toast';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileCheck,
  MapPin,
  Search,
  Upload,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

export default function OnboardingPage() {
  const [platform, setPlatform] = useState<PlatformType | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('');
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [govIdType] = useState<'aadhaar'>('aadhaar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoneLat, setZoneLat] = useState<number | null>(null);
  const [zoneLng, setZoneLng] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureReady, setCaptureReady] = useState(false);
  const autoCaptureTriggeredRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [govIdVerified, setGovIdVerified] = useState(false);
  const [govIdVerifying, setGovIdVerifying] = useState(false);
  const [govIdVerificationPath, setGovIdVerificationPath] = useState<string | null>(null);
  const [govIdVerificationReason, setGovIdVerificationReason] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const govIdInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const faceVideoRef = useRef<HTMLVideoElement | null>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [gesture, setGesture] = useState<string | null>(null);
  const [showFaceCamera, setShowFaceCamera] = useState(false);
  const [faceCameraError, setFaceCameraError] = useState<string | null>(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceVerifying, setFaceVerifying] = useState(false);
  const [faceVerificationPath, setFaceVerificationPath] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Prefill name from auth metadata if available
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) {
        setFullName((prev) => prev || user.user_metadata.full_name);
      }
    });
  }, [supabase]);

  async function prefillZoneFromCurrentLocation() {
    if (zoneLat != null || zoneLng != null || zone.trim().length > 0) return;
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setZoneLat(latitude);
        setZoneLng(longitude);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
          );
          if (!res.ok) return;
          const data: any = await res.json();
          const display =
            (data?.address?.suburb ||
              data?.address?.neighbourhood ||
              data?.address?.quarter ||
              data?.address?.city_district) &&
            (data?.address?.city || data?.address?.town || data?.address?.village)
              ? `${
                  data.address.suburb ||
                  data.address.neighbourhood ||
                  data.address.quarter ||
                  data.address.city_district
                }, ${data.address.city || data.address.town || data.address.village}`
              : data?.display_name
                ? String(data.display_name).split(',').slice(0, 2).join(',').trim()
                : null;

          if (display) {
            setZone((prev) => (prev.trim().length > 0 ? prev : display));
          }
        } catch {
          // Ignore geocoding failures; user can search manually
        }
      },
      () => {
        // User denied or GPS unavailable – silently ignore
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  // Initialize map when coordinates are set
  useEffect(() => {
    if (!mapRef.current || !zoneLat || !zoneLng) return;
    if (mapLoaded && mapInstance.current) {
      // Update existing map
      const map = mapInstance.current as {
        setCenter: (c: { lng: number; lat: number }) => void;
        setZoom: (z: number) => void;
      };
      map.setCenter({ lng: zoneLng, lat: zoneLat });
      map.setZoom(13);
      return;
    }

    let cancelled = false;

    import('maplibre-gl').then((maplibre) => {
      if (cancelled || !mapRef.current) return;
      const map = new maplibre.Map({
        container: mapRef.current,
        style: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`,
        center: [zoneLng, zoneLat],
        zoom: 13,
        attributionControl: false,
      });

      const marker = new maplibre.Marker({ color: '#10b981' })
        .setLngLat([zoneLng, zoneLat])
        .addTo(map);

      // Allow clicking on map to adjust position
      map.on('click', (e: { lngLat: { lat: number; lng: number } }) => {
        marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        setZoneLat(e.lngLat.lat);
        setZoneLng(e.lngLat.lng);
      });

      mapInstance.current = map;
      markerRef.current = marker;
      setMapLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [zoneLat, zoneLng, mapLoaded]);

  // Resize map when container size changes (e.g. Aadhaar section expands)
  useEffect(() => {
    const container = mapRef.current;
    const map = mapInstance.current as { resize: () => void } | null;
    if (!container || !map) return;
    const ro = new ResizeObserver(() => {
      try {
        map.resize();
      } catch {
        // ignore
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [mapLoaded]);

  // Cleanup on unmount only — must NOT depend on previewUrl or the map gets destroyed when Aadhaar upload changes previewUrl
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        const map = mapInstance.current as { remove?: () => void } | null;
        if (map && typeof map.remove === 'function') {
          try {
            map.remove();
          } catch {
            // Safely ignore map cleanup errors
          }
        }
        mapInstance.current = null;
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
      if (faceStreamRef.current) {
        faceStreamRef.current.getTracks().forEach((t) => t.stop());
        faceStreamRef.current = null;
      }
      // previewUrl is revoked in the govIdFile effect's cleanup when it changes
    };
  }, []);

  useEffect(() => {
    if (step !== 2 || gesture) return;
    console.log('[face-verify] Fetching random gesture...');
    fetch('/api/onboarding/verify-face')
      .then((r) => r.json())
      .then((d) => {
        if (d.gesture) {
          console.log('[face-verify] Gesture:', d.gesture);
          setGesture(d.gesture);
        }
      })
      .catch(() => {
        console.warn('[face-verify] Gesture fetch failed, using fallback');
        setGesture('smile with teeth visible');
      });
  }, [step, gesture]);

  // Face camera lifecycle (front-facing for selfie)
  useEffect(() => {
    if (!showFaceCamera) {
      if (faceStreamRef.current) {
        faceStreamRef.current.getTracks().forEach((t) => t.stop());
        faceStreamRef.current = null;
      }
      return;
    }
    let cancelled = false;
    async function enableFaceCamera() {
      try {
        setFaceCameraError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
          setFaceCameraError('Camera not supported.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        faceStreamRef.current = stream;
        if (faceVideoRef.current) {
          faceVideoRef.current.srcObject = stream;
          await faceVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setFaceCameraError(err instanceof Error ? err.message : 'Could not access camera.');
      }
    }
    void enableFaceCamera();
    return () => {
      cancelled = true;
      if (faceStreamRef.current) {
        faceStreamRef.current.getTracks().forEach((t) => t.stop());
        faceStreamRef.current = null;
      }
    };
  }, [showFaceCamera]);

  function stopFaceCamera() {
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((t) => t.stop());
      faceStreamRef.current = null;
    }
    setShowFaceCamera(false);
  }

  async function captureFacePhoto() {
    if (!faceVideoRef.current || !gesture) return;
    const video = faceVideoRef.current;
    console.log('[face-verify] Capturing frame...');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise<void>((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            resolve();
            return;
          }
          const file = new File([blob], 'face-verification.jpg', { type: 'image/jpeg' });
          stopFaceCamera();
          setFaceVerifying(true);
          setFaceError(null);
          setFaceVerified(false);
          setFaceVerificationPath(null);
          console.log('[face-verify] Captured', (file.size / 1024).toFixed(1), 'KB');
          console.log('[face-verify] Expected gesture:', gesture);
          try {
            console.log('[face-verify] Sending to verification service...');
            const formData = new FormData();
            formData.set('face_photo', file);
            formData.set('expected_gesture', gesture);
            const res = await fetch('/api/onboarding/verify-face', {
              method: 'POST',
              body: formData,
            });
            console.log('[face-verify] Response:', res.status);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              const errMsg = data.error ?? 'Face verification failed';
              setFaceError(errMsg);
              console.error('[face-verify] Error:', errMsg);
              gooeyToast.error('Face verification failed', {
                description: errMsg,
                action: {
                  label: 'Try again',
                  onClick: () => {
                    try {
                      setFaceError(null);
                      fetch('/api/onboarding/verify-face')
                        .then((r) => r.json())
                        .then((d) => d.gesture && setGesture(d.gesture))
                        .catch(() => setGesture('smile with teeth visible'));
                    } catch (err) {
                      console.error('[face-verify] Try again error:', err);
                    }
                  },
                },
              });
              resolve();
              return;
            }
            if (data.verified) {
              setFaceVerified(true);
              setFaceVerificationPath(data.path ?? null);
              console.log('[face-verify] Verified — live photo confirmed');
              gooeyToast.success('Face verified', { description: 'Live photo confirmed.' });
            } else {
              const reason =
                data.reason ?? 'Could not verify. Please try again with a clear live photo.';
              setFaceError(reason);
              console.warn('[face-verify] Rejected:', reason);
              gooeyToast.error('Verification failed', {
                description: reason,
                action: {
                  label: 'Try again',
                  onClick: () => {
                    try {
                      setFaceError(null);
                      setGesture(null);
                      fetch('/api/onboarding/verify-face')
                        .then((r) => r.json())
                        .then((d) => d.gesture && setGesture(d.gesture))
                        .catch(() => setGesture('smile with teeth visible'));
                    } catch (err) {
                      console.error('[face-verify] Try again error:', err);
                    }
                  },
                },
              });
              setGesture(null);
            }
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : 'Verification failed';
            setFaceError('Verification failed. Please try again.');
            console.error('[face-verify] Exception:', errMsg);
            gooeyToast.error('Verification failed', {
              description: 'Please try again.',
              action: {
                label: 'Try again',
                onClick: () => {
                  try {
                    setFaceError(null);
                    fetch('/api/onboarding/verify-face')
                      .then((r) => r.json())
                      .then((d) => d.gesture && setGesture(d.gesture))
                      .catch(() => setGesture('smile with teeth visible'));
                  } catch (err) {
                    console.error('[face-verify] Try again error:', err);
                  }
                },
              },
            });
          }
          setFaceVerifying(false);
          resolve();
        },
        'image/jpeg',
        0.9,
      );
    });
  }

  // Camera lifecycle: start stream when showCamera is true
  useEffect(() => {
    if (!showCamera) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
      return;
    }

    let cancelled = false;

    async function enableCamera() {
      try {
        setCameraError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Camera not supported on this device/browser.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setCameraError(
          err instanceof Error ? err.message : 'Could not access camera. Please check permissions.',
        );
      }
    }

    void enableCamera();

    return () => {
      cancelled = true;
    };
  }, [showCamera]);

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setShowCamera(false);
    setCaptureReady(false);
    autoCaptureTriggeredRef.current = false;
  }

  /** Analyze frame for sharpness (blur) and brightness; returns true if clear enough to auto-capture */
  function isFrameClearEnough(video: HTMLVideoElement): boolean {
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return false;
    const w = Math.min(160, video.videoWidth);
    const h = Math.min(120, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const len = data.length;
    const gray: number[] = [];
    for (let i = 0; i < len; i += 4) {
      gray.push(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!);
    }
    let mean = 0;
    for (let i = 0; i < gray.length; i++) mean += gray[i]!;
    mean /= gray.length;
    if (mean < 50 || mean > 220) return false; // too dark or overexposed
    let variance = 0;
    for (let i = 0; i < gray.length; i++) {
      const d = gray[i]! - mean;
      variance += d * d;
    }
    variance /= gray.length;
    const std = Math.sqrt(variance);
    if (std < 25) return false; // too flat (blurry or blank)
    let laplacianSum = 0;
    const kernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let v = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * w + (x + dx))!;
            v += gray[idx]! * kernel[(dy + 1) * 3 + (dx + 1)]!;
          }
        }
        laplacianSum += Math.abs(v);
      }
    }
    const lapVar = laplacianSum / ((w - 2) * (h - 2));
    return lapVar > 80 && lapVar < 2000;
  }

  // Auto-capture when frame is clear for a few consecutive checks
  useEffect(() => {
    if (!showCamera || !videoRef.current) return;
    autoCaptureTriggeredRef.current = false;
    setCaptureReady(false);
    let consecutiveGood = 0;
    const NEED_GOOD = 3;
    const CHECK_MS = 400;
    const id = window.setInterval(() => {
      if (autoCaptureTriggeredRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const ok = isFrameClearEnough(video);
      setCaptureReady(ok);
      if (ok) {
        consecutiveGood++;
        if (consecutiveGood >= NEED_GOOD) {
          autoCaptureTriggeredRef.current = true;
          window.clearInterval(id);
          capturePhoto();
        }
      } else {
        consecutiveGood = 0;
      }
    }, CHECK_MS);
    return () => window.clearInterval(id);
  }, [showCamera]);

  async function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], 'government-id-camera.jpg', {
          type: 'image/jpeg',
        });
        setGovIdFile(file);
        void verifyGovernmentId(file);
        stopCamera();
      },
      'image/jpeg',
      0.9,
    );
  }

  // Preview URL for uploaded / captured ID
  useEffect(() => {
    if (!govIdFile) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setShowPreview(false);
      setGovIdVerified(false);
      setGovIdVerificationPath(null);
      setGovIdVerificationReason(null);
      return;
    }
    const url = URL.createObjectURL(govIdFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [govIdFile]);

  async function verifyGovernmentId(file: File) {
    try {
      setGovIdVerifying(true);
      setGovIdVerified(false);
      setGovIdVerificationPath(null);
      setGovIdVerificationReason(null);
      setError(null);

      const formData = new FormData();
      formData.set('full_name', fullName.trim());
      formData.set('id_type', govIdType); // only 'aadhaar'
      formData.set('government_id', file);

      const verifyRes = await fetch('/api/onboarding/verify-government-id', {
        method: 'POST',
        body: formData,
      });

      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        setError(verifyData.error ?? 'Failed to upload government ID');
        setGovIdVerified(false);
        return;
      }

      if (!verifyData.verified) {
        setError(
          verifyData.reason ??
            'Government ID could not be verified. Please upload a clear photo of your Aadhaar, PAN, Voter ID, or Driving License.',
        );
        setGovIdVerified(false);
        return;
      }

      setGovIdVerified(true);
      setGovIdVerificationPath(verifyData.path ?? null);
      setGovIdVerificationReason(verifyData.reason ?? null);
    } finally {
      setGovIdVerifying(false);
    }
  }

  // Debounced search
  const handleZoneChange = useCallback((value: string) => {
    setZone(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setSearchLoading(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value.trim())}&count=5&language=en&countryCode=IN`,
        );
        if (res.ok) {
          const geo = (await res.json()) as { results?: GeoResult[] };
          setSearchResults(geo.results ?? []);
        } else {
          setSearchResults([]);
        }
        setShowResults(true);
      } catch {
        setSearchResults([]);
        setShowResults(true);
      }
      setSearchLoading(false);
    }, 400);
  }, []);

  function selectLocation(result: GeoResult) {
    setZone(result.name + (result.admin1 ? `, ${result.admin1}` : ''));
    setZoneLat(result.latitude);
    setZoneLng(result.longitude);
    setShowResults(false);
    setSearchResults([]);
  }

  const isFormFilled =
    !!platform &&
    fullName.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    zone.trim().length >= 2 &&
    zoneLat != null &&
    zoneLng != null;

  const canGoNext = isFormFilled && !loading;
  const canContinue = step === 2 && govIdVerified && faceVerified && !faceVerifying && !loading;

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!canGoNext) return;
    setStep(2);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canContinue) return;
    setLoading(true);
    setError(null);
    setFaceError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in');
      setLoading(false);
      return;
    }

    if (!govIdVerified || !govIdVerificationPath) {
      setError('Please upload and verify your government ID before continuing.');
      setLoading(false);
      return;
    }

    if (!faceVerified || !faceVerificationPath) {
      setError('Please complete face verification before continuing.');
      setLoading(false);
      return;
    }

    // Save profile with all required data (government ID + face verified)
    const { error: upsertError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        platform,
        primary_zone_geofence: zone ? { zone_name: zone, coordinates: [zoneLng, zoneLat] } : null,
        zone_latitude: zoneLat,
        zone_longitude: zoneLng,
        government_id_url: govIdVerificationPath,
        government_id_verified: true,
        government_id_verification_result: {
          verified: true,
          reason: govIdVerificationReason,
        },
        face_photo_url: faceVerificationPath,
        face_verified: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (upsertError) {
      setError(upsertError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-400 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <Logo size={24} />
          Oasis
        </Link>
        <div className="flex justify-center mb-6">
          <Logo size={80} />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">
          {step === 1 ? 'Complete your profile' : 'Identity verification'}
        </h1>
        <p className="text-zinc-400 mb-8 text-center">
          {step === 1 ? 'Q-commerce delivery partner setup' : 'Government ID and face verification'}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            step === 1 ? handleNext(e) : handleSubmit(e);
          }}
          className="space-y-6"
        >
          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm text-zinc-400 mb-3">
                  Which platform do you deliver for? <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-3">
                  {(['zepto', 'blinkit'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`flex-1 py-3 px-4 rounded-lg border transition-colors ${
                        platform === p
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm text-zinc-400 mb-1">
                  Full name <span className="text-red-400">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="As on your government ID"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm text-zinc-400 mb-1">
                  Phone number <span className="text-red-400">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  pattern="\d{10}"
                  required
                />
              </div>

              {/* Zone picker with search + map */}
              <div>
                <label
                  htmlFor="zone"
                  className="block text-sm text-zinc-400 mb-1 flex items-center justify-between"
                >
                  <span>
                    Pin your delivery zone <span className="text-red-400">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={prefillZoneFromCurrentLocation}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300"
                  >
                    Use current location
                  </button>
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                      style={{ width: 16, height: 16 }}
                    />
                    <input
                      id="zone"
                      type="text"
                      value={zone}
                      onChange={(e) => handleZoneChange(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowResults(true)}
                      className="w-full pl-10 pr-10 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Search Indian area, e.g. Koramangala, Andheri"
                    />
                    {zone && (
                      <button
                        type="button"
                        onClick={() => {
                          setZone('');
                          setZoneLat(null);
                          setZoneLng(null);
                          setSearchResults([]);
                          setShowResults(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        <X style={{ width: 16, height: 16 }} />
                      </button>
                    )}
                  </div>

                  {/* Search results dropdown */}
                  {showResults && (
                    <div className="absolute z-20 w-full mt-1 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl shadow-black/40 max-h-48 overflow-y-auto">
                      {searchLoading && (
                        <div className="px-4 py-3 text-sm text-zinc-400 border-b border-zinc-700/60">
                          Searching locations…
                        </div>
                      )}
                      {!searchLoading && searchResults.length === 0 && (
                        <div className="px-4 py-3 text-sm text-zinc-500">
                          No locations found. Try a nearby area name or check your connection.
                        </div>
                      )}
                      {!searchLoading &&
                        searchResults.map((result, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectLocation(result)}
                            className="w-full text-left px-4 py-3 hover:bg-zinc-800 active:bg-zinc-700 flex items-center gap-3 text-sm transition-colors border-b border-zinc-700/60 last:border-0"
                          >
                            <MapPin
                              className="text-emerald-400 shrink-0"
                              style={{ width: 14, height: 14 }}
                            />
                            <div>
                              <p className="text-zinc-200">{result.name}</p>
                              <p className="text-[11px] text-zinc-500">
                                {[result.admin1, result.country].filter(Boolean).join(', ')}
                              </p>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Map preview */}
                {zoneLat && zoneLng && (
                  <div className="mt-3 rounded-[16px] overflow-hidden border border-[#1e2535]">
                    <div ref={mapRef} className="w-full h-[200px]" />
                    <div className="bg-[#111820] px-3 py-2 flex items-center gap-2">
                      <MapPin className="text-emerald-400" style={{ width: 12, height: 12 }} />
                      <span className="text-[11px] text-zinc-400">
                        Tap on the map to set the center point of your delivery zone
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={!canGoNext} fullWidth size="lg">
                Next
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-400 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to profile
              </button>

              <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`rounded-full p-2 ${govIdVerified ? 'bg-emerald-500/20' : 'bg-zinc-700'}`}
                    >
                      <FileCheck
                        className={govIdVerified ? 'text-emerald-400' : 'text-zinc-500'}
                        size={20}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-200">Government ID (Aadhaar)</p>
                      <p className="text-xs text-zinc-500">
                        {govIdVerifying
                          ? 'Verifying…'
                          : govIdVerified
                            ? 'Verified'
                            : 'Upload or capture your Aadhaar'}
                      </p>
                    </div>
                    {govIdVerified && (
                      <CheckCircle2 className="text-emerald-400 ml-auto" size={20} />
                    )}
                  </div>
                  {!govIdVerified && !govIdVerifying && (
                    <>
                      <p className="text-[11px] text-zinc-500 mb-2">
                        Upload a clear photo or capture using your camera. AI will verify
                        authenticity.
                      </p>
                      <input
                        ref={govIdInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0] ?? null;
                          setGovIdFile(file);
                          if (file) await verifyGovernmentId(file);
                        }}
                        className="hidden"
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (govIdFile && previewUrl) setShowPreview(true);
                            else govIdInputRef.current?.click();
                          }
                        }}
                        onClick={() => {
                          if (govIdFile && previewUrl) setShowPreview(true);
                          else govIdInputRef.current?.click();
                        }}
                        className={`w-full px-4 py-4 rounded-lg border border-dashed transition-colors flex items-center justify-center gap-3 cursor-pointer ${
                          govIdFile
                            ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400'
                            : 'border-zinc-600 bg-zinc-900/50 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-900'
                        }`}
                      >
                        {govIdFile ? (
                          <>
                            <FileCheck style={{ width: 20, height: 20 }} />
                            <span className="flex-1 truncate text-left">{govIdFile.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGovIdFile(null);
                              }}
                              className="shrink-0 rounded p-1 hover:bg-zinc-700/50 -mr-1"
                              aria-label="Remove file"
                            >
                              <X style={{ width: 14, height: 14 }} />
                            </button>
                          </>
                        ) : (
                          <>
                            <Upload style={{ width: 20, height: 20 }} />
                            <span>Choose file (JPEG, PNG, WebP, max 5MB)</span>
                          </>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setShowCamera((v) => !v)}
                          className={`inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:border-emerald-500 hover:bg-zinc-900/80 hover:text-emerald-400 transition-colors ${showCamera ? 'border-emerald-500 text-emerald-400' : ''}`}
                          aria-label={showCamera ? 'Close camera' : 'Open camera'}
                        >
                          <Camera className="h-3.5 w-3.5 mr-1.5" />
                          <span>{showCamera ? 'Close camera' : 'Use camera'}</span>
                        </button>
                        {cameraError && (
                          <p className="text-[11px] text-red-400 text-right">{cameraError}</p>
                        )}
                      </div>
                      {showCamera && (
                        <div
                          className={`mt-3 rounded-lg overflow-hidden transition-colors ${captureReady ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950' : 'border border-zinc-700'}`}
                        >
                          <video
                            ref={videoRef}
                            className="w-full bg-black aspect-[3/2] object-contain"
                            autoPlay
                            playsInline
                            muted
                          />
                          <div className="px-3 py-2 bg-zinc-900 flex items-center justify-between">
                            <span className="text-[11px] text-zinc-400">
                              {captureReady
                                ? 'Hold steady — capturing...'
                                : 'Align your Aadhaar in the frame. Auto-capture when clear.'}
                            </span>
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="text-xs px-3 py-1 rounded-full bg-emerald-500 text-black font-medium hover:bg-emerald-400"
                            >
                              Capture now
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="border-t border-zinc-700/60 pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`rounded-full p-2 ${faceVerified ? 'bg-emerald-500/20' : 'bg-zinc-700'}`}
                    >
                      <User
                        className={faceVerified ? 'text-emerald-400' : 'text-zinc-500'}
                        size={20}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-200">Face verification</p>
                      <p className="text-xs text-zinc-500">
                        {faceVerified
                          ? 'Verified'
                          : faceVerifying
                            ? 'Verifying…'
                            : 'Prove you’re a real person with a live photo'}
                      </p>
                    </div>
                    {faceVerified && (
                      <CheckCircle2 className="text-emerald-400 ml-auto" size={20} />
                    )}
                  </div>

                  {!faceVerified && !faceVerifying && (
                    <div className="space-y-3">
                      {gesture && (
                        <p className="text-sm text-zinc-300 bg-zinc-800/60 rounded-lg px-3 py-2">
                          <span className="text-emerald-400 font-medium">Do this:</span> {gesture}
                        </p>
                      )}
                      {!showFaceCamera ? (
                        <button
                          type="button"
                          onClick={() => setShowFaceCamera(true)}
                          disabled={!gesture}
                          className="w-full py-3 px-4 rounded-lg border border-zinc-600 bg-zinc-900 text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 transition-colors flex items-center justify-center gap-2"
                        >
                          <Camera size={18} />
                          Capture face
                        </button>
                      ) : (
                        <div className="rounded-lg overflow-hidden border border-zinc-700 relative">
                          <video
                            ref={faceVideoRef}
                            className="w-full bg-black aspect-[3/4] object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                            autoPlay
                            playsInline
                            muted
                          />
                          <div
                            className="absolute inset-0 pointer-events-none flex items-center justify-center"
                            aria-hidden
                          >
                            <div className="w-44 h-56 rounded-[40%] border-2 border-emerald-500/60 border-dashed" />
                          </div>
                          {faceCameraError && (
                            <p className="text-xs text-red-400 px-3 py-2">{faceCameraError}</p>
                          )}
                          <div className="px-3 py-2 bg-zinc-900 flex items-center justify-between">
                            <span className="text-[11px] text-zinc-400">
                              Align face in the frame. Must be a live selfie.
                            </span>
                            <button
                              type="button"
                              onClick={captureFacePhoto}
                              className="text-xs px-3 py-1.5 rounded-full bg-emerald-500 text-black font-medium hover:bg-emerald-400"
                            >
                              Capture
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={stopFaceCamera}
                            className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-400"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={!canContinue} fullWidth size="lg">
                {loading ? 'Verifying & saving...' : 'Continue'}
              </Button>
            </>
          )}

          {/* Full-screen preview for uploaded / captured ID — shared across steps */}
          {showPreview && previewUrl && (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4"
              onClick={() => setShowPreview(false)}
            >
              <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <img
                  src={previewUrl}
                  alt="Government ID preview"
                  className="w-full max-h-[70vh] object-contain rounded-lg border border-zinc-700 bg-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="absolute -top-3 -right-3 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800 px-2 py-1 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
