'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { fetchPromotions } from './actions'
import { formatDate } from '@/app/lib/utils'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Search } from 'lucide-react'

// Promotion type definition
export interface Promotion {
  id: number
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  valid_from: string | null
  valid_until: string | null
  usage_limit: number | null
  redemption_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadPromotions() {
      try {
        setLoading(true)
        const data = await fetchPromotions()
        setPromotions(data)
        setError(null)
      } catch (err) {
        console.error('Error loading promotions:', err)
        setError('Failed to load promotions. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadPromotions()
  }, [])

  // Filter promotions based on search query
  const filteredPromotions = promotions.filter(promo => 
    promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (promo.description && promo.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Format discount value for display
  const formatDiscount = (type: 'percentage' | 'fixed_amount', value: number) => {
    if (type === 'percentage') {
      return `${value}%`
    } else {
      return `$${(value / 100).toFixed(2)}`
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Promotional Codes</h1>
        <Link href="/admin/promotions/new" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
          <PlusCircle className="w-4 h-4 mr-2" />
          New Promotion
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search promotions..."
              className="w-full pl-10 pr-4 py-2 border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p>Loading promotions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <p>{error}</p>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No promotions found.</p>
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-400">
                Try adjusting your search query or create a new promotion.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPromotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {promotion.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {promotion.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDiscount(promotion.discount_type, promotion.discount_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {promotion.valid_from && promotion.valid_until ? (
                        `${formatDate(promotion.valid_from)} - ${formatDate(promotion.valid_until)}`
                      ) : promotion.valid_until ? (
                        `Until ${formatDate(promotion.valid_until)}`
                      ) : promotion.valid_from ? (
                        `From ${formatDate(promotion.valid_from)}`
                      ) : (
                        'No expiration'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge 
                        className={promotion.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {promotion.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {promotion.redemption_count} / {promotion.usage_limit || '∞'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-3">
                        <Link href={`/admin/promotions/${promotion.id}`} className="text-primary-600 hover:text-primary-900">
                          View
                        </Link>
                        <Link href={`/admin/promotions/${promotion.id}/edit`} className="text-yellow-600 hover:text-yellow-900">
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 