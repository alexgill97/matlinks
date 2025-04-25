import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/app/lib/utils'

// Types for the data we'll be displaying
type PaymentRecord = {
  id: string
  stripe_invoice_id: string
  stripe_customer_id: string
  amount_paid: number
  period_start: string
  period_end: string
  status: string
  created_at: string
  user?: {
    full_name: string | null
    email: string | null
  }
}

type SubscriptionStatusCount = {
  status: string
  count: number
}

type RevenueMetrics = {
  total_revenue: number
  monthly_revenue: number
  active_subscriptions: number
}

// Function to fetch payment records from Supabase
async function getRecentPayments(): Promise<PaymentRecord[]> {
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
  
  // Fetch recent payment records with user information
  const { data: payments, error } = await supabase
    .from('payment_history')
    .select(`
      *,
      user:profiles(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('Error fetching payments:', error)
    return []
  }
  
  return payments as PaymentRecord[]
}

// Function to fetch subscription status counts
async function getSubscriptionStatusCounts(): Promise<SubscriptionStatusCount[]> {
  const supabase = createClient()
  
  // Get counts grouped by subscription status
  const { data, error } = await supabase
    .from('member_profiles')
    .select('subscription_status')
    .not('subscription_status', 'is', null)
  
  if (error) {
    console.error('Error fetching subscription status counts:', error)
    return []
  }
  
  // Count occurrences of each status
  const statusMap = data.reduce((acc, item) => {
    const status = item.subscription_status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Convert to array format
  return Object.entries(statusMap).map(([status, count]) => ({
    status,
    count
  }))
}

// Function to fetch revenue metrics
async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const supabase = createClient()
  
  // Get sum of all payments
  const { data: totalData, error: totalError } = await supabase
    .from('payment_history')
    .select('amount_paid')
    .eq('status', 'paid')
  
  if (totalError) {
    console.error('Error fetching total revenue:', totalError)
    return { total_revenue: 0, monthly_revenue: 0, active_subscriptions: 0 }
  }
  
  const totalRevenue = totalData.reduce((sum, record) => sum + (record.amount_paid || 0), 0)
  
  // Get current month payments
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  
  const { data: monthlyData, error: monthlyError } = await supabase
    .from('payment_history')
    .select('amount_paid')
    .eq('status', 'paid')
    .gte('created_at', startOfMonth)
  
  if (monthlyError) {
    console.error('Error fetching monthly revenue:', monthlyError)
    return { total_revenue: totalRevenue, monthly_revenue: 0, active_subscriptions: 0 }
  }
  
  const monthlyRevenue = monthlyData.reduce((sum, record) => sum + (record.amount_paid || 0), 0)
  
  // Count active subscriptions
  const { count, error: countError } = await supabase
    .from('member_profiles')
    .select('id', { count: 'exact' })
    .eq('subscription_status', 'active')
  
  if (countError) {
    console.error('Error counting active subscriptions:', countError)
    return { total_revenue: totalRevenue, monthly_revenue: monthlyRevenue, active_subscriptions: 0 }
  }
  
  return {
    total_revenue: totalRevenue,
    monthly_revenue: monthlyRevenue,
    active_subscriptions: count || 0
  }
}

export default async function FinanceDashboardPage() {
  const payments = await getRecentPayments()
  const statusCounts = await getSubscriptionStatusCounts()
  const revenueMetrics = await getRevenueMetrics()
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Financial Dashboard</h1>
        <div className="flex gap-4">
          <Link
            href="/admin/finance/payments"
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            View All Payments
          </Link>
          <Link
            href="/admin/finance/subscriptions"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Manage Subscriptions
          </Link>
        </div>
      </div>
      
      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-600 mb-2">Total Revenue</h2>
          <p className="text-3xl font-bold text-primary-700">
            {formatCurrency(revenueMetrics.total_revenue / 100)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Lifetime revenue</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-600 mb-2">Monthly Revenue</h2>
          <p className="text-3xl font-bold text-primary-700">
            {formatCurrency(revenueMetrics.monthly_revenue / 100)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Current month</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-600 mb-2">Active Subscriptions</h2>
          <p className="text-3xl font-bold text-primary-700">
            {revenueMetrics.active_subscriptions}
          </p>
          <p className="text-sm text-gray-500 mt-1">Currently paying members</p>
        </div>
      </div>
      
      {/* Subscription Status Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Subscription Status</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {statusCounts.map((item) => (
                <div key={item.status} className="text-center">
                  <div className="text-2xl font-bold">{item.count}</div>
                  <div className="text-sm text-gray-500 capitalize">{item.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Payments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Payments</h2>
          <Link
            href="/admin/finance/payments"
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            View All &rarr;
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                      Invoice ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()}
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.stripe_invoice_id.substring(0, 12)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No payment records found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 