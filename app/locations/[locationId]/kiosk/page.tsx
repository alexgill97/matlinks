'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { recordCheckIn } from '@/app/locations/[locationId]/check-in/actions'
import { QRScanner } from '@/components/ui/qr-scanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Camera, X, RotateCcw, CheckCircle } from 'lucide-react'

// Type for location info
type LocationInfo = {
  id: number;
  name: string;
  gym_id: number;
  gym: {
    name: string;
    logo_url: string | null;
  } | null;
};

// Type for class info
type ClassInfo = {
  id: number;
  start_time: string;
  end_time: string;
  class_name: string;
  class_type: string;
  instructor_name: string;
};

// Type for member info retrieved from QR code
type MemberInfo = {
  id: string;
  full_name: string | null;
  email: string | null;
  profile_image_url?: string | null;
};

export default function TabletKioskPage({ params }: { params: { locationId: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const locationId = parseInt(params.locationId, 10);
  
  // State
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [currentClasses, setCurrentClasses] = useState<ClassInfo[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedMember, setScannedMember] = useState<MemberInfo | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState<{
    text: string;
    type: 'success' | 'error';
    details?: string;
  } | null>(null);
  
  // Fetch location info
  const fetchLocationInfo = useCallback(async () => {
    if (isNaN(locationId)) {
      setIsLoadingLocation(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('locations')
        .select(`
          id, 
          name, 
          gym_id,
          gyms:gym_id (
            name,
            logo_url
          )
        `)
        .eq('id', locationId)
        .single();
      
      if (error) throw error;
      
      setLocation({
        id: data.id,
        name: data.name,
        gym_id: data.gym_id,
        gym: data.gyms ? {
          name: data.gyms.name,
          logo_url: data.gyms.logo_url
        } : null
      });
      
    } catch (err) {
      console.error("Error fetching location info:", err);
    } finally {
      setIsLoadingLocation(false);
    }
  }, [locationId, supabase]);
  
  // Fetch current and upcoming classes
  const fetchCurrentClasses = useCallback(async () => {
    if (!locationId || isNaN(locationId)) return;
    
    setIsLoadingClasses(true);
    
    try {
      const now = new Date();
      // Get classes that start within the next hour or are ongoing
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('class_instances')
        .select(`
          id,
          start_time,
          end_time,
          classes (
            name,
            class_types (name),
            profiles:instructor_id (full_name)
          )
        `)
        .eq('location_id', locationId)
        .gte('start_time', oneHourAgo)
        .lte('start_time', oneHourFromNow)
        .order('start_time', { ascending: true });
        
      if (error) throw error;
      
      // Transform the data to our expected format
      const classesData = (data || []).map(item => {
        return {
          id: item.id,
          start_time: item.start_time,
          end_time: item.end_time,
          class_name: item.classes?.name || 'Unnamed Class',
          class_type: item.classes?.class_types?.name || 'Unknown Type',
          instructor_name: item.classes?.profiles?.full_name || 'No Instructor'
        };
      });
      
      setCurrentClasses(classesData);
      
    } catch (err) {
      console.error("Error fetching current classes:", err);
    } finally {
      setIsLoadingClasses(false);
    }
  }, [locationId, supabase]);
  
  // Initialize data
  useEffect(() => {
    fetchLocationInfo();
    fetchCurrentClasses();
    
    // Refresh class list every minute
    const intervalId = setInterval(fetchCurrentClasses, 60000);
    
    return () => clearInterval(intervalId);
  }, [fetchLocationInfo, fetchCurrentClasses]);
  
  // Handle QR code scan
  const handleScan = async (data: string) => {
    try {
      // Expected format: JSON string with member info
      const memberData = JSON.parse(data);
      
      if (!memberData.id) {
        setCheckInMessage({
          text: 'Invalid QR Code',
          type: 'error',
          details: 'The QR code does not contain valid member information.'
        });
        return;
      }
      
      setScannedMember({
        id: memberData.id,
        full_name: memberData.name || null,
        email: memberData.email || null,
        profile_image_url: memberData.profile_image_url || null
      });
      
      // Stop the scanner after successful scan
      setScannerActive(false);
      
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      setCheckInMessage({
        text: 'Invalid QR Code Format',
        type: 'error',
        details: 'Could not read the QR code. Please try again.'
      });
    }
  };
  
  // Handle check-in
  const handleCheckIn = async () => {
    if (!scannedMember || !location) return;
    
    setIsCheckingIn(true);
    setCheckInMessage(null);
    
    try {
      const result = await recordCheckIn(
        scannedMember.id,
        location.id,
        selectedClass?.id || null,
        'KIOSK'
      );
      
      if (result.error) {
        let errorMsg = 'Check-in failed';
        let details = result.error;
        
        // Format the error message with membership details if available
        if (result.membershipDetails) {
          const { hasPlan, isActive, planName } = result.membershipDetails;
          if (!hasPlan) {
            details = 'You do not have an assigned membership plan.';
          } else if (!isActive) {
            details = `Your plan "${planName}" is inactive. Please contact the gym staff.`;
          }
        }
        
        setCheckInMessage({
          text: errorMsg,
          type: 'error',
          details
        });
      } else {
        const classMsg = selectedClass ? ` for ${selectedClass.class_name}` : '';
        setCheckInMessage({
          text: 'Check-in Successful!',
          type: 'success',
          details: `Welcome, ${scannedMember.full_name || 'Member'}${classMsg}!`
        });
        
        // Reset after 5 seconds
        setTimeout(() => {
          setScannedMember(null);
          setCheckInMessage(null);
          setSelectedClass(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Error during check-in:', error);
      setCheckInMessage({
        text: 'Check-in Failed',
        type: 'error',
        details: `An unexpected error occurred. Please try again or contact staff.`
      });
    } finally {
      setIsCheckingIn(false);
    }
  };
  
  // Helper to format class time
  const formatClassTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  // Reset everything
  const handleReset = () => {
    setScannedMember(null);
    setCheckInMessage(null);
    setSelectedClass(null);
    setScannerActive(false);
  };
  
  if (isLoadingLocation) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50">Loading...</div>;
  }
  
  if (!location) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-[90%] max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Location Not Found</CardTitle>
            <CardDescription>Invalid location ID</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {location.gym?.logo_url && (
              <div className="w-12 h-12 relative">
                <Image 
                  src={location.gym.logo_url} 
                  alt={location.gym.name || "Gym Logo"} 
                  fill 
                  className="object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{location.name}</h1>
              <p className="text-sm text-muted-foreground">{location.gym?.name || "Gym"}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-5xl">
        {/* Scanner Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Member Check-In</h2>
          <p className="text-xl mb-8">Scan your personal QR code to check in</p>
          
          {checkInMessage && (
            <Alert 
              variant={checkInMessage.type === 'success' ? 'default' : 'destructive'}
              className="mb-8 max-w-2xl mx-auto text-left"
            >
              <AlertTitle className="text-xl">
                {checkInMessage.text}
              </AlertTitle>
              {checkInMessage.details && (
                <AlertDescription className="text-base mt-2">
                  {checkInMessage.details}
                </AlertDescription>
              )}
            </Alert>
          )}
          
          {!scannerActive && !scannedMember && !checkInMessage && (
            <Button 
              size="lg" 
              className="text-xl py-8 px-12"
              onClick={() => setScannerActive(true)}
            >
              <Camera className="mr-2 h-6 w-6" />
              Scan QR Code
            </Button>
          )}
          
          {scannerActive && (
            <div className="max-w-md mx-auto">
              <div className="relative">
                <QRScanner 
                  onScan={handleScan} 
                  className="rounded-xl overflow-hidden border-4 border-primary" 
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  className="absolute top-2 right-2 rounded-full bg-white/80"
                  onClick={() => setScannerActive(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="mt-4 text-muted-foreground">
                Position your QR code in the center of the camera
              </p>
            </div>
          )}
          
          {scannedMember && !checkInMessage && (
            <div className="max-w-md mx-auto border rounded-xl p-6 bg-white shadow-sm">
              <div className="text-2xl font-bold mb-2">
                {scannedMember.full_name || 'Member'}
              </div>
              <div className="text-muted-foreground mb-6">
                {scannedMember.email || 'No email available'}
              </div>
              
              {currentClasses.length > 0 && (
                <div className="mb-6">
                  <div className="text-lg font-medium mb-2">Check in for a class?</div>
                  <div className="grid gap-2">
                    {currentClasses.map(classInfo => (
                      <Button
                        key={classInfo.id}
                        variant={selectedClass?.id === classInfo.id ? "default" : "outline"}
                        className="justify-start text-left h-auto py-3 px-4"
                        onClick={() => setSelectedClass(classInfo)}
                      >
                        <div>
                          <div className="font-medium">{classInfo.class_name}</div>
                          <div className="text-sm opacity-80">
                            {formatClassTime(classInfo.start_time, classInfo.end_time)}
                          </div>
                        </div>
                      </Button>
                    ))}
                    <Button
                      variant={selectedClass === null ? "default" : "outline"}
                      className="justify-start text-left h-auto py-3 px-4"
                      onClick={() => setSelectedClass(null)}
                    >
                      <div>
                        <div className="font-medium">General Check-in</div>
                        <div className="text-sm opacity-80">Just visiting the facility</div>
                      </div>
                    </Button>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleCheckIn} 
                disabled={isCheckingIn}
                size="lg" 
                className="w-full py-6 text-xl"
              >
                {isCheckingIn ? 'Processing...' : 'Complete Check-in'}
                {!isCheckingIn && <CheckCircle className="ml-2 h-5 w-5" />}
              </Button>
            </div>
          )}
        </div>
        
        {/* Current Classes Section (only shown before member is scanned) */}
        {!scannedMember && !scannerActive && currentClasses.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Current & Upcoming Classes</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {currentClasses.map(classInfo => (
                <Card key={classInfo.id}>
                  <CardHeader className="pb-2">
                    <CardTitle>{classInfo.class_name}</CardTitle>
                    <CardDescription>{classInfo.class_type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">
                      {formatClassTime(classInfo.start_time, classInfo.end_time)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Instructor: {classInfo.instructor_name}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-100 text-center p-4 text-sm text-muted-foreground">
        <p>
          Need help? Please ask a staff member for assistance
        </p>
      </footer>
    </div>
  );
} 