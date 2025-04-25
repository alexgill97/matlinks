'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// --- Helper function (could be moved to a shared lib/utils file) ---
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
// ---------------------------------------------------------------------

// TODO: Add role-based authorization checks

export async function updateLocation(formData: FormData) {
  const supabase = createClient()

  // --- Authorization Check ---
  const isAdmin = await checkAdminRole(supabase);
  if (!isAdmin) {
      return { error: 'Unauthorized: Only admins or owners can update locations.' };
  }
  // -------------------------

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const gym_id_str = formData.get('gym_id') as string
  // TODO: Handle contact_info, operating_hours

  if (!id) return { error: 'Location ID is missing.' };
  if (!name) return { error: 'Location name is required.' };
  if (!gym_id_str) return { error: 'Gym selection is required.' };

  const locationId = parseInt(id, 10);
  const gym_id = parseInt(gym_id_str, 10);
  if (isNaN(locationId)) return { error: 'Invalid Location ID.' };
  if (isNaN(gym_id)) return { error: 'Invalid Gym selected.' };

  const { error } = await supabase
    .from('locations')
    .update({
      name,
      address,
      gym_id,
      updated_at: new Date().toISOString(),
      // contact_info,
      // operating_hours,
    })
    .eq('id', locationId)

  if (error) {
    console.error('Error updating location:', error)
    return { error: `Failed to update location: ${error.message}` }
  }

  revalidatePath('/admin/locations')

  return { error: null }
}

export async function deleteLocation(locationId: number) {
  const supabase = createClient()

  // --- Authorization Check ---
  const isAdmin = await checkAdminRole(supabase);
  if (!isAdmin) {
      return { error: 'Unauthorized: Only admins or owners can delete locations.' };
  }
  // -------------------------

  // TODO: Add role-based authorization checks
  if (!locationId || isNaN(locationId)) {
    return { error: 'Invalid Location ID provided for deletion.' };
  }

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', locationId)

  if (error) {
    console.error('Error deleting location:', error)
    return { error: `Failed to delete location: ${error.message}` }
  }

  revalidatePath('/admin/locations')

  return { error: null }
} 