import Stripe from 'stripe';

export function createStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('Missing Stripe secret key');
  }
  
  return new Stripe(secretKey, {
    apiVersion: '2025-03-31.basil',
    typescript: true,
  });
}

export function getStripePublishableKey(): string {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    throw new Error('Missing Stripe publishable key');
  }
  
  return publishableKey;
}

export async function constructEventFromPayload(signature: string, payload: Buffer): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('Missing Stripe webhook secret');
  }
  
  const stripe = createStripeClient();
  
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw new Error('Invalid signature');
  }
} 