/**
 * Face liveness verification via LLM vision.
 * User must capture a photo performing a random gesture (e.g. close left eye)
 * to prove the photo is live, not a screen/print.
 * Face photos are encrypted at rest using AES-256-GCM when FACE_PHOTO_ENCRYPTION_KEY
 * or GOV_ID_ENCRYPTION_KEY is set.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const BUCKET = 'face-photos';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VISION_MODEL = 'qwen/qwen3-vl-235b-a22b-thinking';

const GESTURES = [
  'close your left eye (wink with left eye closed)',
  'close your right eye (wink with right eye closed)',
  'smile with teeth visible',
  'raise your eyebrows',
  'turn your head slightly to the left',
  'turn your head slightly to the right',
  'look up toward the camera',
] as const;

export async function GET() {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!openRouterKey) {
    return NextResponse.json(
      { error: 'Face verification unavailable. Set OPENROUTER_API_KEY.' },
      { status: 503 },
    );
  }

  const gesture =
    GESTURES[Math.floor(Math.random() * GESTURES.length)];
  return NextResponse.json({ gesture });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!openRouterKey) {
    return NextResponse.json(
      { error: 'Face verification unavailable. Set OPENROUTER_API_KEY.' },
      { status: 503 },
    );
  }

  const contentType = request.headers.get('content-type') ?? '';
  let file: File | null = null;
  let expectedGesture: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    file = formData.get('face_photo') as File | null;
    expectedGesture = (formData.get('expected_gesture') as string)?.trim() ?? null;
  } else {
    const body = await request.json().catch(() => ({}));
    expectedGesture = (body.expected_gesture as string)?.trim() ?? null;
  }

  if (!file || file.size === 0) {
    return NextResponse.json(
      { error: 'Face photo is required' },
      { status: 400 },
    );
  }

  if (!expectedGesture) {
    return NextResponse.json(
      { error: 'Expected gesture is required (from GET /api/onboarding/verify-face)' },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File must be under 5MB' },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'File must be JPEG, PNG, or WebP' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${user.id}/face-verification.${ext}`;

  const encKeyBase64 =
    process.env.FACE_PHOTO_ENCRYPTION_KEY?.trim() ||
    process.env.GOV_ID_ENCRYPTION_KEY?.trim();

  if (process.env.NODE_ENV === 'production' && !encKeyBase64) {
    return NextResponse.json(
      { error: 'KYC storage not configured. Set FACE_PHOTO_ENCRYPTION_KEY (32-byte base64) in production.' },
      { status: 503 },
    );
  }

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let toStore = fileBuffer;
    if (encKeyBase64) {
      try {
        const key = Buffer.from(encKeyBase64, 'base64');
        if (key.length === 32) {
          const iv = crypto.randomBytes(12);
          const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
          const encrypted = Buffer.concat([
            cipher.update(fileBuffer),
            cipher.final(),
          ]);
          const tag = cipher.getAuthTag();
          toStore = Buffer.concat([iv, tag, encrypted]);
        } else {
          if (process.env.NODE_ENV === 'production') {
            return NextResponse.json(
              { error: 'KYC storage not configured. Set FACE_PHOTO_ENCRYPTION_KEY (32-byte base64).' },
              { status: 503 },
            );
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Face photo encryption failed.' },
            { status: 503 },
          );
        }
      }
    }

    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(path, toStore, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json(
        {
          error:
            'Failed to upload. Ensure the face-photos bucket exists in Supabase Storage.',
        },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to upload face photo' },
      { status: 500 },
    );
  }

  let verified = false;
  let reason = 'Verification failed';

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    const mime = file.type;
    const dataUrl = `data:${mime};base64,${base64}`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a strict KYC liveness verifier. REJECT by default. Only verify when you are highly confident. When in doubt, set verified: false. Be strict to prevent fraud.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `The user was asked to perform this exact gesture: "${expectedGesture}".

STRICT VERIFICATION RULES — reject (verified: false) if ANY of these apply:
1. Face is not clearly visible (blurry, obscured, too dark, overexposed, cropped)
2. Gesture is NOT clearly and unmistakably performed (partial, ambiguous, or different gesture)
3. Multiple faces visible (must be exactly one person)
4. Signs of a non-live image:
   - Photo of a phone/screen showing another image
   - Printed photograph held to camera
   - Screenshot or digitally cropped image
   - Reflection, glare, or frame suggesting secondary capture
5. AI-generated, deepfake, or heavily filtered appearance
6. Face appears too small (< ~20% of frame) or poorly lit

ONLY set verified: true when:
- Exactly one real human face is clearly visible
- The requested gesture is unmistakably performed
- The image looks like a direct live selfie from a phone camera (no secondary capture)
- Lighting and quality are acceptable for identity verification

Be STRICT. False negatives (rejecting real users) are preferable to false positives (accepting fraud).
Reply ONLY with valid JSON: {"verified": true/false, "reason": "brief explanation"}
`,
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        max_tokens: 256,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? '';
      const match = content.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as {
          verified?: boolean;
          reason?: string;
        };
        verified = parsed.verified === true;
        reason = parsed.reason ?? 'Could not verify liveness.';
      }
    } else {
      reason = 'Verification service error.';
    }
  } catch {
    reason = 'Verification service error.';
  }

  return NextResponse.json({
    path: verified ? path : null,
    verified,
    reason,
  });
}
