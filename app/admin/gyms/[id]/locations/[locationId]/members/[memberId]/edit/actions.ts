'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { recordRankProgression } from '@/app/admin/ranks/actions'

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
      return { isAdmin: false, error: 'Unauthorized: Only admins or owners can update members.' };
  }
  return { isAdmin: true, error: null };
}

// --- Update Member Profile Action ---
export async function updateMemberProfile(formData: FormData) {
  
  // --- Authorization ---
  const authCheck = await checkAdminRole();
  if (!authCheck.isAdmin) {
      return { error: authCheck.error };
  }
  const supabase = createClient();
  // -------------------

  // --- Get Data & Validate ---
  const profileId = formData.get('profile_id') as string;
  const fullName = formData.get('full_name') as string | null; // Allow empty string
  const primaryLocationIdString = formData.get('primary_location_id') as string;
  const currentPlanIdString = formData.get('current_plan_id') as string; // Get plan ID string
  const currentRankIdString = formData.get('current_rank_id') as string; // Get rank ID string
  const currentGymIdString = formData.get('current_gym_id') as string;
  const currentLocationIdString = formData.get('current_location_id') as string;
  // Get role, etc. if needed

  if (!profileId) return { error: 'Member Profile ID is missing.' };
  // Full name can be optional or empty
  if (!currentGymIdString) return { error: 'Current Gym ID context is missing.' }; 
  if (!currentLocationIdString) return { error: 'Current Location ID context is missing.' };

  const currentGymId = parseInt(currentGymIdString, 10);
  const currentLocationId = parseInt(currentLocationIdString, 10);
  if (isNaN(currentGymId)) return { error: 'Invalid Current Gym ID context.' };
  if (isNaN(currentLocationId)) return { error: 'Invalid Current Location ID context.' };

  let primary_location_id: number | null = null;
  if (primaryLocationIdString) {
      const parsedId = parseInt(primaryLocationIdString, 10);
      if (isNaN(parsedId)) return { error: 'Invalid Primary Location ID format.' };
      primary_location_id = parsedId;
  }

  let current_plan_id: number | null = null;
  if (currentPlanIdString) {
      const parsedPlanId = parseInt(currentPlanIdString, 10);
      if (isNaN(parsedPlanId)) return { error: 'Invalid Membership Plan ID format.' };
      current_plan_id = parsedPlanId;
      // TODO: Optionally verify here that the selected plan ID actually exists and is active?
      // This would require another DB query.
  }

  // <<< Parse and validate Rank ID >>>
  let current_rank_id: number | null = null;
  if (currentRankIdString) {
      const parsedRankId = parseInt(currentRankIdString, 10);
      if (isNaN(parsedRankId)) return { error: 'Invalid Rank ID format.' };
      current_rank_id = parsedRankId;
      // TODO: Optionally verify rank exists?
  }
  // -------------------------

  // --- Get current profile data to detect changes ---
  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('current_rank_id')
    .eq('id', profileId)
    .single();

  if (profileError) {
    console.error('Error fetching current profile data:', profileError);
    return { error: `Failed to fetch current profile data: ${profileError.message}` };
  }

  const previousRankId = currentProfile.current_rank_id;
  // -------------------------

  // --- Prepare Update Data ---
  const updateData: { 
      full_name: string | null; 
      primary_location_id: number | null;
      current_plan_id: number | null; // Add plan ID to update data
      current_rank_id: number | null; // <<< Add rank ID to update data >>>
      updated_at: string;
      // role?: string | null; // Add role if managing
  } = {
    full_name: fullName, // Send null if empty string was intended as null, else send empty string
    primary_location_id: primary_location_id, 
    current_plan_id: current_plan_id, // Include plan ID
    current_rank_id: current_rank_id, // <<< Include rank ID >>>
    updated_at: new Date().toISOString(),
    // Add role here if applicable
  };
  // -------------------------

  // --- Execute Update ---
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', profileId);
  // --------------------

  if (updateError) {
    console.error('Error updating member profile:', updateError);
    return { error: `Failed to update member profile: ${updateError.message}` };
  }

  // --- Record rank progression if rank changed ---
  if (current_rank_id !== previousRankId) {
    try {
      const notes = `Rank updated through member profile edit.`;
      await recordRankProgression(profileId, current_rank_id!, previousRankId, notes);
    } catch (error) {
      console.error('Error recording rank progression:', error);
      // Don't fail the whole operation if rank progression recording fails
      // Just log the error and continue
    }
  }
  // -------------------------

  // --- Revalidate Paths ---
  revalidatePath(`/admin/gyms/${currentGymId}/locations/${currentLocationId}/members`);
  revalidatePath(`/admin/gyms/${currentGymId}/locations/${currentLocationId}/members/${profileId}/edit`);
  if (primary_location_id && primary_location_id !== currentLocationId) {
      // Also revalidate the new location's member list if changed
      revalidatePath(`/admin/gyms/${currentGymId}/locations/${primary_location_id}/members`);
  }
  // Revalidate rank history page if rank changed
  if (current_rank_id !== previousRankId) {
    revalidatePath('/admin/ranks/history');
  }
  // ----------------------

  console.log(`Successfully updated profile for ${profileId}`);
  return { error: null };
}

// --- Delete Member Action (Placeholder) ---
export async function deleteMember(profileId: string) {
    // --- Authorization ---
    const authCheck = await checkAdminRole();
    if (!authCheck.isAdmin) {
        return { error: authCheck.error };
    }
    // -------------------

    console.warn(`deleteMember action called for profile ${profileId}, but it's not fully implemented.`);
    // TODO: Define actual deletion logic:
    // 1. Disassociate: Update profile set primary_location_id = null
    // 2. Disable Role: Update profile set role = 'disabled'
    // 3. Hard Delete: Use Admin client to delete user (requires careful consideration)
    
    // Example: Disassociation (Option 1)
    /*
    const supabase = createClient();
    const { error } = await supabase
        .from('profiles')
        .update({ primary_location_id: null, updated_at: new Date().toISOString() })
        .eq('id', profileId);
    
    if (error) {
        console.error('Error disassociating member:', error);
        return { error: 'Failed to disassociate member from location.' };
    }
    revalidatePath(`/admin/gyms/${gymId}/locations/${locationId}/members`);
    revalidatePath(`/admin/gyms/${gymId}/locations/${locationId}/members/${profileId}/edit`);
    return { error: null };
    */

   // For now, return an error indicating it's not implemented
   return { error: 'Delete/Disable member functionality is not yet fully implemented.' };
} 