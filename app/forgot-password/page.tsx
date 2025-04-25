import { requestPasswordReset } from '@/app/forgot-password/actions'

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-100">
      <form className="p-8 bg-white rounded shadow-md w-96">
        <h2 className="mb-6 text-2xl font-semibold text-center text-primary-700">Forgot Password</h2>
        <p className="mb-4 text-sm text-center text-secondary-600">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
        <div className="mb-4">
          <label htmlFor="email" className="block mb-2 text-sm font-medium text-secondary-700">
            Email:
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="you@example.com"
          />
        </div>
        <button
          formAction={requestPasswordReset}
          className="w-full px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
        >
          Send Reset Link
        </button>
        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
            Back to Login
          </a>
        </div>
      </form>
    </div>
  )
} 