'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Allowed interval values type (reuse from page or define centrally)
type PlanInterval = 'month' | 'year' | 'week' | 'day' | 'one_time' | null;

// Helper function to check user role (can be reused or moved)
async function checkAdminRole() {
  const supabase = createClient(); 
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false, error: 'Not authenticated' };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
      console.error("Error fetching user profile or profile not found", error);
      return { isAdmin: false, error: 'Failed to verify admin role.' };
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'owner';
  if (!isAdmin) {
      return { isAdmin: false, error: 'Unauthorized: Only admins or owners can add membership plans.' };
  }
  return { isAdmin: true, error: null };
}

export async function addMembershipPlan(formData: FormData) {
  
  // --- Authorization Check --- 
  const authCheck = await checkAdminRole();
  if (!authCheck.isAdmin) {
      return { error: authCheck.error };
  }
  const supabase = createClient();
  // -------------------------

  // --- Get Data & Validate ---
  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null; 
  const priceString = formData.get('price') as string | null;
  const interval = formData.get('interval') as PlanInterval | ''; // Allow empty string from select
  const isActiveString = formData.get('is_active') as string; 
  const stripePriceId = formData.get('stripe_price_id') as string | null;

  if (!name) return { error: 'Plan name is required.' };

  let price: number | null = null;
  if (priceString) {
    price = parseInt(priceString, 10);
    if (isNaN(price) || price < 0) {
        return { error: 'Invalid price provided.' };
    }
  }

  const finalInterval = interval === '' ? null : interval;
  if (price !== null && price > 0 && !finalInterval) {
      return { error: 'Billing interval is required for paid plans.' };
  }
  if (price === null || price === 0) {
      // If plan is free, interval might not be relevant or should be null/one_time
      // For simplicity, let's allow null interval for free plans
  }

  const is_active = isActiveString === 'true';
  // -------------------------

  // --- Prepare Insert Data ---
  const insertData = {
      name,
      description: description || null, // Ensure empty string becomes null
      price,
      interval: finalInterval,
      is_active,
      stripe_price_id: stripePriceId || null,
  };
  // -------------------------

  // --- Execute Insert ---
  const { error: insertError } = await supabase
    .from('membership_plans')
    .insert([insertData]); // insert expects an array
  // --------------------

  if (insertError) {
    console.error('Error adding membership plan:', insertError);
    // TODO: Check for unique constraint violation on name? 
    return { error: `Failed to add membership plan: ${insertError.message}` };
  }

  // --- Revalidate Paths ---
  revalidatePath('/admin/memberships/plans');
  // ----------------------

  console.log(`Successfully added membership plan: ${name}`);
  return { error: null };
} 