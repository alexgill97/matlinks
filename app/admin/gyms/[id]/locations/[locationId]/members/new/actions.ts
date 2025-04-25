'use server'

import { createClient as createServerClient } from '@/app/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'; // Need standard client for admin actions
import { revalidatePath } from 'next/cache'

// Helper function to check user role (can be reused or moved)
async function checkAdminRole() {
  const supabase = createServerClient(); // Use server client for initial auth check
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
      return { isAdmin: false, error: 'Unauthorized: Only admins or owners can add members.' };
  }
  return { isAdmin: true, error: null };
}

export async function addMember(formData: FormData) {
  
  // --- Authorization Check --- 
  const authCheck = await checkAdminRole();
  if (!authCheck.isAdmin) {
      return { error: authCheck.error };
  }
  // -------------------------

  const email = formData.get('email') as string;
  const fullName = formData.get('full_name') as string | null;
  const locationIdString = formData.get('location_id') as string;

  // --- Basic Validation ---
  if (!email) return { error: 'Member email is required.' };
  if (!locationIdString) return { error: 'Location ID is missing.' };
  
  const location_id = parseInt(locationIdString, 10);
  if (isNaN(location_id)) return { error: 'Invalid Location ID.' };

  // Basic email format check (can be improved)
  if (!/\S+@\S+\.\S+/.test(email)) {
      return { error: 'Invalid email format.' };
  }
  // ----------------------

  const supabaseAdmin = createClient( // Use standard client with service role key
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const supabaseServer = createServerClient(); // For public schema operations

  let userId: string | null = null;
  let userExists = false;
  // eslint-disable-next-line prefer-const
  let profileUpdateData: { primary_location_id: number; full_name?: string; updated_at: string } = {
      primary_location_id: location_id,
      updated_at: new Date().toISOString(),
  };
  if (fullName) {
      profileUpdateData.full_name = fullName;
  }

  try {
    // --- Check if user exists in auth.users --- 
    const { data: existingUserData, error: getUserError } = await supabaseAdmin
      .from('users') // Query auth.users schema via admin
      .select('id')
      .eq('email', email)
      .single();

    if (getUserError && getUserError.code !== 'PGRST116') { // Ignore 'Not Found' error
        console.error("Error checking existing user:", getUserError);
        throw new Error('Failed to check for existing user.');
    }

    if (existingUserData) {
        // --- User Exists: Update Profile --- 
        userId = existingUserData.id;
        userExists = true;
        console.log(`User ${email} exists with ID: ${userId}. Updating profile.`);
        
        const { error: updateProfileError } = await supabaseServer
            .from('profiles')
            .update(profileUpdateData)
            .eq('id', userId);

        if (updateProfileError) {
            console.error("Error updating existing profile:", updateProfileError);
            throw new Error('Failed to update profile for existing user.');
        }
        // ---------------------------------
    } else {
        // --- User Doesn't Exist: Invite & Create/Update Profile --- 
        console.log(`User ${email} does not exist. Inviting...`);
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin
            .inviteUserByEmail(email, {
                // Optional: redirect URL after invite acceptance
                // redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm` 
            });

        if (inviteError) {
            console.error("Error inviting user:", inviteError);
            throw new Error(`Failed to invite user: ${inviteError.message}`);
        }
        if (!inviteData || !inviteData.user) {
             throw new Error('Invite sent, but user data was not returned.');
        }
        
        userId = inviteData.user.id;
        console.log(`User ${email} invited. User ID: ${userId}. Upserting profile...`);

        // After invite, ensure profile exists/is updated in public schema
        const { error: upsertProfileError } = await supabaseServer
            .from('profiles')
            .upsert({ 
                id: userId,
                 ...profileUpdateData 
            }, { onConflict: 'id' }); // Update if profile already exists (e.g., from trigger)

        if (upsertProfileError) {
            console.error("Error upserting profile after invite:", upsertProfileError);
            // Note: User was invited, but profile update failed. May need manual fix.
            throw new Error('User invited, but failed to update profile.');
        }
        // -----------------------------------------------------------
    }

    // --- Revalidation --- 
    revalidatePath(`/admin/gyms/${location_id}/locations`); // Might contain member count?
    revalidatePath(`/admin/gyms/${location_id}/locations/${location_id}/members`);
    // Consider revalidating user-specific pages if applicable
    // ------------------

    console.log(`Successfully ${userExists ? 'updated profile for' : 'invited and updated profile for'} ${email}`);
    return { error: null, userId: userId };

  } catch (error: unknown) {
    console.error("Error in addMember action:", error);
    // Type guard for error message
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: message };
  }
} 