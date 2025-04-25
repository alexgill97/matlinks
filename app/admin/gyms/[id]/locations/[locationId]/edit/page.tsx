'use client'

import { useState, useEffect, useCallback } from 'react'
import { updateLocation, deleteLocation } from '@/app/admin/gyms/[id]/locations/[locationId]/edit/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

// Define Location type (should match fetching and actions)
type Location = {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  gym_id: number;
  // Add other fields as needed (state, zip, etc.)
};

export default function EditLocationPage({ params }: { params: { id: string, locationId: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const gymId = parseInt(params.id, 10)
  const locationId = parseInt(params.locationId, 10)

  const [location, setLocation] = useState<Location | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [gymName, setGymName] = useState<string | null>(null); // State for gym name
  const [isFetchingGymName, setIsFetchingGymName] = useState(true); // State for gym name loading

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch location data
  const fetchLocation = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    if (isNaN(locationId)) {
      setError('Invalid Location ID.');
      setIsLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('locations')
      .select('id, name, address, city, gym_id') // Select fields needed
      .eq('id', locationId)
      // Optionally add .eq('gym_id', gymId) for extra security/validation
      .single()

    if (fetchError) {
      console.error('Error fetching location:', fetchError)
      setError('Failed to load location data. Please try again.')
      setLocation(null)
    } else if (data) {
      setLocation(data)
      setName(data.name)
      setAddress(data.address || '')
      setCity(data.city || '')
      // Set state for other fields
    } else {
        setError('Location not found.')
    }
    setIsLoading(false)
  }, [locationId, supabase])

  // Fetch Gym Name (Separate useEffect)
  useEffect(() => {
    if (isNaN(gymId)) {
        setError(prev => prev ? `${prev} Invalid Gym ID.` : 'Invalid Gym ID.');
        setIsFetchingGymName(false);
        return;
    }
    
    const fetchGym = async () => {
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

    fetchGym();
  }, [gymId, supabase]);

  // Fetch location data on mount (Keep existing useEffect)
  useEffect(() => {
    fetchLocation()
  }, [fetchLocation])

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('location_id', locationId.toString())
    formData.append('gym_id', gymId.toString()) // Pass gym_id for context/validation if needed
    formData.append('name', name)
    formData.append('address', address)
    formData.append('city', city)
    // Append other fields

    const result = await updateLocation(formData)

    setIsSubmitting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.push(`/admin/gyms/${gymId}/locations`) // Back to locations list
      router.refresh();
    }
  }

  // Handle deletion
  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete location "${location?.name || 'this location'}"? This cannot be undone.`)) {
      return
    }
    setError(null)
    setIsDeleting(true)
    
    const result = await deleteLocation(locationId, gymId) // Pass locationId and gymId
    
    setIsDeleting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.push(`/admin/gyms/${gymId}/locations`) // Back to locations list
      router.refresh()
    }
  }

  // --- Render Logic ---
  if (isLoading || isFetchingGymName) { // Check both loading states
    return <div className="text-center p-6">Loading details...</div>
  }

  if ((!location && !isLoading) || isNaN(locationId) || isNaN(gymId)) {
     return <div className="text-center p-6 text-red-600">Error: {error || 'Location or Gym not found or invalid ID.'}</div>
  }

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">
        Edit Location: {location?.name || '...'} 
        <span className="block text-lg font-normal text-secondary-600">for Gym {gymName || '(Unknown Gym)'}</span>
      </h1>

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
         {error && !isSubmitting && !isDeleting && (
          <p className="mb-4 text-sm text-red-600">Error: {error}</p>
        )}

        {/* Form fields - similar to Add Location form */}
         <div className="mb-4">
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-secondary-700">Location Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            disabled={isSubmitting || isDeleting}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="address" className="block mb-1 text-sm font-medium text-secondary-700">Address</label>
          <input
            type="text"
            id="address"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            disabled={isSubmitting || isDeleting}
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="city" className="block mb-1 text-sm font-medium text-secondary-700">City</label>
          <input
            type="text"
            id="city"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            disabled={isSubmitting || isDeleting}
          />
        </div>
        {/* Add inputs for other fields */} 

        {/* Buttons - similar to Edit Gym form */}
         <div className="flex items-center justify-between mt-6">
           <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSubmitting}
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50`}
           >
             {isDeleting ? 'Deleting...' : 'Delete Location'}
           </button>
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
              disabled={isSubmitting || isDeleting}
              className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting || isDeleting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
            >
              {isSubmitting ? 'Saving...' : 'Update Location'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 