import Razorpay from 'razorpay';
import { getRazorpayKeyId, getRazorpayKeySecret } from '@/lib/config/env';

let cachedInstance: Razorpay | null = null;
let cachedKeyHash: string | null = null;

/**
 * Returns a Razorpay client instance for the current environment.
 * Caches the instance per key pair so a hot-reload / env change doesn't
 * silently reuse a stale client.
 */
export function getRazorpayInstance(): Razorpay {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  const hash = `${keyId}:${keySecret.length}`;

  if (!cachedInstance || cachedKeyHash !== hash) {
    cachedInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    cachedKeyHash = hash;
  }
  return cachedInstance;
}
