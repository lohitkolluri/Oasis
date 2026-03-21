import { getStripeClient } from '@/lib/clients/stripe';

/**
 * Reads Stripe PaymentMethod.type from a succeeded PaymentIntent (e.g. card, upi).
 * Used to backfill `stripe_payment_method_type` when the webhook could not store it.
 */
export async function getPaymentMethodTypeFromIntent(
  paymentIntentId: string,
): Promise<string | null> {
  try {
    const pi = await getStripeClient().paymentIntents.retrieve(paymentIntentId, {
      expand: ['payment_method'],
    });
    const pm = pi.payment_method;
    if (pm && typeof pm !== 'string') {
      return pm.type ?? null;
    }
  } catch {
    return null;
  }
  return null;
}
