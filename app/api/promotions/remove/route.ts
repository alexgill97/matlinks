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

    // Get the order ID from the request body
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
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

    // Get the current order to verify it has a promotion
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, promotion_id')
      .eq('id', orderId)
      .eq('member_id', memberProfile.id)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json(
        { error: 'Order not found or you do not have permission to modify it' },
        { status: 404 }
      );
    }

    if (!order.promotion_id) {
      return NextResponse.json(
        { error: 'This order does not have a promotion applied' },
        { status: 400 }
      );
    }

    // Delete the promotion redemption
    const { error: deleteRedemptionError } = await supabase
      .from('promotion_redemptions')
      .delete()
      .eq('promotion_id', order.promotion_id)
      .eq('order_id', orderId)
      .eq('member_id', memberProfile.id);

    if (deleteRedemptionError) {
      console.error('Error deleting promotion redemption:', deleteRedemptionError);
      return NextResponse.json(
        { error: 'Failed to remove promotion' },
        { status: 500 }
      );
    }

    // Decrement the promotion usage count
    const { error: decrementError } = await supabase.rpc('decrement_promotion_uses', { 
      promotion_id: order.promotion_id 
    });

    if (decrementError) {
      console.error('Error decrementing promotion uses:', decrementError);
      // Continue anyway as we've already deleted the redemption
    }

    // Update the order to remove the promotion
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        promotion_id: null,
        discount_type: null,
        discount_value: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('member_id', memberProfile.id);

    if (orderUpdateError) {
      console.error('Error updating order to remove promotion:', orderUpdateError);
      return NextResponse.json(
        { error: 'Failed to remove promotion from order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Promotion removed successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Unexpected error removing promotion:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 