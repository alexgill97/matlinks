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

    // Get the promotion code from the request body
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Promotion code is required' },
        { status: 400 }
      );
    }

    // Validate the promotion code using the database function
    const { data, error } = await supabase.rpc('validate_promotion', {
      p_code: code,
      p_user_id: user.id
    });

    if (error) {
      console.error('Error validating promotion:', error);
      return NextResponse.json(
        { error: 'Failed to validate promotion code' },
        { status: 500 }
      );
    }

    // Return the validation result
    const validationResult = data && data.length > 0 ? data[0] : null;
    
    if (!validationResult) {
      return NextResponse.json(
        { error: 'Failed to validate promotion code' },
        { status: 500 }
      );
    }

    if (!validationResult.is_valid) {
      return NextResponse.json(
        { 
          valid: false, 
          message: validationResult.message 
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: validationResult.message,
      promotion: {
        id: validationResult.promotion_id,
        discountType: validationResult.discount_type,
        discountValue: validationResult.discount_value
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Unexpected error validating promotion:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 