'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Search, Filter, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Student = {
  id: string
  full_name: string
  email: string
  profile_image_url: string | null
  belt_rank: string | null
  classes: {
    id: string
    name: string
  }[]
  last_attendance: string | null
}

type ClassInfo = {
  id: string
  name: string
}

export default function StudentRoster() {
  const supabase = createClient()
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [rankFilter, setRankFilter] = useState<string>('all')
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [ranks, setRanks] = useState<string[]>([])

  useEffect(() => {
    const fetchInstructorStudents = async () => {
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
        
        setClasses(uniqueClasses)
        
        if (uniqueClasses.length === 0) {
          setStudents([])
          setFilteredStudents([])
          setIsLoading(false)
          return
        }
        
        const classIds = uniqueClasses.map(cls => cls.id)
        
        // Get profiles enrolled in these classes
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
          .in('class_id', classIds)
          
        if (enrollmentError) throw enrollmentError
        
        // Get detailed profile information for each enrolled student
        const profileIds = Array.from(new Set(enrollments.map(enrollment => enrollment.profile_id)))
        
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            profile_image_url,
            belt_rank
          `)
          .in('id', profileIds)
          
        if (profileError) throw profileError
        
        // Get latest attendance for each student
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('profile_id, created_at')
          .in('profile_id', profileIds)
          .order('created_at', { ascending: false })
          
        if (attendanceError) throw attendanceError
        
        // Create a map of most recent attendance by profile
        const latestAttendance = new Map()
        attendanceData.forEach(record => {
          if (!latestAttendance.has(record.profile_id)) {
            latestAttendance.set(record.profile_id, record.created_at)
          }
        })
        
        // Combine all data to create student objects
        const studentData = profiles.map(profile => {
          // Find all enrollments for this profile
          const studentEnrollments = enrollments.filter(
            enrollment => enrollment.profile_id === profile.id
          )
          
          // Extract class info from enrollments
          const studentClasses = studentEnrollments
            .map(enrollment => {
              const cls = enrollment.classes as unknown as ClassInfo;
              return cls ? { id: cls.id, name: cls.name } : null;
            })
            .filter(Boolean) as ClassInfo[];
          
          return {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            profile_image_url: profile.profile_image_url,
            belt_rank: profile.belt_rank,
            classes: studentClasses,
            last_attendance: latestAttendance.get(profile.id) || null
          }
        })
        
        // Extract unique ranks
        const uniqueRanks = Array.from(
          new Set(
            studentData
              .map(student => student.belt_rank)
              .filter(Boolean)
          )
        ).sort()
        
        setRanks(uniqueRanks)
        setStudents(studentData)
        setFilteredStudents(studentData)
      } catch (err) {
        console.error('Error loading student data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchInstructorStudents()
  }, [supabase])
  
  // Filter students when search term or filters change
  useEffect(() => {
    let result = [...students]
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(student => 
        student.full_name.toLowerCase().includes(term) || 
        student.email.toLowerCase().includes(term)
      )
    }
    
    // Apply class filter
    if (classFilter !== 'all') {
      result = result.filter(student => 
        student.classes.some(cls => cls.id === classFilter)
      )
    }
    
    // Apply rank filter
    if (rankFilter !== 'all') {
      result = result.filter(student => student.belt_rank === rankFilter)
    }
    
    setFilteredStudents(result)
  }, [searchTerm, classFilter, rankFilter, students])
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-12 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
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
      <div className="flex items-center mb-6">
        <Link href="/instructor/dashboard" className="mr-4">
          <ArrowLeft className="h-5 w-5 text-gray-500 hover:text-gray-700" />
        </Link>
        <h1 className="text-3xl font-bold">Student Roster</h1>
      </div>
      
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Class Filter */}
          <div className="w-full md:w-64">
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <div className="flex items-center justify-center px-3 bg-gray-100">
                <Filter className="h-4 w-4 text-gray-500" />
              </div>
              <select 
                className="flex-1 py-2 px-2 bg-white outline-none"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="all">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Rank Filter */}
          <div className="w-full md:w-64">
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <div className="flex items-center justify-center px-3 bg-gray-100">
                <Filter className="h-4 w-4 text-gray-500" />
              </div>
              <select 
                className="flex-1 py-2 px-2 bg-white outline-none"
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
              >
                <option value="all">All Ranks</option>
                {ranks.map(rank => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg mb-2">No students found</p>
          <p className="text-gray-400">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md">
          <div className="grid grid-cols-12 gap-4 p-4 font-medium text-gray-500 border-b">
            <div className="col-span-5">Student</div>
            <div className="col-span-2">Rank</div>
            <div className="col-span-3">Classes</div>
            <div className="col-span-2">Last Attendance</div>
          </div>
          
          <div className="divide-y">
            {filteredStudents.map(student => (
              <div key={student.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50">
                <div className="col-span-5">
                  <Link href={`/instructor/students/${student.id}`} className="flex items-center hover:text-blue-600">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-3">
                      {student.profile_image_url ? (
                        <img 
                          src={student.profile_image_url} 
                          alt={student.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 font-medium">
                          {student.full_name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{student.full_name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                  </Link>
                </div>
                
                <div className="col-span-2 flex items-center">
                  {student.belt_rank ? (
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {student.belt_rank}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not set</span>
                  )}
                </div>
                
                <div className="col-span-3 flex items-center">
                  <div className="space-y-1">
                    {student.classes.map(cls => (
                      <div key={cls.id} className="text-sm">{cls.name}</div>
                    ))}
                  </div>
                </div>
                
                <div className="col-span-2 flex items-center">
                  {student.last_attendance ? (
                    <span className="text-sm text-gray-600">
                      {new Date(student.last_attendance).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">Never</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 