import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/config/env";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secret = getStripeSecretKey();
    stripeClient = new Stripe(secret as string);
  }
  return stripeClient;
}

export async function createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.create(params);
}

