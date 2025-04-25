'use client' // <<< Make this a Client Component for state and interaction

import { createClient } from '@/app/lib/supabase/client' // <<< Use client supabase
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation' // <<< Import router and searchParams, remove unused notFound
import { useState, useEffect, useCallback } from 'react' // <<< Import hooks

// --- Types --- 
type MemberProfile = {
  id: string; // UUID from auth.users
  email: string | undefined; // Email might be on auth.users
  full_name: string | null;
  rank_name: string | null;
  plan_name: string | null;
  // Add other relevant profile fields (phone_number? role?)
};

// Type for the nested user data from the join
type UserEmail = {
  email: string | undefined; 
};

// Type for joined rank data
type RankName = {
    name: string | null;
};

// Type for joined plan data
type PlanName = {
    name: string | null;
};

// Type for the raw data returned by the query with joins
type ProfileWithJoins = {
  id: string;
  full_name: string | null;
  user: UserEmail[] | null; 
  ranks: RankName[] | null; // Joined rank can be an array or null
  membership_plans: PlanName[] | null; // Joined plan can be an array or null
};

type LocationInfo = {
  id: number;
  name: string;
};

// Type for filter options
type RankOption = { id: number; name: string; };
type PlanOption = { id: number; name: string; };

// --- Data Fetching (Now needs client Supabase and filter params) ---
async function fetchLocationAndMembers( 
    supabase: ReturnType<typeof createClient>, // Pass client instance
    locationId: number,
    rankIdFilter: number | null,
    planIdFilter: number | null
): Promise<{ location: LocationInfo | null; members: MemberProfile[]; ranks: RankOption[]; plans: PlanOption[]; error: boolean }> {
  
  let location: LocationInfo | null = null;
  let members: MemberProfile[] = [];
  let ranks: RankOption[] = [];
  let plans: PlanOption[] = [];
  let errorOccurred = false;

  try {
      // 1. Fetch Location details (can still use server client logic here potentially, but easier to use client)
      const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('id, name')
          .eq('id', locationId)
          .single();

      if (locationError || !locationData) {
          console.error('Error fetching location for members page:', locationError);
          // Handle error appropriately in client component (e.g., set error state)
          errorOccurred = true; 
          // Don't call notFound() directly in client component fetch logic
      } else {
          location = locationData;
      }

      // 2. Fetch Members based on filters
      let query = supabase
          .from('profiles')
          .select(`
              id,
              full_name,
              user:users ( email ),
              ranks ( name ),
              membership_plans ( name )
          `)
          .eq('primary_location_id', locationId);

      // <<< Apply filters >>>
      if (rankIdFilter !== null) {
          query = query.eq('current_rank_id', rankIdFilter);
      } else {
          // If you want to explicitly filter for NO rank:
          // query = query.is('current_rank_id', null);
      }
      if (planIdFilter !== null) {
          query = query.eq('current_plan_id', planIdFilter);
      } else {
          // If you want to explicitly filter for NO plan:
          // query = query.is('current_plan_id', null);
      }

      const { data: membersData, error: membersError } = await query
          .order('full_name', { ascending: true });

      if (membersError) {
          console.error('Error fetching members:', membersError);
          errorOccurred = true;
      } else {
          const rawMembersData = membersData as ProfileWithJoins[] | null;
          members = rawMembersData?.map(p => ({ 
              id: p.id,
              full_name: p.full_name,
              email: p.user?.[0]?.email,
              rank_name: p.ranks?.[0]?.name ?? null,
              plan_name: p.membership_plans?.[0]?.name ?? null
          })) || [];
      }

      // 3. Fetch Ranks for filter dropdown
      const { data: ranksData, error: ranksError } = await supabase
          .from('ranks')
          .select('id, name')
          .order('order', { ascending: true, nullsFirst: false })
          .order('name', { ascending: true });
      if (ranksError) {
          console.error('Error fetching ranks:', ranksError);
          errorOccurred = true;
      } else {
          ranks = ranksData || [];
      }

      // 4. Fetch Active Plans for filter dropdown
      const { data: plansData, error: plansError } = await supabase
          .from('membership_plans')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true });
       if (plansError) {
          console.error('Error fetching plans:', plansError);
          errorOccurred = true;
      } else {
          plans = plansData || [];
      }

  } catch (err) {
       console.error('Unexpected error fetching data:', err);
       errorOccurred = true;
  }

  // Return fetched data, indicate error if needed
  return { location, members, ranks, plans, error: errorOccurred };
}

// --- Page Component ---
export default function LocationMembersPage({ params }: { params: { id: string, locationId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient(); // Create client instance

  const gymId = parseInt(params.id, 10);
  const locationId = parseInt(params.locationId, 10);
  
  // <<< State for fetched data and UI >>>
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [availableRanks, setAvailableRanks] = useState<RankOption[]>([]);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // <<< State for filter dropdowns >>>
  const [selectedRankFilter, setSelectedRankFilter] = useState<string>(searchParams.get('rank') || '');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>(searchParams.get('plan') || '');

  // <<< Get filter values from URL >>>
  const rankFilter = searchParams.get('rank');
  const planFilter = searchParams.get('plan');

  // Use useCallback to memoize the fetch function
  const loadData = useCallback(async () => {
      setIsLoading(true);
      setError(null);

      if (isNaN(locationId) || isNaN(gymId)) {
          setError("Invalid Gym or Location ID.");
          setIsLoading(false);
          return;
      }

      const currentRankFilterId = rankFilter ? parseInt(rankFilter, 10) : null;
      const currentPlanFilterId = planFilter ? parseInt(planFilter, 10) : null;
      
      // Validate parsed IDs
      if ((rankFilter && isNaN(currentRankFilterId ?? NaN)) || (planFilter && isNaN(currentPlanFilterId ?? NaN))) {
           setError("Invalid filter value in URL.");
           // Potentially clear invalid filters from URL?
           // router.push(`/admin/gyms/${gymId}/locations/${locationId}/members`);
           setIsLoading(false);
           return;
      }

      try {
          const { location: locData, members: memData, ranks: rankOpts, plans: planOpts, error: fetchError } = await fetchLocationAndMembers(
              supabase, 
              locationId, 
              currentRankFilterId, 
              currentPlanFilterId
          );

          setLocation(locData);
          setMembers(memData);
          setAvailableRanks(rankOpts);
          setAvailablePlans(planOpts);

          if (fetchError) {
              setError('Failed to load location details.');
          } else if (!locData) {
               // Still possible locData is null even without fetchError if DB returns null
               setError('Location details not found.'); 
           }
      } catch (err) {
          console.error("Error in loadData:", err);
          setError("An unexpected error occurred while loading member data.");
          // Clear potentially partial data
          setLocation(null);
          setMembers([]);
          setAvailableRanks([]);
          setAvailablePlans([]);
      } finally {
          setIsLoading(false);
      }
  }, [gymId, locationId, rankFilter, planFilter, supabase]); // Depend on filters read from searchParams

  // Fetch data on initial load and when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // <<< Handle Filter Application >>>
  const handleFilter = () => {
      const params = new URLSearchParams();
      if (selectedRankFilter) params.set('rank', selectedRankFilter);
      if (selectedPlanFilter) params.set('plan', selectedPlanFilter);
      
      const queryString = params.toString();
      router.push(`/admin/gyms/${gymId}/locations/${locationId}/members${queryString ? '?' + queryString : ''}`);
      // Data will reload via useEffect dependency on searchParams change
  };

  // <<< Handle Clearing Filters >>>
  const clearFilters = () => {
      setSelectedRankFilter('');
      setSelectedPlanFilter('');
      router.push(`/admin/gyms/${gymId}/locations/${locationId}/members`);
  };

  // Render logic
  if (isLoading) {
    return <div className="text-center p-6">Loading members...</div>;
  }
  
  if (error) {
      // Show error message, potentially with a retry option
      return <div className="text-center p-6 text-red-600">Error: {error}</div>;
  }

  // This check is important after client-side fetching
  if (!location && !isLoading) {
       return <div className="text-center p-6 text-red-600">Error loading location data.</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Members at {location?.name || 'Location'}</h1>
        <Link href={`/admin/gyms/${gymId}/locations/${locationId}/members/new`} passHref>
          <button className="px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50">
            Add New Member
          </button>
        </Link>
      </div>

      {/* <<< Filter Section >>> */} 
      <div className="mb-6 p-4 bg-white rounded shadow flex space-x-4 items-end">
          {/* Rank Filter */} 
          <div>
              <label htmlFor="rankFilter" className="block text-sm font-medium text-secondary-700 mb-1">Filter by Rank</label>
              <select 
                  id="rankFilter"
                  value={selectedRankFilter}
                  onChange={(e) => setSelectedRankFilter(e.target.value)}
                  className="px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              >
                  <option value="">All Ranks</option>
                  {/* Option to filter for "No Rank" could be added here with a special value e.g., "_none_" */}
                  {availableRanks.map(rank => (
                      <option key={rank.id} value={rank.id}>{rank.name}</option>
                  ))}
              </select>
          </div>
          {/* Plan Filter */} 
          <div>
              <label htmlFor="planFilter" className="block text-sm font-medium text-secondary-700 mb-1">Filter by Plan</label>
              <select 
                  id="planFilter"
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  className="px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              >
                  <option value="">All Plans</option>
                   {/* Option to filter for "No Plan" */}
                  {availablePlans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
              </select>
          </div>
           {/* Filter Buttons */} 
          <button 
              onClick={handleFilter}
              className="px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
          >
              Filter
          </button>
          {(selectedRankFilter || selectedPlanFilter) && (
             <button 
                onClick={clearFilters}
                className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50"
             >
                Clear Filters
             </button>
          )}
      </div>

      {members.length === 0 ? (
        <p className="text-secondary-600">No members found matching the current filters.</p>
      ) : (
        <div className="bg-white shadow rounded p-6">
          <ul className="divide-y divide-secondary-200">
            {members.map((member) => (
              <li key={member.id} className="py-4 flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold text-primary-800">{member.full_name || 'No Name'}</p>
                  <p className="text-sm text-secondary-600">
                    {member.email || 'No Email'} 
                  </p>
                  {member.rank_name && (
                     <p className="text-sm text-secondary-500 mt-1">Rank: {member.rank_name}</p>
                  )}
                  {member.plan_name && (
                     <p className="text-sm text-secondary-500 mt-1">Plan: {member.plan_name}</p>
                  )}
                  {/* Add other member details display here */}
                </div>
                <div>
                   {/* Edit button */}
                   <Link href={`/admin/gyms/${gymId}/locations/${locationId}/members/${member.id}/edit`} passHref>
                     <button className="px-3 py-1 text-sm transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50">
                       Edit
                     </button>
                  </Link>
                  {/* TODO: Add Delete Button/Action here */}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 