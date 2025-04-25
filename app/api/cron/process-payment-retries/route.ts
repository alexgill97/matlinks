import { NextRequest, NextResponse } from 'next/server';
import { processScheduledRetries } from '@/app/lib/payment-failure-service';

// Define acceptable environment secrets
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * API endpoint to process scheduled payment retries
 * Can be triggered by a cron job scheduler (e.g., Vercel Cron Jobs)
 * 
 * Example cron schedule: 0 /6 * * * (every 6 hours)
 */
export async function GET(req: NextRequest) {
  // Validate that the request includes the correct secret
  const authHeader = req.headers.get('authorization');
  
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const startTime = Date.now();
    console.log('Starting scheduled payment retry processing');
    
    // Process scheduled payment retries
    const result = await processScheduledRetries();
    
    const elapsedMs = Date.now() - startTime;
    console.log(`Payment retry processing completed in ${elapsedMs}ms`);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        processed: result.processed,
        message: `Successfully processed ${result.processed} payment retries`,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Error processing payment retries:', result.error);
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error processing payment retries:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * This allows the endpoint to be accessed via POST as well
 * Some cron job schedulers prefer or require POST requests
 */
export async function POST(req: NextRequest) {
  return GET(req);
} 