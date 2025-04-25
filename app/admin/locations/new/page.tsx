'use client'

import { useState, useEffect } from 'react'
import { addLocation } from '@/app/admin/locations/new/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

// Define minimal Gym type for dropdown
type GymOption = {
  id: number;
  name: string;
};

export default function NewLocationPage() {
  const router = useRouter()
  const supabase = createClient()
  const [gyms, setGyms] = useState<GymOption[]>([])
  const [isLoadingGyms, setIsLoadingGyms] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch gyms for the dropdown
  useEffect(() => {
    const fetchGyms = async () => {
      setIsLoadingGyms(true)
      const { data, error: fetchError } = await supabase
        .from('gyms')
        .select('id, name')
        .order('name', { ascending: true })

      if (fetchError) {
        console.error('Error fetching gyms for dropdown:', fetchError)
        setError('Could not load gyms. Please try again.')
        setGyms([])
      } else {
        setGyms(data || [])
      }
      setIsLoadingGyms(false)
    }
    fetchGyms()
  }, [supabase])

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    // TODO: Add validation (e.g., ensure gym is selected)

    const result = await addLocation(formData)

    setIsSubmitting(false)

    if (result?.error) {
      setError(result.error)
    } else {
      router.push('/admin/locations') // Redirect to locations list
    }
  }

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Add New Location</h1>

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
        {error && <p className="mb-4 text-sm text-red-600">Error: {error}</p>}

        {/* Gym Selection Dropdown */}
        <div className="mb-4">
          <label htmlFor="gym_id" className="block mb-1 text-sm font-medium text-secondary-700">Gym</label>
          <select
            id="gym_id"
            name="gym_id"
            required
            disabled={isLoadingGyms}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white disabled:bg-secondary-100"
          >
            <option value="" disabled>{isLoadingGyms ? 'Loading gyms...' : 'Select a Gym'}</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>{gym.name}</option>
            ))}
          </select>
          {isLoadingGyms && <p className="mt-1 text-xs text-secondary-500">Loading gym options...</p>}
        </div>

        {/* Location Name */}
        <div className="mb-4">
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-secondary-700">Location Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Address */}
        <div className="mb-4">
          <label htmlFor="address" className="block mb-1 text-sm font-medium text-secondary-700">Address</label>
          <textarea
            id="address"
            name="address"
            rows={3}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          ></textarea>
        </div>

        {/* TODO: Add fields for contact_info and operating_hours (maybe JSON editor or structured inputs) */}

        <div className="flex justify-end space-x-3">
           <button type="button" onClick={() => router.back()} className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingGyms}
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${(isSubmitting || isLoadingGyms) ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50`}
          >
            {isSubmitting ? 'Saving...' : 'Add Location'}
          </button>
        </div>
      </form>
    </div>
  )
} 