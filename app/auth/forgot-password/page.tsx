'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePasswordResetRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    // Get the current origin for the redirect URL
    const redirectURL = `${window.location.origin}/auth/reset-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectURL,
    });

    setIsSubmitting(false)

    if (resetError) {
        console.error("Password reset request error:", resetError);
        setError(resetError.message || 'Failed to send password reset email. Please check the email address and try again.')
    } else {
        setMessage('Password reset instructions have been sent to your email address. Please check your inbox (and spam folder).')
        setEmail(''); // Clear email field on success
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center text-primary-700">Reset Your Password</h2>
        <p className="text-sm text-center text-secondary-600">
            Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
        
        <form onSubmit={handlePasswordResetRequest} className="space-y-4">
          {error && (
            <p className="p-3 text-sm text-center text-red-700 bg-red-100 rounded">
              {error}
            </p>
          )}
           {message && (
            <p className="p-3 text-sm text-center text-green-700 bg-green-100 rounded">
              {message}
            </p>
          )}

          <div>
            <label htmlFor="email" className="block mb-1 text-sm font-medium text-secondary-700">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-sm text-center text-secondary-600">
          Remembered your password?{' '}
          <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
} 