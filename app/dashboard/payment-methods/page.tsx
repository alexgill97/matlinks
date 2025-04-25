'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import dynamic from 'next/dynamic'
import { formatCurrency, formatDate } from '@/app/lib/utils'

// Dynamically import Stripe components to avoid server-side errors
const StripeElements = dynamic(
  () => import('@/components/payments/StripeElements'),
  { ssr: false }
)

type UserProfile = {
  id: string
  full_name: string | null
  stripe_customer_id: string | null
}

type PaymentRecord = {
  id: string
  stripe_invoice_id: string | null
  amount_paid: number
  period_start: string
  period_end: string
  status: string
  created_at: string
  payment_method?: string
  receipt_number?: string | null
  description?: string
}

export default function PaymentMethodsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)

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
        .select('id, full_name, stripe_customer_id')
        .eq('id', user.id)
        .single()
        
      if (profileError) {
        setError('Error fetching your profile')
        setIsLoading(false)
        return
      }
      
      if (!data.stripe_customer_id) {
        setError('You do not have a payment account set up yet. Please contact support.')
        setIsLoading(false)
        return
      }
      
      setProfile(data)
      setIsLoading(false)
      
      // Fetch payment history
      await fetchPaymentHistory()
    }
    
    fetchProfile()
  }, [router])
  
  const fetchPaymentHistory = async () => {
    setIsPaymentsLoading(true)
    setPaymentsError(null)
    
    try {
      const response = await fetch('/api/payments/history?limit=10')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch payment history')
      }
      
      const data = await response.json()
      setPayments(data.payments || [])
    } catch (err) {
      console.error('Error fetching payment history:', err)
      setPaymentsError('Could not load payment history. Please try again later.')
    } finally {
      setIsPaymentsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <p>Loading payment methods...</p>
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
        <h1 className="text-3xl font-bold">Payment Methods</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Back to Dashboard
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <p className="text-gray-600 mb-6">
          Manage your payment methods securely. Your card information is processed by Stripe and is never stored on our servers.
        </p>
        
        {profile?.stripe_customer_id && <StripeElements customerId={profile.stripe_customer_id} />}
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Payment History</h2>
        
        {paymentsError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{paymentsError}</AlertDescription>
          </Alert>
        )}
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isPaymentsLoading ? (
            <div className="p-6 text-center text-gray-500">
              Loading payment history...
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount_paid / 100)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.description || 'Membership Payment'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No payment records found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 