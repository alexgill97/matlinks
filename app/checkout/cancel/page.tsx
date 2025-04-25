'use client'

import { useRouter } from 'next/navigation'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

export default function CheckoutCancelPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[70vh]">
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Checkout Cancelled</AlertTitle>
          <AlertDescription>
            Your payment process was cancelled and no charges were made.
          </AlertDescription>
        </Alert>
        
        <div className="mt-8 flex flex-col space-y-4 items-center">
          <p className="text-center text-gray-600">
            You can try again whenever you&apos;re ready, or contact us if you have any questions about our membership plans.
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={() => router.back()} 
              className="px-4 py-2 font-medium border border-secondary-300 text-secondary-700 hover:bg-secondary-50 rounded transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-opacity-50"
            >
              Back to Checkout
            </button>
            
            <button
              onClick={() => router.push('/plans')} 
              className="px-4 py-2 font-medium bg-primary-600 hover:bg-primary-700 text-white rounded transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 