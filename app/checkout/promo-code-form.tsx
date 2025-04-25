'use client'

import { useState } from 'react'
import { validatePromoCode } from './promo-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { AlertCircle, Check } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PromoCodeFormProps {
  onApplyPromo: (discount: {
    type: 'percentage' | 'fixed',
    value: number,
    promoId: number
  }) => void
}

export function PromoCodeForm({ onApplyPromo }: PromoCodeFormProps) {
  const [promoCode, setPromoCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string,
    description?: string,
    discountType: 'percentage' | 'fixed',
    discountValue: number
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!promoCode.trim()) return
    
    setIsLoading(true)
    setError(null)

    try {
      const result = await validatePromoCode(promoCode.trim())
      
      if (result.error) {
        setError(result.error)
      } else if (result.promotion) {
        setAppliedPromo({
          code: result.promotion.code,
          description: result.promotion.description,
          discountType: result.promotion.discount_type,
          discountValue: result.promotion.discount_value
        })
        
        onApplyPromo({
          type: result.promotion.discount_type,
          value: result.promotion.discount_value,
          promoId: result.promotion.id
        })
        
        toast({
          title: 'Promo code applied!',
          description: `${result.promotion.code} has been applied to your order.`,
        })
      }
    } catch (err) {
      setError('Failed to validate promo code. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearPromo = () => {
    setAppliedPromo(null)
    setPromoCode('')
    onApplyPromo({ type: 'fixed', value: 0, promoId: 0 }) // Reset discount
  }

  if (appliedPromo) {
    return (
      <div className="mb-4 p-4 border rounded-md bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium flex items-center">
              <Check size={16} className="mr-2 text-green-500" />
              Promo applied: {appliedPromo.code}
            </p>
            {appliedPromo.description && (
              <p className="text-sm text-muted-foreground">{appliedPromo.description}</p>
            )}
            <p className="text-sm font-medium mt-1">
              Discount: {appliedPromo.discountType === 'percentage' 
                ? `${appliedPromo.discountValue}%` 
                : `$${appliedPromo.discountValue.toFixed(2)}`}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearPromo}
          >
            Remove
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <Input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter promo code"
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !promoCode.trim()}
            variant="secondary"
          >
            {isLoading ? 'Checking...' : 'Apply'}
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">{error}</AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  )
} 