/**
 * GET /api/admin/rider/[id]/government-id/image
 * Admin-only. Returns the rider's government ID image (decrypted if stored encrypted).
 * Use as <img src="..."> so the browser displays a valid image.
 */
import { getGovIdEncryptionKey } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

const BUCKET = 'government-ids';

// Encryption format from verify-government-id: iv (12) + tag (16) + ciphertext
const IV_LEN = 12;
const TAG_LEN = 16;

function contentTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_ctx, request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // [... 'admin', 'rider', id, 'government-id', 'image']
  const id = segments[segments.length - 3] ?? null;
  if (!id) {
    return NextResponse.json({ error: 'Rider ID required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('government_id_url')
    .eq('id', id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const path = (profile as { government_id_url?: string | null }).government_id_url;
  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: 'No government ID on file' }, { status: 404 });
  }

  const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(path);

  if (downloadError || !blob) {
    return NextResponse.json(
      { error: downloadError?.message ?? 'Failed to download file' },
      { status: 500 },
    );
  }

  let buffer = Buffer.from(await blob.arrayBuffer());
  const encKey = getGovIdEncryptionKey();

  if (encKey) {
    try {
      const key = Buffer.from(encKey, 'base64');
      if (key.length === 32 && buffer.length > IV_LEN + TAG_LEN) {
        const iv = buffer.subarray(0, IV_LEN);
        const tag = buffer.subarray(IV_LEN, IV_LEN + TAG_LEN);
        const ciphertext = buffer.subarray(IV_LEN + TAG_LEN);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        buffer = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      }
    } catch (e) {
      logger.error('Gov ID decrypt error', {
        error: e instanceof Error ? e.message : String(e),
        rider_id: id,
        path,
      });
      return NextResponse.json({ error: 'Failed to decrypt government ID' }, { status: 500 });
    }
  }

  const contentType = contentTypeFromPath(path);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
    },
  });
});
