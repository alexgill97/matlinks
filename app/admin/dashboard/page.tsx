'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  CreditCard, 
  Calendar, 
  Clock, 
  User, 
  Dumbbell,
  MapPin,
  Bell
} from 'lucide-react'

type MetricCardProps = {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
}

const MetricCard = ({ title, value, description, icon, trend }: MetricCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="h-4 w-4 text-muted-foreground">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {trend && (
        <div className={`flex items-center text-xs mt-2 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}% {trend.label}
        </div>
      )}
    </CardContent>
  </Card>
)

type NotificationProps = {
  title: string
  message: string
  time: string
  isUnread?: boolean
}

const Notification = ({ title, message, time, isUnread = false }: NotificationProps) => (
  <div className={`p-4 ${isUnread ? 'bg-blue-50' : ''} border-b border-gray-100 last:border-0`}>
    <div className="flex justify-between items-start">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-gray-400">{time}</div>
    </div>
    <p className="text-sm text-gray-600 mt-1">{message}</p>
    {isUnread && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>}
  </div>
)

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Metrics state
  const [metrics, setMetrics] = useState({
    activeMembers: 0,
    revenueMonthly: 0,
    classesWeekly: 0,
    attendanceWeekly: 0,
    locations: 0,
    instructors: 0
  })
  
  // Notification state
  const [notifications, setNotifications] = useState<NotificationProps[]>([])
  
  useEffect(() => {
    const checkUserRole = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/auth/signin')
        return
      }

      const { data: userData, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single()

      if (error || !userData || !['admin', 'owner'].includes(userData.role)) {
        router.push('/dashboard')
      } else {
        fetchDashboardData()
      }
    }

    checkUserRole()
  }, [supabase, router])
  
  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch active members count
      const { count: activeMembers, error: membersError } = await supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
      
      if (membersError) throw membersError
      
      // Fetch monthly revenue (this would be more complex in a real implementation)
      const { data: revenueData, error: revenueError } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', new Date(new Date().setDate(1)).toISOString()) // Current month
      
      let monthlyRevenue = 0
      if (!revenueError && revenueData) {
        monthlyRevenue = revenueData.reduce((sum, payment) => sum + (payment.amount || 0), 0)
      }
      
      // Fetch weekly class count
      const { count: classesCount, error: classesError } = await supabase
        .from('class_instances')
        .select('id', { count: 'exact', head: true })
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      
      if (classesError) throw classesError
      
      // Fetch weekly attendance
      const { count: attendanceCount, error: attendanceError } = await supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      
      if (attendanceError) throw attendanceError
      
      // Fetch locations count
      const { count: locationsCount, error: locationsError } = await supabase
        .from('locations')
        .select('id', { count: 'exact', head: true })
      
      if (locationsError) throw locationsError
      
      // Fetch instructors count
      const { count: instructorsCount, error: instructorsError } = await supabase
        .from('instructors')
        .select('id', { count: 'exact', head: true })
      
      if (instructorsError) throw instructorsError
      
      // Update metrics state
      setMetrics({
        activeMembers: activeMembers || 0,
        revenueMonthly: monthlyRevenue,
        classesWeekly: classesCount || 0,
        attendanceWeekly: attendanceCount || 0,
        locations: locationsCount || 0,
        instructors: instructorsCount || 0
      })
      
      // Set some sample notifications (in a real app, these would come from a notifications table)
      setNotifications([
        {
          title: 'New Membership',
          message: 'John Doe just signed up for a 12-month membership plan',
          time: '10 minutes ago',
          isUnread: true
        },
        {
          title: 'Payment Failure',
          message: 'Failed payment for Sarah Smith\'s recurring membership',
          time: '2 hours ago',
          isUnread: true
        },
        {
          title: 'Class Capacity Alert',
          message: 'Evening BJJ class at Main Location is at 90% capacity',
          time: '5 hours ago'
        },
        {
          title: 'Instructor Update',
          message: 'Carlos Martinez updated their availability for next week',
          time: 'Yesterday'
        }
      ])
      
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data. Please try again later.')
      setIsLoading(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded mt-6"></div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500">Welcome to the Matlinks administrator dashboard</p>
      </div>
      
      <Tabs defaultValue="overview" className="w-full mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard
              title="Active Members"
              value={metrics.activeMembers}
              description="Total active memberships"
              icon={<Users className="h-4 w-4" />}
              trend={{ value: 12, label: "from last month", isPositive: true }}
            />
            
            <MetricCard
              title="Monthly Revenue"
              value={`$${metrics.revenueMonthly.toLocaleString()}`}
              description="Current month"
              icon={<CreditCard className="h-4 w-4" />}
              trend={{ value: 8, label: "from last month", isPositive: true }}
            />
            
            <MetricCard
              title="Weekly Classes"
              value={metrics.classesWeekly}
              description="Classes held this week"
              icon={<Calendar className="h-4 w-4" />}
            />
            
            <MetricCard
              title="Weekly Attendance"
              value={metrics.attendanceWeekly}
              description="Check-ins this week"
              icon={<User className="h-4 w-4" />}
              trend={{ value: 5, label: "from last week", isPositive: true }}
            />
            
            <MetricCard
              title="Locations"
              value={metrics.locations}
              description="Active gym locations"
              icon={<MapPin className="h-4 w-4" />}
            />
            
            <MetricCard
              title="Instructors"
              value={metrics.instructors}
              description="Active instructors"
              icon={<Dumbbell className="h-4 w-4" />}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">Recent Activity</CardTitle>
                <CardDescription>System activity over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center bg-gray-50">
                  <p className="text-gray-400">Activity chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl">Notifications</CardTitle>
                <Bell className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification, index) => (
                    <Notification
                      key={index}
                      title={notification.title}
                      message={notification.message}
                      time={notification.time}
                      isUnread={notification.isUnread}
                    />
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-100 p-2">
                <Link 
                  href="/admin/notifications" 
                  className="text-sm text-blue-600 hover:text-blue-800 w-full text-center"
                >
                  View all notifications
                </Link>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="members">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Member Overview</h2>
              <Link 
                href="/admin/members" 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                View All Members
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 font-medium">New Members</div>
                <div className="text-2xl font-bold">12</div>
                <div className="text-sm text-gray-500">This month</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-600 font-medium">Renewal Rate</div>
                <div className="text-2xl font-bold">85%</div>
                <div className="text-sm text-gray-500">Last 30 days</div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-yellow-600 font-medium">Trial Members</div>
                <div className="text-2xl font-bold">8</div>
                <div className="text-sm text-gray-500">Active trials</div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-red-600 font-medium">Churn Rate</div>
                <div className="text-2xl font-bold">4.2%</div>
                <div className="text-sm text-gray-500">Last 30 days</div>
              </div>
            </div>
            
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Member growth chart will be displayed here</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="financial">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Financial Overview</h2>
              <Link 
                href="/admin/finance" 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                View Finance Details
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-600 font-medium">Total Revenue</div>
                <div className="text-2xl font-bold">${metrics.revenueMonthly.toLocaleString()}</div>
                <div className="text-sm text-gray-500">This month</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-600 font-medium">Avg. Revenue Per Member</div>
                <div className="text-2xl font-bold">
                  {metrics.activeMembers ? `$${Math.round(metrics.revenueMonthly / metrics.activeMembers)}` : '$0'}
                </div>
                <div className="text-sm text-gray-500">This month</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-600 font-medium">Outstanding Payments</div>
                <div className="text-2xl font-bold">$1,250</div>
                <div className="text-sm text-gray-500">3 pending payments</div>
              </div>
            </div>
            
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Revenue chart will be displayed here</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="attendance">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Attendance Overview</h2>
              <Link 
                href="/admin/attendance/analytics" 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                View Attendance Analytics
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-600 font-medium">Total Check-ins</div>
                <div className="text-2xl font-bold">{metrics.attendanceWeekly}</div>
                <div className="text-sm text-gray-500">This week</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-600 font-medium">Class Capacity</div>
                <div className="text-2xl font-bold">72%</div>
                <div className="text-sm text-gray-500">Average this week</div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-600 font-medium">Most Popular Class</div>
                <div className="text-xl font-bold">Evening BJJ</div>
                <div className="text-sm text-gray-500">84% attendance rate</div>
              </div>
            </div>
            
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Attendance chart will be displayed here</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link 
                href="/admin/members/new" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex flex-col items-center justify-center text-center"
              >
                <User className="h-8 w-8 text-blue-500 mb-2" />
                <span className="font-medium">Add New Member</span>
              </Link>
              
              <Link 
                href="/admin/schedule/new" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex flex-col items-center justify-center text-center"
              >
                <Calendar className="h-8 w-8 text-green-500 mb-2" />
                <span className="font-medium">Schedule Class</span>
              </Link>
              
              <Link 
                href="/admin/finance/payments/new" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex flex-col items-center justify-center text-center"
              >
                <CreditCard className="h-8 w-8 text-purple-500 mb-2" />
                <span className="font-medium">Record Payment</span>
              </Link>
              
              <Link 
                href="/admin/attendance" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex flex-col items-center justify-center text-center"
              >
                <Clock className="h-8 w-8 text-yellow-500 mb-2" />
                <span className="font-medium">Check-in Member</span>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Database</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Online</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Processing</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Email Service</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Working</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Latest Backup</span>
                <span className="text-sm text-gray-500">Today at 03:00 AM</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">System Version</span>
                <span className="text-sm text-gray-500">v1.2.0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 