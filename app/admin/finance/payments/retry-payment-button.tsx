'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface RetryPaymentButtonProps {
  paymentId: string
  disabled?: boolean
}

export default function RetryPaymentButton({ 
  paymentId, 
  disabled = false 
}: RetryPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRetry = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to retry payment')
      }
      
      toast.success('Payment retry successful', {
        description: data.message || 'The payment has been successfully processed.'
      })
      
      // Refresh the page to show updated payment status
      router.refresh()
    } catch (error) {
      console.error('Error retrying payment:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      
      toast.error('Payment retry failed', {
        description: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRetry}
      disabled={disabled || isLoading}
      className="flex items-center gap-1 text-sm"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5 mr-1" />
      )}
      Retry Payment
    </Button>
  )
} 