import { createBrowserClient } from '@supabase/ssr'

// Define a function to create a Supabase client for client components
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// You can add functions for server components or route handlers here later
// using createServerClient or createRouteHandlerClient from '@supabase/ssr' 