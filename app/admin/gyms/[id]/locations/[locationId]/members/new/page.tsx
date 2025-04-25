'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client' 
import { addMember } from '@/app/admin/gyms/[id]/locations/[locationId]/members/new/actions'
import { useRouter } from 'next/navigation' 

export default function NewMemberPage({ params }: { params: { id: string, locationId: string } }) {
  const router = useRouter()
  const gymId = parseInt(params.id, 10);
  const locationId = parseInt(params.locationId, 10);
  const supabase = createClient();

  // State for form fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  // Add state for other fields if needed (e.g., initial role)

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [gymName, setGymName] = useState<string | null>(null);
  const [isFetchingNames, setIsFetchingNames] = useState(true);

  // Fetch Gym and Location Names
  useEffect(() => {
    if (isNaN(gymId) || isNaN(locationId)) {
        setError("Invalid Gym or Location ID provided in URL.");
        setIsFetchingNames(false);
        return;
    }
    
    const fetchNames = async () => {
        setIsFetchingNames(true);
        // Fetch Location Name
        const { data: locData, error: locError } = await supabase
            .from('locations')
            .select('name, gym_id') // Fetch gym_id to verify consistency
            .eq('id', locationId)
            .single();

        if (locError || !locData || locData.gym_id !== gymId) {
            console.error("Error fetching location name or ID mismatch:", locError);
            setError(prev => prev ? `${prev} Failed to load Location name.` : 'Failed to load Location name or invalid context.');
            setLocationName(null);
        } else {
            setLocationName(locData.name);
        }

        // Fetch Gym Name
        const { data: gymData, error: gymError } = await supabase
            .from('gyms')
            .select('name')
            .eq('id', gymId)
            .single();
        
        if (gymError || !gymData) {
            console.error("Error fetching gym name:", gymError);
            setError(prev => prev ? `${prev} Failed to load Gym name.` : 'Failed to load Gym name.');
            setGymName(null);
        } else {
            setGymName(gymData.name);
        }
        setIsFetchingNames(false);
    };

    fetchNames();
  }, [gymId, locationId, supabase]);

  // Handle Form Submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('email', email);
    formData.append('full_name', fullName);
    formData.append('location_id', locationId.toString());
    // Add other fields if needed

    // TODO: Client-side validation (e.g., email format)

    const result = await addMember(formData)

    setIsSubmitting(false)

    if (result?.error) {
      setError(result.error)
    } else {
      // Redirect to the members list for this location on success
      router.push(`/admin/gyms/${gymId}/locations/${locationId}/members`)
      router.refresh(); // Ensure the list page gets fresh data
    }
  }

  // --- Render Logic ---
  if (isNaN(gymId) || isNaN(locationId)) {
    return <div className="text-center p-6 text-red-600">Invalid Gym or Location ID.</div>;
  }

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">
         Add New Member to {isFetchingNames ? '...' : (locationName || '(Unknown Location)')}
         <span className="block text-lg font-normal text-secondary-600"> (Gym: {gymName || '...'})</span>
      </h1>

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
        {error && <p className="mb-4 text-sm text-red-600">Error: {error}</p>}

        {/* Email Field (Required) */} 
        <div className="mb-4">
          <label htmlFor="email" className="block mb-1 text-sm font-medium text-secondary-700">Member Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            placeholder="user@example.com"
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-secondary-500">
            If the user doesn&apos;t exist, an account will be created and an invite sent (depending on Supabase settings).
          </p>
        </div>

        {/* Full Name Field */} 
        <div className="mb-4">
          <label htmlFor="full_name" className="block mb-1 text-sm font-medium text-secondary-700">Full Name</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          />
        </div>
        
        {/* TODO: Add fields for initial role, phone number etc. if applicable */} 

        {/* --- Buttons --- */} 
        <div className="flex justify-end space-x-3 mt-6">
           <button 
              type="button" 
              onClick={() => router.back()} 
              className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
              disabled={isSubmitting}
            >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isFetchingNames} // Also disable while fetching context
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${(isSubmitting || isFetchingNames) ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
          >
            {isSubmitting ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </form>
    </div>
  )
} 