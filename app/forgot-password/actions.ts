'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server' // Use server client

export async function requestPasswordReset(formData: FormData) {
  const supabase = createClient()
  const email = formData.get('email') as string

  if (!email) {
    return redirect('/forgot-password?message=Email+is+required')
  }

  // Get the current site URL dynamically
  const { data: { session } } = await supabase.auth.getSession(); // Using getSession to infer URL origin if possible, though may not be reliable on server
  // TODO: A more reliable way to get the base URL might be needed, e.g., from env vars
  const siteUrl = session?.user?.aud ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`, // The page where users can set a new password
  })

  if (error) {
    console.error('Password Reset Request Error:', error.message)
    // Even if there's an error (e.g., email not found), redirect to a generic success page
    // to avoid user enumeration attacks.
  }

  // Redirect to a confirmation page informing the user to check their email
  redirect('/reset-password-sent')
} 