'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name?: string // May be calculated
}

export default function NewInstructorPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [bio, setBio] = useState<string>('')
  const [specialties, setSpecialties] = useState<string>('')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch eligible users (ones that aren't already instructors)
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // First, get all users with role 'instructor' or where the user has an instructor record
        const { data: existingInstructorUsers, error: instructorError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'instructor')

        if (instructorError) throw instructorError

        // Get list of user IDs that already have instructor profiles
        const { data: existingInstructorProfiles, error: profileError } = await supabase
          .from('instructors')
          .select('user_id')

        if (profileError) throw profileError

        // Create an array of IDs to exclude
        const excludeIds = [
          ...(existingInstructorUsers?.map(u => u.id) || []),
          ...(existingInstructorProfiles?.map(p => p.user_id) || [])
        ]

        // Fetch all non-instructor users
        const { data: eligibleUsers, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .not('id', 'in', excludeIds.length > 0 ? `(${excludeIds.join(',')})` : '(0)')
          .order('first_name', { ascending: true })

        if (userError) throw userError

        // Add a full_name field for easier display
        const usersWithFullName = eligibleUsers?.map(user => ({
          ...user,
          full_name: `${user.first_name} ${user.last_name}`.trim() || user.email
        })) || []

        setUsers(usersWithFullName)
      } catch (err) {
        console.error('Error fetching users:', err)
        setError('Failed to load users. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!selectedUserId) {
      setError('Please select a user')
      return
    }

    setIsSubmitting(true)

    try {
      // First update the user role to instructor
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'instructor' })
        .eq('id', selectedUserId)

      if (updateError) throw updateError

      // Then create the instructor profile
      const { error: createError } = await supabase
        .from('instructors')
        .insert([
          {
            user_id: selectedUserId,
            bio: bio || null,
            specialties: specialties || null
          }
        ])

      if (createError) throw createError

      setSuccessMessage('Instructor created successfully!')
      
      // Optionally redirect after a short delay
      setTimeout(() => {
        router.push('/admin/instructors')
        router.refresh()
      }, 1500)
    } catch (err) {
      console.error('Error creating instructor:', err)
      setError('Failed to create instructor. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin/instructors" className="inline-flex items-center text-gray-700 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Instructors
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Add New Instructor</h1>

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

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <div className="mb-4">
          <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
            Select User <span className="text-red-500">*</span>
          </label>
          <select
            id="user"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={isLoading || isSubmitting}
          >
            <option value="">Select a user...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email}
              </option>
            ))}
          </select>
          {users.length === 0 && !isLoading && (
            <p className="mt-1 text-sm text-gray-500">
              No eligible users found. All users already have instructor profiles.
            </p>
          )}
        </div>

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
          <Link href="/admin/instructors">
            <Button type="button" variant="outline" className="mr-2" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || users.length === 0}
            className={`px-4 py-2 ${
              isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50`}
          >
            {isSubmitting ? 'Creating...' : 'Create Instructor'}
          </Button>
        </div>
      </form>
    </div>
  )
} 