'use server'

import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Types for the data we'll be displaying
type ClassType = {
  id: number
  name: string
  description: string | null
  difficulty_level: string | null
  default_capacity: number | null
  duration_minutes: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

async function getClassTypes() {
  const supabase = createClient()
  
  // Get the current user to check for admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  
  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }
  
  // Fetch all class types
  const { data, error } = await supabase
    .from('class_types')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error fetching class types:', error)
    return []
  }
  
  return data as ClassType[]
}

export default async function ClassTypesPage() {
  const classTypes = await getClassTypes()
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Class Types</h1>
          <p className="text-gray-500 mt-1">Manage BJJ class types and definitions</p>
        </div>
        <Link
          href="/admin/class-types/new"
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Add New Class Type
        </Link>
      </div>
      
      {/* Class Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {classTypes.length > 0 ? (
          classTypes.map((classType) => (
            <div key={classType.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{classType.name}</h2>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    classType.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {classType.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {classType.description && (
                  <p className="text-gray-600 mb-4">{classType.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="block text-xs text-gray-500">Difficulty</span>
                    <span className="font-medium">{classType.difficulty_level || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Duration</span>
                    <span className="font-medium">{classType.duration_minutes || 'N/A'} minutes</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Capacity</span>
                    <span className="font-medium">{classType.default_capacity || 'Unlimited'}</span>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Link
                    href={`/admin/class-types/${classType.id}/edit`}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/admin/class-types/${classType.id}`}
                    className="px-3 py-1 text-sm bg-primary-100 text-primary-800 rounded hover:bg-primary-200"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No class types found. Start by adding a new class type.</p>
            <Link
              href="/admin/class-types/new"
              className="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Add New Class Type
            </Link>
          </div>
        )}
      </div>
      
      {/* Explanatory Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">About Class Types</h2>
          <p className="text-gray-600 mb-4">
            Class types define the different categories of training sessions offered at your BJJ academy.
            Common class types include:
          </p>
          
          <ul className="list-disc list-inside text-gray-600 mb-4 ml-4 space-y-2">
            <li><strong>Fundamentals:</strong> Basic techniques for beginners focusing on core movements and principles</li>
            <li><strong>All Levels:</strong> Classes suitable for all experience levels with options for all students</li>
            <li><strong>Advanced:</strong> More complex techniques and training methods for experienced practitioners</li>
            <li><strong>Competition Prep:</strong> Focused training for competitive athletes</li>
            <li><strong>Open Mat:</strong> Unstructured training time for free rolling and self-directed practice</li>
            <li><strong>Specific Training:</strong> Sessions focused on specific positions or techniques (guard, passing, etc.)</li>
          </ul>
          
          <p className="text-gray-600">
            Each class type can have different duration, capacity limits, and prerequisites. 
            Use this section to define class types that will be used when creating the gym schedule.
          </p>
        </div>
      </div>
    </div>
  )
} 