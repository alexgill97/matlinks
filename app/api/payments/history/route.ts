import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '10');
  
  try {
    // Check authentication
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Fetch payment history for the user
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching payment history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      payments: data || [],
    });
  } catch (err) {
    console.error('Error in payment history route:', err);
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
} 