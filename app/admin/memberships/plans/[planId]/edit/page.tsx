'use client'

import { useState, useEffect, useCallback } from 'react'
import { updateMembershipPlan, deactivateMembershipPlan } from '@/app/admin/memberships/plans/[planId]/edit/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

// Type matching plan data
type MembershipPlan = {
  id: number;
  name: string;
  description: string | null;
  price: number | null; // In cents
  interval: 'month' | 'year' | 'week' | 'day' | 'one_time' | null;
  is_active: boolean;
  stripe_price_id: string | null;
};

export default function EditMembershipPlanPage({ params }: { params: { planId: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const planId = parseInt(params.planId, 10);

  // State for form fields
  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(''); // Store as string initially
  const [interval, setInterval] = useState<'month' | 'year' | 'week' | 'day' | 'one_time' | '' >('');
  const [isActive, setIsActive] = useState(true);
  const [stripePriceId, setStripePriceId] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false) // State for deactivation

  // --- Fetch Plan Data ---
  const fetchPlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (isNaN(planId)) {
      setError('Invalid Plan ID.');
      setIsLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('membership_plans')
      .select('id, name, description, price, interval, is_active, stripe_price_id') // Select fields needed
      .eq('id', planId)
      .single()

    if (fetchError || !data) {
      console.error('Error fetching plan:', fetchError)
      setError('Failed to load plan data. Please try again.')
      setPlan(null)
    } else {
      setPlan(data)
      setName(data.name)
      setDescription(data.description || '')
      // Convert cents back to dollars string for input
      setPrice(data.price !== null ? (data.price / 100).toFixed(2) : ''); 
      setInterval(data.interval || '');
      setIsActive(data.is_active);
      setStripePriceId(data.stripe_price_id || '');
    }
    setIsLoading(false);
  }, [planId, supabase])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])
  // ---------------------

  // --- Handle Form Submission ---
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
    const finalInterval = interval === '' ? null : interval;
    if (finalInterval === null && priceInCents !== null && priceInCents > 0) {
        setError("Please select a billing interval for the plan.");
        setIsSubmitting(false);
        return;
    }
    // ---------------------------

    const formData = new FormData()
    formData.append('plan_id', planId.toString());
    formData.append('name', name);
    formData.append('description', description);
    if (priceInCents !== null) {
        formData.append('price', priceInCents.toString());
    }
    formData.append('interval', interval); // Send the potentially empty string interval
    formData.append('is_active', isActive.toString());
    if (stripePriceId) {
      formData.append('stripe_price_id', stripePriceId);
    }

    const result = await updateMembershipPlan(formData)

    setIsSubmitting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.push('/admin/memberships/plans') // Back to plans list
      router.refresh();
    }
  }
  // --------------------------

  // --- Handle Deletion (Deactivation) ---
  const handleDeactivate = async () => {
    if (!plan) return;
    if (!window.confirm(`Are you sure you want to DEACTIVATE the plan "${plan.name}"? This will prevent it from being assigned to new members.`)) return;

    setError(null);
    setIsDeactivating(true);
    
    const result = await deactivateMembershipPlan(plan.id);

    setIsDeactivating(false);

    if (result?.error) {
      setError(result.error);
    } else {
      router.push('/admin/memberships/plans'); // Redirect to plans list
      router.refresh(); // Refresh the list page
    }
  }
  // --------------------------

  // --- Render Logic ---
  if (isLoading) {
    return <div className="text-center p-6">Loading plan details...</div>
  }

  if ((!plan && !isLoading) || isNaN(planId)) {
     return <div className="text-center p-6 text-red-600">Error: {error || 'Plan not found or invalid ID.'}</div>
  }

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Edit Membership Plan: {plan?.name}</h1>

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
         {error && !isSubmitting && (
          <p className="mb-4 text-sm text-red-600">Error: {error}</p>
        )}

        {/* Form fields - same structure as New Plan form */} 
        {/* --- Plan Name --- */}
        <div className="mb-4">
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-secondary-700">Plan Name</label>
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
        {/* --- Price & Interval --- */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
            <div>
                 <label htmlFor="price" className="block mb-1 text-sm font-medium text-secondary-700">Price (USD)</label>
                 <input
                    type="number" step="0.01" min="0"
                    id="price"
                    name="price"
                    placeholder="e.g., 49.99"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                 />
                 <p className="mt-1 text-xs text-secondary-500">Leave blank or 0 for a free plan.</p>
            </div>
             <div>
                <label htmlFor="interval" className="block mb-1 text-sm font-medium text-secondary-700">Billing Interval</label>
                <select
                    id="interval"
                    name="interval"
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as typeof interval)}
                    required={!!price && parseFloat(price) > 0} // Required if price > 0
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                >
                    <option value="">-- Select Interval (if paid) --</option>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                    <option value="week">Weekly</option>
                    <option value="day">Daily</option>
                    <option value="one_time">One-Time</option>
                </select>
            </div>
        </div>
        {/* --- Stripe Price ID --- */}
        <div className="mb-4">
          <label htmlFor="stripePriceId" className="block mb-1 text-sm font-medium text-secondary-700">Stripe Price ID</label>
          <input
            type="text"
            id="stripePriceId"
            name="stripePriceId"
            value={stripePriceId}
            onChange={(e) => setStripePriceId(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-secondary-500">Optional: Enter the Stripe Price ID for this plan (leave blank to generate one)</p>
        </div>
        {/* --- Active Status --- */}
        <div className="mb-4">
            <label className="flex items-center">
                <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 disabled:opacity-50"
                />
                <span className="ml-2 text-sm font-medium text-secondary-700">Active Plan</span>
            </label>
             <p className="mt-1 text-xs text-secondary-500">Inactive plans cannot be assigned to new members but remain for existing ones.</p>
        </div>

        {/* --- Buttons --- */}
         <div className="flex items-center justify-between mt-6">
           <button
            type="button"
            onClick={handleDeactivate}
            disabled={isSubmitting || isDeactivating || !plan?.is_active} // Disable if submitting, deactivating, or already inactive
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting || isDeactivating || !plan?.is_active ? 'bg-red-400 cursor-not-allowed opacity-50' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50`}
           >
            {isDeactivating ? 'Deactivating...' : (plan?.is_active ? 'Deactivate Plan' : 'Plan Inactive')}
           </button>
          <div className="flex space-x-3">
            <button 
                type="button" 
                onClick={() => router.back()} 
                className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
                disabled={isSubmitting || isDeactivating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDeactivating}
              className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting || isDeactivating ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
            >
              {isSubmitting ? 'Saving...' : 'Update Plan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 