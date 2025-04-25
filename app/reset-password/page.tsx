'use client'

import { useState } from 'react'
import { updatePassword } from '@/app/reset-password/actions'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      // Add any other password complexity rules here
      setError('Password must be at least 6 characters long')
      return
    }

    const formData = new FormData();
    formData.append('password', password);

    const result = await updatePassword(formData)

    if (result?.error) {
      setError(result.error)
    } else {
      setMessage('Password updated successfully! You can now log in with your new password.')
      // Optionally redirect to login after a delay
      // setTimeout(() => window.location.href = '/login', 3000);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-100">
      <form onSubmit={handleSubmit} className="p-8 bg-white rounded shadow-md w-96">
        <h2 className="mb-6 text-2xl font-semibold text-center text-primary-700">Reset Your Password</h2>

        {message && <p className="mb-4 text-sm text-center text-green-600">{message}</p>}
        {error && <p className="mb-4 text-sm text-center text-red-600">{error}</p>}

        {!message && (
          <>
            <div className="mb-4">
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-secondary-700">
                New Password:
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-secondary-700">
                Confirm New Password:
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
            >
              Update Password
            </button>
          </>
        )}
        {message && (
           <div className="mt-4 text-center">
            <a href="/login" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
              Go to Login
            </a>
          </div>
        )}
      </form>
    </div>
  )
} 