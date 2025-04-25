'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'

export default function SignupPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // const [fullName, setFullName] = useState(''); // Optional: Add full name field
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null) // For success messages
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }
    // Add other client-side validation if needed (e.g., password strength)

    setIsSubmitting(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Optional: Add data to be stored in auth.users.user_metadata
        // data: {
        //   full_name: fullName, 
        // },
        // Optional: Email redirect URL after confirmation
        // emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setIsSubmitting(false)

    if (signUpError) {
      console.error("Signup error:", signUpError);
      setError(signUpError.message || 'Failed to create account. Please try again.')
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      // Handle case where user already exists but is unconfirmed (e.g., Supabase settings)
       console.warn("Signup attempt for existing but unconfirmed user:", email);
       setError('This email address may already be registered. Please check your inbox for a confirmation email or try logging in.');
    } else if (data.user) {
        // Successful signup (or user already exists and is confirmed)
        setMessage('Signup successful! Please check your email for a confirmation link to activate your account.')
        // Clear form? Or redirect to login with message?
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        // setFullName('');
    } else {
        // Unexpected case
        setError('An unexpected issue occurred during signup. Please try again.');
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center text-primary-700">Create Your Account</h2>
        
        <form onSubmit={handleSignup} className="space-y-4">
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

           {/* Optional Full Name Field */}
           {/* <div>
            <label htmlFor="full_name" className="block mb-1 text-sm font-medium text-secondary-700">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            />
          </div> */} 

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
            {/* TODO: Add password strength indicator? */} 
          </div>
           <div>
            <label htmlFor="confirmPassword" className="block mb-1 text-sm font-medium text-secondary-700">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              disabled={isSubmitting}
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
          >
            {isSubmitting ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-sm text-center text-secondary-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
} 