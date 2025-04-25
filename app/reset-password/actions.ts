'use server'

import { createClient } from '@/app/lib/supabase/server' // Use server client

export async function updatePassword(formData: FormData) {
  const supabase = createClient()
  const password = formData.get('password') as string

  if (!password) {
    return { error: 'Password is required.' }
  }

  // Password validation (e.g., length) should ideally be done client-side
  // before calling the action, but can be double-checked here.
  if (password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    console.error('Password Update Error:', error.message)
    return { error: 'Could not update password. Please try again.' }
  }

  return { error: null } // Indicate success
} 