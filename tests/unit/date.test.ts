import { describe, expect, it } from 'vitest';
import { addDays, toDateString } from '@/lib/utils/date';

describe('date utils', () => {
  it('formats dates as YYYY-MM-DD', () => {
    expect(toDateString(new Date('2026-03-21T04:05:06.000Z'))).toBe('2026-03-21');
  });

  it('adds days across month boundaries safely in UTC', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
