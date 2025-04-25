'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ButtonProps } from '@/components/ui/button'
import { bookClass } from './actions'

interface BookClassButtonProps extends Omit<ButtonProps, 'onClick'> {
  scheduleId: string
  isFull: boolean
}

export default function BookClassButton({ 
  scheduleId, 
  isFull, 
  ...props 
}: BookClassButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleBooking = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await bookClass(scheduleId)
      
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }
      
      // Success - refresh to show updated booking status
      router.refresh()
    } catch (err) {
      console.error('Error booking class:', err)
      setError('Failed to book class. Please try again.')
      setIsLoading(false)
    }
  }
  
  return (
    <div className="w-full">
      <Button
        onClick={handleBooking}
        disabled={isLoading}
        variant={isFull ? "outline" : "default"}
        {...props}
      >
        {isLoading ? 
          'Processing...' : 
          isFull ? 'Join Waitlist' : 'Book Class'
        }
      </Button>
      
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  )
} 