'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Award, Calendar, BarChart2, Users } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format } from 'date-fns'

type UserProfile = {
  id: string;
  full_name: string | null;
  belt_rank: string | null;
  stripe_count: number | null;
  join_date: string | null;
}

type AttendanceRecord = {
  id: string;
  check_in_time: string;
  check_in_method: string;
  class_name: string | null;
  location_name: string | null;
}

export default function ProgressPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfileAndAttendance = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, belt_rank, stripe_count, created_at')
          .eq('id', user.id)
          .single()
          
        if (profileError) throw profileError
        if (!profileData) throw new Error('Profile not found')
        
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          belt_rank: profileData.belt_rank,
          stripe_count: profileData.stripe_count,
          join_date: profileData.created_at
        })
        
        // Fetch attendance records
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select(`
            id,
            created_at,
            check_in_method,
            class_schedule:class_schedule_id (
              classes (
                name
              ),
              location:location_id (
                name
              )
            )
          `)
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
          
        if (attendanceError) throw attendanceError
        
        // Format attendance records
        const formattedAttendance = attendanceData.map(record => {
          let className = null
          let locationName = null
          
          if (record.class_schedule) {
            const classSchedule = record.class_schedule as { 
              classes?: { name: string },
              location?: { name: string } 
            }
            
            if (classSchedule.classes) {
              className = classSchedule.classes.name
            }
            
            if (classSchedule.location) {
              locationName = classSchedule.location.name
            }
          }
          
          return {
            id: record.id,
            class_name: className,
            location_name: locationName,
            check_in_time: record.created_at,
            check_in_method: record.check_in_method
          }
        })
        
        setAttendance(formattedAttendance)
      } catch (err) {
        console.error('Error loading progress data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred loading your progress data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfileAndAttendance()
  }, [router, supabase])
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return format(new Date(dateString), 'MMMM d, yyyy')
  }
  
  // Calculate attendance stats
  const totalClasses = attendance.length
  const uniqueClasses = new Set(attendance.map(a => a.class_name).filter(Boolean)).size
  const classesByMonth: Record<string, number> = {}
  
  attendance.forEach(record => {
    const monthYear = format(new Date(record.check_in_time), 'MMMM yyyy')
    classesByMonth[monthYear] = (classesByMonth[monthYear] || 0) + 1
  })
  
  // Get classes by month for recent months (up to 6)
  const recentMonths = Object.entries(classesByMonth).slice(0, 6)

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="text-center py-12">
          <p className="text-lg">Loading your progress data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Progress</h1>
          <p className="text-gray-600">Track your training journey and achievements</p>
        </div>
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          Back to Dashboard
        </Link>
      </div>
      
      {/* Rank & Profile Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-6">
          <Award className="h-6 w-6 text-purple-600 mr-2" />
          <h2 className="text-xl font-semibold">Rank & Membership</h2>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3">
            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg">
              <div className="text-center mb-4">
                <div className={`w-32 h-8 mb-2 rounded-md ${getBeltColor(profile?.belt_rank || null)}`}></div>
                <div className="font-bold text-xl">{profile?.belt_rank || 'No rank'}</div>
                <div className="text-gray-600">
                  {profile?.stripe_count ? `${profile.stripe_count} stripe${profile.stripe_count > 1 ? 's' : ''}` : 'No stripes'}
                </div>
              </div>
              <div className="text-sm text-gray-600">Training since {formatDate(profile?.join_date || null)}</div>
            </div>
          </div>
          
          <div className="md:w-2/3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 mb-1">{totalClasses}</div>
                <div className="text-gray-600 text-sm">Total classes attended</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-1">{uniqueClasses}</div>
                <div className="text-gray-600 text-sm">Unique class types</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {Math.round(profile?.join_date 
                    ? (new Date().getTime() - new Date(profile.join_date).getTime()) / (1000 * 60 * 60 * 24 * 30) 
                    : 0)}
                </div>
                <div className="text-gray-600 text-sm">Months of training</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-amber-600 mb-1">
                  {attendance.length > 0 
                    ? format(new Date(attendance[0].check_in_time), 'MMM d')
                    : 'N/A'}
                </div>
                <div className="text-gray-600 text-sm">Last class attended</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Attendance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <BarChart2 className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">Monthly Attendance</h2>
          </div>
          
          {recentMonths.length > 0 ? (
            <div className="space-y-3">
              {recentMonths.map(([month, count]) => (
                <div key={month} className="relative pt-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-600 w-24">{month}</div>
                    <div className="text-sm font-medium text-gray-900">{count} classes</div>
                  </div>
                  <div className="overflow-hidden h-2 mt-1 text-xs flex rounded bg-blue-100">
                    <div 
                      style={{ width: `${Math.min(Math.max(count / 20 * 100, 10), 100)}%` }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500">
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No attendance data available yet.</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold">Class Types</h2>
          </div>
          
          {attendance.length > 0 ? (
            <div>
              {getClassTypeDistribution(attendance).map(([className, count]) => (
                <div key={className} className="relative pt-1 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-600">{className}</div>
                    <div className="text-sm font-medium text-gray-900">{count} classes</div>
                  </div>
                  <div className="overflow-hidden h-2 mt-1 text-xs flex rounded bg-green-100">
                    <div 
                      style={{ width: `${Math.min(count / attendance.length * 100, 100)}%` }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500">
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No attendance data available yet.</p>
          )}
        </div>
      </div>
      
      {/* Attendance History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <Calendar className="h-6 w-6 text-indigo-600 mr-2" />
          <h2 className="text-xl font-semibold">Attendance History</h2>
        </div>
        
        {attendance.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No attendance records found.</p>
            <p className="text-sm text-gray-400">Records will appear here when you check in to classes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date & Time</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Class</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Location</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Check-in Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendance.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {formatDate(record.check_in_time)} {format(new Date(record.check_in_time), 'h:mm a')}
                    </td>
                    <td className="px-4 py-3">
                      {record.class_name || 'General check-in'}
                    </td>
                    <td className="px-4 py-3">
                      {record.location_name || 'Unknown location'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {record.check_in_method}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to get belt color based on rank
function getBeltColor(belt: string | null): string {
  if (!belt) return 'bg-gray-300'
  
  const beltMap: Record<string, string> = {
    'White': 'bg-gray-100 border border-gray-300',
    'Blue': 'bg-blue-500',
    'Purple': 'bg-purple-600',
    'Brown': 'bg-amber-700',
    'Black': 'bg-black'
  }
  
  for (const [key, value] of Object.entries(beltMap)) {
    if (belt.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }
  
  return 'bg-gray-300'
}

// Helper function to get class type distribution
function getClassTypeDistribution(attendance: AttendanceRecord[]): [string, number][] {
  const classCount: Record<string, number> = {}
  
  attendance.forEach(record => {
    const className = record.class_name || 'General check-in'
    classCount[className] = (classCount[className] || 0) + 1
  })
  
  return Object.entries(classCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
} 