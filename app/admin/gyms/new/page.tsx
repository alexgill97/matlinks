'use client' // Form interaction requires client component

import { useState } from 'react'
import { addGym } from '@/app/admin/gyms/new/actions'
import { useRouter } from 'next/navigation' // Use for redirecting after success

export default function NewGymPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // State for logo preview

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    // TODO: Add client-side validation if needed

    const result = await addGym(formData)

    setIsSubmitting(false)

    if (result?.error) {
      setError(result.error)
    } else {
      // Redirect to the gyms list on success
      router.push('/admin/gyms')
    }
  }

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Add New Gym</h1>

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
        {error && <p className="mb-4 text-sm text-red-600">Error: {error}</p>}

        <div className="mb-4">
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-secondary-700">Gym Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block mb-1 text-sm font-medium text-secondary-700">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          ></textarea>
        </div>

        <div className="mb-4">
          <label htmlFor="logo" className="block mb-1 text-sm font-medium text-secondary-700">Logo</label>
          <input
            type="file"
            id="logo"
            name="logo"
            accept="image/png, image/jpeg, image/webp" // Specify acceptable image types
            onChange={handleLogoChange}
            className="w-full text-sm border rounded file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 text-secondary-500"
          />
           {logoPreview && (
            <div className="mt-2">
              <img src={logoPreview} alt="Logo preview" className="object-contain h-20 border rounded" />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
           <button type="button" onClick={() => router.back()} className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50`}
          >
            {isSubmitting ? 'Saving...' : 'Add Gym'}
          </button>
        </div>
      </form>
    </div>
  )
} 