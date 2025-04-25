'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { ArrowLeft, Award } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type AttendanceRecord = {
  id: string
  class_name: string | null
  check_in_time: string
  check_in_method: string
  location_name: string | null
}

export default function StudentAttendance({ params }: { params: { studentId: string } }) {
  const { studentId } = params
  const supabase = createClient()
  const [studentName, setStudentName] = useState<string>('')
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAttendanceHistory = async () => {
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
        
        // Get student name
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', studentId)
          .single()
          
        if (profileError) throw profileError
        
        if (!profile) {
          return notFound()
        }
        
        setStudentName(profile.full_name)
        
        // Get attendance records
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
          .eq('profile_id', studentId)
          .order('created_at', { ascending: false })
          
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
        console.error('Error loading attendance history:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAttendanceHistory()
  }, [supabase, studentId])
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
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
          <div className="mt-3">
            <Link 
              href={`/instructor/students/${studentId}`}
              className="inline-block text-red-700 underline"
            >
              Return to student profile
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href={`/instructor/students/${studentId}`} className="mr-4">
          <ArrowLeft className="h-5 w-5 text-gray-500 hover:text-gray-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Attendance History</h1>
          <p className="text-gray-600">Student: {studentName}</p>
        </div>
      </div>
      
      {/* Attendance History Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <Award className="h-6 w-6 text-purple-600 mr-2" />
          <h2 className="text-xl font-semibold">Complete Attendance Records</h2>
        </div>
        
        {attendance.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No attendance records found.</p>
            <p className="text-sm text-gray-400">Records will appear here when the student checks in.</p>
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
                      {new Date(record.check_in_time).toLocaleString()}
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