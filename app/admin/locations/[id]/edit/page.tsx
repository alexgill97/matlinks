'use client'

import { useState, useEffect, useCallback } from 'react'
import { updateLocation, deleteLocation } from '@/app/admin/locations/[id]/edit/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

// Types (ideally generated later)
type Location = {
  id: number;
  name: string;
  address: string | null;
  gym_id: number;
  // contact_info: any;
  // operating_hours: any;
};
type GymOption = {
  id: number;
  name: string;
};

export default function EditLocationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const locationId = parseInt(params.id, 10)

  const [location, setLocation] = useState<Location | null>(null)
  const [gyms, setGyms] = useState<GymOption[]>([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [selectedGymId, setSelectedGymId] = useState<number | string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingGyms, setIsLoadingGyms] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch gyms for dropdown
  const fetchGyms = useCallback(async () => {
    setIsLoadingGyms(true)
    const { data, error: fetchError } = await supabase
      .from('gyms')
      .select('id, name')
      .order('name', { ascending: true })
    setIsLoadingGyms(false)
    if (fetchError) {
      console.error('Error fetching gyms:', fetchError)
      setError('Could not load gym options.')
      setGyms([])
    } else {
      setGyms(data || [])
    }
  }, [supabase])

  // Fetch location data
  const fetchLocation = useCallback(async () => {
    if (!locationId || isNaN(locationId)) {
        setError("Invalid Location ID");
        setIsLoading(false);
        return;
    }
    setIsLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('locations')
      .select('id, name, address, gym_id') // Add other fields as needed
      .eq('id', locationId)
      .single()

    setIsLoading(false)
    if (fetchError) {
      console.error('Error fetching location:', fetchError)
      setError('Failed to load location data.')
      setLocation(null)
    } else if (data) {
      setLocation(data)
      setName(data.name)
      setAddress(data.address || '')
      setSelectedGymId(data.gym_id)
    } else {
        setError('Location not found.')
    }
  }, [locationId, supabase])

  useEffect(() => {
    fetchGyms()
    fetchLocation()
  }, [fetchGyms, fetchLocation])

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('id', locationId.toString())
    formData.append('name', name)
    formData.append('address', address)
    formData.append('gym_id', selectedGymId.toString())
    // TODO: Append contact_info, operating_hours

    const result = await updateLocation(formData)

    setIsSubmitting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.push('/admin/locations')
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!location || !window.confirm(`Delete location "${location.name}"?`)) {
      return
    }
    setError(null)
    setIsDeleting(true)
    const result = await deleteLocation(locationId)
    setIsDeleting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.push('/admin/locations')
      router.refresh()
    }
  }

  if (isLoading) {
    return <div className="text-center p-6">Loading location details...</div>
  }

  if (!location && !isLoading) {
     return <div className="text-center p-6 text-red-600">Error: {error || 'Location not found.'}</div>
  }

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Edit Location: {location?.name}</h1>

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
        {error && !isSubmitting && !isDeleting && (
          <p className="mb-4 text-sm text-red-600">Error: {error}</p>
        )}

        {/* Gym Selection Dropdown */}
        <div className="mb-4">
          <label htmlFor="gym_id" className="block mb-1 text-sm font-medium text-secondary-700">Gym</label>
          <select
            id="gym_id"
            name="gym_id"
            required
            disabled={isLoadingGyms || isSubmitting || isDeleting}
            value={selectedGymId}
            onChange={(e) => setSelectedGymId(e.target.value)}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white disabled:bg-secondary-100"
          >
            <option value="" disabled>{isLoadingGyms ? 'Loading...' : 'Select Gym'}</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>{gym.name}</option>
            ))}
          </select>
        </div>

        {/* Location Name */}
        <div className="mb-4">
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-secondary-700">Location Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting || isDeleting}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-secondary-100"
          />
        </div>

        {/* Address */}
        <div className="mb-4">
          <label htmlFor="address" className="block mb-1 text-sm font-medium text-secondary-700">Address</label>
          <textarea
            id="address"
            name="address"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSubmitting || isDeleting}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-secondary-100"
          ></textarea>
        </div>

        {/* TODO: Add fields for contact_info and operating_hours */}

        <div className="flex items-center justify-between mt-6">
           <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSubmitting}
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50`}
           >
             {isDeleting ? 'Deleting...' : 'Delete Location'}
           </button>
          <div className="flex space-x-3">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingGyms || isDeleting}
              className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${(isSubmitting || isLoadingGyms || isDeleting) ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50`}
            >
              {isSubmitting ? 'Saving...' : 'Update Location'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 