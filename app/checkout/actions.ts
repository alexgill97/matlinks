'use server'

import { createClient } from '@/app/lib/supabase/server'
import { createStripeClient } from '@/app/lib/stripe'
import Stripe from 'stripe'
import { validatePromoCode, recordPromoRedemption } from './promo-actions'

// Function to check if user is authenticated
async function getAuthenticatedUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: 'Not authenticated' };
  }
  
  return { user };
}

// Type for the createCheckoutSession parameters
type CreateCheckoutSessionParams = {
  planId: number;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  promoCode?: string; // Optional promotional code
}

// Function to calculate discounted price based on promotion
function calculateDiscountedPrice(basePrice: number, discountType: string, discountValue: number): number {
  if (discountType === 'percentage') {
    // Apply percentage discount (capped at 100%)
    const discountPercentage = Math.min(discountValue, 100);
    return Math.floor(basePrice * (1 - discountPercentage / 100));
  } else if (discountType === 'fixed') {
    // Apply fixed amount discount (prevent negative price)
    return Math.max(basePrice - discountValue, 0);
  }
  
  // Return original price if discount type is invalid
  return basePrice;
}

// Create a checkout session
export async function createCheckoutSession({
  planId,
  userId,
  successUrl,
  cancelUrl,
  promoCode
}: CreateCheckoutSessionParams) {
  // Check authentication
  const authResult = await getAuthenticatedUser();
  if ('error' in authResult) {
    return { error: authResult.error };
  }
  
  // Initialize Supabase client
  const supabase = createClient();
  
  try {
    // Fetch the membership plan details
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();
      
    if (planError || !plan) {
      return { error: 'Membership plan not found or is inactive' };
    }
    
    // Ensure the plan has a price
    if (!plan.price) {
      return { error: 'This plan does not have a price configured' };
    }
    
    // Initialize variables for promotion handling
    let finalPrice = plan.price;
    let appliedPromotion = null;
    
    // Validate and apply promotional code if provided
    if (promoCode) {
      const promoResult = await validatePromoCode(promoCode);
      
      if ('error' in promoResult) {
        return { error: promoResult.error };
      }
      
      if (promoResult.promotion) {
        appliedPromotion = promoResult.promotion;
        finalPrice = calculateDiscountedPrice(
          plan.price,
          promoResult.promotion.discount_type,
          promoResult.promotion.discount_value
        );
      }
    }
    
    // Create Stripe client
    const stripe = createStripeClient();
    
    // First check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('member_profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();
      
    let customerId: string;
    
    // If user already has a Stripe customer ID, use it
    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      // Get user email for creating a Stripe customer
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      if (userError || !userData) {
        return { error: 'Failed to retrieve user information' };
      }
      
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: {
          user_id: userId
        }
      });
      
      customerId = customer.id;
      
      // Update user profile with Stripe customer ID
      const { error: updateError } = await supabase
        .from('member_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId);
        
      if (updateError) {
        console.error('Error updating user profile with Stripe customer ID:', updateError);
      }
    }
    
    // Define the pricing options based on interval
    let recurrence: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring | undefined;
    
    if (plan.interval) {
      recurrence = {
        interval: plan.interval as any, // Cast to any to fix type error
        interval_count: 1,
      };
    }
    
    // Set up metadata with promotion info if applied
    const metadata: Record<string, string> = {
      user_id: userId,
      membership_plan_id: plan.id.toString(),
    };
    
    if (appliedPromotion) {
      metadata.promotion_id = appliedPromotion.id.toString();
      metadata.original_price = plan.price.toString();
      metadata.discounted_price = finalPrice.toString();
      metadata.promo_code = appliedPromotion.code;
    }
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            description: plan.description || undefined,
          },
          unit_amount: finalPrice, // Use discounted price if promo applied
          recurring: recurrence,
        },
        quantity: 1,
      }],
      mode: plan.interval ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
    });
    
    // Record the promotion redemption if a promotion was applied
    // Only record it when payment is successful (handled by Stripe webhook)
    
    return { 
      url: session.url,
      appliedPromotion: appliedPromotion ? {
        code: appliedPromotion.code,
        originalPrice: plan.price,
        discountedPrice: finalPrice
      } : null
    };
  } catch (err) {
    console.error('Error creating checkout session:', err);
    return { error: 'Failed to create checkout session' };
  }
} 