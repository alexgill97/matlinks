import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient } from '@/app/lib/stripe'
import { checkUserRole } from '@/app/lib/auth-utils'
import { createClient } from '@/app/lib/supabase/server'

// GET handler to retrieve subscription details
export async function GET(
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
    // Get the authenticated user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Check if user is authorized to view this subscription
    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .select('*, member_id(*)')
      .eq('id', subscriptionId)
      .single()
      
    if (dbError) {
      console.error('Error fetching subscription:', dbError)
      return NextResponse.json(
        { error: 'Error fetching subscription data' },
        { status: 500 }
      )
    }
    
    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }
    
    // Check if user is admin/owner or the subscription owner
    const { isAdmin } = await checkUserRole(['admin', 'owner'])
    if (!isAdmin && subscription.member_id.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to subscription data' },
        { status: 403 }
      )
    }
    
    // Fetch additional details from Stripe
    const stripe = createStripeClient()
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    )
    
    return NextResponse.json({
      ...subscription,
      stripe_details: stripeSubscription,
    })
  } catch (error) {
    console.error('Error processing subscription request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription details' },
      { status: 500 }
    )
  }
} 