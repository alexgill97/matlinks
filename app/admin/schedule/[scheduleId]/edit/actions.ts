'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Reusable admin role check (Ensure this is consistent with other actions)
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
      return { isAdmin: false, error: 'Unauthorized: Only admins or owners can manage schedules.' };
  }
  return { isAdmin: true, error: null };
}

// --- Update Schedule Rule Action ---
export async function updateSchedule(formData: FormData) {
  
  // --- Authorization Check ---
  const authCheck = await checkAdminRole();
  if (!authCheck.isAdmin) {
      return { error: authCheck.error };
  }
  const supabase = createClient();
  // -------------------------

  // --- Get Data & Validate ---
  const scheduleIdString = formData.get('schedule_id') as string;
  const classTypeIdString = formData.get('class_type_id') as string;
  const locationIdString = formData.get('location_id') as string;
  const instructorId = formData.get('instructor_id') as string; 
  const dayOfWeekString = formData.get('day_of_week') as string;
  const start_time = formData.get('start_time') as string; // Expects "HH:MM"
  const end_time = formData.get('end_time') as string;   // Expects "HH:MM"
  // TODO: Get start_date, end_date if implementing schedule validity

  if (!scheduleIdString || !classTypeIdString || !locationIdString || !instructorId || !dayOfWeekString || !start_time || !end_time) {
      return { error: 'Missing required schedule information.' };
  }

  const schedule_id = parseInt(scheduleIdString, 10);
  const class_type_id = parseInt(classTypeIdString, 10);
  const location_id = parseInt(locationIdString, 10);
  const day_of_week = parseInt(dayOfWeekString, 10);

  if (isNaN(schedule_id)) return { error: 'Invalid Schedule ID.' };
  if (isNaN(class_type_id)) return { error: 'Invalid Class Type ID.' };
  if (isNaN(location_id)) return { error: 'Invalid Location ID.' };
  if (isNaN(day_of_week) || day_of_week < 0 || day_of_week > 6) return { error: 'Invalid Day of Week.' };
  // Basic time format validation (HH:MM)
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(start_time)) return { error: 'Invalid Start Time format (use HH:MM).' };
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(end_time)) return { error: 'Invalid End Time format (use HH:MM).' };
  if (end_time <= start_time) return { error: 'End Time must be after Start Time.' };
  // TODO: Validate instructorId is a valid UUID if needed?

  // TODO: Add validation for start_date/end_date if added
  // -------------------------

  // --- Prepare Update Data ---
  const updateData: { 
      class_type_id: number;
      location_id: number;
      instructor_id: string;
      day_of_week: number;
      start_time: string; 
      end_time: string; 
      // start_date?: string | null; 
      // end_date?: string | null;
      updated_at: string;
  } = {
      class_type_id,
      location_id,
      instructor_id: instructorId, // Use the correct variable name
      day_of_week,
      start_time: `${start_time}:00`, // Append seconds for time type in DB if needed
      end_time: `${end_time}:00`,     // Append seconds for time type in DB if needed
      // start_date: null, // Set if implementing validity
      // end_date: null,   // Set if implementing validity
      updated_at: new Date().toISOString(),
  };
  // --------------------------

  // --- Execute Update ---
  const { error: updateError } = await supabase
    .from('class_schedules') 
    .update(updateData)
    .eq('id', schedule_id); 
  // --------------------

  if (updateError) {
    console.error('Error updating schedule rule:', updateError);
    return { error: `Failed to update schedule rule: ${updateError.message}` };
  }

  // --- Revalidate Paths ---
  revalidatePath('/admin/schedule');
  revalidatePath(`/admin/schedule/${schedule_id}/edit`);
  // ----------------------

  console.log(`Successfully updated schedule rule ID: ${schedule_id}`);
  return { error: null };
}

// --- Delete Schedule Rule Action --- 
export async function deleteSchedule(scheduleId: number) {
  
  // --- Authorization ---
  const authCheck = await checkAdminRole();
  if (!authCheck.isAdmin) {
    return { error: authCheck.error };
  }
  const supabase = createClient();
  // -------------------

  if (!scheduleId || isNaN(scheduleId)) {
      return { error: 'Invalid Schedule ID provided for deletion.' };
  }

  // --- Execute Delete ---
  const { error: deleteError } = await supabase
    .from('class_schedules')
    .delete()
    .eq('id', scheduleId);
  // --------------------

  if (deleteError) {
    console.error('Error deleting schedule rule:', deleteError);
    return { error: `Failed to delete schedule rule: ${deleteError.message}` };
  }

  // --- Revalidate Path ---
  revalidatePath('/admin/schedule');
  // ---------------------

  console.log(`Successfully deleted schedule rule ID: ${scheduleId}`);
  return { error: null };
} 