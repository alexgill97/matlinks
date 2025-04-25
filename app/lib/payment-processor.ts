import { createClient } from '@/app/lib/supabase/server'
import Stripe from 'stripe'

type PaymentInput = {
  amount: number
  currency: string
  paymentMethodId: string
  memberId: string
  description: string
}

type PaymentResult = {
  success: boolean
  message: string
  transactionId?: string
}

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil',
})

/**
 * Process a payment using Stripe
 * @param input Payment details including amount, currency, and payment method
 * @returns Object with success status, message, and transaction ID if successful
 */
export async function processPayment(input: PaymentInput): Promise<PaymentResult> {
  const supabase = createClient()
  
  try {
    // Validate input
    if (!input.amount || input.amount <= 0) {
      return { 
        success: false, 
        message: 'Invalid payment amount' 
      }
    }
    
    if (!input.paymentMethodId) {
      return { 
        success: false, 
        message: 'Payment method ID is required' 
      }
    }
    
    // Get the payment method details from our database
    const { data: paymentMethodData, error: paymentMethodError } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id, customer_id')
      .eq('id', input.paymentMethodId)
      .single()
    
    if (paymentMethodError || !paymentMethodData) {
      return { 
        success: false, 
        message: `Payment method not found: ${paymentMethodError?.message || 'No data returned'}` 
      }
    }
    
    // Process the payment with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(input.amount * 100), // Convert to cents
      currency: input.currency.toLowerCase(),
      payment_method: paymentMethodData.stripe_payment_method_id,
      customer: paymentMethodData.customer_id,
      confirm: true,
      description: input.description,
      metadata: {
        member_id: input.memberId
      }
    })
    
    // Check if payment was successful
    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        message: 'Payment processed successfully',
        transactionId: paymentIntent.id
      }
    } else if (paymentIntent.status === 'requires_action') {
      return {
        success: false,
        message: 'Payment requires additional authentication. Please try again with authentication.'
      }
    } else {
      return {
        success: false,
        message: `Payment failed with status: ${paymentIntent.status}`
      }
    }
  } catch (error) {
    // Handle Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe error during payment processing:', error)
      
      // Format user-friendly error message based on error code
      let errorMessage = 'Payment processing failed'
      
      if (error instanceof Stripe.errors.StripeCardError) {
        errorMessage = `Card error: ${error.message}`
      } else if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        errorMessage = 'Invalid payment request'
      } else if (error instanceof Stripe.errors.StripeAPIError) {
        errorMessage = 'Payment service temporarily unavailable'
      }
      
      return {
        success: false,
        message: errorMessage
      }
    }
    
    // Handle other errors
    console.error('Error processing payment:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return {
      success: false,
      message: `Failed to process payment: ${errorMessage}`
    }
  }
} 