import { format, isAfter, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, formatDistance, isEqual, parseISO, addDays } from 'date-fns';

/**
 * Formats a date using the specified format string.
 * @param date The date to format
 * @param formatString The format string to use (default: 'MMM d, yyyy')
 * @returns The formatted date string
 */
export function formatDate(date: Date, formatString: string = 'MMM d, yyyy'): string {
  return format(date, formatString);
}

/**
 * Checks if a date is in the past.
 * @param date The date to check
 * @returns True if the date is in the past, false otherwise
 */
export function isDateInPast(date: Date): boolean {
  return !isAfter(date, new Date());
}

/**
 * Returns the start and end dates for a specified time period.
 * @param period The time period ('week', 'month', or 'year')
 * @returns An object containing the start and end dates
 */
export function getDateRangeForPeriod(period: 'week' | 'month' | 'year'): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  switch (period) {
    case 'week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 })
      };
    case 'month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now)
      };
    case 'year':
      return {
        startDate: startOfYear(now),
        endDate: endOfYear(now)
      };
  }
}

/**
 * Formats a date range as a string.
 * @param startDate The start date
 * @param endDate The end date
 * @returns A formatted string representing the date range
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  if (isEqual(startOfDay(startDate), startOfDay(endDate))) {
    return formatDate(startDate);
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Returns a relative time string (e.g., "2 days ago", "in 3 hours").
 * @param date The date to compare with the current date
 * @returns A string representing the relative time
 */
export function getRelativeTimeString(date: Date): string {
  return formatDistance(date, new Date(), { addSuffix: true });
}

/**
 * Parses an ISO date string to a Date object.
 * @param dateString The ISO date string to parse
 * @returns A Date object
 */
export function parseISODate(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * Creates an array of dates for the specified number of days starting from a date.
 * @param startDate The start date
 * @param numberOfDays The number of days to include
 * @returns An array of Date objects
 */
export function generateDateRange(startDate: Date, numberOfDays: number): Date[] {
  const dates: Date[] = [];
  
  for (let i = 0; i < numberOfDays; i++) {
    dates.push(addDays(startDate, i));
  }
  
  return dates;
}

/**
 * Groups an array of objects by date.
 * @param items The array of objects to group
 * @param dateField The name of the date field in each object
 * @returns An object with dates as keys and arrays of objects as values
 */
export function groupByDate<T>(items: T[], dateField: keyof T): Record<string, T[]> {
  return items.reduce((groups, item) => {
    const dateValue = item[dateField];
    if (dateValue instanceof Date) {
      const dateKey = formatDate(dateValue, 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    }
    return groups;
  }, {} as Record<string, T[]>);
} 