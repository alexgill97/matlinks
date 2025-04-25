'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ButtonProps } from '@/components/ui/button'
import { cancelBooking } from './actions'

interface CancelBookingButtonProps extends Omit<ButtonProps, 'onClick'> {
  bookingId?: string
  isWaitlisted?: boolean
}

export default function CancelBookingButton({ 
  bookingId, 
  isWaitlisted, 
  ...props 
}: CancelBookingButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleCancellation = async () => {
    if (!bookingId) {
      setError('No booking ID provided')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const result = await cancelBooking(bookingId)
      
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }
      
      // Success - refresh to show updated booking status
      router.refresh()
    } catch (err) {
      console.error('Error cancelling booking:', err)
      setError('Failed to cancel booking. Please try again.')
      setIsLoading(false)
    }
  }
  
  if (!bookingId) {
    return null // Don't render if no booking ID is provided
  }
  
  return (
    <div className="w-full">
      <Button
        onClick={handleCancellation}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
        aria-label={isWaitlisted ? "Cancel waitlist position" : "Cancel booking"}
        title={isWaitlisted ? "Remove from waitlist" : "Cancel your booking"}
        {...props}
      >
        {isLoading ? 'Processing...' : 'Cancel'}
      </Button>
      
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  )
} 