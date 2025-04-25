'use server';

import { createClient } from '@/app/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper function to check if user has admin role
async function checkAdminRole() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("You must be logged in to perform this action");
  }
  
  // Check if user has admin role
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
    
  if (error || !profile || profile.role !== "admin") {
    throw new Error("You must be an admin to manage ranks");
  }
  
  return user;
}

/**
 * Record a rank progression for a member
 * 
 * @param memberId - The ID of the member receiving the rank
 * @param rankId - The ID of the new rank
 * @param previousRankId - The ID of the member's previous rank (if any)
 * @param notes - Optional notes about the promotion
 * @param awardedBy - Optional name of the person who awarded the rank
 * @returns 
 */
export async function recordRankProgression(
  memberId: string,
  rankId: number,
  previousRankId: number | null,
  notes: string | null = null,
  awardedBy: string | null = null
) {
  try {
    // Check admin role
    const user = await checkAdminRole();
    
    if (!memberId) {
      return { error: "Member ID is required" };
    }
    
    if (!rankId || isNaN(rankId)) {
      return { error: "Valid rank ID is required" };
    }
    
    // Initialize Supabase client
    const supabase = createClient();
    
    // Add the rank progression record
    const { error } = await supabase
      .from("rank_progressions")
      .insert({
        member_id: memberId,
        rank_id: rankId,
        previous_rank_id: previousRankId,
        awarded_at: new Date().toISOString(),
        awarded_by: awardedBy || user.email,
        notes: notes
      });
      
    if (error) {
      console.error("Error recording rank progression:", error);
      return { error: "Failed to record rank progression: " + error.message };
    }
    
    // Revalidate rank history page and member profile
    revalidatePath("/admin/ranks/history");
    revalidatePath(`/admin/members/${memberId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Error in recordRankProgression:", error);
    return { 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
} 