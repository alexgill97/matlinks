import { NextRequest, NextResponse } from 'next/server'
import { processPendingNotifications, processPendingCancellations } from '@/app/lib/dunning-service'

// Define acceptable environment secrets
const CRON_SECRET = process.env.CRON_SECRET

/**
 * API endpoint to process pending dunning notifications and cancellations
 * Should be called regularly (e.g., hourly) by a cron job scheduler
 * 
 * Example cron schedule: 0 * * * * (hourly)
 */
export async function GET(req: NextRequest) {
  // Validate that the request includes the correct secret
  const authHeader = req.headers.get('authorization')
  
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  try {
    const startTime = Date.now()
    console.log('Starting dunning notification processing')
    
    // Process pending notifications
    const notificationResult = await processPendingNotifications()
    
    // Process pending cancellations
    const cancellationResult = await processPendingCancellations()
    
    const elapsedMs = Date.now() - startTime
    console.log(`Dunning processing completed in ${elapsedMs}ms`)
    
    return NextResponse.json({
      success: true,
      notifications: {
        processed: notificationResult.processed,
        failed: notificationResult.failed
      },
      cancellations: {
        processed: cancellationResult.processed
      },
      elapsedMs,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error processing dunning notifications:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * This allows the endpoint to be accessed via POST as well
 * Some cron job schedulers prefer or require POST requests
 */
export async function POST(req: NextRequest) {
  return GET(req)
} 