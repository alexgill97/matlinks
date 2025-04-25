import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // Get the current user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the promotion code and order ID from the request body
    const { code, orderId } = await req.json();

    if (!code || !orderId) {
      return NextResponse.json(
        { error: 'Promotion code and order ID are required' },
        { status: 400 }
      );
    }

    // First, validate the promotion code
    const { data: validationData, error: validationError } = await supabase.rpc('validate_promotion', {
      p_code: code,
      p_user_id: user.id
    });

    if (validationError || !validationData || validationData.length === 0) {
      console.error('Error validating promotion:', validationError);
      return NextResponse.json(
        { error: 'Failed to validate promotion code' },
        { status: 500 }
      );
    }

    const validationResult = validationData[0];
    
    if (!validationResult.is_valid) {
      return NextResponse.json(
        { 
          success: false, 
          message: validationResult.message 
        },
        { status: 200 }
      );
    }

    // Get member profile ID for the user
    const { data: memberProfile, error: profileError } = await supabase
      .from('member_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !memberProfile) {
      console.error('Error fetching member profile:', profileError);
      return NextResponse.json(
        { error: 'Member profile not found' },
        { status: 404 }
      );
    }

    // Record the promotion redemption
    const { error: redemptionError } = await supabase
      .from('promotion_redemptions')
      .insert({
        promotion_id: validationResult.promotion_id,
        member_id: memberProfile.id,
        order_id: orderId,
        redeemed_at: new Date().toISOString()
      });

    if (redemptionError) {
      console.error('Error recording promotion redemption:', redemptionError);
      return NextResponse.json(
        { error: 'Failed to apply promotion' },
        { status: 500 }
      );
    }

    // Increment the promotion usage count
    const { error: incrementError } = await supabase.rpc('increment_promotion_uses', { 
      promotion_id: validationResult.promotion_id 
    });

    if (incrementError) {
      console.error('Error incrementing promotion uses:', incrementError);
      // We'll continue anyway as the redemption was recorded
    }

    // Apply the discount to the order
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        promotion_id: validationResult.promotion_id,
        discount_type: validationResult.discount_type,
        discount_value: validationResult.discount_value,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('member_id', memberProfile.id);

    if (orderUpdateError) {
      console.error('Error updating order with promotion:', orderUpdateError);
      return NextResponse.json(
        { error: 'Failed to apply promotion to order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Promotion applied successfully',
      discount: {
        type: validationResult.discount_type,
        value: validationResult.discount_value
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Unexpected error applying promotion:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 