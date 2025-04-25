import { login, signup } from '@/app/login/actions'

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-100">
      <form className="p-8 bg-white rounded shadow-md w-96">
        <h2 className="mb-6 text-2xl font-semibold text-center text-primary-700">Login / Sign Up</h2>
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
          />
        </div>
        <div className="mb-6">
          <label htmlFor="password" className="block mb-2 text-sm font-medium text-secondary-700">
            Password:
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="mb-6 text-right">
          <a href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
            Forgot Password?
          </a>
        </div>
        <div className="flex justify-between">
          <button
            formAction={login}
            className="px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
          >
            Log in
          </button>
          <button
            formAction={signup}
            className="px-4 py-2 font-semibold transition duration-200 ease-in-out border rounded border-primary-600 text-primary-600 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  )
} 