'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

// --- Update Rank Action ---
export async function updateRank(formData: FormData) {
  try {
    // Check admin role
    await checkAdminRole();
    
    // Get form data
    const idStr = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const orderStr = formData.get('order') as string | null;
    
    // Validate inputs
    if (!idStr || isNaN(parseInt(idStr, 10))) {
      return { error: "Invalid rank ID" };
    }
    
    const id = parseInt(idStr, 10);
    
    if (!name || name.trim() === "") {
      return { error: "Rank name is required" };
    }
    
    // Parse order value to number (if provided)
    let order: number | null = null;
    if (orderStr && orderStr.trim() !== "") {
      order = parseInt(orderStr, 10);
      if (isNaN(order)) {
        return { error: "Order must be a valid number" };
      }
    }
    
    // Initialize Supabase client
    const supabase = createClient();
    
    // Update rank
    const { error } = await supabase
      .from("ranks")
      .update({
        name,
        description: description || null,
        order: order,
      })
      .eq('id', id);
      
    if (error) {
      console.error("Error updating rank:", error);
      return { error: "Failed to update rank: " + error.message };
    }
    
    // Revalidate ranks page
    revalidatePath("/admin/ranks");
    
    return { success: true };
  } catch (error) {
    console.error("Error in updateRank:", error);
    return { 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
}

// --- Delete Rank Action --- 
export async function deleteRank(id: number) {
  try {
    // Check admin role
    await checkAdminRole();
    
    if (!id || isNaN(id)) {
      return { error: "Invalid rank ID" };
    }
    
    // Initialize Supabase client
    const supabase = createClient();
    
    // Check if rank is assigned to any members
    const { data: members, error: membersError } = await supabase
      .from("profiles")
      .select("id")
      .eq("current_rank_id", id)
      .limit(1);
      
    if (membersError) {
      console.error("Error checking rank usage:", membersError);
      return { error: "Failed to check if rank is in use" };
    }
    
    if (members && members.length > 0) {
      return { error: "Cannot delete rank as it is assigned to members. Reassign members first." };
    }
    
    // Delete rank
    const { error } = await supabase
      .from("ranks")
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error("Error deleting rank:", error);
      return { error: "Failed to delete rank: " + error.message };
    }
    
    // Revalidate ranks page
    revalidatePath("/admin/ranks");
    
    return { success: true };
  } catch (error) {
    console.error("Error in deleteRank:", error);
    return { 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
} 