'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Fetch class data and related options
export async function getClass(id: string) {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to view class details' }
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
    return { error: 'You do not have permission to view class details' }
  }
  
  // Get the class data
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('*')
    .eq('id', id)
    .single()
  
  if (classError) {
    console.error('Error fetching class data:', classError)
    return { error: 'Failed to fetch class details' }
  }
  
  // Get location options
  const { data: locationOptions, error: locationError } = await supabase
    .from('locations')
    .select('id, name')
    .order('name')
  
  if (locationError) {
    console.error('Error fetching locations:', locationError)
    return { error: 'Failed to fetch location options' }
  }
  
  // Get class type options
  const { data: classTypeOptions, error: classTypeError } = await supabase
    .from('class_types')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  
  if (classTypeError) {
    console.error('Error fetching class types:', classTypeError)
    return { error: 'Failed to fetch class type options' }
  }
  
  return { 
    data: {
      classData,
      locationOptions,
      classTypeOptions
    }
  }
}

// Update class data
export async function updateClass(formData: FormData) {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to update class details' }
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
    return { error: 'You do not have permission to update class details' }
  }
  
  // Get form data
  const id = formData.get('id') as string
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
  
  // Prepare data for update
  const updateData = {
    name,
    description: description || null,
    maxCapacity,
    requiresBooking,
    locationId,
    classType,
    updated_at: new Date().toISOString()
  }
  
  // Update the class
  const { error } = await supabase
    .from('classes')
    .update(updateData)
    .eq('id', id)
  
  if (error) {
    console.error('Error updating class:', error)
    return { error: 'Failed to update class details' }
  }
  
  // Revalidate paths
  revalidatePath('/admin/classes')
  revalidatePath(`/admin/classes/${id}/edit`)
  
  return { success: true }
} 