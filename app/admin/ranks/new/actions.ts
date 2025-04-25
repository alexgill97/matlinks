"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/app/lib/supabase/server"

// Helper function to check if user has admin role
async function checkAdminRole() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error("You must be logged in to perform this action")
  }
  
  // Check if user has admin role
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
    
  if (error || !profile || profile.role !== "admin") {
    throw new Error("You must be an admin to manage ranks")
  }
  
  return user
}

export async function addRank(formData: FormData) {
  try {
    // Check admin role
    await checkAdminRole()
    
    // Get form data
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const orderValue = formData.get("order") as string
    
    // Validate inputs
    if (!name || name.trim() === "") {
      return { error: "Rank name is required" }
    }
    
    // Parse order value to number (if provided)
    let order: number | null = null
    if (orderValue && orderValue.trim() !== "") {
      order = parseInt(orderValue, 10)
      if (isNaN(order)) {
        return { error: "Order must be a valid number" }
      }
    }
    
    // Initialize Supabase client
    const supabase = createClient()
    
    // Insert new rank
    const { error } = await supabase
      .from("ranks")
      .insert({
        name,
        description: description || null,
        order: order || null,
      })
    
    if (error) {
      console.error("Error adding rank:", error)
      return { error: "Failed to add rank: " + error.message }
    }
    
    // Revalidate ranks page to show the new rank
    revalidatePath("/admin/ranks")
    
    // Redirect to ranks list
    redirect("/admin/ranks")
  } catch (error) {
    console.error("Error in addRank:", error)
    return { 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    }
  }
} 