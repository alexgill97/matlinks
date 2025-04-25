import Stripe from 'stripe';

// Helper for creating a Stripe client with the proper API version and secretKey
export function createStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing Stripe secret key');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-03-31.basil', // Updated to latest version required by linter
    appInfo: {
      name: 'MatLinks'
    },
  });
}

// Client-side publishable key
export const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Helper for constructing a Stripe event from a webhook payload
export async function constructEventFromPayload(signature: string, payload: Buffer) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Missing Stripe webhook secret');
  }

  const stripe = createStripeClient();
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  );
} 