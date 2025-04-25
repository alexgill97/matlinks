import { NextRequest, NextResponse } from 'next/server';
import { createStripeClient } from '@/app/lib/stripe';
import { createClient } from '@/app/lib/supabase/server';

// DELETE handler to remove a payment method
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const paymentMethodId = params.id;
  
  if (!paymentMethodId) {
    return NextResponse.json(
      { error: 'Payment method ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const body = await request.json();
    const { customerId } = body;
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
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
    
    // Fetch payment method first to verify it belongs to the customer
    const stripe = createStripeClient();
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    if (paymentMethod.customer !== customerId) {
      return NextResponse.json(
        { error: 'This payment method does not belong to the specified customer' },
        { status: 403 }
      );
    }
    
    // Detach payment method from the customer
    await stripe.paymentMethods.detach(paymentMethodId);
    
    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error removing payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove payment method' },
      { status: 500 }
    );
  }
} 