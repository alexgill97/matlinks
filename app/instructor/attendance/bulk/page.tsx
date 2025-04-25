'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Users, 
  CheckCircle, 
  XCircle,
  FileText,
  Download,
  Clock,
  Save,
  CheckSquare
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Student = {
  id: string
  full_name: string
  email: string
  profile_image_url: string | null
  belt_rank: string | null
  membershipActive: boolean
  lastAttendance: string | null
  selected: boolean
}

export default function BulkAttendance() {
  const supabase = createClient()
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [locations, setLocations] = useState<{id: string, name: string}[]>([])
  const [checkInType, setCheckInType] = useState<'CLASS' | 'GENERAL'>('GENERAL')
  const [classId, setClassId] = useState<string | null>(null)
  const [classes, setClasses] = useState<{id: string, name: string}[]>([])
  const [notes, setNotes] = useState('')
  const [selectAll, setSelectAll] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
        
        // Get locations the instructor has classes at
        const { data: classSchedules, error: scheduleError } = await supabase
          .from('class_schedules')
          .select(`
            classes (
              location_id,
              locations:location_id (
                id,
                name
              )
            )
          `)
          .eq('instructor_id', instructor.id)
          
        if (scheduleError) throw scheduleError
        
        // Extract unique locations
        const uniqueLocations = Array.from(
          new Set(
            classSchedules
              .map(schedule => {
                const classes = schedule.classes as any
                const location = classes?.locations as any
                return location ? JSON.stringify({ id: location.id, name: location.name }) : null
              })
              .filter(Boolean)
          )
        ).map(jsonStr => JSON.parse(jsonStr))
        
        setLocations(uniqueLocations)
        
        if (uniqueLocations.length > 0) {
          setSelectedLocation(uniqueLocations[0].id)
        }
        
        // Get classes taught by this instructor
        const { data: instructorClasses, error: classesError } = await supabase
          .from('classes')
          .select(`
            id,
            name
          `)
          .eq('instructor_id', instructor.id)
          
        if (classesError && classesError.code !== 'PGRST116') throw classesError
        
        setClasses(instructorClasses || [])
      } catch (err) {
        console.error('Error loading instructor data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchInstructorData()
  }, [supabase])
  
  useEffect(() => {
    const fetchLocationStudents = async () => {
      if (!selectedLocation) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        // Get all active members at this location
        const { data: memberships, error: membershipError } = await supabase
          .from('memberships')
          .select(`
            id,
            profile_id,
            location_id,
            status,
            active_until
          `)
          .eq('location_id', selectedLocation)
          .in('status', ['active', 'trial'])
          
        if (membershipError) throw membershipError
        
        // Get all the profiles
        const profileIds = memberships.map(m => m.profile_id)
        
        if (profileIds.length === 0) {
          setStudents([])
          setFilteredStudents([])
          setIsLoading(false)
          return
        }
        
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
          .order('full_name')
          
        if (profileError) throw profileError
        
        // Get latest attendance for these students
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance')
          .select('profile_id, created_at')
          .in('profile_id', profileIds)
          .order('created_at', { ascending: false })
          
        if (attendanceError) throw attendanceError
        
        // Create a map of most recent check-in by profile
        const lastAttendance = new Map()
        attendance.forEach(record => {
          if (!lastAttendance.has(record.profile_id)) {
            lastAttendance.set(record.profile_id, record.created_at)
          }
        })
        
        // Map memberships to check active status
        const today = new Date()
        const membershipStatus = new Map()
        memberships.forEach(membership => {
          const activeUntil = membership.active_until 
            ? new Date(membership.active_until) 
            : null
          
          const isActive = membership.status === 'active' && 
            (!activeUntil || activeUntil > today)
          
          membershipStatus.set(membership.profile_id, isActive)
        })
        
        // Combine all data
        const studentData = profiles.map(profile => ({
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          profile_image_url: profile.profile_image_url,
          belt_rank: profile.belt_rank,
          membershipActive: membershipStatus.get(profile.id) || false,
          lastAttendance: lastAttendance.get(profile.id) || null,
          selected: false
        }))
        
        setStudents(studentData)
        setFilteredStudents(studentData)
      } catch (err) {
        console.error('Error loading location students:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchLocationStudents()
  }, [selectedLocation, supabase])
  
  useEffect(() => {
    if (students.length > 0) {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        setFilteredStudents(
          students.filter(student => 
            student.full_name.toLowerCase().includes(term) || 
            student.email.toLowerCase().includes(term)
          )
        )
      } else {
        setFilteredStudents(students)
      }
    }
  }, [searchTerm, students])
  
  useEffect(() => {
    // Update all students' selected state when selectAll changes
    setStudents(prevStudents => 
      prevStudents.map(student => ({
        ...student,
        selected: selectAll
      }))
    )
    
    // Also update the filtered view
    setFilteredStudents(prevFiltered => 
      prevFiltered.map(student => ({
        ...student,
        selected: selectAll
      }))
    )
  }, [selectAll])
  
  const toggleStudentSelection = (studentId: string) => {
    // Update in the main students array
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === studentId
          ? { ...student, selected: !student.selected }
          : student
      )
    )
    
    // Also update in the filtered view
    setFilteredStudents(prevFiltered => 
      prevFiltered.map(student => 
        student.id === studentId
          ? { ...student, selected: !student.selected }
          : student
      )
    )
    
    // Check if we should update selectAll
    const updatedStudent = students.find(s => s.id === studentId)
    if (updatedStudent) {
      const willBeSelected = !updatedStudent.selected
      
      if (!willBeSelected && selectAll) {
        setSelectAll(false)
      } else if (willBeSelected) {
        // Check if all students are now selected
        const allSelected = students.every(s => 
          s.id === studentId ? true : s.selected
        )
        if (allSelected) {
          setSelectAll(true)
        }
      }
    }
  }
  
  const submitBulkAttendance = async () => {
    // Get all selected students
    const selectedStudents = students.filter(s => s.selected)
    
    if (selectedStudents.length === 0) {
      setError('Please select at least one student')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      const currentDate = new Date()
      const formattedDate = currentDate.toISOString()
      
      let classInstanceId = null
      
      // If this is a class check-in, create or get the class instance
      if (checkInType === 'CLASS' && classId) {
        // Get today's date in ISO format YYYY-MM-DD
        const today = currentDate.toISOString().split('T')[0]
        
        // First check if there's an existing class instance for today
        const { data: existingSession, error: sessionError } = await supabase
          .from('class_instances')
          .select('id')
          .eq('class_id', classId)
          .eq('date', today)
          .single()
          
        if (existingSession) {
          classInstanceId = existingSession.id
        } else {
          // Create a new class instance
          const { data: newSession, error: createError } = await supabase
            .from('class_instances')
            .insert({
              class_id: classId,
              date: today,
              status: 'active'
            })
            .select('id')
            .single()
            
          if (createError) throw createError
          classInstanceId = newSession.id
        }
      }
      
      // Prepare attendance records
      const attendanceRecords = selectedStudents.map(student => ({
        profile_id: student.id,
        location_id: selectedLocation,
        class_instance_id: classInstanceId,
        check_in_method: 'INSTRUCTOR',
        is_present: true,
        notes: notes || null,
        created_at: formattedDate
      }))
      
      // Insert all records
      const { error: insertError } = await supabase
        .from('attendance')
        .insert(attendanceRecords)
        
      if (insertError) throw insertError
      
      // Success! Clear selections
      setStudents(prevStudents => 
        prevStudents.map(student => ({
          ...student,
          selected: false
        }))
      )
      
      setFilteredStudents(prevFiltered => 
        prevFiltered.map(student => ({
          ...student,
          selected: false
        }))
      )
      
      setSelectAll(false)
      setNotes('')
      setSuccessMessage(`Successfully checked in ${selectedStudents.length} students`)
    } catch (err) {
      console.error('Error recording bulk attendance:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while recording attendance')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-12 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
        <Link href="/instructor/attendance" className="mr-4">
          <ArrowLeft className="h-5 w-5 text-gray-500 hover:text-gray-700" />
        </Link>
        <h1 className="text-3xl font-bold">Bulk Check-in</h1>
      </div>
      
      {/* Setup Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Check-in Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Location Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedLocation || ''}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              {locations.length === 0 ? (
                <option value="">No locations available</option>
              ) : (
                locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))
              )}
            </select>
          </div>
          
          {/* Check-in Type (Class or General) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Check-in Type
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-blue-600"
                  checked={checkInType === 'GENERAL'}
                  onChange={() => setCheckInType('GENERAL')}
                />
                <span className="ml-2">General Check-in</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-blue-600"
                  checked={checkInType === 'CLASS'}
                  onChange={() => setCheckInType('CLASS')}
                />
                <span className="ml-2">Class Check-in</span>
              </label>
            </div>
          </div>
          
          {/* Class Selection (only if Class check-in is selected) */}
          {checkInType === 'CLASS' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class
              </label>
              <select
                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={classId || ''}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">Select a class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (applied to all selected students)
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this check-in..."
            />
          </div>
        </div>
      </div>
      
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          <p className="font-bold">Success</p>
          <p>{successMessage}</p>
        </div>
      )}
      
      {/* Student Selection Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-xl font-semibold mb-3 md:mb-0">Select Students to Check In</h2>
          
          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setSelectAll(!selectAll)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition duration-200"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {selectAll ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
        
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg mb-2">No students found</p>
            {searchTerm ? (
              <p className="text-gray-400">Try adjusting your search term</p>
            ) : (
              <p className="text-gray-400">No active members found at this location</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-2"></th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Student</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Belt Rank</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Membership</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Last Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map(student => (
                  <tr 
                    key={student.id} 
                    className={`hover:bg-gray-50 ${student.selected ? 'bg-blue-50' : ''}`}
                    onClick={() => toggleStudentSelection(student.id)}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={student.selected}
                        onChange={() => toggleStudentSelection(student.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
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
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      {student.belt_rank ? (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {student.belt_rank}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    
                    <td className="px-4 py-3">
                      {student.membershipActive ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <span className="h-2 w-2 rounded-full bg-green-600 mr-1"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <span className="h-2 w-2 rounded-full bg-red-600 mr-1"></span>
                          Inactive
                        </span>
                      )}
                    </td>
                    
                    <td className="px-4 py-3">
                      {student.lastAttendance ? (
                        <span className="text-sm text-gray-600">
                          {new Date(student.lastAttendance).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Never</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={submitBulkAttendance}
            disabled={isSubmitting || students.filter(s => s.selected).length === 0}
            className={`inline-flex items-center px-4 py-2 ${
              isSubmitting || students.filter(s => s.selected).length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white text-sm font-medium rounded transition duration-200`}
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Check In Selected Students ({students.filter(s => s.selected).length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 