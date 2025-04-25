import { NextRequest, NextResponse } from 'next/server';
import { createStripeClient } from '@/app/lib/stripe';
import { createClient } from '@/app/lib/supabase/server';
import Stripe from 'stripe';

// POST handler to change a subscription's plan
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const subscriptionId = params.id;
  
  if (!subscriptionId) {
    return NextResponse.json(
      { error: 'Subscription ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const { planId } = await request.json();
    
    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }
    
    // Check authentication
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get the subscription from the database to check ownership
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_memberships')
      .select('member_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    
    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to modify this subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, id')
      .eq('id', user.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';
    const isOwnSubscription = profile?.id === subscription.member_id;
    
    if (!isAdmin && !isOwnSubscription) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this subscription' },
        { status: 403 }
      );
    }
    
    // Check if the plan exists and is available
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('stripe_price_id, is_active')
      .eq('id', planId)
      .single();
    
    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found or error fetching plan' },
        { status: 404 }
      );
    }
    
    if (!plan.is_active) {
      return NextResponse.json(
        { error: 'This plan is not currently available' },
        { status: 400 }
      );
    }
    
    if (!plan.stripe_price_id) {
      return NextResponse.json(
        { error: 'This plan is not configured for online payments' },
        { status: 400 }
      );
    }
    
    // Update the subscription in Stripe
    const stripe = createStripeClient();
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: await getSubscriptionItemId(stripe, subscriptionId),
          price: plan.stripe_price_id,
        },
      ],
      proration_behavior: 'create_prorations',
    });
    
    // Update the subscription in the database
    const { error: updateError } = await supabase
      .from('user_memberships')
      .update({
        plan_id: planId,
        status: updatedSubscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);
    
    if (updateError) {
      console.error('Error updating subscription in database:', updateError);
    }
    
    return NextResponse.json({
      subscriptionId,
      status: updatedSubscription.status,
      message: 'Subscription plan updated successfully',
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error changing subscription plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change subscription plan' },
      { status: 500 }
    );
  }
}

// Helper function to get the subscription item ID (first item in the subscription)
async function getSubscriptionItemId(stripe: Stripe, subscriptionId: string): Promise<string> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items'],
  });
  
  if (!subscription.items.data || subscription.items.data.length === 0) {
    throw new Error('No items found in subscription');
  }
  
  return subscription.items.data[0].id;
} 