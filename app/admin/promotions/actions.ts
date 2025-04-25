'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/app/lib/supabase/server'
import { checkUserRole } from '@/app/lib/auth-utils'
import { z } from 'zod'

// Define promotion schema for validation
const promotionSchema = z.object({
  code: z.string().min(3, { message: 'Code must be at least 3 characters long' }).max(20),
  description: z.string().nullable().optional(),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.number().positive({ message: 'Discount value must be positive' }),
  valid_from: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  usage_limit: z.number().int().nullable().optional(),
  is_active: z.boolean().default(true),
})

// Type for redemption count result
interface RedemptionCount {
  promotion_id: number;
  count: string;
}

// Fetch all promotions
export async function fetchPromotions() {
  try {
    // Check user role
    const { isAdmin } = await checkUserRole(['admin', 'owner']);
    if (!isAdmin) {
      throw new Error('Unauthorized');
    }

    const supabase = createClient();
    
    // Get promotion redemption counts using raw SQL query
    const { data: redemptionCounts, error: redemptionError } = await supabase
      .rpc('get_promotion_redemption_counts');
    
    if (redemptionError) {
      console.error('Error fetching redemption counts:', redemptionError);
      return [];
    }

    // Create a map of promotion IDs to redemption counts
    const countMap = new Map();
    (redemptionCounts as RedemptionCount[]).forEach(item => {
      countMap.set(item.promotion_id, parseInt(item.count));
    });

    // Get all promotions
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching promotions:', error);
      return [];
    }

    // Add redemption count to each promotion
    return data.map(promo => ({
      ...promo,
      redemption_count: countMap.get(promo.id) || 0
    }));
  } catch (error) {
    console.error('Error in fetchPromotions:', error);
    return [];
  }
}

// Fetch a single promotion by ID
export async function fetchPromotion(id: string) {
  try {
    // Check user role
    const { isAdmin } = await checkUserRole(['admin', 'owner']);
    if (!isAdmin) {
      throw new Error('Unauthorized');
    }

    const supabase = createClient();
    
    // Get the promotion
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching promotion:', error);
      return null;
    }

    // Get redemption count
    const { count, error: countError } = await supabase
      .from('promotion_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('promotion_id', id);
    
    if (countError) {
      console.error('Error fetching redemption count:', countError);
      return { ...data, redemption_count: 0 };
    }

    return { ...data, redemption_count: count || 0 };
  } catch (error) {
    console.error('Error in fetchPromotion:', error);
    return null;
  }
}

// Create a new promotion
export async function createPromotion(formData: FormData) {
  try {
    // Check user role
    const { isAdmin } = await checkUserRole(['admin', 'owner']);
    if (!isAdmin) {
      throw new Error('Unauthorized');
    }

    const supabase = createClient();
    
    // Parse form data
    const code = formData.get('code') as string;
    const description = formData.get('description') as string;
    const discountType = formData.get('discount_type') as 'percentage' | 'fixed_amount';
    const discountValueStr = formData.get('discount_value') as string;
    const validFrom = formData.get('valid_from') as string;
    const validUntil = formData.get('valid_until') as string;
    const usageLimitStr = formData.get('usage_limit') as string;
    const isActive = formData.get('is_active') === 'true';

    // Convert string values to appropriate types
    const discountValue = parseFloat(discountValueStr);
    const usageLimit = usageLimitStr ? parseInt(usageLimitStr) : null;

    // Validate input data
    const validated = promotionSchema.parse({
      code,
      description: description || null,
      discount_type: discountType,
      discount_value: discountValue,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      usage_limit: usageLimit,
      is_active: isActive,
    });

    // Insert promotion
    const { data, error } = await supabase
      .from('promotions')
      .insert([validated])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating promotion:', error);
      return { error: error.message };
    }

    // Revalidate cache
    revalidatePath('/admin/promotions');
    
    return { success: true, promotion: data };
  } catch (error) {
    console.error('Error in createPromotion:', error);
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message || 'Validation error' };
    }
    return { error: 'Failed to create promotion' };
  }
}

// Update an existing promotion
export async function updatePromotion(id: string, formData: FormData) {
  try {
    // Check user role
    const { isAdmin } = await checkUserRole(['admin', 'owner']);
    if (!isAdmin) {
      throw new Error('Unauthorized');
    }

    const supabase = createClient();
    
    // Parse form data
    const code = formData.get('code') as string;
    const description = formData.get('description') as string;
    const discountType = formData.get('discount_type') as 'percentage' | 'fixed_amount';
    const discountValueStr = formData.get('discount_value') as string;
    const validFrom = formData.get('valid_from') as string;
    const validUntil = formData.get('valid_until') as string;
    const usageLimitStr = formData.get('usage_limit') as string;
    const isActive = formData.get('is_active') === 'true';

    // Convert string values to appropriate types
    const discountValue = parseFloat(discountValueStr);
    const usageLimit = usageLimitStr ? parseInt(usageLimitStr) : null;

    // Validate input data
    const validated = promotionSchema.parse({
      code,
      description: description || null,
      discount_type: discountType,
      discount_value: discountValue,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      usage_limit: usageLimit,
      is_active: isActive,
    });

    // Update promotion
    const { data, error } = await supabase
      .from('promotions')
      .update(validated)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating promotion:', error);
      return { error: error.message };
    }

    // Revalidate cache
    revalidatePath('/admin/promotions');
    revalidatePath(`/admin/promotions/${id}`);
    revalidatePath(`/admin/promotions/${id}/edit`);
    
    return { success: true, promotion: data };
  } catch (error) {
    console.error('Error in updatePromotion:', error);
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message || 'Validation error' };
    }
    return { error: 'Failed to update promotion' };
  }
}

// Delete a promotion
export async function deletePromotion(id: string) {
  try {
    // Check user role
    const { isAdmin } = await checkUserRole(['admin', 'owner']);
    if (!isAdmin) {
      throw new Error('Unauthorized');
    }

    const supabase = createClient();
    
    // Delete promotion
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting promotion:', error);
      return { error: error.message };
    }

    // Revalidate cache
    revalidatePath('/admin/promotions');
    
    return { success: true };
  } catch (error) {
    console.error('Error in deletePromotion:', error);
    return { error: 'Failed to delete promotion' };
  }
} 