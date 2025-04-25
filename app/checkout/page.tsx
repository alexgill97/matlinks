'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { createCheckoutSession } from '@/app/checkout/actions'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

// Type for membership plan data
type MembershipPlan = {
  id: number
  name: string
  description: string | null
  price: number | null
  interval: 'month' | 'year' | 'week' | 'day' | 'one_time' | null
  is_active: boolean
}

// Type for user profile
type UserProfile = {
  id: string
  full_name: string | null
  role: string | null
  // Additional profile fields as needed
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('planId')
  
  const [plan, setPlan] = useState<MembershipPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // Fetch the user's profile information
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to checkout')
        setIsLoading(false)
        return
      }
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        
      if (profileError) {
        setError('Error fetching your profile')
        setIsLoading(false)
        return
      }
      
      setUserProfile(profile)
      
      // If no plan ID was provided, redirect back
      if (!planId) {
        setError('No membership plan selected')
        setIsLoading(false)
        return
      }
      
      // Fetch the plan details
      const { data, error: planError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('id', planId)
        .eq('is_active', true)
        .single()
        
      if (planError || !data) {
        setError('Error fetching membership plan details or plan is inactive')
        setIsLoading(false)
        return
      }
      
      setPlan(data)
      setIsLoading(false)
    }
    
    fetchData()
  }, [planId])

  const handleCheckout = async () => {
    if (!plan || !userProfile) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      // Call server action to create Stripe checkout session
      const result = await createCheckoutSession({
        planId: plan.id,
        userId: userProfile.id,
        successUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout/cancel`
      })
      
      if (result.error) {
        setError(result.error)
        setIsProcessing(false)
        return
      }
      
      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError('An error occurred during checkout')
      setIsProcessing(false)
    }
  }
  
  // Format price for display
  const formatPrice = (price: number | null, interval: MembershipPlan['interval']) => {
    if (price === null) return 'Free'
    const amount = (price / 100).toFixed(2)
    
    switch (interval) {
      case 'month': return `$${amount}/month`
      case 'year': return `$${amount}/year`
      case 'week': return `$${amount}/week`
      case 'day': return `$${amount}/day`
      case 'one_time': return `$${amount} (one-time)`
      default: return `$${amount}`
    }
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-md">
          <p className="text-center">Loading checkout information...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-md">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <button
              onClick={() => router.back()}
              className="text-primary-600 hover:text-primary-800 hover:underline"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Checkout</h1>
        
        {plan && (
          <div className="mb-6">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
              <h2 className="text-xl font-semibold mb-2">{plan.name}</h2>
              {plan.description && (
                <p className="text-gray-600 mb-3">{plan.description}</p>
              )}
              <p className="text-lg font-bold text-primary-700">
                {formatPrice(plan.price, plan.interval)}
              </p>
            </div>
            
            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="w-full px-4 py-3 text-white font-medium bg-primary-600 hover:bg-primary-700 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Proceed to Payment'}
            </button>
            
            <p className="text-sm text-gray-500 mt-4 text-center">
              You&apos;ll be redirected to Stripe to complete your payment securely.
            </p>
          </div>
        )}
        
        <div className="mt-4 text-center">
          <button
            onClick={() => router.back()}
            className="text-primary-600 hover:text-primary-800 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
} 