import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server' // Use the server client

// Route handler for GET requests to /auth/confirm
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/' // Default redirect to home

  // Create redirect link without the secret token
  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {
    const supabase = createClient() // Create server client

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // Remove 'next' param if verification is successful
      redirectTo.searchParams.delete('next')
      return NextResponse.redirect(redirectTo)
    }
  }

  // Redirect the user to an error page with instructions
  redirectTo.pathname = '/error' // TODO: Create an error page
  return NextResponse.redirect(redirectTo)
} 