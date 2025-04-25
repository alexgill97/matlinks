'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper function to check user role
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

export async function addGym(formData: FormData) {
  const supabase = createClient()

  // --- Authorization Check ---
  const isAdmin = await checkAdminRole(supabase);
  if (!isAdmin) {
      // Optionally redirect to an unauthorized page or back with an error
      // For now, just return an error
      // redirect('/unauthorized');
      return { error: 'Unauthorized: Only admins or owners can add gyms.' };
  }
  // -------------------------

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const logoFile = formData.get('logo') as File | null // Get the file

  if (!name) {
    return { error: 'Gym name is required.' }
  }

  let logo_url: string | null = null;
  let uploadError: string | null = null;

  // --- Handle Logo Upload --- 
  if (logoFile && logoFile.size > 0) {
      // Generate a unique file path (e.g., using timestamp or gym name)
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Date.now()}-${name.replace(/\s+/g, '-').toLowerCase()}.${fileExt}`;
      const filePath = `public/${fileName}`; // Assuming public path within bucket

      const { error: storageError } = await supabase.storage
          .from('gym-logos') // Your bucket name
          .upload(filePath, logoFile);

      if (storageError) {
          console.error('Error uploading logo:', storageError);
          uploadError = `Failed to upload logo: ${storageError.message}`;
          // Decide if you want to proceed without logo or return error
          // return { error: uploadError }; 
      } else {
          // Get public URL if upload succeeded
          const { data: urlData } = supabase.storage
              .from('gym-logos')
              .getPublicUrl(filePath);
          logo_url = urlData?.publicUrl || null;
      }
  }
  // -------------------------

  // If upload failed, potentially return error early
  if (uploadError) {
      return { error: uploadError };
  }

  // Insert gym data including the logo URL
  const { data, error: insertError } = await supabase
    .from('gyms')
    .insert([{ name, description, logo_url }]) // Add logo_url here
    .select()
    .single()

  if (insertError) {
    console.error('Error adding gym:', insertError)
    // If insert fails after successful upload, maybe try to delete the uploaded file?
    return { error: `Failed to add gym: ${insertError.message}` }
  }

  revalidatePath('/admin/gyms')

  return { error: null, data }
}
