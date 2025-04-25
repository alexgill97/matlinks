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
      return { isAdmin: false, error: 'Unauthorized: Only admins or owners can update membership plans.' };
  }
  return { isAdmin: true, error: null };
}

// --- Update Membership Plan Action ---
export async function updateMembershipPlan(formData: FormData) {
  
  // --- Authorization Check ---
  const authCheck = await checkAdminRole();
  if (!authCheck.isAdmin) {
      return { error: authCheck.error };
  }
  const supabase = createClient();
  // -------------------------

  // --- Get Data & Validate ---
  const planIdString = formData.get('plan_id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null; 
  const priceString = formData.get('price') as string | null;
  const interval = formData.get('interval') as PlanInterval | ''; // Allow empty string from select
  const isActiveString = formData.get('is_active') as string; 
  const stripePriceId = formData.get('stripe_price_id') as string | null;

  if (!planIdString) return { error: 'Plan ID is missing.' };
  if (!name) return { error: 'Plan name is required.' };

  const plan_id = parseInt(planIdString, 10);
  if (isNaN(plan_id)) return { error: 'Invalid Plan ID.' };

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

  const is_active = isActiveString === 'true';
  // -------------------------

  // --- Prepare Update Data ---
  const updateData = {
      name,
      description: description || null,
      price,
      interval: finalInterval,
      is_active,
      updated_at: new Date().toISOString(),
      stripe_price_id: stripePriceId || null,
  };
  // -------------------------

  // --- Execute Update ---
  const { error: updateError } = await supabase
    .from('membership_plans')
    .update(updateData)
    .eq('id', plan_id);
  // --------------------

  if (updateError) {
    console.error('Error updating membership plan:', updateError);
    return { error: `Failed to update membership plan: ${updateError.message}` };
  }

  // --- Revalidate Paths ---
  revalidatePath('/admin/memberships/plans');
  revalidatePath(`/admin/memberships/plans/${plan_id}/edit`);
  // ----------------------

  console.log(`Successfully updated membership plan: ${name} (ID: ${plan_id})`);
  return { error: null };
}

// --- Delete/Deactivate Membership Plan Action ---
// Renamed conceptually - this now DEACTIVATES the plan
export async function deactivateMembershipPlan(planId: number) {
    // --- Authorization Check ---
    const authCheck = await checkAdminRole();
    if (!authCheck.isAdmin) {
        return { error: authCheck.error };
    }
    // -------------------------

    if (!planId || isNaN(planId)) {
        return { error: 'Invalid Plan ID for deactivation.' };
    }

    // --- Execute Deactivation --- 
    const supabase = createClient();
    const { error } = await supabase
        .from('membership_plans')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', planId);
    // --------------------------
    
    if (error) {
        console.error('Error deactivating plan:', error);
        return { error: 'Failed to deactivate plan.' };
    }
    
    // --- Revalidate Paths ---
    revalidatePath('/admin/memberships/plans');
    revalidatePath(`/admin/memberships/plans/${planId}/edit`);
    // ----------------------

    console.log(`Successfully deactivated membership plan ID: ${planId}`);
    return { error: null };
} 