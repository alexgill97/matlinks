'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { QRCode } from '@/components/ui/qr-code'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Download, User } from 'lucide-react'

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  profile_image_url: string | null;
  current_plan_id: number | null;
  current_rank_id: number | null;
  membership_plan: {
    name: string;
    is_active: boolean;
  } | null;
  rank: {
    name: string;
    color: string | null;
  } | null;
};

export default function MemberProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      // Check if user is logged in
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Not authenticated:', sessionError);
        router.push('/auth/signin');
        return;
      }

      try {
        // Fetch profile with membership plan and rank info
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            profile_image_url,
            current_plan_id,
            current_rank_id,
            membership_plans:current_plan_id (
              name,
              is_active
            ),
            ranks:current_rank_id (
              name,
              color
            ),
            users!profiles_user_id_fkey (
              email
            )
          `)
          .eq('user_id', session.user.id)
          .single();

        if (profileError) throw profileError;
        
        // Format the profile data
        const formattedProfile: Profile = {
          id: data.id,
          full_name: data.full_name,
          email: data.users?.email || '',
          profile_image_url: data.profile_image_url,
          current_plan_id: data.current_plan_id,
          current_rank_id: data.current_rank_id,
          membership_plan: data.membership_plans,
          rank: data.ranks
        };

        setProfile(formattedProfile);
        
        // Generate QR code data (JSON string with member info)
        const qrData = JSON.stringify({
          id: formattedProfile.id,
          name: formattedProfile.full_name,
          email: formattedProfile.email,
          profile_image_url: formattedProfile.profile_image_url
        });
        
        setQrCodeData(qrData);
        
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [supabase, router]);

  // Create a downloadable QR code image
  const handleDownloadQrCode = () => {
    const svgElement = document.querySelector('.qr-code-container svg');
    
    if (!svgElement) return;
    
    // Create a canvas from the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const image = new Image();
    
    // Set canvas size (with some padding)
    canvas.width = 1000;
    canvas.height = 1000;
    
    if (ctx) {
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      image.onload = () => {
        // Draw image centered on canvas with padding
        const padding = 100;
        ctx.drawImage(
          image,
          padding,
          padding,
          canvas.width - (padding * 2),
          canvas.height - (padding * 2)
        );
        
        // Add text
        ctx.fillStyle = 'black';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(profile?.full_name || 'Member QR Code', canvas.width / 2, canvas.height - 50);
        
        // Convert to PNG and download
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `${profile?.full_name || 'member'}-qr-code.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };
      
      image.src = url;
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  if (error || !profile) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Could not load profile</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error || 'An unexpected error occurred'}</p>
            <Button 
              className="mt-4" 
              onClick={() => router.push('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'M';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
      
      <div className="grid md:grid-cols-12 gap-8">
        {/* Profile Summary */}
        <div className="md:col-span-4">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.profile_image_url || undefined} />
                  <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{profile.full_name || 'Member'}</CardTitle>
                  <CardDescription>{profile.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Membership Plan</h3>
                  <p className="font-medium">
                    {profile.membership_plan?.name || 'No Plan'}
                    {profile.membership_plan && (
                      <span 
                        className={`text-xs ml-2 px-2 py-0.5 rounded-full ${
                          profile.membership_plan.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {profile.membership_plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Rank</h3>
                  <div className="flex items-center">
                    {profile.rank?.color && (
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: profile.rank.color }}
                      />
                    )}
                    <p className="font-medium">{profile.rank?.name || 'No Rank'}</p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => router.push('/dashboard/profile/edit')}
                >
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* QR Code Card */}
        <div className="md:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Your Check-in QR Code</CardTitle>
              <CardDescription>
                Use this code to check in at the gym or for classes
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="qr-code-container mb-6">
                <QRCode 
                  value={qrCodeData} 
                  size={250}
                  level="H"
                  title={profile.full_name || 'Member QR Code'} 
                />
              </div>
              
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground mb-2">
                  Show this QR code to staff or use it with the self-check-in kiosk
                </p>
                <p className="text-xs text-muted-foreground">
                  Code contains: Member ID, Name, Email
                </p>
              </div>
              
              <Button 
                variant="outline"
                onClick={handleDownloadQrCode}
                className="flex items-center"
              >
                <Download className="mr-2 h-4 w-4" />
                Download QR Code
              </Button>
            </CardContent>
          </Card>
          
          {/* Additional Tabs Section */}
          <Tabs defaultValue="attendance" className="mt-8">
            <TabsList className="w-full">
              <TabsTrigger value="attendance" className="flex-1">Recent Attendance</TabsTrigger>
              <TabsTrigger value="classes" className="flex-1">Upcoming Classes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Check-ins</CardTitle>
                  <CardDescription>Your recent gym and class attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Display a placeholder or actual attendance records */}
                  <div className="text-center text-muted-foreground py-8">
                    You'll see your recent check-ins here
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="classes">
              <Card>
                <CardHeader>
                  <CardTitle>Your Classes</CardTitle>
                  <CardDescription>Upcoming classes you've booked</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Display a placeholder or actual class bookings */}
                  <div className="text-center text-muted-foreground py-8">
                    You'll see your upcoming classes here
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 