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

export async function addLocation(formData: FormData) {
  const supabase = createClient()

  // --- Authorization Check ---
  const isAdmin = await checkAdminRole(supabase);
  if (!isAdmin) {
      return { error: 'Unauthorized: Only admins or owners can add locations.' };
  }
  // -------------------------

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const gym_id_str = formData.get('gym_id') as string
  // TODO: Get contact_info and operating_hours (likely need structured form inputs)
  // const contact_info = JSON.parse(formData.get('contact_info') as string || '{}');
  // const operating_hours = JSON.parse(formData.get('operating_hours') as string || '{}');

  if (!name) {
    return { error: 'Location name is required.' }
  }
  if (!gym_id_str) {
    return { error: 'Gym selection is required.' }
  }

  const gym_id = parseInt(gym_id_str, 10);
  if (isNaN(gym_id)) {
    return { error: 'Invalid Gym selected.' };
  }

  const { data, error } = await supabase
    .from('locations')
    .insert([
      {
        name,
        address,
        gym_id,
        // contact_info,
        // operating_hours,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error adding location:', error)
    return { error: `Failed to add location: ${error.message}` }
  }

  revalidatePath('/admin/locations')

  return { error: null, data }
} 