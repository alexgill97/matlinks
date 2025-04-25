import { createClient } from '@/app/lib/supabase/server'
import { sendEmail } from '@/app/lib/email-service'
import { PaymentFailureType } from '@/utils/payment-utils'

// Define types for dunning management
export enum DunningStage {
  INITIAL_FAILURE = 'initial_failure',
  FIRST_REMINDER = 'first_reminder',
  SECOND_REMINDER = 'second_reminder',
  FINAL_NOTICE = 'final_notice',
  SUBSCRIPTION_CANCELED = 'subscription_canceled'
}

export interface DunningNotification {
  id: string
  user_id: string
  payment_id: string
  stage: DunningStage
  scheduled_date: string
  sent_date?: string
  status: 'pending' | 'sent' | 'failed'
  failure_type: PaymentFailureType
  amount: number
  currency: string
  created_at: string
}

/**
 * Creates a dunning workflow for a failed payment
 * This sets up the sequence of notifications to be sent
 */
export async function createDunningWorkflow(
  userId: string,
  paymentId: string,
  failureType: PaymentFailureType,
  amount: number,
  currency: string
): Promise<boolean> {
  const supabase = createClient()
  const now = new Date()
  
  try {
    // Create notifications at different stages with appropriate delays
    const notifications = [
      {
        user_id: userId,
        payment_id: paymentId,
        stage: DunningStage.INITIAL_FAILURE,
        scheduled_date: now.toISOString(), // Immediate notification
        status: 'pending',
        failure_type: failureType,
        amount: amount,
        currency: currency,
        created_at: now.toISOString()
      },
      {
        user_id: userId,
        payment_id: paymentId,
        stage: DunningStage.FIRST_REMINDER,
        scheduled_date: addDays(now, 3).toISOString(), // +3 days
        status: 'pending',
        failure_type: failureType,
        amount: amount,
        currency: currency,
        created_at: now.toISOString()
      },
      {
        user_id: userId,
        payment_id: paymentId,
        stage: DunningStage.SECOND_REMINDER,
        scheduled_date: addDays(now, 7).toISOString(), // +7 days
        status: 'pending',
        failure_type: failureType,
        amount: amount,
        currency: currency,
        created_at: now.toISOString()
      },
      {
        user_id: userId,
        payment_id: paymentId,
        stage: DunningStage.FINAL_NOTICE,
        scheduled_date: addDays(now, 14).toISOString(), // +14 days
        status: 'pending',
        failure_type: failureType,
        amount: amount,
        currency: currency,
        created_at: now.toISOString()
      }
    ]
    
    // Insert notifications into database
    const { error } = await supabase
      .from('dunning_notifications')
      .insert(notifications)
    
    if (error) {
      console.error('Error creating dunning workflow:', error)
      return false
    }
    
    // Send the initial notification immediately
    await processPendingNotification(notifications[0] as DunningNotification)
    
    return true
  } catch (error) {
    console.error('Error in createDunningWorkflow:', error)
    return false
  }
}

/**
 * Process pending notifications that are due to be sent
 */
export async function processPendingNotifications(): Promise<{ processed: number, failed: number }> {
  const supabase = createClient()
  const now = new Date()
  
  try {
    // Get all pending notifications that are due
    const { data, error } = await supabase
      .from('dunning_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_date', now.toISOString())
    
    if (error) {
      console.error('Error fetching pending notifications:', error)
      return { processed: 0, failed: 0 }
    }
    
    if (!data || data.length === 0) {
      return { processed: 0, failed: 0 }
    }
    
    let successCount = 0
    let failureCount = 0
    
    // Process each notification
    for (const notification of data as DunningNotification[]) {
      const success = await processPendingNotification(notification)
      
      if (success) {
        successCount++
      } else {
        failureCount++
      }
    }
    
    return { processed: successCount, failed: failureCount }
  } catch (error) {
    console.error('Error in processPendingNotifications:', error)
    return { processed: 0, failed: 0 }
  }
}

/**
 * Process a single pending notification
 */
async function processPendingNotification(notification: DunningNotification): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Get user information
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', notification.user_id)
      .single()
    
    if (userError || !userData) {
      console.error('Error fetching user data:', userError)
      await updateNotificationStatus(notification.id, 'failed')
      return false
    }
    
    // Get payment information (this could be expanded based on your payment schema)
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', notification.payment_id)
      .single()
    
    if (paymentError || !paymentData) {
      console.error('Error fetching payment data:', paymentError)
      await updateNotificationStatus(notification.id, 'failed')
      return false
    }
    
    // Prepare email content based on dunning stage
    const emailContent = prepareEmailContent(
      notification.stage,
      userData,
      notification,
      paymentData
    )
    
    // Send the email
    const emailResult = await sendEmail({
      to: userData.email,
      subject: emailContent.subject,
      html: emailContent.body,
      text: emailContent.plainText
    })
    
    if (!emailResult.success) {
      console.error('Error sending dunning email:', emailResult.error)
      await updateNotificationStatus(notification.id, 'failed')
      return false
    }
    
    // Update notification status to sent
    await updateNotificationStatus(notification.id, 'sent')
    
    // If this is the final notice, potentially schedule subscription cancellation
    if (notification.stage === DunningStage.FINAL_NOTICE) {
      await scheduleSubscriptionCancellation(notification.user_id, notification.payment_id)
    }
    
    return true
  } catch (error) {
    console.error('Error processing notification:', error)
    await updateNotificationStatus(notification.id, 'failed')
    return false
  }
}

/**
 * Update notification status in the database
 */
async function updateNotificationStatus(notificationId: string, status: 'sent' | 'failed'): Promise<void> {
  const supabase = createClient()
  
  await supabase
    .from('dunning_notifications')
    .update({
      status: status,
      sent_date: status === 'sent' ? new Date().toISOString() : null
    })
    .eq('id', notificationId)
}

/**
 * Schedule subscription cancellation after final notice
 */
async function scheduleSubscriptionCancellation(userId: string, paymentId: string): Promise<void> {
  const supabase = createClient()
  const now = new Date()
  const cancellationDate = addDays(now, 7) // Schedule cancellation for 7 days after final notice
  
  // Get subscription ID from payment
  const { data: paymentData } = await supabase
    .from('payments')
    .select('subscription_id')
    .eq('id', paymentId)
    .single()
  
  if (!paymentData?.subscription_id) {
    console.error('No subscription ID found for payment:', paymentId)
    return
  }
  
  // Create a cancellation notification
  await supabase
    .from('dunning_notifications')
    .insert({
      user_id: userId,
      payment_id: paymentId,
      stage: DunningStage.SUBSCRIPTION_CANCELED,
      scheduled_date: cancellationDate.toISOString(),
      status: 'pending',
      failure_type: 'subscription_cancellation',
      created_at: now.toISOString()
    })
  
  // Store the pending cancellation in a separate table for tracking
  await supabase
    .from('pending_subscription_cancellations')
    .insert({
      user_id: userId,
      subscription_id: paymentData.subscription_id,
      scheduled_date: cancellationDate.toISOString(),
      payment_id: paymentId,
      created_at: now.toISOString()
    })
}

/**
 * Prepare email content based on dunning stage
 */
function prepareEmailContent(
  stage: DunningStage,
  user: { email: string, first_name: string, last_name: string },
  notification: DunningNotification,
  payment: any
): { subject: string, body: string, plainText: string } {
  const userName = `${user.first_name} ${user.last_name}`
  const formattedAmount = formatCurrency(notification.amount, notification.currency)
  
  let subject = ''
  let body = ''
  let plainText = ''
  
  switch (stage) {
    case DunningStage.INITIAL_FAILURE:
      subject = 'Payment Failed: Action Required'
      body = `
        <h2>Payment Failed</h2>
        <p>Hello ${userName},</p>
        <p>We were unable to process your payment of ${formattedAmount} for your membership.</p>
        <p>Reason: ${getFailureReason(notification.failure_type)}</p>
        <p>Please update your payment method in your account settings to prevent any interruption to your membership.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/student/billing">Update Payment Method</a></p>
      `
      plainText = `
        Payment Failed
        Hello ${userName},
        We were unable to process your payment of ${formattedAmount} for your membership.
        Reason: ${getFailureReason(notification.failure_type)}
        Please update your payment method in your account settings to prevent any interruption to your membership.
        ${process.env.NEXT_PUBLIC_APP_URL}/student/billing
      `
      break
      
    case DunningStage.FIRST_REMINDER:
      subject = 'Payment Reminder: Update Your Payment Method'
      body = `
        <h2>Payment Reminder</h2>
        <p>Hello ${userName},</p>
        <p>This is a reminder that we were unable to process your payment of ${formattedAmount} for your membership.</p>
        <p>Please update your payment method as soon as possible to maintain uninterrupted access to classes.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/student/billing">Update Payment Method</a></p>
      `
      plainText = `
        Payment Reminder
        Hello ${userName},
        This is a reminder that we were unable to process your payment of ${formattedAmount} for your membership.
        Please update your payment method as soon as possible to maintain uninterrupted access to classes.
        ${process.env.NEXT_PUBLIC_APP_URL}/student/billing
      `
      break
      
    case DunningStage.SECOND_REMINDER:
      subject = 'Urgent: Payment Update Required'
      body = `
        <h2>Urgent Payment Reminder</h2>
        <p>Hello ${userName},</p>
        <p>We still have not been able to process your payment of ${formattedAmount} for your membership.</p>
        <p>Your membership benefits may be affected if the payment issue is not resolved soon.</p>
        <p>Please update your payment method immediately to avoid any interruptions.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/student/billing">Update Payment Method</a></p>
      `
      plainText = `
        Urgent Payment Reminder
        Hello ${userName},
        We still have not been able to process your payment of ${formattedAmount} for your membership.
        Your membership benefits may be affected if the payment issue is not resolved soon.
        Please update your payment method immediately to avoid any interruptions.
        ${process.env.NEXT_PUBLIC_APP_URL}/student/billing
      `
      break
      
    case DunningStage.FINAL_NOTICE:
      subject = 'Final Notice: Membership At Risk'
      body = `
        <h2>Final Payment Notice</h2>
        <p>Hello ${userName},</p>
        <p>This is a final notice regarding your failed payment of ${formattedAmount}.</p>
        <p>If your payment method is not updated within 7 days, your membership will be automatically canceled.</p>
        <p>To maintain your membership and access to classes, please update your payment information immediately.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/student/billing">Update Payment Method</a></p>
      `
      plainText = `
        Final Payment Notice
        Hello ${userName},
        This is a final notice regarding your failed payment of ${formattedAmount}.
        If your payment method is not updated within 7 days, your membership will be automatically canceled.
        To maintain your membership and access to classes, please update your payment information immediately.
        ${process.env.NEXT_PUBLIC_APP_URL}/student/billing
      `
      break
      
    case DunningStage.SUBSCRIPTION_CANCELED:
      subject = 'Your Membership Has Been Canceled'
      body = `
        <h2>Membership Canceled</h2>
        <p>Hello ${userName},</p>
        <p>Due to continued payment failures, your membership has been canceled.</p>
        <p>If you would like to reinstate your membership, please contact our staff or visit the gym.</p>
        <p>We value you as a member and hope to see you back soon.</p>
      `
      plainText = `
        Membership Canceled
        Hello ${userName},
        Due to continued payment failures, your membership has been canceled.
        If you would like to reinstate your membership, please contact our staff or visit the gym.
        We value you as a member and hope to see you back soon.
      `
      break
      
    default:
      subject = 'Important Information About Your Membership'
      body = `
        <h2>Membership Update</h2>
        <p>Hello ${userName},</p>
        <p>There's an important update regarding your membership.</p>
        <p>Please log in to your account to view the details.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard">View Account</a></p>
      `
      plainText = `
        Membership Update
        Hello ${userName},
        There's an important update regarding your membership.
        Please log in to your account to view the details.
        ${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard
      `
  }
  
  return { subject, body, plainText }
}

/**
 * Get a user-friendly description of the failure reason
 */
function getFailureReason(failureType: PaymentFailureType): string {
  switch (failureType) {
    case 'insufficient_funds':
      return 'Insufficient funds in your account'
    case 'card_declined':
      return 'Your card was declined'
    case 'expired_card':
      return 'Your card has expired'
    case 'invalid_cvc':
      return 'Invalid security code (CVC)'
    case 'processing_error':
      return 'A processing error occurred'
    default:
      return 'Payment processing issue'
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount / 100) // Assuming amounts are stored in cents
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Cancel subscriptions that have reached the final stage of dunning
 */
export async function processPendingCancellations(): Promise<{ processed: number }> {
  const supabase = createClient()
  const now = new Date()
  
  try {
    // Get all pending cancellations that are due
    const { data, error } = await supabase
      .from('pending_subscription_cancellations')
      .select('*')
      .lte('scheduled_date', now.toISOString())
      .is('processed', false)
    
    if (error) {
      console.error('Error fetching pending cancellations:', error)
      return { processed: 0 }
    }
    
    if (!data || data.length === 0) {
      return { processed: 0 }
    }
    
    let processedCount = 0
    
    // Process each cancellation
    for (const cancellation of data) {
      try {
        // Get Stripe subscription ID
        const { data: memberData } = await supabase
          .from('member_profiles')
          .select('stripe_subscription_id')
          .eq('user_id', cancellation.user_id)
          .single()
        
        if (!memberData?.stripe_subscription_id) {
          console.error('No Stripe subscription ID found for user:', cancellation.user_id)
          continue
        }
        
        // Import this only when needed to avoid circular dependencies
        const { cancelSubscription } = await import('@/app/lib/subscription-service')
        
        // Cancel the subscription
        const result = await cancelSubscription(
          memberData.stripe_subscription_id,
          'Canceled due to payment failure'
        )
        
        if (result.success) {
          // Update subscription status in the database
          await supabase
            .from('member_profiles')
            .update({
              subscription_status: 'canceled',
              updated_at: now.toISOString()
            })
            .eq('user_id', cancellation.user_id)
          
          // Mark the cancellation as processed
          await supabase
            .from('pending_subscription_cancellations')
            .update({
              processed: true,
              processed_date: now.toISOString()
            })
            .eq('id', cancellation.id)
          
          processedCount++
        } else {
          console.error('Failed to cancel subscription:', result.error)
        }
      } catch (error) {
        console.error('Error processing cancellation:', error)
      }
    }
    
    return { processed: processedCount }
  } catch (error) {
    console.error('Error in processPendingCancellations:', error)
    return { processed: 0 }
  }
} 