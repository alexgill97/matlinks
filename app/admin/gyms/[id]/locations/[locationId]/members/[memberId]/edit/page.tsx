'use client'

import { useState, useEffect, useCallback } from 'react'
import { updateMemberProfile /*, deleteMember */ } from '@/app/admin/gyms/[id]/locations/[locationId]/members/[memberId]/edit/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { QRCode } from '@/components/ui/qr-code'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Types matching profile data + potentially joined email
type MemberProfileEdit = {
  id: string; 
  full_name: string | null;
  email: string | undefined; // Fetched separately or joined
  primary_location_id: number | null;
  current_plan_id: number | null; // Add plan ID
  current_rank_id: number | null; // <<< Add rank ID
  // role: string | null; // Add if managing roles here
  // Add other relevant profile fields
};

// <<< Define structure matching the Supabase query result >>>
type ProfileQueryResult = {
  id: string;
  full_name: string | null;
  primary_location_id: number | null;
  current_plan_id: number | null;
  current_rank_id: number | null;
  // Even with .single(), the join might be typed as potentially returning an array
  users: { email: string | null }[] | null; 
};

// Type for available plans dropdown
type MembershipPlanOption = {
    id: number;
    name: string;
};

// <<< Type for available ranks dropdown >>>
type RankOption = {
    id: number;
    name: string;
    order: number | null; // Optional: for sorting dropdown
};

type Location = {
  id: number;
  name: string;
};

// <<< Type for Check-in History record >>>
type CheckInRecord = {
    id: number; // Assuming check_ins table has numeric PK
    checked_in_at: string; // ISO timestamp string
    location_id: number;
    location_name: string | null; // Joined from locations table
};

// <<< Type for the Check-in query result >>>
type CheckInQueryResult = {
    id: number;
    checked_in_at: string;
    location_id: number;
    locations: { name: string | null }[] | null; // Expect joined location as potential array
};

export default function EditMemberPage({ params }: { params: { id: string, locationId: string, memberId: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const gymId = parseInt(params.id, 10);
  const locationId = parseInt(params.locationId, 10);
  const memberId = params.memberId; // Keep as string (UUID)

  // State for form fields
  const [profile, setProfile] = useState<MemberProfileEdit | null>(null)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(''); // Display only, not editable
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null); // State for assigned plan
  const [selectedRankId, setSelectedRankId] = useState<number | null>(null); // <<< State for assigned rank >>>
  // Add state for role, etc.
  
  // State for UI
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]); // For dropdown
  const [availablePlans, setAvailablePlans] = useState<MembershipPlanOption[]>([]); // State for plans dropdown
  const [availableRanks, setAvailableRanks] = useState<RankOption[]>([]); // <<< State for ranks dropdown >>>
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([]); // <<< State for check-ins >>>

  // --- Fetch Initial Data ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!memberId || isNaN(gymId) || isNaN(locationId)) {
        setError('Invalid IDs provided.');
        setIsLoading(false);
        return;
    }

    try {
        // 1. Fetch member profile, email, CURRENT plan ID, and CURRENT rank ID
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                primary_location_id,
                current_plan_id, 
                current_rank_id,
                users ( email )
            `)
            .eq('id', memberId)
            .single();

        if (profileError || !profileData) {
            console.error("Error fetching profile:", profileError);
            throw new Error('Failed to load member profile.');
        }
        
        // Assert the type after checking for null/error
        const profileDataTyped = profileData as ProfileQueryResult;
        const emailFromJoin = profileDataTyped.users?.[0]?.email;

        const initialProfile : MemberProfileEdit = {
            // Map from typed data
            id: profileDataTyped.id,
            full_name: profileDataTyped.full_name,
            primary_location_id: profileDataTyped.primary_location_id,
            current_plan_id: profileDataTyped.current_plan_id,
            current_rank_id: profileDataTyped.current_rank_id,
            email: emailFromJoin || undefined, 
        };
        setProfile(initialProfile);
        setFullName(initialProfile.full_name || '');
        setEmail(initialProfile.email || 'Email not found');
        setSelectedLocationId(initialProfile.primary_location_id);
        setSelectedPlanId(initialProfile.current_plan_id); // Set initial selected plan
        setSelectedRankId(initialProfile.current_rank_id); // <<< Set initial selected rank >>>
        // set initial role state if applicable

        // 2. Fetch available locations (for dropdown)
        // Fetch locations belonging to the CURRENT gym for reassignment
        const { data: locationsData, error: locationsError } = await supabase
            .from('locations')
            .select('id, name')
            .eq('gym_id', gymId) // Filter by the parent gym ID
            .order('name', { ascending: true });

        if (locationsError) {
            console.error("Error fetching locations:", locationsError);
            // Don't fail entirely, maybe just show current location
            setError('Could not load all available locations for reassignment.');
            setAvailableLocations([]);
        } else {
            setAvailableLocations(locationsData || []);
        }

        // 3. Fetch available ACTIVE membership plans (for dropdown)
        const { data: plansData, error: plansError } = await supabase
            .from('membership_plans')
            .select('id, name')
            .eq('is_active', true) // Only fetch active plans
            .order('name', { ascending: true });
        
        if (plansError) {
            console.error("Error fetching membership plans:", plansError);
            setError(prev => prev ? `${prev} Could not load membership plans.` : 'Could not load membership plans.');
            setAvailablePlans([]);
        } else {
            setAvailablePlans(plansData || []);
        }

        // <<< 4. Fetch available ranks (for dropdown) >>>
        const { data: ranksData, error: ranksError } = await supabase
            .from('ranks')
            .select('id, name, order') // Fetch order for potential sorting
            .order('order', { ascending: true, nullsFirst: false })
            .order('name', { ascending: true });

        if (ranksError) {
            console.error("Error fetching ranks:", ranksError);
            setError(prev => prev ? `${prev} Could not load ranks.` : 'Could not load ranks.');
            setAvailableRanks([]);
        } else {
            setAvailableRanks(ranksData || []);
        }
        // <<< End Fetch Ranks >>>

        // <<< 5. Fetch Check-in History >>>
        const { data: checkInData, error: checkInError } = await supabase
            .from('check_ins')
            .select(`
                id,
                checked_in_at,
                location_id,
                locations ( name )
            `)
            .eq('profile_id', memberId) // Filter by the current member
            .order('checked_in_at', { ascending: false })
            .limit(15); // Limit to recent check-ins

        if (checkInError) {
             console.error("Error fetching check-in history:", checkInError);
             // Don't block page load, just show error message in history section
             setError(prev => prev ? `${prev} Could not load check-in history.` : 'Could not load check-in history.');
             setCheckInHistory([]);
        } else {
            // Map the data, handling potential null location join
            const rawHistory = checkInData as CheckInQueryResult[] | null;
            const mappedHistory = rawHistory?.map((c) => ({ 
                id: c.id,
                checked_in_at: c.checked_in_at,
                location_id: c.location_id,
                location_name: c.locations?.[0]?.name ?? 'Unknown Location' 
            })) || [];
            setCheckInHistory(mappedHistory);
        }
        // <<< End Fetch Check-ins >>>

    } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred during data fetching.');
        setProfile(null);
    } finally {
        setIsLoading(false);
    }
  }, [memberId, gymId, supabase]); // Removed locationId dependency as it wasn't used for plans

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  // ------------------------

  // --- Handle Form Submission ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!profile) {
        setError("Profile data not loaded.");
        setIsSubmitting(false);
        return;
    }

    const formData = new FormData();
    formData.append('profile_id', profile.id);
    formData.append('full_name', fullName);
    formData.append('primary_location_id', selectedLocationId ? selectedLocationId.toString() : ''); // Send selected location ID
    formData.append('current_plan_id', selectedPlanId ? selectedPlanId.toString() : ''); // Add selected plan ID
    formData.append('current_rank_id', selectedRankId ? selectedRankId.toString() : ''); // <<< Add selected rank ID >>>
    // Append role etc. if managing here
    formData.append('current_gym_id', gymId.toString()); // Pass for revalidation context
    formData.append('current_location_id', locationId.toString());

    const result = await updateMemberProfile(formData);

    setIsSubmitting(false);
    if (result?.error) {
      setError(result.error);
    } else {
      // Navigate back to the members list of the *original* location for simplicity,
      // even if reassigned. Or could navigate to new location's list.
      router.push(`/admin/gyms/${gymId}/locations/${locationId}/members`);
      router.refresh();
    }
  };
  // --------------------------

  // --- Handle Deletion (Placeholder) ---
  const handleDelete = async () => {
    // TODO: Define what "Delete Member" means.
    // Option A: Disassociate from location (set primary_location_id = null)
    // Option B: Change role (e.g., to 'disabled')
    // Option C: Hard delete user (use admin client - DANGEROUS)
    if (!profile) return;
    if (!window.confirm(`CONFIRM: Delete/Disable member ${profile.full_name || profile.email}? Define action!`)) return;

    setError('Delete/Disable action not fully implemented yet.');
    // setIsDeleting(true);
    // const result = await deleteMember(profile.id, gymId, locationId);
    // setIsDeleting(false);
    // Handle result...
  };
  // --------------------------------

  // --- Render Logic ---
  if (isLoading) {
    return <div className="text-center p-6">Loading member details...</div>;
  }

  if (!profile && !isLoading) {
     return <div className="text-center p-6 text-red-600">Error: {error || 'Member profile not found.'}</div>;
  }

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Edit Member: {profile?.full_name || profile?.email || '...'}</h1>

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
         {error && !isSubmitting && (
          <p className="mb-4 text-sm text-red-600">Error: {error}</p>
        )}

        {/* Email (Readonly) */} 
        <div className="mb-4">
          <label htmlFor="email" className="block mb-1 text-sm font-medium text-secondary-700">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            readOnly
            className="w-full px-3 py-2 bg-secondary-100 border rounded border-secondary-300 text-secondary-500 focus:outline-none"
          />
        </div>

        {/* Full Name */} 
        <div className="mb-4">
          <label htmlFor="full_name" className="block mb-1 text-sm font-medium text-secondary-700">Full Name</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            disabled={isSubmitting}
          />
        </div>

        {/* Primary Location Dropdown */} 
        <div className="mb-4">
            <label htmlFor="primary_location_id" className="block mb-1 text-sm font-medium text-secondary-700">Primary Location</label>
            <select
                id="primary_location_id"
                name="primary_location_id"
                value={selectedLocationId ?? ''} // Handle null value for select
                onChange={(e) => setSelectedLocationId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                disabled={isSubmitting}
            >
                <option value="">-- No Primary Location --</option>
                {availableLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
            </select>
             <p className="mt-1 text-xs text-secondary-500">Assign or change the member&apos;s primary location within this gym.</p>
        </div>

        {/* Membership Plan Dropdown */} 
        <div className="mb-4">
            <label htmlFor="current_plan_id" className="block mb-1 text-sm font-medium text-secondary-700">Membership Plan</label>
            <select
                id="current_plan_id"
                name="current_plan_id"
                value={selectedPlanId ?? ''} // Handle null value
                onChange={(e) => setSelectedPlanId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                disabled={isSubmitting}
            >
                <option value="">-- No Active Plan --</option>
                {availablePlans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
            </select>
             <p className="mt-1 text-xs text-secondary-500">Assign an active membership plan to this member.</p>
        </div>
        
        {/* <<< Rank Dropdown >>> */} 
        <div className="mb-4">
            <label htmlFor="current_rank_id" className="block mb-1 text-sm font-medium text-secondary-700">Rank</label>
            <select
                id="current_rank_id"
                name="current_rank_id"
                value={selectedRankId ?? ''} // Handle null value
                onChange={(e) => setSelectedRankId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                disabled={isSubmitting}
            >
                <option value="">-- No Rank Assigned --</option>
                {availableRanks.map(rank => (
                    <option key={rank.id} value={rank.id}>{rank.name}</option>
                ))}
            </select>
             <p className="mt-1 text-xs text-secondary-500">Assign a rank to this member.</p>
        </div>
        {/* <<< End Rank Dropdown >>> */} 

        {/* Member QR Code for Check-ins */}
        {profile && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Member Check-in QR Code</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <QRCode
                value={JSON.stringify({
                  id: profile.id,
                  name: profile.full_name,
                  email: profile.email
                })}
                size={200}
                title="Scan for quick check-in"
                className="mb-3"
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                Member can use this QR code for quick check-in at any location
              </p>
            </CardContent>
          </Card>
        )}

        {/* --- Buttons --- */} 
         <div className="flex items-center justify-between mt-6">
           <button
            type="button"
            onClick={handleDelete} // Placeholder action
            disabled={isSubmitting}
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50`}
           >
             Delete/Disable Member
           </button>
          <div className="flex space-x-3">
            <button 
                type="button" 
                onClick={() => router.back()} 
                className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
                disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}
            >
              {isSubmitting ? 'Saving...' : 'Update Member'}
            </button>
          </div>
        </div>
      </form>

      {/* <<< Check-in History Section >>> */} 
      <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Recent Check-ins</h2>
          {checkInHistory.length === 0 ? (
              <p className="text-secondary-600 italic">No recent check-in history found.</p>
          ) : (
              <div className="bg-white shadow rounded p-4 max-h-96 overflow-y-auto">
                  <ul className="divide-y divide-secondary-200">
                      {checkInHistory.map((checkIn) => (
                          <li key={checkIn.id} className="py-3 flex justify-between items-center">
                              <div>
                                  <p className="text-sm font-medium text-secondary-800">
                                      {/* Format date nicely */} 
                                      {new Date(checkIn.checked_in_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                  </p>
                              </div>
                              <div className="text-sm text-secondary-600">
                                  at {checkIn.location_name} (ID: {checkIn.location_id})
                              </div>
                          </li>
                      ))}
                  </ul>
              </div>
          )}
          {/* Display history-specific errors if needed */}
          {error?.includes('check-in history') && <p className='text-red-500 text-sm mt-2'>{error}</p>} 
      </div>
      {/* <<< End Check-in History Section >>> */} 

    </div>
  )
} 