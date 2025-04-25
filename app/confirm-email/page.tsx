export default function ConfirmEmailPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary-100">
      <div className="p-8 text-center bg-white rounded shadow-md">
        <h2 className="mb-4 text-2xl font-semibold text-primary-700">Check Your Email</h2>
        <p className="text-secondary-700">
          Thank you for signing up!
        </p>
        <p className="mt-2 text-secondary-600">
          A confirmation link has been sent to your email address. Please click the link to activate your account.
        </p>
        <p className="mt-4 text-sm text-secondary-500">
          (If you don&apos;t see the email, please check your spam folder.)
        </p>
        <a href="/login" className="inline-block px-4 py-2 mt-6 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50">
          Back to Login
        </a>
      </div>
    </div>
  )
} 