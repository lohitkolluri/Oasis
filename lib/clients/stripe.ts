import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/config/env";

let stripeClient: Stripe | null = null;

/**
 * Instantiates and caches a singleton instance of the Stripe API SDK.
 * Binds automatically to the secure production keys exported in the configuration environment.
 *
 * @returns Configured Stripe instance wrapper
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secret = getStripeSecretKey();
    stripeClient = new Stripe(secret as string);
  }
  return stripeClient;
}

/**
 * Generates an encrypted Checkout URL authorizing a predefined transaction payload.
 *
 * @param params - Configuration object dictating Line Items, Modes, and Callbacks
 * @returns Serialized session object tracking the pending payment
 */
export async function createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.create(params);
}

