'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { recordCheckIn } from '@/app/locations/[locationId]/check-in/actions'
import { 
  saveOfflineCheckIn, 
  syncOfflineCheckIns,
  hasPendingCheckIns
} from '@/app/locations/[locationId]/check-in/offline-store'
import { verifyUserLocation } from '@/app/locations/[locationId]/check-in/location-verification'
import { QRScanner } from '@/components/ui/qr-scanner'
import { OfflineCheckInsManager } from '@/components/ui/offline-check-ins'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Camera, Check, Wifi, WifiOff, MapPin } from 'lucide-react'
import { format } from 'date-fns'

// Type for location info
type LocationInfo = {
  id: number;
  name: string;
  gym_id: number;
};

// Type for class info
type ClassInfo = {
  id: number;
  start_time: string;
  end_time: string;
  location_id: number;
  location_name: string;
  class_name: string;
  class_type: string;
  instructor_id: string;
  instructor_name: string;
};

// Type for member info retrieved from QR code
type MemberInfo = {
  id: string;
  full_name: string | null;
  email: string | null;
};

// Type for Location Verification Result
type LocationVerificationResult = {
  success: boolean;
  message?: string;
  distance?: number;
  locationName?: string;
};

export default function QRCheckInPage({ params }: { params: { locationId: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const locationId = parseInt(params.locationId, 10);
  
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [todayClasses, setTodayClasses] = useState<ClassInfo[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [scannedMember, setScannedMember] = useState<MemberInfo | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);
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
  
  // Fetch location info
  const fetchLocationInfo = useCallback(async () => {
    setIsLoadingLocation(true);
    if (isNaN(locationId)) {
      setCheckInMessage({
        text: 'Invalid Location ID',
        type: 'error'
      });
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
      setCheckInMessage({
        text: 'Error loading location information',
        type: 'error'
      });
      setLocation(null);
    } else {
      setLocation(data);
    }
    setIsLoadingLocation(false);
  }, [locationId, supabase]);
  
  // Fetch today's classes
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
          location_id,
          locations (name),
          classes (
            name,
            instructor_id,
            class_types (name),
            profiles:instructor_id (full_name)
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
        // Transform the data to our expected format
        // First cast to any to avoid TypeScript errors with complex nested types
        const rawData = data as unknown as Array<{
          id: number;
          start_time: string;
          end_time: string;
          location_id: number;
          locations: { name: string };
          classes: {
            name: string;
            instructor_id: string | null;
            class_types: { name: string };
            profiles: { full_name: string | null } | null;
          };
        }>;
        
        // Then map to our ClassInfo type
        const classesData = rawData.map(item => {
          return {
            id: item.id,
            start_time: item.start_time,
            end_time: item.end_time,
            location_id: item.location_id,
            location_name: item.locations?.name || 'Unknown Location',
            class_name: item.classes?.name || 'Unnamed Class',
            class_type: item.classes?.class_types?.name || 'Unknown Type',
            instructor_id: item.classes?.instructor_id || '',
            instructor_name: item.classes?.profiles?.full_name || 'No Instructor'
          };
        });
        
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
  
  // Initialize data
  useEffect(() => {
    fetchLocationInfo();
    fetchTodayClasses();
    checkUserLocation();
    
    // Auto-sync any pending check-ins when this page loads and we're online
    if (isOnline && hasPendingCheckIns()) {
      syncOfflineCheckIns().catch(console.error);
    }
  }, [fetchLocationInfo, fetchTodayClasses, checkUserLocation, isOnline]);
  
  // Handle QR code scan
  const handleScan = async (data: string) => {
    try {
      // Expected format: JSON string with member info: {"id":"123","name":"John Doe","email":"john@example.com"}
      const memberData = JSON.parse(data);
      
      if (!memberData.id) {
        setCheckInMessage({
          text: 'Invalid QR code format',
          type: 'error'
        });
        return;
      }
      
      setScannedMember({
        id: memberData.id,
        full_name: memberData.name || null,
        email: memberData.email || null
      });
      
      // Optionally, auto check-in immediately without confirmation
      // await handleCheckIn(memberData.id);
      
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      setCheckInMessage({
        text: 'Invalid QR code format',
        type: 'error'
      });
    }
  };
  
  // Handle check-in
  const handleCheckIn = async () => {
    if (!scannedMember || !location) return;
    
    setIsCheckingIn(true);
    setCheckInMessage(null);
    
    try {
      // If offline, save to local storage
      if (!isOnline) {
        // Create offline check-in record
        const timestamp = new Date().toISOString();
        saveOfflineCheckIn({
          profileId: scannedMember.id,
          locationId: location.id,
          classId: selectedClass?.id || null,
          checkInMethod,
          timestamp,
          memberName: scannedMember.full_name,
          className: selectedClass?.class_name
        });
        
        setCheckInMessage({
          text: `Saved offline check-in for ${scannedMember.full_name || scannedMember.email}. Will sync when back online.`,
          type: 'warning'
        });
        
        // Reset for next check-in after 3 seconds
        setTimeout(() => {
          setScannedMember(null);
          setCheckInMessage(null);
        }, 3000);
        
        setIsCheckingIn(false);
        return;
      }
      
      // Otherwise, perform an online check-in
      const result = await recordCheckIn(
        scannedMember.id,
        location.id,
        selectedClass?.id || null,
        checkInMethod
      );
      
      if (result.error) {
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
        setCheckInMessage({
          text: errorMsg,
          type: 'error'
        });
      } else {
        const classMsg = selectedClass ? ` for ${selectedClass.class_name}` : '';
        setCheckInMessage({
          text: `Successfully checked in ${scannedMember.full_name || scannedMember.email}${classMsg}!`,
          type: 'success'
        });
        
        // Reset for next check-in after 3 seconds
        setTimeout(() => {
          setScannedMember(null);
          setCheckInMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error during check-in:', error);
      setCheckInMessage({
        text: `Check-in failed: ${error}`,
        type: 'error'
      });
    } finally {
      setIsCheckingIn(false);
    }
  };
  
  // Format time for display
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, 'h:mm a');
  };
  
  if (isLoadingLocation) {
    return <div className="p-6 text-center">Loading Location Info...</div>
  }
  
  if (!location) {
    return (
      <div className="p-6 text-center">
        <Alert variant="destructive">
          <AlertDescription>
            {checkInMessage?.text || 'Could not load location details.'}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <Link 
            href={`/locations/${locationId}/check-in`}
            className="text-sm flex items-center text-gray-500 hover:text-primary-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Regular Check-in
          </Link>
          
          <div className="text-right">
            <h1 className="text-2xl font-bold text-primary-700">QR Check-in</h1>
            <p className="text-sm text-secondary-600">{location.name}</p>
            
            {/* Online/Offline Status */}
            <div className="flex items-center mt-1 justify-end">
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
                <div className={`flex items-center text-xs ml-3 ${
                  locationVerified.success ? 'text-green-600' : 'text-amber-600'
                }`}>
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
        </div>
        
        {/* Class Selection (if available) */}
        {!isLoadingClasses && todayClasses.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Select Class (Optional)
            </label>
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
                  {classInfo.class_name} - {formatTime(classInfo.start_time)} ({classInfo.instructor_name || 'No Instructor'})
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Check-in Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Check-in Method
          </label>
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
        
        {/* QR Scanner */}
        {!scannedMember && (
          <div className="mt-6">
            <QRScanner 
              onScan={handleScan}
              onError={(error) => {
                setCheckInMessage({
                  text: `Camera error: ${error.message}`,
                  type: 'error'
                });
              }}
            />
          </div>
        )}
        
        {/* Scanned Member Info */}
        {scannedMember && (
          <div className="mt-6 p-4 border rounded border-primary-200 bg-primary-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary-800">
                  {scannedMember.full_name || 'Unknown Member'}
                </h3>
                {scannedMember.email && (
                  <p className="text-sm text-secondary-600">{scannedMember.email}</p>
                )}
              </div>
              <div className="bg-green-100 text-green-800 p-2 rounded-full">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            
            <Button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="w-full py-3 mt-2 flex items-center justify-center bg-green-600 hover:bg-green-700"
            >
              {isCheckingIn ? (
                'Processing...'
              ) : !isOnline ? (
                'Save Offline Check-in'
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Confirm Check-in
                </>
              )}
            </Button>
            
            {!isOnline && (
              <p className="text-amber-600 text-xs mt-2 text-center">
                You&apos;re offline. Check-in will be saved locally and synced when you&apos;re back online.
              </p>
            )}
            
            <Button
              variant="outline"
              onClick={() => setScannedMember(null)}
              className="w-full mt-2"
              disabled={isCheckingIn}
            >
              Cancel
            </Button>
          </div>
        )}
        
        {/* Status Messages */}
        {checkInMessage && (
          <Alert 
            variant={
              checkInMessage.type === 'error' 
                ? 'destructive' 
                : checkInMessage.type === 'warning' 
                  ? 'default' 
                  : 'default'
            }
            className={`mt-4 ${
              checkInMessage.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : checkInMessage.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : ''
            }`}
          >
            <AlertDescription>{checkInMessage.text}</AlertDescription>
          </Alert>
        )}
        
        {/* Offline Check-ins Manager */}
        <div className="mt-4">
          <OfflineCheckInsManager />
        </div>
      </div>
    </div>
  );
} 