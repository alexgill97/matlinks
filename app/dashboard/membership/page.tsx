'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import dynamic from 'next/dynamic'

// Dynamically import Stripe components to avoid server-side errors
const StripeElements = dynamic(
  () => import('@/components/payments/StripeElements'),
  { ssr: false }
)

type UserProfile = {
  id: string
  user_id: string
  full_name: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  current_plan_id: number | null
}

type MembershipPlan = {
  id: number
  name: string
  description: string | null
  price: number | null
  interval: string | null
}

type SubscriptionDetails = {
  id: string
  current_period_start: string
  current_period_end: string
  status: string
  cancel_at_period_end: boolean
}

export default function MembershipPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [plan, setPlan] = useState<MembershipPlan | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)

  useEffect(() => {
    const fetchMembershipDetails = async () => {
      setIsLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
        
      if (profileError) {
        setError('Error fetching your profile')
        setIsLoading(false)
        return
      }
      
      setProfile(profileData)
      
      // If user has a plan, fetch plan details
      if (profileData.current_plan_id) {
        const { data: planData, error: planError } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('id', profileData.current_plan_id)
          .single()
          
        if (!planError && planData) {
          setPlan(planData)
        }
      }
      
      // If user has a Stripe subscription, fetch subscription details
      if (profileData.stripe_subscription_id) {
        try {
          const response = await fetch(`/api/subscriptions/${profileData.stripe_subscription_id}`)
          if (response.ok) {
            const subscriptionData = await response.json()
            setSubscription(subscriptionData)
          }
        } catch (err) {
          console.error('Failed to fetch subscription details:', err)
        }
      }
      
      setIsLoading(false)
    }
    
    fetchMembershipDetails()
  }, [router])

  const handleCancelSubscription = async () => {
    if (!profile?.stripe_subscription_id) return
    
    setIsCancelling(true)
    
    try {
      const response = await fetch(`/api/subscriptions/${profile.stripe_subscription_id}/cancel`, {
        method: 'POST',
      })
      
      if (response.ok) {
        // Update the UI without using the response data
        setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } : null)
      } else {
        setError('Failed to cancel subscription')
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err)
      setError('Failed to cancel subscription')
    } finally {
      setIsCancelling(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }
  
  const formatPrice = (price: number | null, interval: string | null) => {
    if (price === null) return 'Free'
    const amount = (price / 100).toFixed(2)
    
    switch (interval) {
      case 'month': return `$${amount}/month`
      case 'year': return `$${amount}/year`
      case 'week': return `$${amount}/week`
      case 'day': return `$${amount}/day`
      default: return `$${amount}`
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <p>Loading membership details...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Membership Details</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Back to Dashboard
        </button>
      </div>
      
      {!plan && (
        <div className="mb-8">
          <Alert>
            <AlertTitle>No Active Membership</AlertTitle>
            <AlertDescription>
              You don&apos;t have an active membership plan. Browse our available plans to sign up.
            </AlertDescription>
          </Alert>
          <div className="mt-6">
            <button
              onClick={() => router.push('/memberships')}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              View Available Plans
            </button>
          </div>
        </div>
      )}
      
      {plan && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Current Plan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-lg text-gray-900">{plan.name}</h3>
              {plan.description && <p className="text-gray-600 mt-1">{plan.description}</p>}
              
              <div className="mt-4">
                <p className="text-lg font-bold text-primary-600">
                  {formatPrice(plan.price, plan.interval)}
                </p>
              </div>
              
              <div className="mt-6">
                <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-medium">
                  {profile?.subscription_status || 'Unknown'}
                </div>
              </div>
            </div>
            
            {subscription && (
              <div className="border-t pt-4 md:border-t-0 md:border-l md:pl-6 md:pt-0">
                <h3 className="font-medium text-gray-900 mb-2">Billing Details</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Period</span>
                    <span>
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="capitalize">{subscription.status}</span>
                  </div>
                  
                  {subscription.cancel_at_period_end && (
                    <div className="mt-4">
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertTitle className="text-yellow-800">Cancellation Scheduled</AlertTitle>
                        <AlertDescription className="text-yellow-700">
                          Your subscription will end on {formatDate(subscription.current_period_end)}. You&apos;ll still have access until then.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                  
                  {!subscription.cancel_at_period_end && (
                    <div className="mt-4">
                      <button
                        onClick={handleCancelSubscription}
                        disabled={isCancelling}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        {isCancelling ? 'Processing...' : 'Cancel Subscription'}
                      </button>
                      <p className="text-sm text-gray-500 mt-2">
                        Your subscription will remain active until the end of the current billing period.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Payment Methods Section */}
      <div className="mt-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Payment Methods</h2>
          <button
            onClick={() => setShowPaymentMethods(!showPaymentMethods)}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            {showPaymentMethods ? 'Hide Payment Methods' : 'Manage Payment Methods'}
          </button>
        </div>
        
        {showPaymentMethods && (
          <div className="bg-white rounded-lg shadow p-6">
            {profile?.stripe_customer_id ? (
              <StripeElements customerId={profile.stripe_customer_id} />
            ) : (
              <Alert>
                <AlertTitle>Payment Setup Required</AlertTitle>
                <AlertDescription>
                  You need to set up a payment method for your subscription.
                  Please contact support to complete this step.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Billing History</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">View your complete payment history</p>
            <button
              onClick={() => router.push('/dashboard/payment-methods')}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              View Payment History
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 