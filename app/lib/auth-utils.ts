import { createClient } from './supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Define role types
type UserRole = 'admin' | 'owner' | 'instructor' | 'student';

/**
 * Check if the current user has one of the specified roles
 * @param allowedRoles - Array of roles that are allowed to access the resource
 * @returns Object with user information and role status
 */
export async function checkUserRole(allowedRoles: UserRole[] = []) {
  const supabase = createClient();

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    redirect('/auth/login?error=not_authenticated');
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching user profile:', profileError);
    redirect('/auth/login?error=profile_not_found');
  }

  const isAdmin = allowedRoles.length === 0 || allowedRoles.includes(profile.role as UserRole);

  return {
    user: {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.role,
    },
    isAdmin,
  };
}

/**
 * Get the current user data
 * @returns User data or null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
  };
}

/**
 * Check if the current user is an admin or owner
 * Redirects to login page if not authenticated or not an admin/owner
 */
export async function checkAdminRole() {
  return checkUserRole(['admin', 'owner']);
}

/**
 * Check if the current user is an instructor, admin, or owner
 * Redirects to login page if not authenticated or not an instructor/admin/owner
 */
export async function checkInstructorRole() {
  return checkUserRole(['instructor', 'admin', 'owner']);
}

/**
 * Check if the current user is authenticated
 * Redirects to login page if not authenticated
 */
export async function checkAuthenticated() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login?error=not_authenticated');
  }

  return {
    user: session.user,
  };
} 