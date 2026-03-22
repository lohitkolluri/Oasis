import { createHmac, timingSafeEqual } from 'crypto';

/** Razorpay payment signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = createHmac('sha256', keySecret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch {
    return false;
  }
}

/** Webhook body must be the raw request string; signature from `x-razorpay-signature` header. */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null,
  webhookSecret: string,
): boolean {
  if (!signature?.trim()) return false;
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch {
    return false;
  }
}
