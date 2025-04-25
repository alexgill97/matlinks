'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Types
type BookableClass = {
  scheduleId: string
  className: string
  classTypeName: string
  locationName: string
  startTime: string
  endTime: string
  instructorName: string | null
  instructorImage: string | null
  maxCapacity: number | null
  spotsRemaining: number
  userBookingStatus: 'NONE' | 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED'
  waitlistPosition: number | null
  bookingId?: string
}

// Fetch classes that can be booked
export async function getBookableClasses(): Promise<{ data?: BookableClass[], error?: string }> {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to view bookable classes' }
  }
  
  // Get user's member profile to confirm they're a student
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, status')
    .eq('userId', user.id)
    .single()
  
  if (memberError || !member) {
    console.error('Error fetching member profile:', memberError)
    return { error: 'Unable to verify your membership. Please contact support.' }
  }
  
  if (member.status !== 'ACTIVE') {
    return { error: 'Your membership is not active. Please update your membership to book classes.' }
  }
  
  // Get upcoming class schedules that have booking enabled
  const now = new Date()
  const twoWeeksFromNow = new Date(now)
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)
  
  const { data: schedules, error: schedulesError } = await supabase
    .from('class_schedules')
    .select(`
      id,
      class:classId(
        id,
        name,
        requiresBooking,
        maxCapacity,
        class_types:classType(name)
      ),
      instructor:instructorId(
        id,
        user:userId(firstName, lastName, profileImage)
      ),
      location:locationId(
        id, 
        name
      ),
      startTime,
      endTime
    `)
    .gte('startTime', now.toISOString())
    .lte('startTime', twoWeeksFromNow.toISOString())
    .eq('active', true)
    .order('startTime', { ascending: true })
  
  if (schedulesError) {
    console.error('Error fetching class schedules:', schedulesError)
    return { error: 'Failed to fetch class schedules' }
  }
  
  // Filter out classes that don't require booking
  const bookableSchedules = schedules.filter(
    schedule => schedule.class?.requiresBooking === true
  )
  
  if (bookableSchedules.length === 0) {
    return { data: [] }
  }
  
  // Get current bookings for these schedules to calculate remaining spots
  const scheduleIds = bookableSchedules.map(schedule => schedule.id)
  
  const { data: bookings, error: bookingsError } = await supabase
    .from('class_bookings')
    .select('classScheduleId, status')
    .in('classScheduleId', scheduleIds)
    .in('status', ['CONFIRMED', 'WAITLISTED'])
  
  if (bookingsError) {
    console.error('Error fetching class bookings:', bookingsError)
    return { error: 'Failed to fetch booking information' }
  }
  
  // Get user's own bookings
  const { data: userBookings, error: userBookingsError } = await supabase
    .from('class_bookings')
    .select('id, classScheduleId, status, waitlistPosition')
    .eq('memberId', member.id)
    .in('classScheduleId', scheduleIds)
  
  if (userBookingsError) {
    console.error('Error fetching user bookings:', userBookingsError)
  }
  
  // Create a map of schedule IDs to user booking status
  const userBookingMap = new Map()
  userBookings?.forEach(booking => {
    userBookingMap.set(booking.classScheduleId, {
      status: booking.status,
      waitlistPosition: booking.waitlistPosition,
      bookingId: booking.id
    })
  })
  
  // Count bookings per schedule
  const bookingCounts = new Map()
  bookings.forEach(booking => {
    if (booking.status === 'CONFIRMED') {
      const current = bookingCounts.get(booking.classScheduleId) || 0
      bookingCounts.set(booking.classScheduleId, current + 1)
    }
  })
  
  // Transform data for the frontend
  const result = bookableSchedules.map(schedule => {
    const userBooking = userBookingMap.get(schedule.id)
    const confirmedBookings = bookingCounts.get(schedule.id) || 0
    const maxCapacity = schedule.class?.maxCapacity || null
    const spotsRemaining = maxCapacity ? maxCapacity - confirmedBookings : 999
    
    const instructorName = schedule.instructor ? 
      `${schedule.instructor.user?.firstName} ${schedule.instructor.user?.lastName}` : 
      null
    
    return {
      scheduleId: schedule.id,
      className: schedule.class?.name || 'Unknown Class',
      classTypeName: schedule.class?.class_types?.name || 'General',
      locationName: schedule.location?.name || 'Unknown Location',
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      instructorName,
      instructorImage: schedule.instructor?.user?.profileImage || null,
      maxCapacity,
      spotsRemaining,
      userBookingStatus: userBooking?.status || 'NONE',
      waitlistPosition: userBooking?.waitlistPosition || null,
      bookingId: userBooking?.bookingId || undefined
    }
  })
  
  return { data: result }
}

// Book a class
export async function bookClass(scheduleId: string) {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to book a class' }
  }
  
  // Get user's member profile
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, status, membershipPlanId')
    .eq('userId', user.id)
    .single()
  
  if (memberError || !member) {
    console.error('Error fetching member profile:', memberError)
    return { error: 'Unable to verify your membership. Please contact support.' }
  }
  
  if (member.status !== 'ACTIVE') {
    return { error: 'Your membership is not active. Please update your membership to book classes.' }
  }
  
  // Get the class schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from('class_schedules')
    .select(`
      id,
      class:classId(id, name, requiresBooking, maxCapacity)
    `)
    .eq('id', scheduleId)
    .single()
  
  if (scheduleError || !schedule) {
    console.error('Error fetching class schedule:', scheduleError)
    return { error: 'Class not found or unavailable' }
  }
  
  if (!schedule.class?.requiresBooking) {
    return { error: 'This class does not require booking' }
  }
  
  // Check if user already has a booking for this class
  const { data: existingBooking, error: bookingError } = await supabase
    .from('class_bookings')
    .select('id, status')
    .eq('memberId', member.id)
    .eq('classScheduleId', scheduleId)
    .maybeSingle()
  
  if (bookingError) {
    console.error('Error checking existing booking:', bookingError)
    return { error: 'Failed to check existing bookings' }
  }
  
  if (existingBooking && ['CONFIRMED', 'WAITLISTED'].includes(existingBooking.status)) {
    return { error: 'You have already booked this class' }
  }
  
  // Begin transaction to either book a spot or join waitlist
  // First, count confirmed bookings
  const { data: confirmedBookings, error: countError } = await supabase
    .from('class_bookings')
    .select('id', { count: 'exact' })
    .eq('classScheduleId', scheduleId)
    .eq('status', 'CONFIRMED')
  
  if (countError) {
    console.error('Error counting confirmed bookings:', countError)
    return { error: 'Failed to check class availability' }
  }
  
  const currentBookings = confirmedBookings.length
  const maxCapacity = schedule.class?.maxCapacity || null
  
  let bookingStatus = 'CONFIRMED'
  let waitlistPosition = null
  
  if (maxCapacity !== null && currentBookings >= maxCapacity) {
    // Class is full, add to waitlist
    bookingStatus = 'WAITLISTED'
    
    // Get the highest current waitlist position
    const { data: waitlist, error: waitlistError } = await supabase
      .from('class_bookings')
      .select('waitlistPosition')
      .eq('classScheduleId', scheduleId)
      .eq('status', 'WAITLISTED')
      .order('waitlistPosition', { ascending: false })
      .limit(1)
    
    if (waitlistError) {
      console.error('Error checking waitlist:', waitlistError)
      return { error: 'Failed to check waitlist status' }
    }
    
    // Set waitlist position (either highest + 1, or 1 if this is the first)
    waitlistPosition = waitlist && waitlist.length > 0 && waitlist[0].waitlistPosition 
      ? waitlist[0].waitlistPosition + 1 
      : 1
  }
  
  // Create the booking
  const { data: booking, error: insertError } = await supabase
    .from('class_bookings')
    .insert({
      memberId: member.id,
      classScheduleId: scheduleId,
      status: bookingStatus,
      waitlistPosition,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (insertError) {
    console.error('Error creating booking:', insertError)
    return { error: 'Failed to book class' }
  }
  
  // Revalidate the page to show updated booking status
  revalidatePath('/student/classes')
  
  return { 
    success: true, 
    data: booking,
    isWaitlisted: bookingStatus === 'WAITLISTED'
  }
}

// Cancel a class booking
export async function cancelBooking(bookingId: string) {
  const supabase = createClient()
  
  // Check authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to cancel a booking' }
  }
  
  // Get user's member profile
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('userId', user.id)
    .single()
  
  if (memberError || !member) {
    console.error('Error fetching member profile:', memberError)
    return { error: 'Unable to verify your membership' }
  }
  
  // Verify the booking belongs to this user
  const { data: booking, error: bookingError } = await supabase
    .from('class_bookings')
    .select('id, memberId, classScheduleId, status, waitlistPosition')
    .eq('id', bookingId)
    .single()
  
  if (bookingError || !booking) {
    console.error('Error fetching booking:', bookingError)
    return { error: 'Booking not found' }
  }
  
  if (booking.memberId !== member.id) {
    return { error: 'You do not have permission to cancel this booking' }
  }
  
  // If this was a waitlisted booking, update positions for others
  if (booking.status === 'WAITLISTED' && booking.waitlistPosition) {
    // Update waitlist positions for people behind this booking
    const { error: updateError } = await supabase.rpc('decrease_waitlist_positions', {
      schedule_id: booking.classScheduleId,
      current_position: booking.waitlistPosition
    })
    
    if (updateError) {
      console.error('Error updating waitlist positions:', updateError)
      // Continue with cancellation even if this fails
    }
  }
  
  // Cancel the booking
  const { error: cancelError } = await supabase
    .from('class_bookings')
    .update({
      status: 'CANCELLED',
      waitlistPosition: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
  
  if (cancelError) {
    console.error('Error cancelling booking:', cancelError)
    return { error: 'Failed to cancel booking' }
  }
  
  // Revalidate the page to show updated booking status
  revalidatePath('/student/classes')
  
  return { success: true }
} 