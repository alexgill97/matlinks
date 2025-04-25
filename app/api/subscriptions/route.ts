import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionForMember } from '@/app/lib/stripe/subscriptions';
import { createClient } from '@/app/lib/supabase/server';

// POST handler to create a new subscription
export async function POST(request: NextRequest) {
  try {
    const { memberId, planId, paymentMethodId } = await request.json();
    
    if (!memberId || !planId) {
      return NextResponse.json(
        { error: 'Member ID and plan ID are required' },
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
    
    // Check if user has permission to create this subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, id')
      .eq('id', user.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';
    const isOwnSubscription = profile?.id === memberId;
    
    if (!isAdmin && !isOwnSubscription) {
      return NextResponse.json(
        { error: 'You do not have permission to create this subscription' },
        { status: 403 }
      );
    }
    
    // Check if the plan exists and is available
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('id, stripe_price_id, is_active')
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
    
    // Create the subscription using our helper function
    const result = await createSubscriptionForMember(memberId, planId, paymentMethodId || null);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      subscriptionId: result.subscriptionId,
      status: result.status,
      clientSecret: result.clientSecret,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 