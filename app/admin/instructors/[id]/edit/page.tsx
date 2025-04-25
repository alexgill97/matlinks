'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar } from 'lucide-react'

type Instructor = {
  id: string
  user_id: string
  bio: string | null
  specialties: string | null
  created_at: string
  updated_at: string
  users: {
    id: string
    email: string
    first_name: string
    last_name: string
    profile_image: string | null
  } | null
}

type ScheduledClass = {
  id: string
  class_type: {
    id: number
    name: string
  } | null
  location: {
    id: number
    name: string
  } | null
  day_of_week: number
  start_time: string
  end_time: string
}

export default function EditInstructorPage({ params }: { params: { id: string } }) {
  const instructorId = params.id
  const supabase = createClient()
  
  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [classes, setClasses] = useState<ScheduledClass[]>([])
  const [bio, setBio] = useState<string>('')
  const [specialties, setSpecialties] = useState<string>('')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch instructor data
  useEffect(() => {
    const fetchInstructor = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from('instructors')
          .select(`
            id, 
            user_id,
            bio,
            specialties,
            created_at,
            updated_at,
            users (
              id,
              email,
              first_name,
              last_name,
              profile_image
            )
          `)
          .eq('id', instructorId)
          .single()

        if (error) throw error

        // Cast the result to ensure it matches our type
        setInstructor(data as unknown as Instructor)
        setBio(data.bio || '')
        setSpecialties(data.specialties || '')

        // Fetch instructor's classes
        const { data: classData, error: classError } = await supabase
          .from('class_schedules')
          .select(`
            id,
            class_type:class_type_id (id, name),
            location:location_id (id, name),
            day_of_week,
            start_time,
            end_time
          `)
          .eq('instructor_id', instructorId)
          .order('day_of_week')
          .order('start_time')

        if (classError) throw classError

        // Cast the result to ensure it matches our type
        setClasses(classData as unknown as ScheduledClass[])
      } catch (err) {
        console.error('Error fetching instructor:', err)
        setError('Failed to load instructor. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInstructor()
  }, [supabase, instructorId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    setIsSubmitting(true)

    try {
      const { error: updateError } = await supabase
        .from('instructors')
        .update({
          bio: bio || null,
          specialties: specialties || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', instructorId)

      if (updateError) throw updateError

      setSuccessMessage('Instructor updated successfully!')
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (err) {
      console.error('Error updating instructor:', err)
      setError('Failed to update instructor. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-40 bg-gray-200 rounded mb-6"></div>
        </div>
      </div>
    )
  }

  if (!instructor) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Instructor not found
        </div>
        <Link href="/admin/instructors">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Instructors
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin/instructors" className="inline-flex items-center text-gray-700 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Instructors
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">
        {instructor.users?.first_name} {instructor.users?.last_name}
      </h1>
      <p className="text-gray-600 mb-6">{instructor.users?.email}</p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instructor Details Form */}
        <div>
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
            <h2 className="text-xl font-semibold mb-4">Instructor Details</h2>

            <div className="mb-4">
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                disabled={isSubmitting}
                placeholder="Enter instructor bio..."
              />
            </div>

            <div className="mb-6">
              <label htmlFor="specialties" className="block text-sm font-medium text-gray-700 mb-1">
                Specialties
              </label>
              <input
                id="specialties"
                type="text"
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
                placeholder="Enter instructor specialties (e.g., 'Open Guard, Wrestling')"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 ${
                  isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50`}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* Assigned Classes */}
        <div className="bg-white p-6 rounded shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Assigned Classes</h2>
            <Link href="/admin/schedule">
              <Button variant="outline" size="sm" className="inline-flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Manage Schedule
              </Button>
            </Link>
          </div>

          {classes.length === 0 ? (
            <div className="text-gray-500 text-center py-6">
              No classes assigned to this instructor yet.
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((cls) => (
                <div key={cls.id} className="border border-gray-200 rounded p-3">
                  <div className="font-medium">{cls.class_type?.name}</div>
                  <div className="text-sm text-gray-600">
                    {getDayName(cls.day_of_week)}, {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Location: {cls.location?.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 