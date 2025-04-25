import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { manuallyRetryPayment } from '@/app/lib/payment-failure-service'
import { checkUserRole } from '@/app/lib/auth-utils'

/**
 * Type definition for the result of manuallyRetryPayment
 */
interface RetryResult {
  success: boolean;
  message: string;
  paymentId?: string;
}

/**
 * API endpoint to manually retry a failed payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract the payment ID from params
    const paymentId = params.id
    if (!paymentId) {
      return NextResponse.json(
        { success: false, message: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // Get the current user and validate authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check user role - must be admin or owner
    const { isAdmin } = await checkUserRole(['admin', 'owner'])
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      )
    }

    // Attempt to retry the payment
    const result: RetryResult = await manuallyRetryPayment(paymentId)
    
    if (result.success) {
      return NextResponse.json(
        { success: true, message: result.message, paymentId: result.paymentId },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in payment retry API:', error)
    return NextResponse.json(
      { success: false, message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 