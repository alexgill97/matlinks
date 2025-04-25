'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClassType(id: string) {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to view class types' }
  }
  
  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    return { error: 'Unable to verify user role' }
  }
  
  if (profile.role !== 'admin') {
    return { error: 'You do not have permission to view class types' }
  }
  
  // Get the class type
  const { data, error } = await supabase
    .from('class_types')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching class type:', error)
    return { error: 'Failed to fetch class type' }
  }
  
  return { data }
}

// --- Update Class Type Action ---
export async function updateClassType(formData: FormData) {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to update class types' }
  }
  
  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    return { error: 'Unable to verify user role' }
  }
  
  if (profile.role !== 'admin') {
    return { error: 'You do not have permission to update class types' }
  }
  
  // Get form data
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const difficultyLevel = formData.get('difficulty_level') as string
  const durationMinutesStr = formData.get('duration_minutes') as string
  const defaultCapacityStr = formData.get('default_capacity') as string
  const color = formData.get('color') as string
  const isActiveStr = formData.get('is_active') as string
  
  // Validation
  if (!name) {
    return { error: 'Name is required' }
  }
  
  // Parse numeric values
  let durationMinutes: number | null = null
  if (durationMinutesStr && durationMinutesStr.trim() !== '') {
    durationMinutes = parseInt(durationMinutesStr, 10)
    if (isNaN(durationMinutes)) {
      return { error: 'Duration must be a valid number' }
    }
  }
  
  let defaultCapacity: number | null = null
  if (defaultCapacityStr && defaultCapacityStr.trim() !== '') {
    defaultCapacity = parseInt(defaultCapacityStr, 10)
    if (isNaN(defaultCapacity)) {
      return { error: 'Default capacity must be a valid number' }
    }
  }
  
  const isActive = isActiveStr === 'true'
  
  // Prepare data for update
  const updateData = {
    name,
    description: description || null,
    difficulty_level: difficultyLevel || null,
    duration_minutes: durationMinutes,
    default_capacity: defaultCapacity,
    color: color || null,
    is_active: isActive,
    updated_at: new Date().toISOString()
  }
  
  // Update the class type
  const { error } = await supabase
    .from('class_types')
    .update(updateData)
    .eq('id', id)
  
  if (error) {
    console.error('Error updating class type:', error)
    return { error: 'Failed to update class type' }
  }
  
  // Revalidate paths
  revalidatePath('/admin/class-types')
  revalidatePath(`/admin/class-types/${id}/edit`)
  
  return { success: true }
}

// --- Delete Class Type Action --- 
export async function deleteClassType(id: string) {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to delete class types' }
  }
  
  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profileError || !profile) {
    return { error: 'Unable to verify user role' }
  }
  
  if (profile.role !== 'admin') {
    return { error: 'You do not have permission to delete class types' }
  }
  
  // Check if class type is used in schedules
  const { data: schedules, error: schedulesError } = await supabase
    .from('schedules')
    .select('id')
    .eq('class_type_id', id)
    .limit(1)
  
  if (schedulesError) {
    console.error('Error checking schedules:', schedulesError)
    return { error: 'Failed to check if class type is in use' }
  }
  
  if (schedules && schedules.length > 0) {
    return { error: 'This class type cannot be deleted because it is being used in schedules' }
  }
  
  // Delete the class type
  const { error } = await supabase
    .from('class_types')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting class type:', error)
    return { error: 'Failed to delete class type' }
  }
  
  // Revalidate paths
  revalidatePath('/admin/class-types')
  
  return { success: true }
} 