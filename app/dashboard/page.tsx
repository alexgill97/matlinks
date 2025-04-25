'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

type UserProfile = {
  id: string
  full_name: string | null
  role: string | null
  stripe_customer_id: string | null
  subscription_status: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
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
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        
      if (profileError) {
        setError('Error fetching your profile')
        setIsLoading(false)
        return
      }
      
      setProfile(data)
      setIsLoading(false)
    }
    
    fetchProfile()
  }, [router])

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <p>Loading dashboard...</p>
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
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome, {profile?.full_name || 'Member'}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Membership Card */}
        <div 
          onClick={() => router.push('/dashboard/membership')}
          className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition cursor-pointer"
        >
          <h2 className="text-xl font-semibold mb-2">Membership</h2>
          <p className="text-gray-600 mb-4">View and manage your current membership plan</p>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium px-2 py-1 rounded-full bg-primary-100 text-primary-800">
              {profile?.subscription_status || 'No active plan'}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        
        {/* Payment Methods Card */}
        <div 
          onClick={() => router.push('/dashboard/payment-methods')}
          className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition cursor-pointer"
        >
          <h2 className="text-xl font-semibold mb-2">Payment Methods</h2>
          <p className="text-gray-600 mb-4">Manage cards and view payment history</p>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800">
              {profile?.stripe_customer_id ? 'Manage Cards' : 'Setup Payment'}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        
        {/* Schedule Card */}
        <div 
          onClick={() => router.push('/dashboard/schedule')}
          className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition cursor-pointer"
        >
          <h2 className="text-xl font-semibold mb-2">Class Schedule</h2>
          <p className="text-gray-600 mb-4">View upcoming classes and register</p>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
              View Schedule
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        
        {/* Progress Card */}
        <div 
          onClick={() => router.push('/dashboard/progress')}
          className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition cursor-pointer"
        >
          <h2 className="text-xl font-semibold mb-2">My Progress</h2>
          <p className="text-gray-600 mb-4">Track your rank and attendance history</p>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
              View Progress
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
} 