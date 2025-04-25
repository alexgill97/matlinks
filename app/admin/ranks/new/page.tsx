'use client'

import { useState } from 'react'
import { addRank } from '@/app/admin/ranks/new/actions'
import { useRouter } from 'next/navigation'

export default function NewRankPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState<string>(''); // Store as string for input

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    // --- Client-side Validation ---
    let orderValue: number | null = null;
    if (order) {
        const parsedOrder = parseInt(order, 10);
        if (isNaN(parsedOrder)) {
            setError("Invalid order value. Please enter a whole number.");
            setIsSubmitting(false);
            return;
        }
        orderValue = parsedOrder;
    }
    // ---------------------------

    const formData = new FormData()
    formData.append('name', name);
    formData.append('description', description);
    if (orderValue !== null) {
        formData.append('order', orderValue.toString());
    }

    const result = await addRank(formData)

    setIsSubmitting(false)

    if (result?.error) {
      setError(result.error)
    } else {
      router.push('/admin/ranks') // Redirect to ranks list on success
      router.refresh(); 
    }
  }

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Add New Rank</h1>

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
        {error && <p className="mb-4 text-sm text-red-600">Error: {error}</p>}

        {/* --- Rank Name --- */} 
        <div className="mb-4">
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-secondary-700">Rank Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          />
        </div>

        {/* --- Description --- */} 
        <div className="mb-4">
          <label htmlFor="description" className="block mb-1 text-sm font-medium text-secondary-700">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          ></textarea>
        </div>

         {/* --- Order --- */} 
        <div className="mb-4">
          <label htmlFor="order" className="block mb-1 text-sm font-medium text-secondary-700">Order (Optional)</label>
          <input
            type="number"
            id="order"
            name="order"
            step="1"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="e.g., 1 for lowest, 10 for highest"
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-secondary-500">Determines the sorting order in lists. Lower numbers usually appear first.</p>
        </div>
        
        {/* TODO: Add color picker? */} 

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
            disabled={isSubmitting}
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
          >
            {isSubmitting ? 'Saving...' : 'Add Rank'}
          </button>
        </div>
      </form>
    </div>
  )
} 