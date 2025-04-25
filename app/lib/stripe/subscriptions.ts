import { createStripeClient } from '@/app/lib/stripe';
import { createClient } from '@/app/lib/supabase/server';
import Stripe from 'stripe';

// Type for valid recurring intervals in Stripe
type StripeRecurringInterval = 'day' | 'week' | 'month' | 'year';

/**
 * Creates a Stripe product and price for a membership plan
 */
export async function createStripeProductForPlan(planId: number, planName: string, planDescription: string | null, priceInCents: number, interval: string | null) {
  const stripe = createStripeClient();
  const supabase = createClient();
  
  try {
    // 1. Create a Stripe Product
    const product = await stripe.products.create({
      name: planName,
      description: planDescription || undefined,
      metadata: {
        plan_id: planId.toString(),
      },
    });
    
    // 2. Create a Price for the Product (if it's a paid plan)
    if (priceInCents > 0 && interval) {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceInCents,
        currency: 'usd',
        recurring: {
          interval: interval as StripeRecurringInterval,
        },
        metadata: {
          plan_id: planId.toString(),
        },
      });
      
      // 3. Update the membership plan in Supabase with Stripe IDs
      const { error } = await supabase
        .from('membership_plans')
        .update({
          stripe_product_id: product.id,
          stripe_price_id: price.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId);
      
      if (error) {
        console.error('Error updating membership plan with Stripe IDs:', error);
        return { error: error.message };
      }
      
      return { productId: product.id, priceId: price.id };
    } else {
      // For free plans, just save the product ID
      const { error } = await supabase
        .from('membership_plans')
        .update({
          stripe_product_id: product.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId);
      
      if (error) {
        console.error('Error updating membership plan with Stripe product ID:', error);
        return { error: error.message };
      }
      
      return { productId: product.id };
    }
  } catch (err) {
    const error = err as Error;
    console.error('Error creating Stripe product and price:', error.message);
    return { error: error.message };
  }
}

/**
 * Creates a Stripe customer for a user
 */
export async function createStripeCustomerForUser(userId: string, email: string, name: string | null) {
  const stripe = createStripeClient();
  const supabase = createClient();
  
  try {
    // Create a Stripe Customer
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        user_id: userId,
      },
    });
    
    // Update the user profile in Supabase with Stripe customer ID
    const { error } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating user profile with Stripe customer ID:', error);
      return { error: error.message };
    }
    
    return { customerId: customer.id };
  } catch (err) {
    const error = err as Error;
    console.error('Error creating Stripe customer:', error.message);
    return { error: error.message };
  }
}

// Type definition for subscription response with additional properties
export interface SubscriptionWithPeriods extends Omit<Stripe.Subscription, 'latest_invoice'> {
  latest_invoice?: Stripe.Invoice & {
    payment_intent?: Stripe.PaymentIntent & {
      client_secret?: string;
    };
  };
  current_period_start: number;
  current_period_end: number;
}

/**
 * Creates a Stripe subscription for a member to a plan
 */
export async function createSubscriptionForMember(memberId: string, planId: number, paymentMethodId: string | null) {
  const stripe = createStripeClient();
  const supabase = createClient();
  
  try {
    // 1. Get the member (user) and plan details
    const { data: member, error: memberError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', memberId)
      .single();
    
    if (memberError || !member) {
      return { error: 'Member not found or error fetching member' };
    }
    
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('stripe_price_id')
      .eq('id', planId)
      .single();
    
    if (planError || !plan) {
      return { error: 'Plan not found or error fetching plan' };
    }
    
    // 2. Ensure we have a customer ID and price ID
    if (!member.stripe_customer_id) {
      return { error: 'Member does not have a Stripe customer ID' };
    }
    
    if (!plan.stripe_price_id) {
      return { error: 'Plan does not have a Stripe price ID' };
    }
    
    // 3. If payment method provided, attach it to the customer
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: member.stripe_customer_id,
      });
      
      // Set as default payment method
      await stripe.customers.update(member.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }
    
    // 4. Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: member.stripe_customer_id,
      items: [
        {
          price: plan.stripe_price_id,
        },
      ],
      metadata: {
        member_id: memberId,
        plan_id: planId.toString(),
      },
      expand: ['latest_invoice.payment_intent'],
    }) as unknown as SubscriptionWithPeriods;
    
    // 5. Create user_membership record
    const { error: membershipError } = await supabase
      .from('user_memberships')
      .insert({
        member_id: memberId,
        plan_id: planId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        start_date: new Date(subscription.current_period_start * 1000).toISOString(),
        end_date: new Date(subscription.current_period_end * 1000).toISOString(),
      });
    
    if (membershipError) {
      console.error('Error creating user membership record:', membershipError);
      return { error: membershipError.message, subscription };
    }
    
    return { 
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret || null,
    };
  } catch (err) {
    const error = err as Error;
    console.error('Error creating subscription:', error.message);
    return { error: error.message };
  }
}

/**
 * Cancels a Stripe subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  const stripe = createStripeClient();
  const supabase = createClient();
  
  try {
    // Cancel the subscription at period end to avoid refunds
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    
    // Update the user_membership record
    const { error } = await supabase
      .from('user_memberships')
      .update({
        status: 'cancelling', // Special status for cancelled but not yet ended
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);
    
    if (error) {
      console.error('Error updating user membership record:', error);
      return { error: error.message, subscription };
    }
    
    return { 
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  } catch (err) {
    const error = err as Error;
    console.error('Error cancelling subscription:', error.message);
    return { error: error.message };
  }
}

// Function to get formatted subscription date periods
export function getFormattedSubscriptionPeriods(subscription: SubscriptionWithPeriods): {
  current_period_start: string;
  current_period_end: string;
} {
  // Convert Unix timestamps to readable dates
  const startDate = new Date(subscription.current_period_start * 1000);
  const endDate = new Date(subscription.current_period_end * 1000);

  return {
    current_period_start: startDate.toLocaleDateString(),
    current_period_end: endDate.toLocaleDateString(),
  };
} 