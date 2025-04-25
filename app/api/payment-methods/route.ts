import { NextRequest, NextResponse } from 'next/server';
import { createStripeClient } from '@/app/lib/stripe';
import { createClient } from '@/app/lib/supabase/server';

// GET handler to list a customer's payment methods
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customerId = searchParams.get('customerId');
  
  if (!customerId) {
    return NextResponse.json(
      { error: 'Customer ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Check authentication
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Check if user has permission to access this customer's data
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';
    const isOwnCustomer = profile?.stripe_customer_id === customerId;
    
    if (!isAdmin && !isOwnCustomer) {
      return NextResponse.json(
        { error: 'You do not have permission to access this data' },
        { status: 403 }
      );
    }
    
    // Fetch payment methods from Stripe
    const stripe = createStripeClient();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    
    return NextResponse.json({
      paymentMethods: paymentMethods.data,
    });
  } catch (err) {
    console.error('Error fetching payment methods:', err);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// POST handler to add a payment method to a customer
export async function POST(request: NextRequest) {
  try {
    const { customerId, paymentMethodId } = await request.json();
    
    if (!customerId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Customer ID and payment method ID are required' },
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
    
    // Check if user has permission to modify this customer's data
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';
    const isOwnCustomer = profile?.stripe_customer_id === customerId;
    
    if (!isAdmin && !isOwnCustomer) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this data' },
        { status: 403 }
      );
    }
    
    // Attach payment method to customer in Stripe
    const stripe = createStripeClient();
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    
    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Payment method added successfully',
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error adding payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add payment method' },
      { status: 500 }
    );
  }
} 