import { describe, expect, test } from '@jest/globals';
import { formatDate, isDateInPast, getDateRangeForPeriod, formatDateRange, getRelativeTimeString, parseISODate, generateDateRange, groupByDate } from '@/utils/date-utils';
import { addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

describe('Date Utilities', () => {
  test('formatDate should format a date string correctly', () => {
    const date = new Date('2023-05-15T14:30:00');
    expect(formatDate(date)).toBe('May 15, 2023');
    expect(formatDate(date, 'MM/dd/yyyy')).toBe('05/15/2023');
  });

  test('isDateInPast should return true for past dates', () => {
    const pastDate = subDays(new Date(), 1);
    expect(isDateInPast(pastDate)).toBe(true);
  });

  test('isDateInPast should return false for future dates', () => {
    const futureDate = addDays(new Date(), 1);
    expect(isDateInPast(futureDate)).toBe(false);
  });

  test('getDateRangeForPeriod should return correct date range for week', () => {
    const now = new Date();
    const result = getDateRangeForPeriod('week');
    
    expect(result.startDate).toEqual(startOfWeek(now, { weekStartsOn: 1 }));
    expect(result.endDate).toEqual(endOfWeek(now, { weekStartsOn: 1 }));
  });

  test('getDateRangeForPeriod should return correct date range for month', () => {
    const now = new Date();
    const result = getDateRangeForPeriod('month');
    
    expect(result.startDate).toEqual(startOfMonth(now));
    expect(result.endDate).toEqual(endOfMonth(now));
  });

  test('getDateRangeForPeriod should return correct date range for year', () => {
    const now = new Date();
    const result = getDateRangeForPeriod('year');
    
    expect(result.startDate).toEqual(startOfYear(now));
    expect(result.endDate).toEqual(endOfYear(now));
  });

  test('formatDateRange should handle same day correctly', () => {
    const date = new Date('2023-05-15T14:30:00');
    expect(formatDateRange(date, date)).toBe('May 15, 2023');
  });

  test('formatDateRange should format range correctly', () => {
    const startDate = new Date('2023-05-15T14:30:00');
    const endDate = new Date('2023-05-20T14:30:00');
    expect(formatDateRange(startDate, endDate)).toBe('May 15, 2023 - May 20, 2023');
  });

  test('parseISODate should parse ISO string correctly', () => {
    const dateString = '2023-05-15T14:30:00Z';
    const result = parseISODate(dateString);
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toContain('2023-05-15');
  });

  test('generateDateRange should create an array of dates', () => {
    const startDate = new Date('2023-05-15T14:30:00');
    const result = generateDateRange(startDate, 3);
    
    expect(result.length).toBe(3);
    expect(result[0]).toEqual(startDate);
    expect(result[1]).toEqual(addDays(startDate, 1));
    expect(result[2]).toEqual(addDays(startDate, 2));
  });

  test('getRelativeTimeString should format relative time', () => {
    const now = new Date();
    const pastDate = subDays(now, 2);
    const result = getRelativeTimeString(pastDate);
    
    expect(result).toContain('days ago');
  });

  test('groupByDate should group items by date field', () => {
    const items = [
      { id: 1, date: new Date('2023-05-15T10:00:00'), value: 'A' },
      { id: 2, date: new Date('2023-05-15T14:30:00'), value: 'B' },
      { id: 3, date: new Date('2023-05-16T09:00:00'), value: 'C' },
    ];
    
    const result = groupByDate(items, 'date');
    
    expect(Object.keys(result).length).toBe(2);
    expect(result['2023-05-15'].length).toBe(2);
    expect(result['2023-05-16'].length).toBe(1);
    expect(result['2023-05-15'][0].value).toBe('A');
    expect(result['2023-05-15'][1].value).toBe('B');
    expect(result['2023-05-16'][0].value).toBe('C');
  });
}); 