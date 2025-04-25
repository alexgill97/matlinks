import { createClient } from '@/app/lib/supabase/server';
import Stripe from 'stripe';
import { 
  PaymentFailureType, 
  RetryStatus, 
  createFailedPaymentRecord, 
  updateRetryAttemptStatus, 
  getNextRetryAttempt,
  FailedPayment,
  RetryAttempt
} from '@/utils/payment-utils';
import { createStripeClient } from './stripe';
import { processPayment } from '@/app/lib/payment-processor';
import { createDunningWorkflow } from '@/app/lib/dunning-service';

/**
 * Map Stripe payment intent failure reason to internal PaymentFailureType
 */
export function mapStripeErrorToFailureType(stripeError: string): PaymentFailureType {
  switch (stripeError) {
    case 'insufficient_funds':
      return PaymentFailureType.INSUFFICIENT_FUNDS;
    case 'card_declined':
      return PaymentFailureType.CARD_DECLINED;
    case 'expired_card':
      return PaymentFailureType.EXPIRED_CARD;
    case 'invalid_cvc':
      return PaymentFailureType.INVALID_CVC;
    case 'processing_error':
      return PaymentFailureType.PROCESSING_ERROR;
    default:
      return PaymentFailureType.UNKNOWN;
  }
}

/**
 * Record a failed payment in the database
 */
export async function recordFailedPayment(
  customerId: string,
  invoiceId: string,
  amount: number,
  currency: string,
  paymentMethodId: string,
  failureReason: string,
  subscriptionId?: string
): Promise<{ success: boolean; error?: string; failedPaymentId?: string }> {
  try {
    const supabase = createClient();
    
    // Get user ID from Stripe customer
    const { data: memberData, error: memberError } = await supabase
      .from('member_profiles')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (memberError || !memberData) {
      console.error('Error finding member:', memberError);
      return { success: false, error: 'Member not found' };
    }
    
    // Create payment data object
    const paymentData = {
      id: `${invoiceId}_failure`,
      userId: memberData.user_id,
      amount,
      currency,
      paymentMethod: paymentMethodId,
      subscriptionId,
      invoiceId
    };
    
    // Map failure reason to internal type
    const failureType = mapStripeErrorToFailureType(failureReason);
    
    // Create failed payment record
    const failedPayment = createFailedPaymentRecord(
      paymentData,
      failureType,
      `Payment failed: ${failureReason}`
    );
    
    // Store in database
    const { data, error } = await supabase
      .from('failed_payments')
      .insert({
        id: failedPayment.id,
        user_id: failedPayment.userId,
        amount: failedPayment.amount,
        currency: failedPayment.currency,
        failure_date: failedPayment.failureDate.toISOString(),
        failure_type: failedPayment.failureType,
        failure_message: failedPayment.failureMessage,
        payment_method: failedPayment.paymentMethod,
        subscription_id: failedPayment.subscriptionId,
        invoice_id: failedPayment.invoiceId,
        max_retries: failedPayment.maxRetries,
        retry_attempts: failedPayment.retryAttempts,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error recording failed payment:', error);
      return { success: false, error: 'Database error' };
    }
    
    // Start dunning workflow for this failed payment
    await createDunningWorkflow(
      memberData.user_id,
      data.id,
      failureType,
      amount,
      currency
    );
    
    return { success: true, failedPaymentId: data.id };
  } catch (error) {
    console.error('Error in recordFailedPayment:', error);
    return { success: false, error: 'Service error' };
  }
}

/**
 * Process payment retries that are due
 */
export async function processScheduledRetries(): Promise<{ success: boolean; processed: number; error?: string }> {
  try {
    const supabase = createClient();
    const now = new Date();
    
    // Find all failed payments with upcoming retry attempts
    const { data: failedPayments, error } = await supabase
      .from('failed_payments')
      .select('*');
    
    if (error) {
      console.error('Error fetching failed payments:', error);
      return { success: false, processed: 0, error: 'Database error' };
    }
    
    let processedCount = 0;
    
    if (!failedPayments || failedPayments.length === 0) {
      return { success: true, processed: 0 };
    }
    
    // Process each failed payment
    for (const payment of failedPayments) {
      // Convert to FailedPayment type
      const failedPayment: FailedPayment = {
        ...payment,
        failureDate: new Date(payment.failure_date),
        failureType: payment.failure_type as PaymentFailureType,
        failureMessage: payment.failure_message,
        retryAttempts: payment.retry_attempts as RetryAttempt[],
        maxRetries: payment.max_retries
      };
      
      // Get next retry attempt
      const nextAttempt = getNextRetryAttempt(failedPayment);
      
      // If no scheduled retry or not yet due, skip
      if (!nextAttempt || nextAttempt.scheduledDate > now) {
        continue;
      }
      
      // Update status to processing
      const updatedPayment = updateRetryAttemptStatus(
        failedPayment,
        nextAttempt.id,
        RetryStatus.PROCESSING
      );
      
      // Update in database
      await supabase
        .from('failed_payments')
        .update({
          retry_attempts: updatedPayment.retryAttempts
        })
        .eq('id', updatedPayment.id);
      
      // Execute the retry attempt
      const retryResult = await executeRetryAttempt(updatedPayment, nextAttempt);
      
      // Update the retry status based on result
      const finalPayment = updateRetryAttemptStatus(
        updatedPayment,
        nextAttempt.id,
        retryResult.success ? RetryStatus.SUCCEEDED : RetryStatus.FAILED,
        retryResult.message
      );
      
      // Update in database
      await supabase
        .from('failed_payments')
        .update({
          retry_attempts: finalPayment.retryAttempts
        })
        .eq('id', finalPayment.id);
      
      processedCount++;
    }
    
    return { success: true, processed: processedCount };
  } catch (error) {
    console.error('Error in processScheduledRetries:', error);
    return { success: false, processed: 0, error: 'Service error' };
  }
}

/**
 * Execute a payment retry attempt
 */
async function executeRetryAttempt(
  failedPayment: FailedPayment,
  retryAttempt: RetryAttempt
): Promise<{ success: boolean; message: string; paymentIntentId?: string }> {
  try {
    const stripe = createStripeClient();
    
    // If this is a subscription payment, retry via invoice
    if (failedPayment.subscriptionId && failedPayment.invoiceId) {
      const invoice = await stripe.invoices.retrieve(failedPayment.invoiceId);
      
      if (invoice.status === 'open' || invoice.status === 'uncollectible') {
        // Retry payment on invoice
        const retryResult = await stripe.invoices.pay(failedPayment.invoiceId);
        
        if (retryResult.status === 'paid') {
          return { 
            success: true, 
            message: 'Payment retry succeeded',
            paymentIntentId: typeof retryResult.payment_intent === 'string' 
              ? retryResult.payment_intent 
              : retryResult.payment_intent?.id
          };
        } else {
          return { 
            success: false, 
            message: `Payment retry failed: ${retryResult.status}`
          };
        }
      } else {
        return { 
          success: false, 
          message: `Invoice status ${invoice.status} cannot be retried`
        };
      }
    }
    
    // For non-subscription payments, process a new payment intent
    // This would require additional implementation specific to your use case
    
    return { 
      success: false, 
      message: 'Non-subscription payment retry not implemented'
    };
  } catch (error) {
    console.error('Error executing retry attempt:', error);
    return { 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Send email notification about payment failure
 */
async function sendPaymentFailureNotification(failedPayment: FailedPayment): Promise<void> {
  // This would integrate with your email service to send notifications
  // For now, we'll just log that it would send an email
  console.log(`Would send payment failure notification to user ${failedPayment.userId}`);
  console.log(`Failure type: ${failedPayment.failureType}`);
  console.log(`Amount: ${failedPayment.amount} ${failedPayment.currency}`);
  
  const nextRetry = getNextRetryAttempt(failedPayment);
  if (nextRetry) {
    console.log(`Next retry: ${nextRetry.scheduledDate.toISOString()}`);
  }
  
  // In a real implementation, you would integrate with an email service
  // await emailService.sendTemplate('payment-failure', {
  //   to: userEmail,
  //   params: {
  //     amount: formatCurrency(failedPayment.amount, failedPayment.currency),
  //     failureReason: failedPayment.failureMessage,
  //     nextRetryDate: formatDate(getNextRetryAttempt(failedPayment)?.scheduledDate),
  //     subscriptionDetails: '...',
  //   }
  // });
}

export type RetryResult = {
  success: boolean
  message: string
  transactionId?: string
}

/**
 * Retries a failed payment by retrieving payment details and reprocessing it
 * @param paymentId The ID of the failed payment to retry
 * @returns Object with success status, message, and transaction ID if successful
 */
export async function retryFailedPayment(paymentId: string): Promise<RetryResult> {
  const supabase = createClient()
  
  try {
    // Fetch the payment record
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()
    
    if (fetchError || !payment) {
      return {
        success: false,
        message: `Payment not found: ${fetchError?.message || 'No payment data'}`
      }
    }
    
    // Verify the payment is in a failed state
    if (payment.status !== 'failed') {
      return {
        success: false,
        message: `Cannot retry a payment with status: ${payment.status}. Only failed payments can be retried.`
      }
    }
    
    // Get the associated payment method
    const { data: paymentMethod, error: methodError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', payment.payment_method_id)
      .single()
    
    if (methodError || !paymentMethod) {
      return {
        success: false,
        message: `Payment method not found: ${methodError?.message || 'No payment method data'}`
      }
    }
    
    // Process the payment using the payment processor
    const processResult = await processPayment({
      amount: payment.amount,
      currency: payment.currency || 'USD',
      paymentMethodId: payment.payment_method_id,
      memberId: payment.member_id,
      description: `Retry of payment ${paymentId} - ${payment.description || 'Monthly membership'}`
    })
    
    if (!processResult.success) {
      // Update the payment record with the new failure reason
      await supabase
        .from('payments')
        .update({
          updated_at: new Date().toISOString(),
          failure_reason: processResult.message
        })
        .eq('id', paymentId)
      
      return {
        success: false,
        message: processResult.message
      }
    }
    
    // Update the payment record to mark it as successful
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
        transaction_id: processResult.transactionId,
        failure_reason: null
      })
      .eq('id', paymentId)
    
    if (updateError) {
      console.error('Failed to update payment status after successful retry:', updateError)
      return {
        success: true,
        message: 'Payment processed but failed to update record. Please check the payment status.',
        transactionId: processResult.transactionId
      }
    }
    
    // Return success
    return {
      success: true,
      message: 'Payment retry was successful',
      transactionId: processResult.transactionId
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error retrying payment:', errorMessage)
    
    return {
      success: false,
      message: `Failed to retry payment: ${errorMessage}`
    }
  }
}

/**
 * Manually retry a failed payment
 * @param paymentId The ID of the payment to retry
 * @returns A result object with success status and optional message
 */
export async function manuallyRetryPayment(paymentId: string): Promise<RetryResult> {
  try {
    // Get the Supabase client
    const supabase = createClient()
    
    // Fetch the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, amount, status, payment_intent_id, customer_id, member_id, subscription_id, failure_reason')
      .eq('id', paymentId)
      .single()
    
    if (paymentError || !payment) {
      return {
        success: false,
        message: `Payment not found: ${paymentError?.message || 'Unknown error'}`
      }
    }
    
    // Check if the payment is failed
    if (payment.status !== 'failed') {
      return {
        success: false,
        message: `Cannot retry payment with status: ${payment.status}. Only failed payments can be retried.`
      }
    }
    
    // If there's a payment intent, try to retry it
    if (payment.payment_intent_id) {
      try {
        // Attempt to retrieve the payment intent
        const paymentIntent = await createStripeClient().paymentIntents.retrieve(payment.payment_intent_id)
        
        // If it can be retried, confirm it again
        if (['requires_payment_method', 'requires_confirmation'].includes(paymentIntent.status)) {
          await createStripeClient().paymentIntents.confirm(payment.payment_intent_id)
          
          // Update payment status in database
          await supabase
            .from('payments')
            .update({
              status: 'processing',
              updated_at: new Date().toISOString(),
              last_retry_at: new Date().toISOString()
            })
            .eq('id', paymentId)
          
          return {
            success: true,
            message: 'Payment retry initiated successfully',
            paymentId
          }
        } else {
          // Create a new payment intent if the old one can't be reused
          const newIntent = await createStripeClient().paymentIntents.create({
            amount: payment.amount,
            currency: 'usd',
            customer: payment.customer_id,
            confirm: true
          })
          
          // Update payment record with new payment intent
          await supabase
            .from('payments')
            .update({
              status: 'processing',
              payment_intent_id: newIntent.id,
              updated_at: new Date().toISOString(),
              last_retry_at: new Date().toISOString()
            })
            .eq('id', paymentId)
          
          return {
            success: true,
            message: 'Created new payment attempt successfully',
            paymentId
          }
        }
      } catch (stripeError: any) {
        return {
          success: false,
          message: `Stripe error: ${stripeError?.message || 'Unknown stripe error'}`
        }
      }
    } else {
      // If no payment intent exists, create a new one
      try {
        // First fetch the customer details
        const { data: member } = await supabase
          .from('members')
          .select('stripe_customer_id')
          .eq('id', payment.member_id)
          .single()
        
        if (!member?.stripe_customer_id) {
          return {
            success: false,
            message: 'No Stripe customer ID found for this member'
          }
        }
        
        // Create a new payment intent
        const intent = await createStripeClient().paymentIntents.create({
          amount: payment.amount,
          currency: 'usd',
          customer: member.stripe_customer_id,
          confirm: true
        })
        
        // Update payment record
        await supabase
          .from('payments')
          .update({
            status: 'processing',
            payment_intent_id: intent.id,
            updated_at: new Date().toISOString(),
            last_retry_at: new Date().toISOString()
          })
          .eq('id', paymentId)
        
        return {
          success: true,
          message: 'Created new payment intent successfully',
          paymentId
        }
      } catch (createError: any) {
        return {
          success: false,
          message: `Error creating new payment: ${createError?.message || 'Unknown error'}`
        }
      }
    }
  } catch (error: any) {
    console.error('Error in manuallyRetryPayment:', error)
    return {
      success: false,
      message: `Unexpected error: ${error?.message || 'Unknown error'}`
    }
  }
} 