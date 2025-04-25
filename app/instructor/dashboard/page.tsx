'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, Clock, MapPin, Users, Bell, ClipboardCheck, UserCheck } from 'lucide-react'
import Link from 'next/link'

type ClassSchedule = {
  id: string
  class_id: string
  day_of_week: number
  start_time: string
  end_time: string
  recurring: boolean
  classes: {
    id: string
    name: string
    description: string | null
    class_type: string
    location: {
      id: string
      name: string
    }
  } | null
}

type Notification = {
  id: string
  title: string
  message: string
  created_at: string
  read: boolean
}

export default function InstructorDashboard() {
  const supabase = createClient()
  const [classes, setClasses] = useState<ClassSchedule[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    const fetchInstructorData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          throw new Error('You must be logged in to view this page')
        }
        
        // Get the instructor profile
        const { data: instructor, error: instructorError } = await supabase
          .from('instructors')
          .select('id')
          .eq('user_id', user.id)
          .single()
          
        if (instructorError || !instructor) {
          throw new Error('You do not have instructor permissions')
        }
        
        // Get the instructor's classes
        const { data: classData, error: classError } = await supabase
          .from('class_schedules')
          .select(`
            id,
            class_id,
            day_of_week,
            start_time,
            end_time,
            recurring,
            classes (
              id,
              name,
              description,
              class_type,
              location_id,
              location:location_id (
                id, 
                name
              )
            )
          `)
          .eq('instructor_id', instructor.id)
          .order('day_of_week')
          .order('start_time')
          
        if (classError) throw classError
        
        // Cast the data to ensure it matches our ClassSchedule type
        setClasses(classData as unknown as ClassSchedule[])
        
        // Fetch sample notifications (in a real app, these would come from a notifications table)
        // Just mocking this for now
        setNotifications([
          {
            id: '1',
            title: 'New Student Joined',
            message: 'Alex Garcia has joined your Tuesday evening class',
            created_at: new Date().toISOString(),
            read: false
          },
          {
            id: '2',
            title: 'Promotion Reminder',
            message: 'Belt promotion tests scheduled for next Friday',
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            read: true
          }
        ])
      } catch (err) {
        console.error('Error loading instructor data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchInstructorData()
  }, [supabase])
  
  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayNum]
  }
  
  const formatTime = (timeStr: string) => {
    // Convert 24-hour time string (HH:MM:SS) to 12-hour format with AM/PM
    try {
      const [hours, minutes] = timeStr.split(':')
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    } catch {
      return timeStr
    }
  }
  
  // Get today's day number (0-6, Sunday-Saturday)
  const todayDayNum = new Date().getDay()
  
  // Filter classes for today
  const todaysClasses = classes.filter(cls => cls.day_of_week === todayDayNum)
  
  // Filter all classes based on selected filter
  const filteredClasses = filterType === 'today' 
    ? todaysClasses 
    : classes
  
  // Sort classes by day and time
  const sortedClasses = [...filteredClasses].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return a.start_time.localeCompare(b.start_time)
  })
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
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
      <h1 className="text-3xl font-bold mb-6">Instructor Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Today's Classes Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">Today&apos;s Classes</h2>
          </div>
          
          {todaysClasses.length === 0 ? (
            <p className="text-gray-500">No classes scheduled for today.</p>
          ) : (
            <div className="space-y-4">
              {todaysClasses.map(cls => (
                <div key={cls.id} className="border-l-4 border-blue-500 pl-3 py-1">
                  <div className="font-medium">{cls.classes?.name}</div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {cls.classes?.location?.name || 'No location set'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Students Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold">My Students</h2>
          </div>
          
          <p className="mb-4">View and manage your students:</p>
          
          <Link 
            href="/instructor/students" 
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition duration-200"
          >
            Student Roster
          </Link>
        </div>
        
        {/* Notifications Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Bell className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {notifications.filter(n => !n.read).length} new
              </span>
            )}
          </div>
          
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`p-3 rounded-md ${notification.read ? 'bg-gray-50' : 'bg-purple-50 border-l-4 border-purple-500'}`}
                >
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-sm text-gray-600">{notification.message}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Class Schedule */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Class Schedule</h2>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md ${
                filterType === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              All Classes
            </button>
            <button 
              onClick={() => setFilterType('today')}
              className={`px-3 py-1 rounded-md ${
                filterType === 'today' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
          </div>
        </div>
        
        {sortedClasses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">You don&apos;t have any classes assigned yet.</p>
            <p className="text-sm text-gray-400">Classes will appear here once they are assigned to you.</p>
          </div>
        ) : (
          <div>
            {/* Group classes by day */}
            {[0, 1, 2, 3, 4, 5, 6].map(dayNum => {
              const dayClasses = sortedClasses.filter(cls => cls.day_of_week === dayNum)
              if (dayClasses.length === 0) return null
              
              return (
                <div key={dayNum} className="mb-6">
                  <h3 className={`text-lg font-medium mb-2 pb-1 border-b ${
                    dayNum === todayDayNum ? 'text-blue-700 border-blue-700' : 'border-gray-200'
                  }`}>
                    {getDayName(dayNum)}
                    {dayNum === todayDayNum && ' (Today)'}
                  </h3>
                  
                  <div className="space-y-3">
                    {dayClasses.map(cls => (
                      <div key={cls.id} className="flex bg-gray-50 p-3 rounded-md">
                        <div className="w-32 text-sm font-medium border-r border-gray-200 pr-3">
                          {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                        </div>
                        
                        <div className="ml-3 flex-1">
                          <div className="font-medium">{cls.classes?.name}</div>
                          <div className="text-sm text-gray-600 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {cls.classes?.location?.name || 'No location set'}
                          </div>
                          {cls.classes?.description && (
                            <div className="text-sm text-gray-600 mt-1">{cls.classes.description}</div>
                          )}
                        </div>
                        
                        <div className="ml-auto">
                          <Link 
                            href={`/instructor/classes/${cls.id}`} 
                            className="inline-block text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded transition duration-200"
                          >
                            Manage
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Quick Links</h3>
            </div>
            <div className="space-y-3">
              <Link href="/instructor/students" className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition duration-200">
                <Users className="h-5 w-5 text-blue-500 mr-2" />
                <span>Student Roster</span>
              </Link>
              <Link href="/instructor/attendance" className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition duration-200">
                <ClipboardCheck className="h-5 w-5 text-green-500 mr-2" />
                <span>Attendance Tracking</span>
              </Link>
              <Link href="/instructor/attendance/bulk" className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition duration-200">
                <UserCheck className="h-5 w-5 text-purple-500 mr-2" />
                <span>Bulk Check-in</span>
              </Link>
            </div>
          </div>
          
          <Link href="/instructor/events" className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition duration-200">
            <Calendar className="h-5 w-5 text-purple-600 mr-2" />
            <span>Special Events</span>
          </Link>
        </div>
      </div>
    </div>
  )
} 