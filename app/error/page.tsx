'use client' // Error components must be Client Components

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('message') || 'Something went wrong.'

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Auth Error Page:', errorMessage)
  }, [errorMessage])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary-100">
      <div className="p-8 text-center bg-white rounded shadow-md">
        <h2 className="mb-4 text-2xl font-semibold text-red-600">Authentication Error</h2>
        <p className="text-secondary-700">{errorMessage}</p>
        <p className="mt-4 text-sm text-secondary-500">
          Please try again or contact support if the problem persists.
        </p>
        {/* Optional: Add a link back to the login page */}
        <a href="/login" className="inline-block px-4 py-2 mt-6 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50">
          Go to Login
        </a>
      </div>
    </div>
  )
} 