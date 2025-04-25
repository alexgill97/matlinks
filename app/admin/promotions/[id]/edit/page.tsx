'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchPromotion, updatePromotion } from '../../actions'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'

type Promotion = {
  id: number
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  valid_from: string | null
  valid_until: string | null
  usage_limit: number | null
  is_active: boolean
  redemption_count: number
}

export default function EditPromotionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    async function loadPromotion() {
      try {
        setIsLoading(true)
        const data = await fetchPromotion(params.id)
        if (!data) {
          setError('Promotion not found')
        } else {
          setPromotion(data)
        }
      } catch (err) {
        console.error('Error loading promotion:', err)
        setError('Failed to load promotion data')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadPromotion()
  }, [params.id])
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      const formData = new FormData(event.currentTarget)
      const result = await updatePromotion(params.id, formData)
      
      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }
      
      // Redirect to promotions list on success
      router.push('/admin/promotions')
    } catch (err) {
      console.error('Error updating promotion:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p>Loading promotion data...</p>
        </div>
      </div>
    )
  }
  
  if (error && !promotion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link 
            href="/admin/promotions" 
            className="inline-flex items-center text-primary-600 hover:text-primary-800"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Promotions
          </Link>
        </div>
        
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/admin/promotions" 
          className="inline-flex items-center text-primary-600 hover:text-primary-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Promotions
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Promotion: {promotion?.code}</h1>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 mb-6">
            {/* Promotion Code */}
            <div>
              <Label htmlFor="code" className="block mb-1 font-medium">
                Promotion Code <span className="text-red-500">*</span>
              </Label>
              <input
                id="code"
                name="code"
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md"
                placeholder="WELCOME10"
                disabled={isSubmitting}
                defaultValue={promotion?.code}
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">
                Code must be between 3-20 characters and will be displayed to users.
              </p>
            </div>
            
            {/* Description */}
            <div>
              <Label htmlFor="description" className="block mb-1 font-medium">
                Description
              </Label>
              <textarea
                id="description"
                name="description"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="10% off for new members"
                disabled={isSubmitting}
                defaultValue={promotion?.description || ''}
                rows={3}
              />
            </div>
            
            {/* Discount Type and Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_type" className="block mb-1 font-medium">
                  Discount Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="discount_type"
                  name="discount_type"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={isSubmitting}
                  defaultValue={promotion?.discount_type}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount ($)</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="discount_value" className="block mb-1 font-medium">
                  Discount Value <span className="text-red-500">*</span>
                </Label>
                <input
                  id="discount_value"
                  name="discount_value"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="10"
                  disabled={isSubmitting}
                  defaultValue={promotion?.discount_value}
                />
                <p className="text-xs text-gray-500 mt-1">
                  For fixed amounts, enter value in cents (e.g., 1000 for $10.00)
                </p>
              </div>
            </div>
            
            {/* Validity Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid_from" className="block mb-1 font-medium">
                  Valid From
                </Label>
                <input
                  id="valid_from"
                  name="valid_from"
                  type="date"
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={isSubmitting}
                  defaultValue={promotion?.valid_from ? new Date(promotion.valid_from).toISOString().split('T')[0] : ''}
                />
              </div>
              
              <div>
                <Label htmlFor="valid_until" className="block mb-1 font-medium">
                  Valid Until
                </Label>
                <input
                  id="valid_until"
                  name="valid_until"
                  type="date"
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={isSubmitting}
                  defaultValue={promotion?.valid_until ? new Date(promotion.valid_until).toISOString().split('T')[0] : ''}
                />
              </div>
            </div>
            
            {/* Usage Limit */}
            <div>
              <Label htmlFor="usage_limit" className="block mb-1 font-medium">
                Usage Limit
              </Label>
              <input
                id="usage_limit"
                name="usage_limit"
                type="number"
                min="1"
                step="1"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Leave blank for unlimited usage"
                disabled={isSubmitting}
                defaultValue={promotion?.usage_limit || ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of times this code can be used across all customers.
                {promotion && promotion.redemption_count > 0 && (
                  <span className="font-medium text-primary-700"> Currently used: {promotion.redemption_count} times</span>
                )}
              </p>
            </div>
            
            {/* Active Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active" className="font-medium">
                Active
              </Label>
              <Switch
                id="is_active"
                name="is_active"
                value="true"
                defaultChecked={promotion?.is_active}
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Link
              href="/admin/promotions"
              className="px-4 py-2 border rounded-md font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Update Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 