import { describe, expect, it } from 'vitest';
import {
  addCalendarDaysIST,
  getISTCurrentCoverageWeekMondayStart,
  getISTDateString,
  getISTMondayYmdForInstant,
  istEndOfDay,
  istStartOfDay,
} from '@/lib/datetime/ist';

describe('ist', () => {
  it('istStartOfDay and istEndOfDay bracket the calendar day', () => {
    const start = istStartOfDay('2026-06-15');
    const end = istEndOfDay('2026-06-15');
    expect(start.toISOString()).toBe('2026-06-14T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-06-15T18:29:59.999Z');
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it('addCalendarDaysIST rolls across months', () => {
    expect(addCalendarDaysIST('2026-03-30', 7)).toBe('2026-04-06');
  });

  it('getISTDateString uses Asia/Kolkata', () => {
    const instant = new Date('2026-03-29T18:30:00.000Z');
    expect(getISTDateString(instant)).toBe('2026-03-30');
  });

  it('getISTCurrentCoverageWeekMondayStart: Wednesday -> that week Monday', () => {
    const wed = new Date('2026-04-01T06:30:00.000Z');
    const mon = getISTCurrentCoverageWeekMondayStart(wed);
    expect(getISTDateString(mon)).toBe('2026-03-30');
  });

  it('getISTMondayYmdForInstant groups by IST week', () => {
    const wed = new Date('2026-04-01T06:30:00.000Z');
    expect(getISTMondayYmdForInstant(wed)).toBe('2026-03-30');
  });
});
