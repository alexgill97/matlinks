import { NextRequest, NextResponse } from 'next/server';
import { constructEventFromPayload, createStripeClient } from '@/app/lib/stripe';
import { createClient } from '@/app/lib/supabase/server';
import Stripe from 'stripe';
import { recordFailedPayment } from '@/app/lib/payment-failure-service';

// Define types for Stripe event objects
interface StripeCheckoutSession extends Stripe.Checkout.Session {
  customer: string;
  subscription: string;
  metadata: {
    user_id?: string;
    membership_plan_id?: string;
  };
}

// Extend Stripe.Invoice to include payment error details
type StripeInvoice = Stripe.Invoice & {
  status: string;
  payment_intent?: string;
  subscription?: string;
  customer: string;
  last_payment_error?: {
    code?: string;
    doc_url?: string;
    message?: string;
    param?: string;
    payment_method?: {
      id: string;
      object: string;
      type: string;
    };
    type: string;
  };
}

interface StripeSubscription extends Omit<Stripe.Subscription, 'status'> {
  customer: string;
  status: string;
}

// Webhook handler for Stripe events
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }
  
  const payload = await req.text();
  const buffer = Buffer.from(payload);
  
  try {
    const event = await constructEventFromPayload(signature, buffer);
    const stripe = createStripeClient();
    const supabase = createClient();
    
    console.log(`Processing Stripe event: ${event.type}`);
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as StripeCheckoutSession;
        
        // Extract metadata from the session
        const { user_id, membership_plan_id } = session.metadata || {};
        
        if (user_id && membership_plan_id) {
          // Update the user's membership details
          const { error } = await supabase
            .from('member_profiles')
            .update({
              current_plan_id: membership_plan_id,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user_id);
            
          if (error) {
            console.error('Error updating membership:', error);
          }
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        // Handle successful payment
        const invoice = event.data.object as StripeInvoice;
        const subscription = invoice.subscription;
        
        if (subscription) {
          // Retrieve subscription to get customer ID
          const stripeSubscription = await stripe.subscriptions.retrieve(subscription);
          
          // Update payment record in database
          const { error } = await supabase
            .from('payment_history')
            .insert({
              stripe_invoice_id: invoice.id,
              stripe_customer_id: stripeSubscription.customer as string,
              amount_paid: invoice.amount_paid,
              period_start: new Date(invoice.period_start * 1000).toISOString(),
              period_end: new Date(invoice.period_end * 1000).toISOString(),
              status: invoice.status,
              created_at: new Date().toISOString()
            });
            
          if (error) {
            console.error('Error recording payment:', error);
          }
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        // Handle failed payment
        const invoice = event.data.object as StripeInvoice;
        const subscription = invoice.subscription;
        const customer = invoice.customer;
        
        console.log('Payment failed for invoice:', invoice.id);
        
        if (!invoice.last_payment_error) {
          console.error('No payment error details available');
          break;
        }
        
        // Get failure reason from the payment error
        const failureReason = invoice.last_payment_error.type || 'unknown';
        const paymentMethodId = invoice.last_payment_error.payment_method?.id || 'unknown';
        
        // Ensure customer and subscription are valid string values
        const customerId = typeof customer === 'string' ? customer : 
                         typeof customer === 'object' && customer ? customer.id : 
                         '';
                         
        if (!customerId) {
          console.error('Invalid customer ID for invoice:', invoice.id);
          break;
        }
        
        const subscriptionId = subscription && typeof subscription === 'string' ? subscription : undefined;
        
        // Record the failed payment
        const result = await recordFailedPayment(
          customerId,
          invoice.id,
          invoice.amount_paid || 0, // Use total for amount since amount_paid might be 0 in failure case
          invoice.currency || 'usd', // Get currency from invoice with fallback
          paymentMethodId,
          failureReason,
          subscriptionId
        );
        
        if (!result.success) {
          console.error('Failed to record payment failure:', result.error);
        } else {
          console.log('Successfully recorded failed payment:', result.failedPaymentId);
        }
        
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as StripeSubscription;
        const { customer, status } = subscription;
        
        // Update subscription status for the customer
        const { error } = await supabase
          .from('member_profiles')
          .update({
            subscription_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customer);
          
        if (error) {
          console.error('Error updating subscription status:', error);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as StripeSubscription;
        const { customer } = subscription;
        
        // Update subscription status to cancelled
        const { error } = await supabase
          .from('member_profiles')
          .update({
            subscription_status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customer);
          
        if (error) {
          console.error('Error cancelling subscription:', error);
        }
        break;
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 400 }
    );
  }
} 