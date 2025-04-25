'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper function to check user role (can be reused or moved)
async function checkAdminRole(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
      console.error("Error fetching user profile or profile not found", error);
      return false;
  }

  return profile.role === 'admin' || profile.role === 'owner';
}

// --- Update Location Action ---
export async function updateLocation(formData: FormData) {
  const supabase = createClient()

  // --- Authorization Check ---
  const isAdmin = await checkAdminRole(supabase);
  if (!isAdmin) {
      return { error: 'Unauthorized: Only admins or owners can update locations.' };
  }
  // -------------------------

  // --- Get Data & Validate ---
  const locationIdString = formData.get('location_id') as string;
  const gymIdString = formData.get('gym_id') as string; // Get gymId for revalidation
  const name = formData.get('name') as string;
  const address = formData.get('address') as string | null;
  const city = formData.get('city') as string | null;
  // Get other fields (state, zip, etc.)

  if (!locationIdString) return { error: 'Location ID is missing.' };
  if (!name) return { error: 'Location name is required.' };
  if (!gymIdString) return { error: 'Gym ID context is missing.' }; 

  const location_id = parseInt(locationIdString, 10);
  const gym_id = parseInt(gymIdString, 10);
  if (isNaN(location_id)) return { error: 'Invalid Location ID.' };
  if (isNaN(gym_id)) return { error: 'Invalid Gym ID context.' };
  // -------------------------

  // --- Prepare Update Data ---
  const updateData = {
    name,
    address,
    city,
    updated_at: new Date().toISOString(),
    // Add other fields here
  };
  // -------------------------

  // --- Execute Update ---
  const { error: updateError } = await supabase
    .from('locations')
    .update(updateData)
    .eq('id', location_id);
  // --------------------

  if (updateError) {
    console.error('Error updating location:', updateError);
    return { error: `Failed to update location: ${updateError.message}` };
  }

  // --- Revalidate Paths ---
  revalidatePath(`/admin/gyms/${gym_id}/locations`);
  revalidatePath(`/admin/gyms/${gym_id}/locations/${location_id}/edit`);
  // ----------------------

  return { error: null };
}

// --- Delete Location Action ---
export async function deleteLocation(locationId: number, gymId: number) {
  const supabase = createClient()

  // --- Authorization Check ---
  const isAdmin = await checkAdminRole(supabase);
  if (!isAdmin) {
      return { error: 'Unauthorized: Only admins or owners can delete locations.' };
  }
  // -------------------------

  // --- Validate ID ---
  if (!locationId || isNaN(locationId)) {
    return { error: 'Invalid Location ID provided for deletion.' };
  }
  if (!gymId || isNaN(gymId)) {
      return { error: 'Invalid Gym ID context provided for deletion.' };
  }
  // -----------------

  // --- Execute Delete ---
  const { error: deleteError } = await supabase
    .from('locations')
    .delete()
    .eq('id', locationId);
  // --------------------

  if (deleteError) {
    console.error('Error deleting location:', deleteError);
    return { error: `Failed to delete location: ${deleteError.message}` };
  }

  // --- Revalidate Path ---
  revalidatePath(`/admin/gyms/${gymId}/locations`);
  // ---------------------

  return { error: null };
} 