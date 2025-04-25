import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { cancelSubscription } from '@/app/lib/stripe/subscriptions'

// POST handler to cancel a subscription
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const subscriptionId = params.id
  
  if (!subscriptionId) {
    return NextResponse.json(
      { error: 'Subscription ID is required' },
      { status: 400 }
    )
  }
  
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user's profile to check if they own the subscription
    const { data: profile } = await supabase
      .from('member_profiles')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || profile.stripe_subscription_id !== subscriptionId) {
      return NextResponse.json(
        { error: 'You do not have permission to cancel this subscription' },
        { status: 403 }
      )
    }
    
    // Cancel the subscription through our helper function
    const result = await cancelSubscription(subscriptionId)
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      subscriptionId: result.subscriptionId,
      status: result.status,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
} 