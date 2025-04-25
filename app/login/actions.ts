'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server' // Use server client

export async function login(formData: FormData) {
  const supabase = createClient() // Create server client

  // Type-casting here for convenience
  // In practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Login Error:', error.message)
    redirect('/error?message=Could+not+authenticate+user') // Redirect to error page
  }

  revalidatePath('/', 'layout') // Revalidate all layouts
  redirect('/') // Redirect to home/dashboard page on successful login
}

export async function signup(formData: FormData) {
  const supabase = createClient() // Create server client

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('Signup Error:', error.message)
    redirect('/error?message=Could+not+sign+up+user') // Redirect to error page
  }

  // Sign-up successful, user needs to confirm email.
  // Redirect to a page informing the user to check their email.
  redirect('/confirm-email') // TODO: Create a confirm-email page
} 