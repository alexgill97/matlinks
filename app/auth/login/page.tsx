'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setIsSubmitting(false)

    if (signInError) {
      console.error("Login error:", signInError);
      setError(signInError.message || 'Invalid login credentials. Please try again.')
    } else {
      // Successful login
      // Redirect to a protected route, e.g., dashboard or admin home
      // Check user role here? Or rely on middleware/route protection?
      // For now, redirect to admin home as a default
      router.push('/admin') 
      router.refresh() // Ensure layout re-renders with user context
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center text-primary-700">Login to Your Account</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <p className="p-3 text-sm text-center text-red-700 bg-red-100 rounded">
              {error}
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
              className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-1 text-sm font-medium text-secondary-700">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            />
          </div>
          {/* TODO: Add Password Reset Link */} 
          {/* <div className="text-sm text-right"> 
             <Link href="/auth/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
               Forgot your password?
             </Link>
           </div> */} 
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-sm text-center text-secondary-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-primary-600 hover:text-primary-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
} 