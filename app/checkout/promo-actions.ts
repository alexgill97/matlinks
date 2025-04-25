'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'

export type PromotionType = {
  id: number
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  start_date: string
  end_date: string | null
  max_uses: number | null
  current_uses: number
  created_at: string
  created_by: string
  is_active: boolean
}

export async function validatePromoCode(code: string) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return { error: 'You must be logged in to apply a promo code.' }
  }

  // Get user profile to check membership status
  const { data: profile } = await supabase
    .from('member_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!profile) {
    return { error: 'Member profile not found.' }
  }
  
  // Check if promo code exists and is valid
  const now = new Date().toISOString()
  
  const { data: promotion, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date', now, { allowNull: true })
    .single()
  
  if (error || !promotion) {
    return { error: 'Invalid promo code or promotion has expired.' }
  }
  
  // Check if max uses has been reached
  if (promotion.max_uses !== null && promotion.current_uses >= promotion.max_uses) {
    return { error: 'This promotion has reached its maximum number of uses.' }
  }
  
  // Check if user has already used this promo code
  const { data: existingRedemption } = await supabase
    .from('promotion_redemptions')
    .select('id')
    .eq('promotion_id', promotion.id)
    .eq('member_id', profile.id)
    .single()
  
  if (existingRedemption) {
    return { error: 'You have already used this promotion code.' }
  }
  
  return { promotion }
}

export async function recordPromoRedemption(promoId: number, orderId: number) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error('You must be logged in to apply a promo code.')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('member_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!profile) {
    throw new Error('Member profile not found.')
  }
  
  // Record the redemption
  const { error: redemptionError } = await supabase
    .from('promotion_redemptions')
    .insert({
      promotion_id: promoId,
      member_id: profile.id,
      order_id: orderId,
      redeemed_at: new Date().toISOString()
    })
  
  // Increment the usage count
  await supabase.rpc('increment_promotion_uses', { promotion_id: promoId })
  
  // Revalidate the checkout path
  revalidatePath('/checkout')
} 