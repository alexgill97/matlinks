'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import Link from 'next/link'
import { recordCheckIn } from '@/app/locations/[locationId]/check-in/actions' 
import { 
  saveOfflineCheckIn, 
  syncOfflineCheckIns,
  hasPendingCheckIns
} from '@/app/locations/[locationId]/check-in/offline-store'
import { verifyUserLocation } from '@/app/locations/[locationId]/check-in/location-verification'
import { OfflineCheckInsManager } from '@/components/ui/offline-check-ins'
import { Button } from '@/components/ui/button'
import { QrCode, MapPin, Wifi, WifiOff } from 'lucide-react'
import { format } from 'date-fns'

// Type for search results
type MemberSearchResult = {
    id: string; // Profile ID (UUID)
    full_name: string | null;
    email: string | undefined;
    rank_name: string | null;
    plan_name: string | null;
    plan_status: boolean | null;
    gym_id: number; // Need gym ID for potential navigation
};

// <<< Type for the raw data from the search query >>>
type ProfileSearchQueryResult = {
    id: string;
    full_name: string | null;
    users: { email: string | null }[] | null;
    ranks: { name: string | null }[] | null;
    membership_plans: { name: string | null; is_active: boolean | null }[] | null;
    locations: { gym_id: number | null }[] | null;
};

// Type for location info
type LocationInfo = {
    id: number;
    name: string;
    gym_id: number; // Need gym ID for potential navigation
};

// Type for class info
type ClassInfo = {
    id: number;
    name: string;
    instructor_name: string | null;
    start_time: string;
    end_time: string;
};

// Type for Location Verification Result
type LocationVerificationResult = {
  success: boolean;
  message?: string;
  distance?: number;
  locationName?: string;
};

export default function CheckInPage({ params }: { params: { locationId: string } }) {
    const supabase = createClient();
    const locationId = parseInt(params.locationId, 10);

    const [location, setLocation] = useState<LocationInfo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
    const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [todayClasses, setTodayClasses] = useState<ClassInfo[]>([]);
    const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
    const [isLoadingClasses, setIsLoadingClasses] = useState(false);
    const [checkInMethod, setCheckInMethod] = useState<'KIOSK' | 'MOBILE' | 'INSTRUCTOR' | 'ADMIN'>('MOBILE');
    const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [locationVerified, setLocationVerified] = useState<LocationVerificationResult | null>(null);
    const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);

    // --- Track Online Status ---
    useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }, []);

    // --- Fetch Location Info --- 
    const fetchLocationInfo = useCallback(async () => {
        setIsLoadingLocation(true);
        if (isNaN(locationId)) {
            setCheckInMessage('Invalid Location ID.');
            setIsLoadingLocation(false);
            return;
        }
        const { data, error } = await supabase
            .from('locations')
            .select('id, name, gym_id')
            .eq('id', locationId)
            .single();
        
        if (error || !data) {
            console.error("Error fetching location info:", error);
            setCheckInMessage('Error loading location information.');
            setLocation(null);
        } else {
            setLocation(data);
        }
        setIsLoadingLocation(false);
    }, [locationId, supabase]);

    // --- Fetch Today's Classes ---
    const fetchTodayClasses = useCallback(async () => {
        if (!locationId || isNaN(locationId)) return;
        
        setIsLoadingClasses(true);
        
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        try {
            const { data, error } = await supabase
                .from('class_instances')
                .select(`
                    id,
                    start_time,
                    end_time,
                    classes (
                        name,
                        instructor_id,
                        profiles (
                            full_name
                        )
                    )
                `)
                .eq('location_id', locationId)
                .gte('start_time', startOfDay)
                .lte('end_time', endOfDay)
                .order('start_time', { ascending: true });
                
            if (error) {
                console.error("Error fetching classes:", error);
                setTodayClasses([]);
            } else {
                // Transform data to our ClassInfo type by first casting to unknown
                const rawData = data as unknown as Array<{
                    id: number;
                    start_time: string;
                    end_time: string;
                    classes: {
                        name: string;
                        instructor_id: string | null;
                        profiles: { full_name: string | null } | null;
                    };
                }>;
                
                // Then map to our ClassInfo type
                const classesData = rawData.map(item => ({
                    id: item.id,
                    name: item.classes?.name || 'Unnamed Class',
                    instructor_name: item.classes?.profiles?.full_name || null,
                    start_time: item.start_time,
                    end_time: item.end_time
                }));
                
                setTodayClasses(classesData);
            }
        } catch (err) {
            console.error("Error in class fetch:", err);
            setTodayClasses([]);
        } finally {
            setIsLoadingClasses(false);
        }
    }, [locationId, supabase]);

    // --- Verify User Location ---
    const checkUserLocation = useCallback(async () => {
        if (!locationId || isNaN(locationId)) return;
        
        setIsVerifyingLocation(true);
        
        try {
            const verificationResult = await verifyUserLocation(locationId);
            setLocationVerified(verificationResult);
        } catch (error) {
            console.error("Error verifying location:", error);
            setLocationVerified({
                success: true, // Default to success if verification fails
                message: "Location verification failed. Continuing anyway."
            });
        } finally {
            setIsVerifyingLocation(false);
        }
    }, [locationId]);

    useEffect(() => {
        fetchLocationInfo();
        fetchTodayClasses();
        checkUserLocation();
        
        // Auto-sync any pending check-ins when this page loads and we're online
        if (isOnline && hasPendingCheckIns()) {
            syncOfflineCheckIns().catch(console.error);
        }
    }, [fetchLocationInfo, fetchTodayClasses, checkUserLocation, isOnline]);
    // ------------------------

    // --- Handle Search --- 
    const handleSearch = async (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        if (!searchTerm.trim()) {
            setSearchResults([]);
            setSelectedMember(null);
            return;
        }
        setIsSearching(true);
        setSearchError(null);
        setSelectedMember(null); // Clear selection on new search
        setCheckInMessage(null); 

        try {
            // Search profiles by name or email (case-insensitive)
            // Ensure member is associated with this location? Or allow check-in anywhere?
            // For now, search globally within the location filter.
             const { data, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    users ( email ),
                    ranks ( name ),
                    membership_plans ( name, is_active ),
                    locations ( gym_id )
                `)
                .eq('primary_location_id', locationId) // Only search members of this location
                .or(`full_name.ilike.%${searchTerm}%,users.email.ilike.%${searchTerm}%`) // Search name OR email
                .limit(10); // Limit results
            
            if (error) throw error;

            // <<< Use the specific query result type >>>
            const rawResults = data as ProfileSearchQueryResult[] | null;
            const mappedResults = rawResults?.map((p) => ({
                id: p.id,
                full_name: p.full_name,
                email: p.users?.[0]?.email ?? undefined,
                rank_name: p.ranks?.[0]?.name ?? null,
                plan_name: p.membership_plans?.[0]?.name ?? null,
                plan_status: p.membership_plans?.[0]?.is_active ?? null, 
                gym_id: p.locations?.[0]?.gym_id ?? 0,
            })) || [];

            setSearchResults(mappedResults);
            if (mappedResults.length === 0) {
                setSearchError('No members found matching that name or email at this location.');
            }

        } catch (err) {
            console.error("Search error:", err);
            setSearchError('An error occurred during the search.');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };
    // ---------------------

    // --- Handle Selection ---
    const handleSelectMember = (member: MemberSearchResult) => {
        setSelectedMember(member);
        setSearchResults([]); // Clear results after selection
        setSearchTerm(''); // Clear search term
        setSearchError(null);
    };
    // ---------------------

    // --- Handle Check-in --- 
    const handleCheckIn = async () => {
        if (!selectedMember || !location) return;

        setIsCheckingIn(true);
        setCheckInMessage(null);

        // If offline, save to local storage
        if (!isOnline) {
            // Create offline check-in record
            const timestamp = new Date().toISOString();
            saveOfflineCheckIn({
                profileId: selectedMember.id,
                locationId: location.id,
                classId: selectedClass?.id || null,
                checkInMethod,
                timestamp,
                memberName: selectedMember.full_name,
                className: selectedClass?.name
            });
            
            setIsCheckingIn(false);
            setCheckInMessage(`Saved offline check-in for ${selectedMember.full_name || selectedMember.email}. Will sync when back online.`);
            
            // Clear selection after successful check-in
            setTimeout(() => {
                setSelectedMember(null);
                setSelectedClass(null);
                setCheckInMessage(null);
            }, 3000); // Show success message for 3 seconds
            
            return;
        }

        // Otherwise, perform an online check-in
        const result = await recordCheckIn(
            selectedMember.id, 
            location.id, 
            selectedClass?.id || null,
            checkInMethod
        );

        setIsCheckingIn(false);
        if (result?.error) {
            // Format the error message with membership details if available
            let errorMsg = `Error: ${result.error}`;
            if (result.membershipDetails) {
                const { hasPlan, isActive, planName } = result.membershipDetails;
                if (!hasPlan) {
                    errorMsg += ' Member has no assigned plan.';
                } else if (!isActive) {
                    errorMsg += ` Plan "${planName}" is inactive.`;
                }
            }
            setCheckInMessage(errorMsg);
        } else {
            const classMsg = selectedClass ? ` for ${selectedClass.name}` : '';
            setCheckInMessage(`Successfully checked in ${selectedMember.full_name || selectedMember.email}${classMsg}!`);
            // Clear selection after successful check-in
            setTimeout(() => {
                setSelectedMember(null);
                setSelectedClass(null);
                setCheckInMessage(null);
            }, 3000); // Show success message for 3 seconds
        }
    };
    // ---------------------
    
    // --- Format Time for Display ---
    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return format(date, 'h:mm a');
    };
    
    if (isLoadingLocation) {
        return <div className="p-6 text-center">Loading Location Info...</div>
    }
    if (!location) {
        return <div className="p-6 text-center text-red-500">{checkInMessage || 'Could not load location details.'}</div>
    }

    return (
        <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-primary-700">Check-in</h1>
                        <p className="text-secondary-600 text-lg font-medium">{location.name}</p>
                        
                        {/* Online/Offline Status */}
                        <div className="flex items-center mt-1">
                            {isOnline ? (
                                <div className="flex items-center text-green-600">
                                    <Wifi className="w-4 h-4 mr-1" />
                                    <span className="text-xs">Online</span>
                                </div>
                            ) : (
                                <div className="flex items-center text-amber-600">
                                    <WifiOff className="w-4 h-4 mr-1" />
                                    <span className="text-xs">Offline</span>
                                </div>
                            )}
                            
                            {/* Location Verification Status */}
                            {locationVerified && (
                                <div className={`flex items-center text-xs ml-3 ${locationVerified.success ? 'text-green-600' : 'text-amber-600'}`}>
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {isVerifyingLocation ? (
                                        <span>Verifying...</span>
                                    ) : (
                                        <span>{locationVerified.success ? 'At location' : `${locationVerified.distance}m away`}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <Link href={`/locations/${location.id}/qr-check-in`}>
                        <Button variant="outline" className="flex items-center gap-2">
                            <QrCode className="w-4 h-4" />
                            <span>QR Check-in</span>
                        </Button>
                    </Link>
                </div>

                {/* --- Search Form --- */} 
                <form onSubmit={handleSearch} className="mb-4">
                    <label htmlFor="search" className="block text-sm font-medium text-secondary-700 mb-1">Find Member (Name or Email)</label>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            id="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Enter name or email..."
                            className="flex-grow px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            disabled={isSearching || isCheckingIn}
                        />
                        <button
                            type="submit"
                            disabled={isSearching || !searchTerm.trim()}
                            className="px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSearching ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                    {searchError && <p className="text-red-600 text-sm mt-1">{searchError}</p>}
                </form>

                {/* --- Search Results --- */} 
                {searchResults.length > 0 && (
                    <ul className="mb-4 border rounded border-secondary-200 max-h-60 overflow-y-auto divide-y divide-secondary-200">
                        {searchResults.map(member => (
                            <li key={member.id} 
                                className="p-3 hover:bg-primary-50 cursor-pointer flex justify-between items-center"
                                onClick={() => handleSelectMember(member)}
                            >
                                <div>
                                    <p className="font-medium text-primary-800">{member.full_name || '-'}</p>
                                    <p className="text-sm text-secondary-600">{member.email}</p>
                                </div>
                                <div className="text-right text-sm">
                                    {member.rank_name && <p className="text-secondary-500">{member.rank_name}</p>}
                                    {member.plan_name && (
                                        <p className={`${member.plan_status ? 'text-green-600' : 'text-red-600'} font-medium`}>
                                            {member.plan_name} {!member.plan_status && '(Inactive)'}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* --- Selected Member & Check-in --- */} 
                {selectedMember && (
                    <div className="mt-6 p-4 border rounded border-primary-200 bg-primary-50 text-center">
                        <p className="text-lg font-semibold text-primary-800 mb-1">{selectedMember.full_name}</p>
                        <p className="text-secondary-700 mb-1">{selectedMember.email}</p>
                         {(selectedMember.rank_name || selectedMember.plan_name) && (
                            <p className="text-sm text-secondary-600 mb-4">
                                {selectedMember.rank_name && <span>Rank: {selectedMember.rank_name}</span>}
                                {selectedMember.rank_name && selectedMember.plan_name && <span className="mx-2">|</span>}
                                {selectedMember.plan_name && (
                                    <span className={selectedMember.plan_status ? 'text-green-600' : 'text-red-600'}>
                                        Plan: {selectedMember.plan_name} {!selectedMember.plan_status && '(Inactive)'}
                                    </span>
                                )}
                             </p>
                         )}
                         
                        {/* Class Selection */}
                        {isLoadingClasses ? (
                            <div className="text-center p-2 mb-4">
                                <p className="text-gray-500">Loading classes...</p>
                            </div>
                        ) : todayClasses.length > 0 ? (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-secondary-700 mb-2">Select Class (Optional)</label>
                                <select 
                                    className="w-full p-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    onChange={(e) => {
                                        const classId = parseInt(e.target.value);
                                        const selectedClass = classId ? todayClasses.find(c => c.id === classId) || null : null;
                                        setSelectedClass(selectedClass);
                                    }}
                                    value={selectedClass?.id || ''}
                                >
                                    <option value="">General Check-in (No Specific Class)</option>
                                    {todayClasses.map(classInfo => (
                                        <option key={classInfo.id} value={classInfo.id}>
                                            {classInfo.name} - {formatTime(classInfo.start_time)} ({classInfo.instructor_name || 'No Instructor'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}
                        
                        {/* Check-in Method */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-secondary-700 mb-2">Check-in Method</label>
                            <select 
                                className="w-full p-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                onChange={(e) => setCheckInMethod(e.target.value as 'KIOSK' | 'MOBILE' | 'INSTRUCTOR' | 'ADMIN')}
                                value={checkInMethod}
                            >
                                <option value="KIOSK">Kiosk</option>
                                <option value="MOBILE">Mobile</option>
                                <option value="INSTRUCTOR">Instructor</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        
                        <button
                            onClick={handleCheckIn}
                            disabled={isCheckingIn || !isOnline && !selectedMember.plan_status}
                            className="w-full px-4 py-3 mt-2 text-lg font-bold text-white transition duration-200 ease-in-out rounded bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCheckingIn 
                                ? 'Checking In...' 
                                : !isOnline 
                                    ? 'Save Offline Check-in' 
                                    : 'Confirm Check-in'
                            }
                        </button>
                        
                        {!isOnline && (
                            <p className="text-amber-600 text-xs mt-2">
                                You&apos;re offline. Check-in will be saved locally and synced when you&apos;re back online.
                            </p>
                        )}
                        
                        {!selectedMember.plan_status && (
                            <p className="text-red-600 text-sm mt-2">
                                Unable to check in: Inactive or missing membership plan
                            </p>
                        )}
                    </div>
                )}

                {/* --- Check-in Status Message --- */}
                {checkInMessage && (
                    <div className={`mt-4 p-3 rounded text-center ${checkInMessage.startsWith('Error:') ? 'bg-red-100 text-red-700' : !isOnline ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {checkInMessage}
                    </div>
                )}
                
                {/* --- Offline Check-ins Manager --- */}
                <OfflineCheckInsManager />
            </div>
             {/* Optional link back to admin or location dashboard */}
             {location && location.gym_id && (
                <Link href={`/admin/gyms/${location.gym_id}/locations/${location.id}/members`} className="mt-6 text-sm text-secondary-600 hover:text-primary-700 hover:underline">
                   Back to Member Admin
                 </Link>
             )}
        </div>
    );
} 