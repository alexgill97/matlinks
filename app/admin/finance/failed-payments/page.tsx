'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { PaymentFailureType, RetryStatus, RetryAttempt } from '@/utils/payment-utils'

// Define types
interface FailedPayment {
  id: string
  user_id: string
  amount: number
  currency: string
  failure_date: string
  failure_type: PaymentFailureType
  failure_message: string
  payment_method: string
  subscription_id?: string
  invoice_id: string
  max_retries: number
  retry_attempts: RetryAttempt[]
  created_at: string
  
  // Joined fields
  user_email?: string
  user_name?: string
}

interface RetryResult {
  success: boolean
  message: string
}

export default function FailedPaymentsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // State management
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([])
  const [processingRetry, setProcessingRetry] = useState<Record<string, boolean>>({})
  const [retryResults, setRetryResults] = useState<Record<string, RetryResult>>({})
  
  // Fetch data on mount
  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      // Check authentication status
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/auth/signin')
        return
      }
      
      // Check if user has admin role
      const { data: userData, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single()
      
      if (error || !userData || !['admin', 'owner'].includes(userData.role)) {
        router.push('/dashboard')
        return
      }
      
      // Fetch failed payments
      fetchFailedPayments()
    }
    
    checkUserRoleAndFetchData()
  }, [supabase, router])
  
  // Fetch failed payments
  const fetchFailedPayments = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Get failed payments with user details
      const { data, error } = await supabase
        .from('failed_payments')
        .select(`
          *,
          profiles:user_id (
            email:email,
            name:first_name || ' ' || last_name
          )
        `)
        .order('failure_date', { ascending: false })
      
      if (error) {
        console.error('Error fetching failed payments:', error)
        setError('Failed to load payment data')
        return
      }
      
      const formattedData = data.map(payment => ({
        ...payment,
        user_email: payment.profiles?.email || 'Unknown',
        user_name: payment.profiles?.name || 'Unknown'
      }))
      
      setFailedPayments(formattedData)
    } catch (err) {
      console.error('Error in fetchFailedPayments:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Retry a failed payment
  const handleRetry = async (paymentId: string) => {
    setProcessingRetry(prev => ({ ...prev, [paymentId]: true }))
    setError(null)
    
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      setRetryResults(prev => ({ 
        ...prev, 
        [paymentId]: { 
          success: result.success, 
          message: result.message 
        }
      }))
      
      if (result.success) {
        // Refresh the list after a successful retry
        fetchFailedPayments()
      }
    } catch (err) {
      console.error('Error retrying payment:', err)
      setRetryResults(prev => ({ 
        ...prev, 
        [paymentId]: { 
          success: false, 
          message: 'Failed to process retry request' 
        }
      }))
    } finally {
      setProcessingRetry(prev => ({ ...prev, [paymentId]: false }))
    }
  }
  
  // Format currency amount
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100) // Assuming amounts are stored in cents
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a')
  }
  
  // Get status badge for a payment
  const getPaymentStatusBadge = (payment: FailedPayment) => {
    // Check if any retry attempt was successful
    const hasSuccessfulRetry = payment.retry_attempts.some(
      attempt => attempt.status === RetryStatus.SUCCEEDED
    )
    
    if (hasSuccessfulRetry) {
      return <Badge className="bg-green-500">Recovered</Badge>
    }
    
    // Check if all retry attempts were made and failed
    const allRetriesMade = payment.retry_attempts.every(
      attempt => attempt.status !== RetryStatus.SCHEDULED
    )
    
    if (allRetriesMade && payment.retry_attempts.length >= payment.max_retries) {
      return <Badge variant="destructive">Failed</Badge>
    }
    
    // Check if actively being retried
    const hasProcessingRetry = payment.retry_attempts.some(
      attempt => attempt.status === RetryStatus.PROCESSING
    )
    
    if (hasProcessingRetry) {
      return <Badge className="bg-yellow-500">Processing</Badge>
    }
    
    // Otherwise, it's waiting for scheduled retries
    return <Badge variant="outline">Scheduled</Badge>
  }
  
  // Get the next retry date
  const getNextRetryDate = (payment: FailedPayment) => {
    const nextRetry = payment.retry_attempts.find(
      attempt => attempt.status === RetryStatus.SCHEDULED
    )
    
    if (nextRetry) {
      return formatDate(nextRetry.scheduledDate.toString())
    }
    
    return 'No scheduled retries'
  }
  
  // Get the counts of retry attempts by status
  const getRetryCountsByStatus = (payment: FailedPayment) => {
    const counts = {
      total: payment.retry_attempts.length,
      scheduled: 0,
      processing: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0
    }
    
    payment.retry_attempts.forEach(attempt => {
      switch (attempt.status) {
        case RetryStatus.SCHEDULED:
          counts.scheduled++
          break
        case RetryStatus.PROCESSING:
          counts.processing++
          break
        case RetryStatus.SUCCEEDED:
          counts.succeeded++
          break
        case RetryStatus.FAILED:
          counts.failed++
          break
        case RetryStatus.CANCELLED:
          counts.cancelled++
          break
      }
    })
    
    return counts
  }
  
  // Check if a payment can be manually retried
  const canRetry = (payment: FailedPayment) => {
    // If any retry was successful, no need to retry
    const hasSuccessfulRetry = payment.retry_attempts.some(
      attempt => attempt.status === RetryStatus.SUCCEEDED
    )
    
    if (hasSuccessfulRetry) {
      return false
    }
    
    // If a retry is currently processing, don't allow a new retry
    const hasProcessingRetry = payment.retry_attempts.some(
      attempt => attempt.status === RetryStatus.PROCESSING
    )
    
    if (hasProcessingRetry) {
      return false
    }
    
    // Otherwise, can retry
    return true
  }
  
  if (isLoading) {
    return (
      <div className="container p-6">
        <h1 className="text-2xl font-bold mb-6">Failed Payments</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Failed Payments</h1>
        <Button 
          onClick={fetchFailedPayments}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {failedPayments.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">No failed payments found</p>
              <p className="text-sm text-gray-400">
                Good news! There are no failed payments that need your attention.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment Failures</CardTitle>
            <CardDescription>
              View and manage failed payments. Manually retry or check status of automatic retries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Failure Date</TableHead>
                    <TableHead>Failure Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Next Retry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedPayments.map((payment) => {
                    const retryCounts = getRetryCountsByStatus(payment)
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.user_name}</div>
                            <div className="text-xs text-gray-500">{payment.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          {formatDate(payment.failure_date)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={payment.failure_message}>
                            {payment.failure_message}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(payment)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <span className="text-green-600">{retryCounts.succeeded} succeeded</span>
                            {' · '}
                            <span className="text-red-600">{retryCounts.failed} failed</span>
                            {' · '}
                            <span className="text-blue-600">{retryCounts.scheduled} pending</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-600">
                            {getNextRetryDate(payment)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {canRetry(payment) ? (
                            <div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetry(payment.id)}
                                disabled={processingRetry[payment.id]}
                              >
                                {processingRetry[payment.id] ? (
                                  <>
                                    <span className="animate-spin mr-2">⏳</span> 
                                    Processing...
                                  </>
                                ) : (
                                  <>Retry Payment</>
                                )}
                              </Button>
                              
                              {retryResults[payment.id] && (
                                <div className={`text-xs mt-1 ${
                                  retryResults[payment.id].success ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {retryResults[payment.id].message}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                            >
                              Retry Unavailable
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 