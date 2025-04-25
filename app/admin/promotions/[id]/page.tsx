'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchPromotion, deletePromotion } from '../actions'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { formatDate } from '@/app/lib/utils'

export default function PromotionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [promotion, setPromotion] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
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
  
  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const result = await deletePromotion(params.id)
      
      if (result.error) {
        setError(result.error)
        setIsDeleting(false)
        setShowDeleteConfirm(false)
        return
      }
      
      // Redirect to promotions list on success
      router.push('/admin/promotions')
    } catch (err) {
      console.error('Error deleting promotion:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }
  
  // Format discount value for display
  const formatDiscount = (type: 'percentage' | 'fixed_amount', value: number) => {
    if (type === 'percentage') {
      return `${value}%`
    } else {
      return `$${(value / 100).toFixed(2)}`
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
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="mb-6">
        <Link 
          href="/admin/promotions" 
          className="inline-flex items-center text-primary-600 hover:text-primary-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Promotions
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{promotion.code}</h1>
            <Badge 
              className={promotion.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
            >
              {promotion.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {promotion.description && (
            <p className="text-gray-600 mt-2">{promotion.description}</p>
          )}
        </div>
        
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Discount Details</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <dt className="text-gray-600">Type:</dt>
                <dd className="font-medium">
                  {promotion.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                </dd>
                
                <dt className="text-gray-600">Value:</dt>
                <dd className="font-medium">
                  {formatDiscount(promotion.discount_type, promotion.discount_value)}
                </dd>
              </dl>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-4">Validity & Usage</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <dt className="text-gray-600">Valid From:</dt>
                <dd className="font-medium">
                  {promotion.valid_from ? formatDate(promotion.valid_from) : 'No start date'}
                </dd>
                
                <dt className="text-gray-600">Valid Until:</dt>
                <dd className="font-medium">
                  {promotion.valid_until ? formatDate(promotion.valid_until) : 'No expiration'}
                </dd>
                
                <dt className="text-gray-600">Usage Limit:</dt>
                <dd className="font-medium">
                  {promotion.usage_limit || 'Unlimited'}
                </dd>
                
                <dt className="text-gray-600">Times Used:</dt>
                <dd className="font-medium">
                  {promotion.redemption_count}
                  {promotion.usage_limit && ` / ${promotion.usage_limit}`}
                </dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="p-6 flex flex-wrap justify-end gap-4">
          <Link href={`/admin/promotions/${params.id}/edit`}>
            <Button 
              variant="outline" 
              className="inline-flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          
          {!showDeleteConfirm ? (
            <Button 
              variant="destructive" 
              className="inline-flex items-center"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-red-600">Confirm deletion?</span>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 