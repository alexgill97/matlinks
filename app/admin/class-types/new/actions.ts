'use server'

import { createClient } from '@/app/lib/supabase/server'

// Type definition for the request and response
export async function addClassType(formData: FormData) {
  // Get the current user to check for admin role
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'You must be logged in to perform this action' }
  }
  
  // Check if user has admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile || profile.role !== 'admin') {
    return { error: 'You do not have permission to add class types' }
  }
  
  // Extract form data
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const difficultyLevel = formData.get('difficulty_level') as string
  const durationMinutesStr = formData.get('duration_minutes') as string
  const defaultCapacityStr = formData.get('default_capacity') as string
  const color = formData.get('color') as string
  const isActiveStr = formData.get('is_active') as string
  
  // Validate required fields
  if (!name || name.trim() === '') {
    return { error: 'Class type name is required' }
  }
  
  // Parse numeric values
  const durationMinutes = durationMinutesStr ? parseInt(durationMinutesStr, 10) : null
  const defaultCapacity = defaultCapacityStr ? parseInt(defaultCapacityStr, 10) : null
  const isActive = isActiveStr === 'true'
  
  // Prepare data for database insertion
  const classTypeData = {
    name,
    description: description || null,
    difficulty_level: difficultyLevel || null,
    duration_minutes: durationMinutes,
    default_capacity: defaultCapacity,
    color: color || null,
    is_active: isActive,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  // Insert data into the database
  const { data: insertedData, error: insertError } = await supabase
    .from('class_types')
    .insert(classTypeData)
    .select()
    .single()
  
  if (insertError) {
    console.error('Error adding class type:', insertError)
    return { error: 'Failed to add class type. Please try again.' }
  }
  
  return { data: insertedData }
} 