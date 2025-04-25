/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'USD')
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a date as a localized string
 * @param date - The date to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en-US'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a date and time as a localized string
 * @param date - The date to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date | string,
  locale: string = 'en-US'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Truncate a string to a specified length with ellipsis
 * @param str - The string to truncate
 * @param length - Maximum length before truncating (default: 50)
 * @returns Truncated string
 */
export function truncateString(str: string, length: number = 50): string {
  if (!str) return ''
  if (str.length <= length) return str
  return `${str.substring(0, length)}...`
}

/**
 * Capitalize the first letter of each word in a string
 * @param str - The string to capitalize
 * @returns Capitalized string
 */
export function capitalizeWords(str: string): string {
  if (!str) return ''
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
} 