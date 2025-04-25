import { describe, expect, test } from '@jest/globals';
import { addDays } from 'date-fns';
import { 
  PaymentFailureType,
  RetryStatus,
  DEFAULT_RETRY_SCHEDULE,
  generateRetryDates,
  createFailedPaymentRecord,
  getNextRetryAttempt,
  hasExhaustedRetries,
  formatRetryAttempt,
  updateRetryAttemptStatus,
  ensureDate
} from '@/utils/payment-utils';

describe('Payment Utilities', () => {
  // Common test data
  const testPaymentData = {
    id: 'test-payment-123',
    userId: 'user-456',
    amount: 99.99,
    currency: 'USD',
    paymentMethod: 'card_1234',
    subscriptionId: 'sub_789',
    invoiceId: 'inv_101'
  };

  test('generateRetryDates should create dates based on schedule', () => {
    const baseDate = new Date('2023-05-15T14:30:00');
    const result = generateRetryDates(baseDate);
    
    expect(result.length).toBe(DEFAULT_RETRY_SCHEDULE.length);
    expect(result[0]).toEqual(addDays(baseDate, DEFAULT_RETRY_SCHEDULE[0]));
    expect(result[1]).toEqual(addDays(baseDate, DEFAULT_RETRY_SCHEDULE[1]));
    expect(result[2]).toEqual(addDays(baseDate, DEFAULT_RETRY_SCHEDULE[2]));
  });

  test('generateRetryDates should accept custom schedule', () => {
    const baseDate = new Date('2023-05-15T14:30:00');
    const customSchedule = [2, 5, 10];
    const result = generateRetryDates(baseDate, customSchedule);
    
    expect(result.length).toBe(customSchedule.length);
    expect(result[0]).toEqual(addDays(baseDate, customSchedule[0]));
    expect(result[1]).toEqual(addDays(baseDate, customSchedule[1]));
    expect(result[2]).toEqual(addDays(baseDate, customSchedule[2]));
  });

  test('createFailedPaymentRecord should generate record with retry attempts', () => {
    const result = createFailedPaymentRecord(
      testPaymentData,
      PaymentFailureType.CARD_DECLINED,
      'Card declined by issuer'
    );
    
    expect(result.id).toBe(testPaymentData.id);
    expect(result.userId).toBe(testPaymentData.userId);
    expect(result.amount).toBe(testPaymentData.amount);
    expect(result.failureType).toBe(PaymentFailureType.CARD_DECLINED);
    expect(result.failureMessage).toBe('Card declined by issuer');
    expect(result.retryAttempts.length).toBe(DEFAULT_RETRY_SCHEDULE.length);
    
    // Check retry attempts
    result.retryAttempts.forEach((attempt, index) => {
      expect(attempt.paymentId).toBe(testPaymentData.id);
      expect(attempt.attemptNumber).toBe(index + 1);
      expect(attempt.status).toBe(RetryStatus.SCHEDULED);
    });
  });

  test('createFailedPaymentRecord should respect maxRetries', () => {
    const maxRetries = 2; // Only 2 retry attempts
    const result = createFailedPaymentRecord(
      testPaymentData,
      PaymentFailureType.EXPIRED_CARD,
      'Card has expired',
      maxRetries
    );
    
    expect(result.retryAttempts.length).toBe(maxRetries);
  });

  test('getNextRetryAttempt should return the next scheduled attempt', () => {
    const failedPayment = createFailedPaymentRecord(
      testPaymentData,
      PaymentFailureType.INSUFFICIENT_FUNDS,
      'Insufficient funds'
    );
    
    const nextAttempt = getNextRetryAttempt(failedPayment);
    
    expect(nextAttempt).not.toBeNull();
    expect(nextAttempt?.attemptNumber).toBe(1);
    expect(nextAttempt?.status).toBe(RetryStatus.SCHEDULED);
  });

  test('getNextRetryAttempt should return null when no scheduled attempts', () => {
    // Create payment with all attempts failed
    const failedPayment = createFailedPaymentRecord(
      testPaymentData,
      PaymentFailureType.PROCESSING_ERROR,
      'Processing error'
    );
    
    // Mark all attempts as failed
    let updatedPayment = failedPayment;
    for (const attempt of failedPayment.retryAttempts) {
      updatedPayment = updateRetryAttemptStatus(
        updatedPayment,
        attempt.id,
        RetryStatus.FAILED,
        'Test failure'
      );
    }
    
    const nextAttempt = getNextRetryAttempt(updatedPayment);
    expect(nextAttempt).toBeNull();
  });

  test('hasExhaustedRetries should return true when all attempts are done', () => {
    // Create payment with all attempts failed
    const failedPayment = createFailedPaymentRecord(
      testPaymentData,
      PaymentFailureType.INVALID_CVC,
      'Invalid CVC'
    );
    
    // Mark all attempts as failed
    let updatedPayment = failedPayment;
    for (const attempt of failedPayment.retryAttempts) {
      updatedPayment = updateRetryAttemptStatus(
        updatedPayment,
        attempt.id,
        RetryStatus.FAILED,
        'Test failure'
      );
    }
    
    expect(hasExhaustedRetries(updatedPayment)).toBe(true);
  });

  test('hasExhaustedRetries should return false when scheduled attempts exist', () => {
    const failedPayment = createFailedPaymentRecord(
      testPaymentData,
      PaymentFailureType.UNKNOWN,
      'Unknown error'
    );
    
    expect(hasExhaustedRetries(failedPayment)).toBe(false);
  });

  test('formatRetryAttempt should format scheduled attempts correctly', () => {
    const failedPayment = createFailedPaymentRecord(
      testPaymentData,
      PaymentFailureType.CARD_DECLINED,
      'Card declined'
    );
    
    const formattedAttempt = formatRetryAttempt(failedPayment.retryAttempts[0]);
    
    expect(formattedAttempt).toContain('Attempt #1');
    expect(formattedAttempt).toContain('Scheduled');
    // Don't test the exact date string as it depends on the current date
    expect(formattedAttempt).toContain('for ');
  });

  test('formatRetryAttempt should format executed attempts correctly', () => {
    const failedPayment = createFailedPaymentRecord(
      testPaymentData,
      PaymentFailureType.CARD_DECLINED,
      'Card declined'
    );
    
    // Update an attempt to be failed with a result
    const attemptId = failedPayment.retryAttempts[0].id;
    const updatedPayment = updateRetryAttemptStatus(
      failedPayment,
      attemptId,
      RetryStatus.FAILED,
      'Payment failed due to insufficient funds'
    );
    
    const formattedAttempt = formatRetryAttempt(updatedPayment.retryAttempts[0]);
    
    expect(formattedAttempt).toContain('Attempt #1');
    expect(formattedAttempt).toContain('Failed');
    expect(formattedAttempt).toContain('on ');
    expect(formattedAttempt).toContain('Payment failed due to insufficient funds');
  });

  test('updateRetryAttemptStatus should update the status and add executedDate', () => {
    const failedPayment = createFailedPaymentRecord(
      testPaymentData,
      PaymentFailureType.CARD_DECLINED,
      'Card declined'
    );
    
    const attemptId = failedPayment.retryAttempts[0].id;
    const updatedPayment = updateRetryAttemptStatus(
      failedPayment,
      attemptId,
      RetryStatus.SUCCEEDED,
      'Payment processed successfully'
    );
    
    const updatedAttempt = updatedPayment.retryAttempts[0];
    expect(updatedAttempt.status).toBe(RetryStatus.SUCCEEDED);
    expect(updatedAttempt.result).toBe('Payment processed successfully');
    expect(updatedAttempt.executedDate).toBeDefined();
    expect(updatedAttempt.executedDate instanceof Date).toBe(true);
  });

  test('ensureDate should handle string dates', () => {
    const dateString = '2023-05-15T14:30:00Z';
    const result = ensureDate(dateString);
    
    expect(result instanceof Date).toBe(true);
    expect(result.toISOString()).toContain('2023-05-15');
  });

  test('ensureDate should handle Date objects', () => {
    const date = new Date('2023-05-15T14:30:00Z');
    const result = ensureDate(date);
    
    expect(result).toBe(date); // Should be the same object
    expect(result instanceof Date).toBe(true);
  });
}); 