'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import Link from 'next/link'
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
  current_plan_id: number | null
}

export default function MembershipPlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null)
  
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get user profile to check current plan
        const { data: profile } = await supabase
          .from('member_profiles')
          .select('current_plan_id')
          .eq('user_id', user.id)
          .single()
          
        if (profile) {
          setCurrentPlanId(profile.current_plan_id)
        }
      }
      
      // Fetch active membership plans
      const { data, error } = await supabase
        .from('membership_plans')
        .select('id, name, description, price, interval, is_active')
        .eq('is_active', true)
        .order('price', { ascending: true })
        
      if (error) {
        console.error('Error fetching plans:', error)
        setError('Failed to load membership plans')
        setLoading(false)
        return
      }
      
      setPlans(data || [])
      setLoading(false)
    }
    
    fetchPlans()
  }, [])
  
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
  
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Membership Plans</h1>
        <p className="text-center">Loading available plans...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Membership Plans</h1>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Membership Plans</h1>
      <p className="text-gray-600 mb-8">Choose the plan that best fits your training needs.</p>
      
      {plans.length === 0 ? (
        <p className="text-center text-gray-500">No membership plans available at this time.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div 
              key={plan.id} 
              className={`border rounded-lg shadow-sm overflow-hidden ${currentPlanId === plan.id ? 'border-primary-500 ring-2 ring-primary-500 ring-opacity-50' : 'border-gray-200'}`}
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-2">{plan.name}</h2>
                <p className="text-3xl font-bold text-primary-600 mb-4">
                  {formatPrice(plan.price, plan.interval)}
                </p>
                {plan.description && (
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                )}
                
                {currentPlanId === plan.id ? (
                  <div className="mt-6">
                    <p className="text-green-600 font-medium">Your Current Plan</p>
                  </div>
                ) : (
                  <div className="mt-6">
                    <Link 
                      href={`/checkout?planId=${plan.id}`}
                      className="block w-full text-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition duration-150 ease-in-out"
                    >
                      Subscribe Now
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 