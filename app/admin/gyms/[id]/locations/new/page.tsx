'use client' // Form interaction requires client component

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client' // Need client for fetching gym name
import { addLocation } from '@/app/admin/gyms/[id]/locations/new/actions'
import { useRouter } from 'next/navigation' 

export default function NewLocationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const gymId = parseInt(params.id, 10); // Get gymId from route params
  const supabase = createClient(); // Create client Supabase instance
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [gymName, setGymName] = useState<string | null>(null); // State for gym name
  const [isFetchingGymName, setIsFetchingGymName] = useState(true); // State for gym name loading

  // Fetch Gym Name on mount
  useEffect(() => {
    if (isNaN(gymId)) {
        setError("Invalid Gym ID provided in URL.");
        setIsFetchingGymName(false);
        return;
    }
    
    const fetchGymName = async () => {
        setIsFetchingGymName(true);
        const { data, error: fetchError } = await supabase
            .from('gyms')
            .select('name')
            .eq('id', gymId)
            .single();
        
        if (fetchError || !data) {
            console.error("Error fetching gym name:", fetchError);
            setError(prev => prev ? `${prev} Failed to load Gym name.` : 'Failed to load Gym name.');
            setGymName(null);
        } else {
            setGymName(data.name);
        }
        setIsFetchingGymName(false);
    };

    fetchGymName();
  }, [gymId, supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    formData.append('gym_id', gymId.toString()); // Add gym_id to form data

    // Client-side validation could be added here

    const result = await addLocation(formData)

    setIsSubmitting(false)

    if (result?.error) {
      setError(result.error)
    } else {
      // Redirect to the locations list for this gym on success
      router.push(`/admin/gyms/${gymId}/locations`)
      router.refresh(); // Ensure the list page gets fresh data
    }
  }

  if (isNaN(gymId)) {
    // Handle invalid gym ID in the route
    return <div className="text-center p-6 text-red-600">Invalid Gym ID.</div>;
  }

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">
        Add New Location for Gym {isFetchingGymName ? '...' : (gymName || '(Unknown Gym)')}
      </h1> 

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
        {error && <p className="mb-4 text-sm text-red-600">Error: {error}</p>}

        {/* Hidden input for gym_id might not be needed if passed in action */} 
        {/* <input type="hidden" name="gym_id" value={gymId} /> */} 

        <div className="mb-4">
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-secondary-700">Location Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="address" className="block mb-1 text-sm font-medium text-secondary-700">Address</label>
          <input
            type="text"
            id="address"
            name="address"
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="city" className="block mb-1 text-sm font-medium text-secondary-700">City</label>
          <input
            type="text"
            id="city"
            name="city"
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          />
        </div>

        {/* TODO: Add fields for state, zip_code, country, phone_number etc. if needed */}

        <div className="flex justify-end space-x-3">
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
            disabled={isSubmitting}
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
          >
            {isSubmitting ? 'Saving...' : 'Add Location'}
          </button>
        </div>
      </form>
    </div>
  )
} 