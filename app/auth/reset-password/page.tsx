'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation' // Use useSearchParams for potential error codes
import { createClient } from '@/app/lib/supabase/client'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams(); // To read error codes from URL if any
  const supabase = createClient()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check for error codes from Supabase redirect on mount
  useEffect(() => {
      const errorCode = searchParams.get('error_code');
      const errorDescription = searchParams.get('error_description');
      if (errorCode) {
          console.error(`Error during password reset flow: ${errorCode} - ${errorDescription}`);
          setError(errorDescription || 'An error occurred. The reset link might be invalid or expired.');
      }
  }, [searchParams]);

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }
    if (newPassword.length < 6) { // Basic check, align with Supabase policy
         setError("Password must be at least 6 characters long.");
         return;
    }

    setIsSubmitting(true)

    // The Supabase client automatically handles the access token from the URL fragment
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setIsSubmitting(false)

    if (updateError) {
      console.error("Password update error:", updateError);
      setError(updateError.message || 'Failed to update password. The reset link might be invalid or expired.')
    } else {
      setMessage('Your password has been successfully updated! You can now log in with your new password.')
      // Clear form? Redirect to login after a delay?
       setNewPassword('');
       setConfirmPassword('');
      // Consider redirecting after a short delay:
      // setTimeout(() => router.push('/auth/login'), 3000);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center text-primary-700">Set Your New Password</h2>
       
        <form onSubmit={handlePasswordReset} className="space-y-4">
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

          {/* Show form only if no message/success */}
          {!message && (
            <>
                <div>
                    <label htmlFor="newPassword" className="block mb-1 text-sm font-medium text-secondary-700">New Password</label>
                    <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    disabled={isSubmitting}
                    />
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block mb-1 text-sm font-medium text-secondary-700">Confirm New Password</label>
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
                    {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
            </>
          )}

          {/* Show link to login only if message exists (success) */} 
          {message && (
              <div className="text-center">
                 <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
                    Proceed to Login
                 </Link>
             </div>
          )}
        </form>

      </div>
    </div>
  )
} 