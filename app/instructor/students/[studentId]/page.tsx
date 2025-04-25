'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { ArrowLeft, Calendar, Clock, User, Mail, Award, Bookmark, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type ClassInfo = {
  id: string
  name: string
}

type StudentDetail = {
  id: string
  full_name: string
  email: string
  profile_image_url: string | null
  belt_rank: string | null
  phone_number: string | null
  emergency_contact: string | null
  emergency_contact_phone: string | null
  date_of_birth: string | null
  join_date: string | null
  notes: string | null
  classes: {
    id: string
    name: string
  }[]
}

type AttendanceRecord = {
  id: string
  class_name: string | null
  check_in_time: string
  check_in_method: string
}

export default function StudentDetail({ params }: { params: { studentId: string } }) {
  const { studentId } = params
  const supabase = createClient()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStudentDetails = async () => {
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
        
        // Get instructor's class IDs
        const { data: classSchedules, error: classError } = await supabase
          .from('class_schedules')
          .select('class_id, classes(id, name)')
          .eq('instructor_id', instructor.id)
          
        if (classError) throw classError
        
        // Extract unique class IDs
        const uniqueClasses: ClassInfo[] = Array.from(
          new Set(
            classSchedules
              .map(schedule => {
                const cls = schedule.classes as unknown as ClassInfo;
                return cls ? JSON.stringify({ id: cls.id, name: cls.name }) : null;
              })
              .filter(Boolean)
          )
        ).map(jsonStr => JSON.parse(jsonStr as string) as ClassInfo);
        
        if (uniqueClasses.length === 0) {
          throw new Error('You do not have any classes assigned')
        }
        
        const classIds = uniqueClasses.map(cls => cls.id)
        
        // Check if the student is in any of the instructor's classes
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('class_enrollments')
          .select(`
            profile_id,
            class_id,
            classes:class_id (
              id,
              name
            )
          `)
          .eq('profile_id', studentId)
          .in('class_id', classIds)
          
        if (enrollmentError) throw enrollmentError
        
        if (enrollments.length === 0) {
          throw new Error('Student not found in any of your classes')
        }
        
        // Get student profile details
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            profile_image_url,
            belt_rank,
            phone_number,
            emergency_contact,
            emergency_contact_phone,
            date_of_birth,
            created_at,
            notes
          `)
          .eq('id', studentId)
          .single()
          
        if (profileError) throw profileError
        
        if (!profile) {
          return notFound()
        }
        
        // Format the student classes from enrollments
        const studentClasses = enrollments
          .map(enrollment => {
            const cls = enrollment.classes as unknown as ClassInfo;
            return cls ? { id: cls.id, name: cls.name } : null;
          })
          .filter(Boolean) as ClassInfo[];
        
        setStudent({
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          profile_image_url: profile.profile_image_url,
          belt_rank: profile.belt_rank,
          phone_number: profile.phone_number,
          emergency_contact: profile.emergency_contact,
          emergency_contact_phone: profile.emergency_contact_phone,
          date_of_birth: profile.date_of_birth,
          join_date: profile.created_at,
          notes: profile.notes,
          classes: studentClasses
        })
        
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
              )
            )
          `)
          .eq('profile_id', studentId)
          .order('created_at', { ascending: false })
          .limit(20)
          
        if (attendanceError) throw attendanceError
        
        // Format attendance records
        const formattedAttendance = attendanceData.map(record => {
          let className = null
          if (record.class_schedule) {
            const classSchedule = record.class_schedule as { classes?: { name: string } }
            if (classSchedule.classes) {
              className = classSchedule.classes.name
            }
          }
          
          return {
            id: record.id,
            class_name: className,
            check_in_time: record.created_at,
            check_in_method: record.check_in_method
          }
        })
        
        setAttendance(formattedAttendance)
      } catch (err) {
        console.error('Error loading student details:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStudentDetails()
  }, [supabase, studentId])
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString()
  }
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-48 bg-gray-200 rounded mb-6"></div>
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
              href="/instructor/students"
              className="inline-block text-red-700 underline"
            >
              Return to student roster
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  if (!student) {
    return notFound()
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/instructor/students" className="mr-4">
          <ArrowLeft className="h-5 w-5 text-gray-500 hover:text-gray-700" />
        </Link>
        <h1 className="text-3xl font-bold">Student Profile</h1>
      </div>
      
      {/* Student Profile Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row">
          <div className="mb-6 md:mb-0 md:mr-8">
            <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {student.profile_image_url ? (
                <img 
                  src={student.profile_image_url} 
                  alt={student.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-gray-500 font-medium text-4xl">
                  {student.full_name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            
            {student.belt_rank && (
              <div className="mt-4 text-center">
                <span className="inline-block px-4 py-2 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                  {student.belt_rank}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{student.full_name}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-2" />
                <span>{student.email}</span>
              </div>
              
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <span>{student.phone_number || 'No phone number'}</span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <span>Birth date: {formatDate(student.date_of_birth)}</span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <span>Member since: {formatDate(student.join_date)}</span>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="font-semibold mb-2">Emergency Contact:</div>
              <div className="text-gray-700">
                {student.emergency_contact || 'No emergency contact provided'}
                {student.emergency_contact_phone && ` • ${student.emergency_contact_phone}`}
              </div>
            </div>
            
            {student.notes && (
              <div className="mt-6">
                <div className="font-semibold mb-2">Notes:</div>
                <div className="text-gray-700 bg-gray-50 p-3 rounded">
                  {student.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Enrolled Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Bookmark className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">Enrolled Classes</h2>
          </div>
          
          {student.classes.length === 0 ? (
            <p className="text-gray-500">Not enrolled in any of your classes.</p>
          ) : (
            <div className="space-y-3">
              {student.classes.map(cls => (
                <div key={cls.id} className="p-3 bg-gray-50 rounded-md">
                  <div className="font-medium">{cls.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Attendance Overview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <BarChart2 className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold">Attendance Overview</h2>
          </div>
          
          {/* This would normally include graphs/stats - simplified for now */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-3xl font-bold text-blue-600">
                {attendance.length}
              </div>
              <div className="text-sm text-gray-600">Recent check-ins</div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-3xl font-bold text-green-600">
                {new Set(attendance.map(a => a.class_name).filter(Boolean)).size}
              </div>
              <div className="text-sm text-gray-600">Unique classes</div>
            </div>
          </div>
          
          <div>
            <div className="font-medium mb-2">Last Check-in:</div>
            {attendance.length > 0 ? (
              <div className="text-gray-700">
                {new Date(attendance[0].check_in_time).toLocaleString()}
              </div>
            ) : (
              <div className="text-gray-500">No recent check-ins</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Attendance History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Award className="h-6 w-6 text-purple-600 mr-2" />
            <h2 className="text-xl font-semibold">Attendance History</h2>
          </div>
          
          {attendance.length > 0 && (
            <Link 
              href={`/instructor/students/${studentId}/attendance`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all
            </Link>
          )}
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