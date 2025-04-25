import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/app/lib/utils'

// Types for the data we'll be displaying
type Subscription = {
  id: string
  user_id: string
  stripe_subscription_id: string
  current_plan_id: number
  subscription_status: string
  start_date?: string
  end_date?: string
  updated_at: string
  user?: {
    full_name: string | null
    email: string | null
  }
  plan?: {
    name: string
    price: number | null
    interval: string | null
  }
}

type PageProps = {
  searchParams: {
    page?: string;
    status?: string;
  }
}

// Function to fetch subscriptions with pagination and filters
async function getSubscriptions(
  page: number = 1,
  status?: string
): Promise<{ subscriptions: Subscription[], total: number }> {
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
    .from('member_profiles')
    .select(`
      id,
      user_id,
      stripe_subscription_id,
      current_plan_id,
      subscription_status,
      start_date,
      end_date,
      updated_at,
      user:profiles!member_profiles_user_id_fkey(full_name, email),
      plan:membership_plans!member_profiles_current_plan_id_fkey(name, price, interval)
    `, { count: 'exact' })
    .not('stripe_subscription_id', 'is', null)
  
  // Add filters if provided
  if (status) {
    query = query.eq('subscription_status', status)
  }
  
  // Add pagination
  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + pageSize - 1)
  
  if (error) {
    console.error('Error fetching subscriptions:', error)
    return { subscriptions: [], total: 0 }
  }
  
  return { 
    subscriptions: (data as Subscription[]) || [], 
    total: count || 0 
  }
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  // Parse query parameters
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1
  const { status } = searchParams
  
  // Fetch data
  const { subscriptions, total } = await getSubscriptions(currentPage, status)
  
  // Calculate pagination
  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-gray-500 mt-1">View and manage member subscriptions</p>
        </div>
        <Link
          href="/admin/finance"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Back to Dashboard
        </Link>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status || ''}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trial</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 w-full md:w-auto"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>
      
      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        {subscriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {subscription.user?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {subscription.user?.email || 'No email'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {subscription.plan?.name || 'Unknown plan'}
                      </div>
                      {subscription.plan?.price && (
                        <div className="text-sm text-gray-500">
                          {formatCurrency(subscription.plan.price / 100)}
                          {subscription.plan.interval ? `/${subscription.plan.interval}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        subscription.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                        subscription.subscription_status === 'trialing' ? 'bg-blue-100 text-blue-800' :
                        subscription.subscription_status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                        subscription.subscription_status === 'canceled' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {subscription.subscription_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subscription.start_date ? formatDate(subscription.start_date) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subscription.end_date ? formatDate(subscription.end_date) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-3">
                        <Link
                          href={`/admin/finance/subscriptions/${subscription.stripe_subscription_id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View
                        </Link>
                        
                        {subscription.subscription_status === 'active' && (
                          <Link
                            href={`/admin/finance/subscriptions/${subscription.stripe_subscription_id}/edit`}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Edit
                          </Link>
                        )}
                        
                        {subscription.subscription_status === 'active' && (
                          <Link
                            href={`/admin/finance/subscriptions/${subscription.stripe_subscription_id}/cancel`}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No subscriptions found matching your criteria.
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