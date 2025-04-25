'use server'

import { createClient } from '@/app/lib/supabase/server'
import Link from 'next/link'

// --- Types ---
type MembershipPlan = {
  id: number;
  name: string;
  description: string | null;
  price: number | null; // Store price in cents or use numeric type
  interval: 'month' | 'year' | 'week' | 'day' | 'one_time' | null; // Billing interval
  is_active: boolean;
  // stripe_price_id: string | null; // Add later for billing
};

// --- Data Fetching ---
async function fetchMembershipPlans(): Promise<MembershipPlan[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('membership_plans')
    .select('id, name, description, price, interval, is_active') 
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching membership plans:', error);
    // Return empty array on error, page can show error message
    return [];
  }

  return data || [];
}

// --- Helper Function for Formatting Price ---
function formatPrice(price: number | null, interval: MembershipPlan['interval']) {
    if (price === null || price === undefined) return 'N/A';
    const amount = (price / 100).toFixed(2); // Assuming price is in cents
    switch (interval) {
        case 'month': return `$${amount}/month`;
        case 'year': return `$${amount}/year`;
        case 'week': return `$${amount}/week`;
        case 'day': return `$${amount}/day`;
        case 'one_time': return `$${amount} (one-time)`;
        default: return `$${amount}`;
    }
}

// --- Page Component ---
export default async function MembershipPlansPage() {
  
  const plans = await fetchMembershipPlans();

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Membership Plans</h1>
        <div className="flex space-x-2">
          <Link href="/plans" passHref>
            <button className="px-4 py-2 font-semibold text-primary-600 border border-primary-600 transition duration-200 ease-in-out rounded hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50">
              View Public Plans
            </button>
          </Link>
          <Link href={`/admin/memberships/plans/new`} passHref>
            <button className="px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50">
              Add New Plan
            </button>
          </Link>
        </div>
      </div>

      {plans.length === 0 ? (
        <p className="text-secondary-600">No membership plans created yet.</p>
      ) : (
        <div className="bg-white shadow rounded p-6">
          <ul className="divide-y divide-secondary-200">
            {plans.map((plan) => (
              <li key={plan.id} className="py-4 flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <p className={`text-lg font-semibold ${plan.is_active ? 'text-primary-800' : 'text-secondary-500 line-through'}`}>
                    {plan.name}
                    {!plan.is_active && <span className="ml-2 text-xs font-normal text-red-600">(Inactive)</span>}
                  </p>
                  <p className="text-sm text-secondary-600 mt-1">
                    {plan.description || 'No description'}
                  </p>
                   <p className="text-sm font-medium text-primary-700 mt-1">
                    {formatPrice(plan.price, plan.interval)}
                  </p>
                </div>
                <div className="flex-shrink-0 flex space-x-2">
                   {/* Edit button */} 
                   <Link href={`/admin/memberships/plans/${plan.id}/edit`} passHref>
                     <button className="px-3 py-1 text-sm transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50">
                       Edit
                     </button>
                  </Link>
                  {/* TODO: Add Delete Button/Action here (or maybe just deactivate?) */}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 