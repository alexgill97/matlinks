import { addDays, parseISO, formatDistance } from 'date-fns';
import { formatDate } from './date-utils';

/**
 * Payment retry schedule configuration (in days)
 */
export const DEFAULT_RETRY_SCHEDULE = [1, 3, 7];

/**
 * Payment failure types and their descriptions
 */
export enum PaymentFailureType {
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  CARD_DECLINED = 'card_declined',
  EXPIRED_CARD = 'expired_card',
  INVALID_CVC = 'invalid_cvc',
  PROCESSING_ERROR = 'processing_error',
  UNKNOWN = 'unknown'
}

export const FAILURE_TYPE_MESSAGES = {
  [PaymentFailureType.INSUFFICIENT_FUNDS]: 'Insufficient funds in the account',
  [PaymentFailureType.CARD_DECLINED]: 'Card was declined by the issuer',
  [PaymentFailureType.EXPIRED_CARD]: 'Card has expired',
  [PaymentFailureType.INVALID_CVC]: 'Invalid CVC code provided',
  [PaymentFailureType.PROCESSING_ERROR]: 'Payment processor encountered an error',
  [PaymentFailureType.UNKNOWN]: 'Unknown payment failure'
};

/**
 * Payment retry status
 */
export enum RetryStatus {
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Interface for a payment retry attempt
 */
export interface RetryAttempt {
  id: string;
  paymentId: string;
  attemptNumber: number;
  scheduledDate: Date;
  executedDate?: Date;
  status: RetryStatus;
  result?: string;
}

/**
 * Interface for a failed payment record
 */
export interface FailedPayment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  failureDate: Date;
  failureType: PaymentFailureType;
  failureMessage: string;
  paymentMethod: string;
  retryAttempts: RetryAttempt[];
  subscriptionId?: string;
  invoiceId?: string;
  maxRetries: number;
}

/**
 * Generate scheduled retry dates based on the current date and retry schedule
 * @param baseDate Base date to calculate from (usually the failure date)
 * @param retrySchedule Array of days to wait for each retry attempt
 * @returns Array of dates for scheduled retries
 */
export function generateRetryDates(baseDate: Date, retrySchedule: number[] = DEFAULT_RETRY_SCHEDULE): Date[] {
  return retrySchedule.map(days => addDays(baseDate, days));
}

/**
 * Create a new failed payment record with initial retry attempts
 * @param paymentData Payment data from the payment processor
 * @param failureType Type of payment failure
 * @param failureMessage Error message from the payment processor
 * @param maxRetries Maximum number of retry attempts
 * @param retrySchedule Custom retry schedule (days)
 * @returns A new failed payment record with scheduled retry attempts
 */
export function createFailedPaymentRecord(
  paymentData: {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    subscriptionId?: string;
    invoiceId?: string;
  },
  failureType: PaymentFailureType,
  failureMessage: string,
  maxRetries: number = DEFAULT_RETRY_SCHEDULE.length,
  retrySchedule: number[] = DEFAULT_RETRY_SCHEDULE
): FailedPayment {
  // Use only the specified number of retries
  const actualRetrySchedule = retrySchedule.slice(0, maxRetries);
  
  // Current date as failure date
  const failureDate = new Date();
  
  // Generate retry dates
  const retryDates = generateRetryDates(failureDate, actualRetrySchedule);
  
  // Create retry attempts
  const retryAttempts: RetryAttempt[] = retryDates.map((date, index) => ({
    id: `${paymentData.id}_retry_${index + 1}`,
    paymentId: paymentData.id,
    attemptNumber: index + 1,
    scheduledDate: date,
    status: RetryStatus.SCHEDULED
  }));
  
  // Create the failed payment record
  return {
    id: paymentData.id,
    userId: paymentData.userId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    failureDate,
    failureType,
    failureMessage,
    paymentMethod: paymentData.paymentMethod,
    retryAttempts,
    subscriptionId: paymentData.subscriptionId,
    invoiceId: paymentData.invoiceId,
    maxRetries
  };
}

/**
 * Get the next scheduled retry attempt for a payment
 * @param failedPayment The failed payment record
 * @returns The next scheduled retry attempt or null if none found
 */
export function getNextRetryAttempt(failedPayment: FailedPayment): RetryAttempt | null {
  const pendingRetry = failedPayment.retryAttempts.find(
    attempt => attempt.status === RetryStatus.SCHEDULED
  );
  
  return pendingRetry || null;
}

/**
 * Check if a payment has exhausted all retry attempts
 * @param failedPayment The failed payment record
 * @returns True if all retries have been attempted or cancelled
 */
export function hasExhaustedRetries(failedPayment: FailedPayment): boolean {
  return !failedPayment.retryAttempts.some(
    attempt => attempt.status === RetryStatus.SCHEDULED || attempt.status === RetryStatus.PROCESSING
  );
}

/**
 * Format a payment retry attempt for display
 * @param attempt The retry attempt to format
 * @returns A formatted string describing the retry attempt
 */
export function formatRetryAttempt(attempt: RetryAttempt): string {
  const statusMap = {
    [RetryStatus.SCHEDULED]: 'Scheduled',
    [RetryStatus.PROCESSING]: 'Processing',
    [RetryStatus.SUCCEEDED]: 'Succeeded',
    [RetryStatus.FAILED]: 'Failed',
    [RetryStatus.CANCELLED]: 'Cancelled'
  };
  
  let result = `Attempt #${attempt.attemptNumber} - ${statusMap[attempt.status]} `;
  
  if (attempt.status === RetryStatus.SCHEDULED) {
    result += `for ${formatDate(attempt.scheduledDate)} `;
    result += `(${formatDistance(attempt.scheduledDate, new Date(), { addSuffix: true })})`;
  } else if (attempt.executedDate) {
    result += `on ${formatDate(attempt.executedDate)}`;
    if (attempt.result) {
      result += ` - ${attempt.result}`;
    }
  }
  
  return result;
}

/**
 * Update the status of a retry attempt
 * @param failedPayment The failed payment record
 * @param attemptId The ID of the retry attempt to update
 * @param status The new status of the retry attempt
 * @param result Optional result message
 * @returns The updated failed payment record
 */
export function updateRetryAttemptStatus(
  failedPayment: FailedPayment,
  attemptId: string,
  status: RetryStatus,
  result?: string
): FailedPayment {
  const updatedRetryAttempts = failedPayment.retryAttempts.map(attempt => {
    if (attempt.id === attemptId) {
      return {
        ...attempt,
        status,
        result,
        ...(status !== RetryStatus.SCHEDULED ? { executedDate: new Date() } : {})
      };
    }
    return attempt;
  });
  
  return {
    ...failedPayment,
    retryAttempts: updatedRetryAttempts
  };
}

/**
 * Parse an ISO date string into a Date object, or return the original Date
 * @param date Date string or Date object
 * @returns Date object
 */
export function ensureDate(date: Date | string): Date {
  return typeof date === 'string' ? parseISO(date) : date;
} 