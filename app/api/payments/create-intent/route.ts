import { NextRequest, NextResponse } from 'next/server';
import { createStripeClient } from '@/app/lib/stripe';
import { createClient } from '@/app/lib/supabase/server';

export async function POST(req: NextRequest) {
  const stripe = createStripeClient();
  const supabase = createClient();
  
  try {
    // Parse the request body
    const { amount, currency = 'usd', memberId, description } = await req.json();
    
    // Validate the request
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }
    
    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }
    
    // Get the member's Stripe customer ID
    const { data: member, error: memberError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', memberId)
      .single();
    
    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }
    
    // If the member doesn't have a Stripe customer ID, create one
    let customerId = member.stripe_customer_id;
    if (!customerId) {
      // Get user email from auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(memberId);
      
      if (userError || !userData) {
        return NextResponse.json(
          { error: 'User data not found' },
          { status: 404 }
        );
      }
      
      // Create a Stripe customer
      const customer = await stripe.customers.create({
        email: userData.user.email,
        name: member.full_name || undefined,
        metadata: {
          user_id: memberId,
        },
      });
      
      // Update the user profile with the Stripe customer ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId);
      
      if (updateError) {
        console.error('Error updating user profile with Stripe customer ID:', updateError);
      }
      
      customerId = customer.id;
    }
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency,
      customer: customerId,
      description: description || 'Payment to MatLinks',
      metadata: {
        member_id: memberId,
      },
    });
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error creating payment intent:', error.message);
    return NextResponse.json(
      { error: `Payment Error: ${error.message}` },
      { status: 500 }
    );
  }
} 