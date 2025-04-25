# Utility Functions

This directory contains utility functions used throughout the application.

## Date Utilities (`date-utils.ts`)

A collection of helper functions for working with dates, powered by [date-fns](https://date-fns.org/).

### Functions

#### `formatDate(date: Date, formatString?: string): string`

Formats a date using the specified format string.

```typescript
import { formatDate } from '@/utils/date-utils';

const date = new Date('2023-05-15');
formatDate(date); // "May 15, 2023"
formatDate(date, 'MM/dd/yyyy'); // "05/15/2023"
```

#### `isDateInPast(date: Date): boolean`

Checks if a date is in the past.

```typescript
import { isDateInPast } from '@/utils/date-utils';

const pastDate = new Date('2023-01-01');
isDateInPast(pastDate); // true

const futureDate = new Date('2030-01-01');
isDateInPast(futureDate); // false
```

#### `getDateRangeForPeriod(period: 'week' | 'month' | 'year'): { startDate: Date; endDate: Date }`

Returns the start and end dates for a specified time period.

```typescript
import { getDateRangeForPeriod } from '@/utils/date-utils';

const weekRange = getDateRangeForPeriod('week');
// Returns the start of the current week (Monday) and end of the week (Sunday)

const monthRange = getDateRangeForPeriod('month');
// Returns the first day and last day of the current month

const yearRange = getDateRangeForPeriod('year');
// Returns January 1st and December 31st of the current year
```

#### `formatDateRange(startDate: Date, endDate: Date): string`

Formats a date range as a string. If both dates are the same day, it returns just one formatted date.

```typescript
import { formatDateRange } from '@/utils/date-utils';

const startDate = new Date('2023-05-15');
const endDate = new Date('2023-05-20');
formatDateRange(startDate, endDate); // "May 15, 2023 - May 20, 2023"

// Same day
formatDateRange(startDate, startDate); // "May 15, 2023"
```

#### `getRelativeTimeString(date: Date): string`

Returns a relative time string (e.g., "2 days ago", "in 3 hours").

```typescript
import { getRelativeTimeString } from '@/utils/date-utils';

const pastDate = new Date('2023-05-15');
getRelativeTimeString(pastDate); // "X days ago" (where X is the number of days)

const futureDate = new Date('2030-01-01');
getRelativeTimeString(futureDate); // "in X years" (where X is the number of years)
```

#### `parseISODate(dateString: string): Date`

Parses an ISO date string to a Date object.

```typescript
import { parseISODate } from '@/utils/date-utils';

const date = parseISODate('2023-05-15T14:30:00Z');
// Returns a Date object representing May 15, 2023 14:30:00 UTC
```

#### `generateDateRange(startDate: Date, numberOfDays: number): Date[]`

Creates an array of dates for the specified number of days starting from a date.

```typescript
import { generateDateRange } from '@/utils/date-utils';

const startDate = new Date('2023-05-15');
const dates = generateDateRange(startDate, 3);
// Returns an array of 3 Date objects: May 15, May 16, and May 17, 2023
```

#### `groupByDate<T>(items: T[], dateField: keyof T): Record<string, T[]>`

Groups an array of objects by date.

```typescript
import { groupByDate } from '@/utils/date-utils';

const events = [
  { id: 1, date: new Date('2023-05-15'), title: 'Meeting' },
  { id: 2, date: new Date('2023-05-15'), title: 'Lunch' },
  { id: 3, date: new Date('2023-05-16'), title: 'Conference' },
];

const groupedEvents = groupByDate(events, 'date');
/* Returns:
{
  '2023-05-15': [
    { id: 1, date: Date, title: 'Meeting' },
    { id: 2, date: Date, title: 'Lunch' }
  ],
  '2023-05-16': [
    { id: 3, date: Date, title: 'Conference' }
  ]
}
*/
```

## Payment Utilities (`payment-utils.ts`)

A collection of utilities for handling payment failures and retry logic.

### Enums and Interfaces

#### `PaymentFailureType`

Enum describing different types of payment failures:

```typescript
enum PaymentFailureType {
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  CARD_DECLINED = 'card_declined',
  EXPIRED_CARD = 'expired_card',
  INVALID_CVC = 'invalid_cvc',
  PROCESSING_ERROR = 'processing_error',
  UNKNOWN = 'unknown'
}
```

#### `RetryStatus`

Enum describing the status of a payment retry attempt:

```typescript
enum RetryStatus {
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

#### `RetryAttempt`

Interface for a payment retry attempt:

```typescript
interface RetryAttempt {
  id: string;
  paymentId: string;
  attemptNumber: number;
  scheduledDate: Date;
  executedDate?: Date;
  status: RetryStatus;
  result?: string;
}
```

#### `FailedPayment`

Interface for a failed payment record:

```typescript
interface FailedPayment {
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
```

### Constants

#### `DEFAULT_RETRY_SCHEDULE`

Default schedule for payment retries in days (e.g., `[1, 3, 7]` means retry after 1 day, then 3 days later, then 7 days later).

### Functions

#### `generateRetryDates(baseDate: Date, retrySchedule?: number[]): Date[]`

Generate scheduled retry dates based on the current date and retry schedule.

```typescript
import { generateRetryDates } from '@/utils/payment-utils';

const baseDate = new Date(); // Today
const retryDates = generateRetryDates(baseDate);
// Returns dates for each retry according to DEFAULT_RETRY_SCHEDULE

// Custom schedule
const customRetryDates = generateRetryDates(baseDate, [2, 5, 10]);
// Returns dates 2, 5, and 10 days from baseDate
```

#### `createFailedPaymentRecord(paymentData, failureType, failureMessage, maxRetries?, retrySchedule?): FailedPayment`

Create a new failed payment record with initial retry attempts.

```typescript
import { createFailedPaymentRecord, PaymentFailureType } from '@/utils/payment-utils';

const failedPayment = createFailedPaymentRecord(
  {
    id: 'payment_123',
    userId: 'user_456',
    amount: 99.99,
    currency: 'USD',
    paymentMethod: 'card_1234',
    subscriptionId: 'sub_789'
  },
  PaymentFailureType.CARD_DECLINED,
  'Card was declined by issuer',
  3 // Maximum of 3 retry attempts
);
```

#### `getNextRetryAttempt(failedPayment: FailedPayment): RetryAttempt | null`

Get the next scheduled retry attempt for a payment.

```typescript
import { getNextRetryAttempt } from '@/utils/payment-utils';

const nextAttempt = getNextRetryAttempt(failedPayment);
if (nextAttempt) {
  console.log(`Next retry scheduled for ${nextAttempt.scheduledDate}`);
} else {
  console.log('No more retry attempts scheduled');
}
```

#### `hasExhaustedRetries(failedPayment: FailedPayment): boolean`

Check if a payment has exhausted all retry attempts.

```typescript
import { hasExhaustedRetries } from '@/utils/payment-utils';

if (hasExhaustedRetries(failedPayment)) {
  console.log('All retry attempts have been exhausted');
} else {
  console.log('There are still retry attempts pending');
}
```

#### `formatRetryAttempt(attempt: RetryAttempt): string`

Format a payment retry attempt for display.

```typescript
import { formatRetryAttempt } from '@/utils/payment-utils';

const formattedAttempt = formatRetryAttempt(failedPayment.retryAttempts[0]);
// "Attempt #1 - Scheduled for May 16, 2023 (in 1 day)" 
```

#### `updateRetryAttemptStatus(failedPayment, attemptId, status, result?): FailedPayment`

Update the status of a retry attempt.

```typescript
import { updateRetryAttemptStatus, RetryStatus } from '@/utils/payment-utils';

// Update the status of a retry attempt
const updatedPayment = updateRetryAttemptStatus(
  failedPayment,
  failedPayment.retryAttempts[0].id,
  RetryStatus.SUCCEEDED,
  'Payment was successfully processed'
);
```

#### `ensureDate(date: Date | string): Date`

Parse an ISO date string into a Date object, or return the original Date.

```typescript
import { ensureDate } from '@/utils/payment-utils';

const date1 = ensureDate('2023-05-15T14:30:00Z');
const date2 = ensureDate(new Date());
```

## Usage

Import the functions you need:

```typescript
import { formatDate, getDateRangeForPeriod } from '@/utils/date-utils';
import { createFailedPaymentRecord, updateRetryAttemptStatus } from '@/utils/payment-utils';
```

## Testing

All utility functions are covered by unit tests:

- `__tests__/utils/date-utils.test.ts` - Date utilities tests
- `__tests__/utils/payment-utils.test.ts` - Payment utilities tests

Run tests with:

```bash
npm test -- __tests__/utils/date-utils.test.ts
npm test -- __tests__/utils/payment-utils.test.ts
``` 