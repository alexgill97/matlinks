'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/app/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function recordManualPayment(formData: FormData) {
  const supabase = createClient();
  
  // Get the current user to check for admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }
  
  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Unauthorized - Admin role required' };
  }
  
  // Parse and validate the form data
  const memberId = formData.get('memberId') as string;
  const amountStr = formData.get('amount') as string;
  const amount = Math.round(parseFloat(amountStr) * 100); // Convert to cents
  const paymentMethod = formData.get('paymentMethod') as string;
  const description = formData.get('description') as string;
  const receiptNumber = formData.get('receiptNumber') as string;
  
  // Validate required fields
  if (!memberId) {
    return { success: false, error: 'Member ID is required' };
  }
  
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Valid amount is required' };
  }
  
  if (!paymentMethod) {
    return { success: false, error: 'Payment method is required' };
  }
  
  try {
    // Get member's Stripe customer ID if available
    const { data: member, error: memberError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', memberId)
      .single();
    
    if (memberError) {
      return { success: false, error: `Member not found: ${memberError.message}` };
    }
    
    const now = new Date();
    const periodStart = now.toISOString();
    
    // For manual payments, set period_end to 30 days from now by default
    const periodEnd = new Date(now.setDate(now.getDate() + 30)).toISOString();
    
    // Insert the payment record into the payment_history table
    const { error: insertError } = await supabase
      .from('payment_history')
      .insert({
        user_id: memberId,
        stripe_customer_id: member.stripe_customer_id || null,
        stripe_invoice_id: null, // No Stripe invoice for manual payments
        amount_paid: amount,
        period_start: periodStart,
        period_end: periodEnd,
        status: 'paid',
        payment_method: paymentMethod,
        description: description || 'Manual payment',
        receipt_number: receiptNumber || null,
        is_manual: true,
        created_at: new Date().toISOString(),
      });
    
    if (insertError) {
      return { success: false, error: `Failed to record payment: ${insertError.message}` };
    }
    
    // Revalidate the payments page
    revalidatePath('/admin/finance/payments');
    revalidatePath('/admin/finance');
    
    // Redirect to the payments page
    redirect('/admin/finance/payments');
  } catch (error) {
    const err = error as Error;
    return { success: false, error: `Unexpected error: ${err.message}` };
  }
} 