'use client'

import { useRouter } from 'next/navigation'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

export default function CheckoutSuccessPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[70vh]">
      <div className="w-full max-w-md">
        <Alert className="mb-6 bg-green-50 border-green-200">
          <AlertTitle className="text-green-700 text-xl">Payment Successful!</AlertTitle>
          <AlertDescription className="text-green-600">
            Thank you for your purchase. Your membership has been activated.
          </AlertDescription>
        </Alert>
        
        <div className="mt-8 flex flex-col space-y-4 items-center">
          <p className="text-center text-gray-600">
            Your payment has been processed successfully, and your membership is now active. 
            You can now access all the features included in your membership plan.
          </p>
          
          <button
            onClick={() => router.push('/dashboard')} 
            className="px-4 py-3 font-medium bg-primary-600 hover:bg-primary-700 text-white rounded transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
} 