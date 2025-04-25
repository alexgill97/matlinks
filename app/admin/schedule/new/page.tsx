'use client'

import { useState, useEffect, useCallback } from 'react'
import { addSchedule } from '@/app/admin/schedule/new/actions' // Action to be created
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

// Types for dropdown options
type ClassTypeOption = { id: number; name: string };
type LocationOption = { id: number; name: string };
type InstructorOption = { id: string; full_name: string | null }; // Assuming instructors are in profiles table

export default function NewSchedulePage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dropdown options state
  const [classTypes, setClassTypes] = useState<ClassTypeOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)

  // Form state
  const [selectedClassTypeId, setSelectedClassTypeId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>(''); // 0-6
  const [startTime, setStartTime] = useState<string>(''); // HH:MM
  const [endTime, setEndTime] = useState<string>(''); // HH:MM
  // TODO: Add state for start/end dates if implementing schedule validity range

  // Fetch dropdown options
  const fetchOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
        const [ctRes, locRes, instRes] = await Promise.all([
            supabase.from('class_types').select('id, name').order('name'),
            supabase.from('locations').select('id, name').order('name'),
            // Assuming 'instructor' role exists in profiles
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
        setError(`Failed to load necessary options: ${errorMessage}`);
        // Clear options on error
        setClassTypes([]);
        setLocations([]);
        setInstructors([]);
    } finally {
        setIsLoadingOptions(false);
    }
  }, [supabase]);

  useEffect(() => {
      fetchOptions();
  }, [fetchOptions]);

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    // --- Basic Validation --- 
    if (!selectedClassTypeId || !selectedLocationId || !selectedInstructorId || !selectedDayOfWeek || !startTime || !endTime) {
        setError('Please fill in all required fields.');
        return;
    }
    if (endTime <= startTime) {
        setError('End time must be after start time.');
        return;
    }
    // Add more specific validation if needed
    // ----------------------

    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('class_type_id', selectedClassTypeId);
    formData.append('location_id', selectedLocationId);
    formData.append('instructor_id', selectedInstructorId);
    formData.append('day_of_week', selectedDayOfWeek);
    formData.append('start_time', startTime);
    formData.append('end_time', endTime);
    // Append start/end dates if added

    const result = await addSchedule(formData)

    setIsSubmitting(false)

    if (result?.error) {
      setError(result.error)
    } else {
      router.push('/admin/schedule') // Redirect to schedule view on success
      router.refresh(); 
    }
  }

  const daysOfWeek = [
      { value: '1', label: 'Monday' }, { value: '2', label: 'Tuesday' }, 
      { value: '3', label: 'Wednesday' }, { value: '4', label: 'Thursday' }, 
      { value: '5', label: 'Friday' }, { value: '6', label: 'Saturday' }, 
      { value: '0', label: 'Sunday' }
  ];

  // --- Render Logic ---
  if (isLoadingOptions) {
      return <div className="text-center p-6">Loading options...</div>;
  }

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Add New Recurring Schedule</h1>

      {/* Display error prominently if options failed to load */} 
      {error && !isSubmitting && classTypes.length === 0 && locations.length === 0 && instructors.length === 0 && (
           <div className="mb-4 p-4 text-red-700 bg-red-100 border border-red-300 rounded">
              Error: {error} Cannot add schedule without options.
          </div>
      )}

      <form onSubmit={handleSubmit} className={`p-6 bg-white rounded shadow ${isLoadingOptions ? 'opacity-50' : ''}`}>
         {/* Display regular form errors */} 
        {error && !(classTypes.length === 0 && locations.length === 0 && instructors.length === 0) && (
           <p className="mb-4 text-sm text-red-600">Error: {error}</p>
        )}

        {/* --- Dropdowns --- */} 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Class Type */} 
            <div>
                <label htmlFor="class_type_id" className="block mb-1 text-sm font-medium text-secondary-700">Class Type</label>
                <select id="class_type_id" name="class_type_id" required value={selectedClassTypeId} onChange={(e) => setSelectedClassTypeId(e.target.value)} disabled={isSubmitting || isLoadingOptions} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50">
                    <option value="" disabled>Select Class Type...</option>
                    {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
            </div>
            {/* Location */} 
            <div>
                <label htmlFor="location_id" className="block mb-1 text-sm font-medium text-secondary-700">Location</label>
                <select id="location_id" name="location_id" required value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} disabled={isSubmitting || isLoadingOptions} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50">
                    <option value="" disabled>Select Location...</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
            </div>
             {/* Instructor */} 
            <div>
                <label htmlFor="instructor_id" className="block mb-1 text-sm font-medium text-secondary-700">Instructor</label>
                <select id="instructor_id" name="instructor_id" required value={selectedInstructorId} onChange={(e) => setSelectedInstructorId(e.target.value)} disabled={isSubmitting || isLoadingOptions} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50">
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
                <select id="day_of_week" name="day_of_week" required value={selectedDayOfWeek} onChange={(e) => setSelectedDayOfWeek(e.target.value)} disabled={isSubmitting || isLoadingOptions} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50">
                    <option value="" disabled>Select Day...</option>
                    {daysOfWeek.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
            </div>
            {/* Start Time */} 
            <div>
                <label htmlFor="start_time" className="block mb-1 text-sm font-medium text-secondary-700">Start Time</label>
                <input type="time" id="start_time" name="start_time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isSubmitting || isLoadingOptions} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50" />
            </div>
             {/* End Time */} 
            <div>
                <label htmlFor="end_time" className="block mb-1 text-sm font-medium text-secondary-700">End Time</label>
                <input type="time" id="end_time" name="end_time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={isSubmitting || isLoadingOptions} className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50" />
            </div>
        </div>

         {/* TODO: Add Start/End Date fields for schedule validity range */} 

         {/* --- Buttons --- */} 
        <div className="flex justify-end space-x-3 mt-6">
           <button 
              type="button" 
              onClick={() => router.back()} 
              className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
              disabled={isSubmitting || isLoadingOptions}
            >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingOptions}
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting || isLoadingOptions ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
          >
            {isSubmitting ? 'Saving...' : 'Add Schedule Rule'}
          </button>
        </div>
      </form>
    </div>
  )
} 