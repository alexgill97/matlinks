import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/app/lib/utils'
import RetryPaymentButton from './retry-payment-button'

// Types for the data we'll be displaying
type PaymentRecord = {
  id: string
  stripe_invoice_id: string | null
  stripe_customer_id: string | null
  amount_paid: number
  period_start: string
  period_end: string
  status: string
  created_at: string
  payment_method?: string
  receipt_number?: string | null
  is_manual?: boolean
  description?: string
  user?: {
    full_name: string | null
    email: string | null
  }
}

type PageProps = {
  searchParams: {
    page?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    paymentType?: string;
  }
}

// Function to fetch payment records with pagination and filters
async function getPayments(
  page: number = 1,
  status?: string,
  startDate?: string,
  endDate?: string,
  paymentType?: string
): Promise<{ payments: PaymentRecord[], total: number }> {
  const pageSize = 20
  const offset = (page - 1) * pageSize
  
  const supabase = createClient()
  
  // Get the current user to check for admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  
  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }
  
  // Start building the query
  let query = supabase
    .from('payment_history')
    .select(`
      *,
      user:profiles(full_name, email)
    `, { count: 'exact' })
  
  // Add filters if provided
  if (status) {
    query = query.eq('status', status)
  }
  
  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  
  if (endDate) {
    // Add a day to include the end date in results
    const nextDay = new Date(endDate)
    nextDay.setDate(nextDay.getDate() + 1)
    query = query.lt('created_at', nextDay.toISOString())
  }
  
  if (paymentType) {
    if (paymentType === 'manual') {
      query = query.eq('is_manual', true)
    } else if (paymentType === 'stripe') {
      query = query.eq('is_manual', false)
    }
  }
  
  // Add pagination
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)
  
  if (error) {
    console.error('Error fetching payments:', error)
    return { payments: [], total: 0 }
  }
  
  return { 
    payments: (data as PaymentRecord[]) || [], 
    total: count || 0 
  }
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  // Parse query parameters
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1
  const { status, startDate, endDate, paymentType } = searchParams
  
  // Fetch data
  const { payments, total } = await getPayments(currentPage, status, startDate, endDate, paymentType)
  
  // Calculate pagination
  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-gray-500 mt-1">View and filter all payment records</p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/admin/finance/payments/manual"
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Record Manual Payment
          </Link>
          <Link
            href="/admin/finance"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <form className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status || ''}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Type
            </label>
            <select
              id="paymentType"
              name="paymentType"
              defaultValue={paymentType || ''}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            >
              <option value="">All Types</option>
              <option value="manual">Manual Payments</option>
              <option value="stripe">Stripe Payments</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              defaultValue={startDate}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              defaultValue={endDate}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            />
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 w-full"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>
      
      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.user?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.user?.email || 'No email'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount_paid / 100)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </span>
                        {payment.status === 'failed' && !payment.is_manual && (
                          <RetryPaymentButton paymentId={payment.id} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.is_manual ? (
                        <span className="flex items-center">
                          <span className="h-2 w-2 bg-blue-400 rounded-full mr-2"></span>
                          <span className="capitalize">{payment.payment_method || 'Manual'}</span>
                        </span>
                      ) : (
                        <span>Stripe</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.is_manual ? (
                        payment.receipt_number || 'No receipt'
                      ) : (
                        payment.stripe_invoice_id || 'No invoice'
                      )}
                      {payment.description && (
                        <div className="text-xs text-gray-400 truncate max-w-xs">
                          {payment.description}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No payment records found matching your criteria.
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <nav className="inline-flex rounded-md shadow">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Create URL with current filters
              const url = new URL(typeof window !== 'undefined' ? window.location.href : 'http://placeholder.com')
              url.searchParams.set('page', page.toString())
              if (status) url.searchParams.set('status', status)
              if (startDate) url.searchParams.set('startDate', startDate)
              if (endDate) url.searchParams.set('endDate', endDate)
              if (paymentType) url.searchParams.set('paymentType', paymentType)
              
              return (
                <Link
                  key={page}
                  href={url.pathname + url.search}
                  className={`px-4 py-2 border ${
                    page === currentPage
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } ${page === 1 ? 'rounded-l-md' : ''} ${
                    page === totalPages ? 'rounded-r-md' : ''
                  }`}
                >
                  {page}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
} 