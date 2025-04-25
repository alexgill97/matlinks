'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Get all classes with location and class type names
export async function getClasses() {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to view classes' }
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
  
  if (profile.role !== 'admin' && profile.role !== 'owner') {
    return { error: 'You do not have permission to view classes' }
  }
  
  // Get classes with joined location and class type names
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      locations:locationId(name),
      class_types:classType(name)
    `)
    .order('name')
  
  if (error) {
    console.error('Error fetching classes:', error)
    return { error: 'Failed to fetch classes' }
  }
  
  // Transform the data to include location and class type names directly
  const transformedData = data.map(classItem => ({
    id: classItem.id,
    name: classItem.name,
    description: classItem.description,
    maxCapacity: classItem.maxCapacity,
    requiresBooking: classItem.requiresBooking,
    locationName: classItem.locations?.name || 'Unknown Location',
    classTypeName: classItem.class_types?.name || 'Unknown Type'
  }))
  
  return { data: transformedData }
}

// Create a new class
export async function createClass(formData: FormData) {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to create a class' }
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
  
  if (profile.role !== 'admin' && profile.role !== 'owner') {
    return { error: 'You do not have permission to create classes' }
  }
  
  // Get form data
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const maxCapacityStr = formData.get('maxCapacity') as string
  const requiresBookingStr = formData.get('requiresBooking') as string
  const locationId = formData.get('locationId') as string
  const classType = formData.get('classType') as string
  
  // Validation
  if (!name) {
    return { error: 'Name is required' }
  }
  
  if (!locationId) {
    return { error: 'Location is required' }
  }
  
  if (!classType) {
    return { error: 'Class type is required' }
  }
  
  // Parse values
  const requiresBooking = requiresBookingStr === 'true'
  let maxCapacity: number | null = null
  
  if (requiresBooking && maxCapacityStr && maxCapacityStr.trim() !== '') {
    maxCapacity = parseInt(maxCapacityStr, 10)
    if (isNaN(maxCapacity) || maxCapacity < 1) {
      return { error: 'Maximum capacity must be a positive number' }
    }
  }
  
  // Prepare data for insertion
  const classData = {
    name,
    description: description || null,
    maxCapacity,
    requiresBooking,
    locationId,
    classType,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  // Insert the class
  const { data, error } = await supabase
    .from('classes')
    .insert(classData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating class:', error)
    return { error: 'Failed to create class' }
  }
  
  // Revalidate paths
  revalidatePath('/admin/classes')
  
  return { data }
}

// Delete a class
export async function deleteClass(id: string) {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to delete a class' }
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
  
  if (profile.role !== 'admin' && profile.role !== 'owner') {
    return { error: 'You do not have permission to delete classes' }
  }
  
  // Check if the class has any bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from('class_bookings')
    .select('id')
    .eq('classId', id)
    .limit(1)
  
  if (bookingsError) {
    console.error('Error checking bookings:', bookingsError)
    return { error: 'Failed to check if class has bookings' }
  }
  
  if (bookings && bookings.length > 0) {
    return { error: 'Cannot delete class with existing bookings' }
  }
  
  // Delete the class
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting class:', error)
    return { error: 'Failed to delete class' }
  }
  
  // Revalidate paths
  revalidatePath('/admin/classes')
  
  return { success: true }
} 