'use client'

import { useState, useEffect, useCallback } from 'react'
import { updateSchedule, deleteSchedule } from '@/app/admin/schedule/[scheduleId]/edit/actions' // Actions to be created
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

// Types for dropdown options
type ClassTypeOption = { id: number; name: string };
type LocationOption = { id: number; name: string };
type InstructorOption = { id: string; full_name: string | null }; 

// Type for Schedule data (adapt based on your actual schema)
type ScheduleRule = {
  id: number;
  class_type_id: number;
  location_id: number;
  instructor_id: string; 
  day_of_week: number;
  start_time: string; // HH:MM:SS format from DB
  end_time: string; // HH:MM:SS format from DB
  // Add start_date, end_date if they exist
};

export default function EditSchedulePage({ params }: { params: { scheduleId: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const scheduleId = parseInt(params.scheduleId, 10);

  // State for form fields
  const [scheduleRule, setScheduleRule] = useState<ScheduleRule | null>(null)
  const [selectedClassTypeId, setSelectedClassTypeId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>(''); 
  const [startTime, setStartTime] = useState<string>(''); // HH:MM for input
  const [endTime, setEndTime] = useState<string>(''); // HH:MM for input

  // State for dropdown options
  const [classTypes, setClassTypes] = useState<ClassTypeOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  
  // State for UI
  const [isLoading, setIsLoading] = useState(true)
  const [isOptionsLoading, setIsOptionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch dropdown options
  const fetchOptions = useCallback(async () => {
    setIsOptionsLoading(true);
    try {
        const [ctRes, locRes, instRes] = await Promise.all([
            supabase.from('class_types').select('id, name').order('name'),
            supabase.from('locations').select('id, name').order('name'),
            supabase.from('profiles').select('id, full_name').eq('role', 'instructor').order('full_name') 
        ]);

        if (ctRes.error) throw ctRes.error;
        if (locRes.error) throw locRes.error;
        if (instRes.error) throw instRes.error;

        setClassTypes(ctRes.data || []);
        setLocations(locRes.data || []);
        setInstructors(instRes.data || []);

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error("Error fetching options:", errorMessage, err);
        setError(prev => prev ? `${prev}
Failed to load dropdown options: ${errorMessage}` : `Failed to load dropdown options: ${errorMessage}`);
        // Clear options on error
        setClassTypes([]);
        setLocations([]);
        setInstructors([]);
    } finally {
        setIsOptionsLoading(false);
    }
  }, [supabase]);

  // Fetch schedule rule details
  const fetchScheduleRule = useCallback(async () => {
    if (isNaN(scheduleId)) {
        setError('Invalid Schedule ID.');
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null); 
    
    try {
        const { data, error: fetchError } = await supabase
            .from('class_schedules')
            .select('id, class_type_id, location_id, instructor_id, day_of_week, start_time, end_time') // Select all needed fields
            .eq('id', scheduleId)
            .single();

        if (fetchError || !data) {
            console.error("Error fetching schedule rule:", fetchError);
            throw new Error(fetchError?.message || 'Failed to load schedule details. Rule not found.');
        }

        const rule = data as ScheduleRule;
        setScheduleRule(rule);
        setSelectedClassTypeId(rule.class_type_id.toString());
        setSelectedLocationId(rule.location_id.toString());
        setSelectedInstructorId(rule.instructor_id);
        setSelectedDayOfWeek(rule.day_of_week.toString());
        // Format time from HH:MM:SS to HH:MM for input fields
        setStartTime(rule.start_time?.substring(0, 5) || ''); 
        setEndTime(rule.end_time?.substring(0, 5) || '');

    } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred while fetching the schedule.');
        setScheduleRule(null);
    } finally {
        setIsLoading(false);
    }
  }, [scheduleId, supabase]);

  useEffect(() => {
    fetchOptions();
    fetchScheduleRule();
  }, [fetchOptions, fetchScheduleRule]);

  // --- Handle Form Submission (Update) ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    
    if (!scheduleRule) {
        setError("Schedule data not loaded.");
        return;
    }
     if (!selectedClassTypeId || !selectedLocationId || !selectedInstructorId || !selectedDayOfWeek || !startTime || !endTime) {
        setError('Please fill in all required fields.');
        return;
    }
    if (endTime <= startTime) {
        setError('End time must be after start time.');
        return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('schedule_id', scheduleRule.id.toString()); // Need ID for update
    formData.append('class_type_id', selectedClassTypeId);
    formData.append('location_id', selectedLocationId);
    formData.append('instructor_id', selectedInstructorId);
    formData.append('day_of_week', selectedDayOfWeek);
    formData.append('start_time', startTime); 
    formData.append('end_time', endTime);
    // Append other fields if they exist (e.g., start_date, end_date)

    const result = await updateSchedule(formData);

    setIsSubmitting(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push('/admin/schedule'); // Redirect to list on success
      router.refresh(); 
    }
  };
  // ---------------------------

  // --- Handle Deletion --- 
  const handleDelete = async () => {
    if (!scheduleRule) return;
    if (!window.confirm(`Are you sure you want to delete this schedule rule? This will remove all future occurrences based on this rule.`)) return;

    setIsDeleting(true);
    setError(null);

    const result = await deleteSchedule(scheduleRule.id); // Pass only the ID

    setIsDeleting(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push('/admin/schedule'); 
      router.refresh(); 
    }
  };
  // ----------------------

  const daysOfWeek = [
      { value: '1', label: 'Monday' }, { value: '2', label: 'Tuesday' }, 
      { value: '3', label: 'Wednesday' }, { value: '4', label: 'Thursday' }, 
      { value: '5', label: 'Friday' }, { value: '6', label: 'Saturday' }, 
      { value: '0', label: 'Sunday' }
  ];

   // --- Render Logic --- 
  if (isLoading || isOptionsLoading) {
    return <div className="text-center p-6">Loading schedule details and options...</div>;
  }

  if (!scheduleRule && !isLoading) {
     return <div className="text-center p-6 text-red-600">Error: {error || 'Schedule Rule not found.'}</div>;
  }
  
  // Handle case where options failed but schedule loaded
  const optionsFailed = classTypes.length === 0 || locations.length === 0 || instructors.length === 0;
  if (optionsFailed && error?.includes('Failed to load dropdown options')) {
       return (
            <div className="container mx-auto p-6">
                <h1 className="mb-6 text-3xl font-bold">Edit Recurring Schedule</h1>
                <div className="p-4 text-red-700 bg-red-100 border border-red-300 rounded">
                    Error: {error}. Cannot edit schedule without required options.
                </div>
                 <button 
                    onClick={() => router.back()} 
                    className="mt-4 px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50"
                >
                    Back
                </button>
            </div>
       );
  }

  if (!scheduleRule) {
      // Should be covered by above, but as a fallback
      return <div className="text-center p-6 text-red-600">Error loading schedule details.</div>;
  }


  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Edit Recurring Schedule Rule</h1>

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
         {error && !(isSubmitting || isDeleting) && (
          <p className="mb-4 text-sm text-red-600">Error: {error}</p>
        )}

        {/* --- Dropdowns --- */} 
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Class Type */} 
            <div>
                <label htmlFor="class_type_id" className="block mb-1 text-sm font-medium text-secondary-700">Class Type</label>
                <select id="class_type_id" name="class_type_id" required value={selectedClassTypeId} onChange={(e) => setSelectedClassTypeId(e.target.value)} disabled={isSubmitting || isDeleting || optionsFailed} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50">
                    <option value="" disabled>Select Class Type...</option>
                    {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
            </div>
            {/* Location */} 
            <div>
                <label htmlFor="location_id" className="block mb-1 text-sm font-medium text-secondary-700">Location</label>
                <select id="location_id" name="location_id" required value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} disabled={isSubmitting || isDeleting || optionsFailed} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50">
                    <option value="" disabled>Select Location...</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
            </div>
             {/* Instructor */} 
            <div>
                <label htmlFor="instructor_id" className="block mb-1 text-sm font-medium text-secondary-700">Instructor</label>
                <select id="instructor_id" name="instructor_id" required value={selectedInstructorId} onChange={(e) => setSelectedInstructorId(e.target.value)} disabled={isSubmitting || isDeleting || optionsFailed} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50">
                    <option value="" disabled>Select Instructor...</option>
                    {instructors.map(inst => <option key={inst.id} value={inst.id}>{inst.full_name || 'Unnamed Instructor'}</option>)}
                </select>
            </div>
        </div>

         {/* --- Day & Time --- */} 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             {/* Day of Week */} 
            <div>
                <label htmlFor="day_of_week" className="block mb-1 text-sm font-medium text-secondary-700">Day of Week</label>
                <select id="day_of_week" name="day_of_week" required value={selectedDayOfWeek} onChange={(e) => setSelectedDayOfWeek(e.target.value)} disabled={isSubmitting || isDeleting || optionsFailed} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50">
                    <option value="" disabled>Select Day...</option>
                    {daysOfWeek.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
            </div>
            {/* Start Time */} 
            <div>
                <label htmlFor="start_time" className="block mb-1 text-sm font-medium text-secondary-700">Start Time</label>
                <input type="time" id="start_time" name="start_time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isSubmitting || isDeleting || optionsFailed} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50" />
            </div>
             {/* End Time */} 
            <div>
                <label htmlFor="end_time" className="block mb-1 text-sm font-medium text-secondary-700">End Time</label>
                <input type="time" id="end_time" name="end_time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={isSubmitting || isDeleting || optionsFailed} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50" />
            </div>
        </div>

         {/* TODO: Add Start/End Date fields if implemented */} 

        {/* --- Buttons --- */} 
        <div className="flex items-center justify-between mt-6">
           {/* Delete Button */} 
           <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting || isDeleting || optionsFailed}
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50`}
           >
             {isDeleting ? 'Deleting...' : 'Delete Schedule Rule'}
           </button>
           {/* Save/Cancel Buttons */} 
          <div className="flex space-x-3">
            <button 
                type="button" 
                onClick={() => router.back()} 
                className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
                disabled={isSubmitting || isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDeleting || optionsFailed}
              className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting || optionsFailed ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 