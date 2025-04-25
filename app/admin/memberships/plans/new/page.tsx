'use client'

import { useState } from 'react'
import { addMembershipPlan } from '@/app/admin/memberships/plans/new/actions'
import { useRouter } from 'next/navigation'

export default function NewMembershipPlanPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(''); // Store as string initially for input
  const [interval, setInterval] = useState<'month' | 'year' | 'week' | 'day' | 'one_time' | '' >('');
  const [isActive, setIsActive] = useState(true);
  const [stripePriceId, setStripePriceId] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    // --- Client-side Validation ---
    const priceInCents = price ? Math.round(parseFloat(price) * 100) : null;
    if (price && (isNaN(priceInCents ?? NaN) || (priceInCents ?? -1) < 0)) {
        setError("Invalid price. Please enter a valid number (e.g., 49.99).");
        setIsSubmitting(false);
        return;
    }
    if (!interval && priceInCents !== null && priceInCents > 0) {
        setError("Please select a billing interval for the plan.");
        setIsSubmitting(false);
        return;
    }
    // ---------------------------

    const formData = new FormData()
    formData.append('name', name);
    formData.append('description', description);
    if (priceInCents !== null) {
        formData.append('price', priceInCents.toString());
    }
    formData.append('interval', interval);
    formData.append('is_active', isActive.toString());
    if (stripePriceId) {
      formData.append('stripe_price_id', stripePriceId);
    }

    const result = await addMembershipPlan(formData)

    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/admin/memberships/plans')
    }
  }

  return (
    <div className="container mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Add New Membership Plan</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        {/* Plan Name */}
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            required
            disabled={isSubmitting}
          />
        </div>
        
        {/* Description */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            disabled={isSubmitting}
          />
        </div>
        
        {/* Price */}
        <div className="mb-4">
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
          <input
            type="text"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 49.99 (Leave empty for free plans)"
            className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">Enter price in dollars (e.g., 49.99 for $49.99)</p>
        </div>
        
        {/* Billing Interval */}
        <div className="mb-4">
          <label htmlFor="interval" className="block text-sm font-medium text-gray-700 mb-1">Billing Interval</label>
          <select
            id="interval"
            value={interval}
            onChange={(e) => setInterval(e.target.value as 'month' | 'year' | 'week' | 'day' | 'one_time' | '')}
            className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            disabled={isSubmitting}
          >
            <option value="">Select an interval (or leave empty for free plans)</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
            <option value="week">Weekly</option>
            <option value="day">Daily</option>
            <option value="one_time">One-time payment</option>
          </select>
        </div>
        
        {/* Stripe Price ID */}
        <div className="mb-4">
          <label htmlFor="stripePriceId" className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID</label>
          <input
            type="text"
            id="stripePriceId"
            value={stripePriceId}
            onChange={(e) => setStripePriceId(e.target.value)}
            placeholder="e.g. price_1234567890"
            className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">Optional: Enter the Stripe Price ID for this plan (leave blank to generate one)</p>
        </div>
        
        {/* Active Status */}
        <div className="mb-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Active (available for new subscriptions)
            </label>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => router.push('/admin/memberships/plans')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </form>
    </div>
  )
} 