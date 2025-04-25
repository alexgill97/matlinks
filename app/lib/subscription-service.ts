import { createClient } from '@/app/lib/supabase/server'
import { createStripeClient } from '@/app/lib/stripe'

/**
 * Interface for subscription operation results
 */
export interface SubscriptionResult {
  success: boolean
  message?: string
  error?: string
  subscriptionId?: string
}

/**
 * Cancel a subscription in Stripe and update the database
 * @param subscriptionId The Stripe subscription ID to cancel
 * @param reason Reason for cancellation (optional)
 * @returns Result of the cancellation operation
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason?: string
): Promise<SubscriptionResult> {
  try {
    const stripe = createStripeClient()
    const supabase = createClient()
    
    // Cancel the subscription in Stripe
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      cancellation_details: {
        comment: reason || 'Canceled by user'
      }
    })
    
    // Get the member profile that uses this subscription
    const { data: memberData, error: memberError } = await supabase
      .from('member_profiles')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()
    
    if (memberError || !memberData) {
      console.error('Error fetching member profile:', memberError)
      // Continue with cancellation even if we can't update the database
    } else {
      // Update the subscription status in the database
      await supabase
        .from('member_profiles')
        .update({
          subscription_status: 'canceling', // Will be canceled at period end
          updated_at: new Date().toISOString()
        })
        .eq('user_id', memberData.user_id)
      
      // Add a record to the cancellation history
      await supabase
        .from('subscription_cancellations')
        .insert({
          user_id: memberData.user_id,
          subscription_id: subscriptionId,
          reason: reason || 'Canceled by user',
          canceled_at: new Date().toISOString(),
          effective_date: subscription.cancel_at 
            ? new Date(subscription.cancel_at * 1000).toISOString() 
            : null
        })
    }
    
    return {
      success: true,
      message: 'Subscription canceled successfully',
      subscriptionId
    }
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Immediately cancel a subscription (not at period end)
 * @param subscriptionId The Stripe subscription ID to cancel
 * @param reason Reason for cancellation (optional)
 * @returns Result of the cancellation operation
 */
export async function cancelSubscriptionImmediately(
  subscriptionId: string,
  reason?: string
): Promise<SubscriptionResult> {
  try {
    const stripe = createStripeClient()
    const supabase = createClient()
    
    // Cancel the subscription in Stripe immediately
    const subscription = await stripe.subscriptions.cancel(subscriptionId, {
      invoice_now: true,
      prorate: true
    })
    
    // Get the member profile that uses this subscription
    const { data: memberData, error: memberError } = await supabase
      .from('member_profiles')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()
    
    if (memberError || !memberData) {
      console.error('Error fetching member profile:', memberError)
      // Continue with cancellation even if we can't update the database
    } else {
      // Update the subscription status in the database
      await supabase
        .from('member_profiles')
        .update({
          subscription_status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', memberData.user_id)
      
      // Add a record to the cancellation history
      await supabase
        .from('subscription_cancellations')
        .insert({
          user_id: memberData.user_id,
          subscription_id: subscriptionId,
          reason: reason || 'Canceled immediately',
          canceled_at: new Date().toISOString(),
          effective_date: new Date().toISOString(),
          immediate: true
        })
    }
    
    return {
      success: true,
      message: 'Subscription canceled immediately',
      subscriptionId
    }
  } catch (error) {
    console.error('Error canceling subscription immediately:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 