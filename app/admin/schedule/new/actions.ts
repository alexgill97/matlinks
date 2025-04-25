'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Reusable admin role check
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
      return { isAdmin: false, error: 'Unauthorized: Only admins or owners can add schedules.' };
  }
  return { isAdmin: true, error: null };
}

// --- Add Schedule Rule Action ---
export async function addSchedule(formData: FormData) {
  
  // --- Authorization Check --- 
  const authCheck = await checkAdminRole();
  if (!authCheck.isAdmin) {
      return { error: authCheck.error };
  }
  const supabase = createClient();
  // -------------------------

  // --- Get Data & Validate ---
  const classTypeIdString = formData.get('class_type_id') as string;
  const locationIdString = formData.get('location_id') as string;
  const instructorId = formData.get('instructor_id') as string; // UUIDs are strings
  const dayOfWeekString = formData.get('day_of_week') as string;
  const start_time = formData.get('start_time') as string; // Expects "HH:MM"
  const end_time = formData.get('end_time') as string;   // Expects "HH:MM"
  // TODO: Get start_date, end_date if implementing schedule validity

  if (!classTypeIdString || !locationIdString || !instructorId || !dayOfWeekString || !start_time || !end_time) {
      return { error: 'Missing required schedule information.' };
  }

  const class_type_id = parseInt(classTypeIdString, 10);
  const location_id = parseInt(locationIdString, 10);
  const day_of_week = parseInt(dayOfWeekString, 10);

  if (isNaN(class_type_id)) return { error: 'Invalid Class Type ID.' };
  if (isNaN(location_id)) return { error: 'Invalid Location ID.' };
  if (isNaN(day_of_week) || day_of_week < 0 || day_of_week > 6) return { error: 'Invalid Day of Week.' };
  // Basic time format validation (HH:MM)
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(start_time)) return { error: 'Invalid Start Time format (use HH:MM).' };
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(end_time)) return { error: 'Invalid End Time format (use HH:MM).' };
  if (end_time <= start_time) return { error: 'End Time must be after Start Time.' };

  // TODO: Add validation for start_date/end_date if added
  // TODO: Add check for overlapping schedules for the same location/instructor?
  // -------------------------

  // --- Prepare Insert Data ---
  const insertData = {
      class_type_id, // FK
      location_id,   // FK
      instructor_id: instructorId, // Assign variable to correct key
      day_of_week,   // Integer 0-6
      start_time,    // time string (e.g., "09:00:00") - Add seconds if needed
      end_time,      // time string (e.g., "10:00:00") - Add seconds if needed
      // start_date: null, // Set if implementing validity
      // end_date: null,   // Set if implementing validity
  };
  // -------------------------

  // --- Execute Insert ---
  const { error: insertError } = await supabase
    .from('class_schedules') // Assuming 'class_schedules' table
    .insert([insertData]); 
  // --------------------

  if (insertError) {
    console.error('Error adding schedule:', insertError);
    // TODO: Check for specific errors like FK violations or overlaps if constraints exist
    return { error: `Failed to add schedule: ${insertError.message}` };
  }

  // --- Revalidate Paths ---
  revalidatePath('/admin/schedule');
  // Potentially revalidate instructor/location specific views if they exist
  // ----------------------

  console.log(`Successfully added schedule rule for class type ${class_type_id} on day ${day_of_week}`);
  return { error: null };
} 