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

// --- Restore updateGym function ---
export async function updateGym(formData: FormData) {
  const supabase = createClient()

  // --- Authorization Check ---
  const isAdmin = await checkAdminRole(supabase);
  if (!isAdmin) {
      return { error: 'Unauthorized: Only admins or owners can update gyms.' };
  }
  // -------------------------

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const logoFile = formData.get('logo') as File | null // Get potential new logo
  const removeLogoFlag = formData.get('remove_logo') === 'true' // Check for removal flag

  if (!id) return { error: 'Gym ID is missing.' };
  if (!name) return { error: 'Gym name is required.' };

  const gymId = parseInt(id, 10);
  if (isNaN(gymId)) return { error: 'Invalid Gym ID.' };

  let finalLogoUrl: string | undefined | null = undefined; // Use undefined to signal no change unless set to null (remove) or new URL (upload)
  let uploadError: string | null = null;
  let pathToDelete: string | null = null; // Unified path for potential deletion

  // --- Step 1: Fetch current gym data to get existing logo_url ---
  const { data: currentGym, error: fetchError } = await supabase
    .from('gyms')
    .select('logo_url')
    .eq('id', gymId)
    .single();

  if (fetchError) {
    console.error('Error fetching current gym data:', fetchError);
    return { error: 'Failed to fetch current gym data before update.' };
  }

  const currentLogoUrl = currentGym?.logo_url;
  if (currentLogoUrl) {
      try {
          const url = new URL(currentLogoUrl);
          // Extract path relative to the bucket
          pathToDelete = url.pathname.split('/gym-logos/')[1]; 
      } catch (e) {
          console.error("Error parsing current logo URL:", e);
          pathToDelete = null; // Cannot delete if URL is invalid
      }
  }
  // ------------------------------------------------------------

  // --- Step 2: Handle Logo Removal Request ---
  if (removeLogoFlag) {
      if (pathToDelete) {
          // Deletion will happen in Step 4
          finalLogoUrl = null; // Signal DB update to null
      } else {
          // Request to remove logo, but no logo exists or path is invalid
          finalLogoUrl = null; // Still set DB to null
          pathToDelete = null; // Ensure no deletion is attempted
      }
  }
  // -----------------------------------------

  // --- Step 3: Handle New Logo Upload (only if not removing) ---
  if (logoFile && logoFile.size > 0 && !removeLogoFlag) {
      // Note: pathToDelete is already set if there was an existing logo
      
      // Upload new logo
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}-${name.replace(/\s+/g, '-').toLowerCase()}.${fileExt}`;
      const filePath = `public/${fileName}`; // Path within the bucket

      const { error: storageError } = await supabase.storage
          .from('gym-logos')
          .upload(filePath, logoFile);

      if (storageError) {
          console.error('Error uploading new logo:', storageError);
          uploadError = `Failed to upload logo: ${storageError.message}`;
      } else {
          // Get new public URL and set it for DB update
          const { data: urlData } = supabase.storage
              .from('gym-logos')
              .getPublicUrl(filePath);
          finalLogoUrl = urlData?.publicUrl || null;
          // Deletion of old logo (if pathToDelete is set) will happen in Step 4
      }
  }
  // -----------------------------------------------------------

  // --- Step 4: Delete Old/Removed Logo from Storage (if applicable) ---
  if (pathToDelete && (removeLogoFlag || (logoFile && logoFile.size > 0 && !removeLogoFlag && finalLogoUrl !== undefined))) {
      // Delete if: removing flag is set OR new file uploaded successfully
      const { error: deleteError } = await supabase.storage
          .from('gym-logos')
          .remove([pathToDelete]); 
      if (deleteError) {
          console.error('Error deleting old/removed logo:', deleteError);
          // Log error but continue with DB update
      }
  }
  // ---------------------------------------------------------------------

  // Check for upload error before proceeding to DB update
  if (uploadError) {
      return { error: uploadError };
  }

  // --- Step 5: Construct and Execute Database Update ---
  const updateData: { name: string; description: string | null; updated_at: string; logo_url?: string | null } = {
      name,
      description,
      updated_at: new Date().toISOString(),
  };
  
  // Only include logo_url in update if it has changed (set to null or a new URL)
  if (finalLogoUrl !== undefined) {
      updateData.logo_url = finalLogoUrl;
  }

  const { error: updateDbError } = await supabase
    .from('gyms')
    .update(updateData)
    .eq('id', gymId)

  if (updateDbError) {
    console.error('Error updating gym in database:', updateDbError)
    return { error: `Failed to update gym: ${updateDbError.message}` }
  }
  // -----------------------------------------------------

  revalidatePath('/admin/gyms')
  revalidatePath(`/admin/gyms/${gymId}/edit`) // Revalidate edit page too
  return { error: null }
}

// --- Restore deleteGym function ---
export async function deleteGym(gymId: number) {
  const supabase = createClient()

   // --- Authorization Check ---
  const isAdmin = await checkAdminRole(supabase);
  if (!isAdmin) {
      return { error: 'Unauthorized: Only admins or owners can delete gyms.' };
  }
  // -------------------------

  if (!gymId || isNaN(gymId)) {
    return { error: 'Invalid Gym ID provided for deletion.' };
  }

  // --- Delete associated logo file from storage --- 
  let logoPathToDelete: string | null = null;
  
  // 1. Fetch the gym record to get the logo URL
  const { data: gymData, error: fetchError } = await supabase
      .from('gyms')
      .select('logo_url')
      .eq('id', gymId)
      .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // Ignore 'Not Found' error if gym already deleted
      console.error('Error fetching gym data before deletion:', fetchError);
      return { error: 'Failed to fetch gym data before deletion. Could not remove logo.' };
  }

  // 2. Extract the path if logo_url exists
  if (gymData?.logo_url) {
      try {
          const url = new URL(gymData.logo_url);
          logoPathToDelete = url.pathname.split('/gym-logos/')[1];
      } catch (e) {
          console.error("Error parsing logo URL for deletion:", e);
          // Log error but continue with DB deletion
      }
  }

  // 3. Attempt to delete the logo file if path was extracted
  if (logoPathToDelete) {
      const { error: deleteError } = await supabase.storage
          .from('gym-logos')
          .remove([logoPathToDelete]);
      
      if (deleteError) {
          console.error('Error deleting logo file from storage:', deleteError);
          // Log the error but still proceed to delete the database record
      } else {
        console.log(`Successfully deleted logo file: ${logoPathToDelete}`);
      }
  }
  // --------------------------------------------------

  // 4. Delete the gym record from the database
  const { error: deleteDbError } = await supabase
    .from('gyms')
    .delete()
    .eq('id', gymId)

  if (deleteDbError) {
    console.error('Error deleting gym from database:', deleteDbError)
    return { error: `Failed to delete gym: ${deleteDbError.message}` }
  }

  revalidatePath('/admin/gyms')
  return { error: null }
}