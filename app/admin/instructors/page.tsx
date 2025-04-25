'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PlusCircle, Edit, User } from 'lucide-react'

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

export default function InstructorsPage() {
  const supabase = createClient()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInstructors = async () => {
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
          .order('created_at', { ascending: false })

        if (error) throw error

        // Cast the data to ensure it matches our type
        setInstructors(data as unknown as Instructor[])
      } catch (err) {
        console.error('Error fetching instructors:', err)
        setError('Failed to load instructors. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInstructors()
  }, [supabase])

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Instructors</h1>
        <Link href="/admin/instructors/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Instructor
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
          <div className="h-20 w-full bg-gray-200 animate-pulse rounded"></div>
          <div className="h-20 w-full bg-gray-200 animate-pulse rounded"></div>
          <div className="h-20 w-full bg-gray-200 animate-pulse rounded"></div>
        </div>
      ) : instructors.length === 0 ? (
        <div className="text-center p-6 bg-gray-100 rounded-lg">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No instructors found</h3>
          <p className="mt-1 text-gray-500">Get started by adding a new instructor.</p>
          <div className="mt-6">
            <Link href="/admin/instructors/new">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Instructor
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialties</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {instructors.map((instructor) => (
                <tr key={instructor.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {instructor.users?.first_name} {instructor.users?.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{instructor.users?.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{instructor.specialties || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/admin/instructors/${instructor.id}/edit`}>
                      <Button variant="outline" size="sm" className="inline-flex items-center">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 