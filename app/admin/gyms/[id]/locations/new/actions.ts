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

export async function addLocation(formData: FormData) {
  const supabase = createClient()

  // --- Authorization Check --- 
  const isAdmin = await checkAdminRole(supabase);
  if (!isAdmin) {
      return { error: 'Unauthorized: Only admins or owners can add locations.' };
  }
  // -------------------------

  const name = formData.get('name') as string
  const address = formData.get('address') as string | null
  const city = formData.get('city') as string | null
  const gymIdString = formData.get('gym_id') as string

  // --- Validation ---
  if (!name) {
    return { error: 'Location name is required.' }
  }
  if (!gymIdString) {
      return { error: 'Gym ID is missing.' }
  }
  const gym_id = parseInt(gymIdString, 10);
  if (isNaN(gym_id)) {
      return { error: 'Invalid Gym ID.' };
  }
  // TODO: Add more validation for address, city etc. if needed
  // ------------------

  // --- Insert into database ---
  const { data, error: insertError } = await supabase
    .from('locations')
    .insert([
      {
        name,
        address,
        city,
        gym_id, // Make sure this matches your DB schema column name
        // Add other fields like state, zip_code, etc. here
      },
    ])
    .select()
    .single()
  // ------------------------

  if (insertError) {
    console.error('Error adding location:', insertError)
    return { error: `Failed to add location: ${insertError.message}` }
  }

  // --- Revalidate relevant paths ---
  revalidatePath(`/admin/gyms/${gym_id}/locations`)
  revalidatePath('/admin/locations') // If you have a global locations list
  // ------------------------------

  return { error: null, data }
} 