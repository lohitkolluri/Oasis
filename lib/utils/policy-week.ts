/**
 * Back-compat wrapper around the unified Oasis time layer.
 *
 * Prefer importing from `@/lib/datetime/oasis-time` directly.
 */

import { coverageWeekRange, enrollmentWeekRange } from '@/lib/datetime/oasis-time';

export function getCoverageWeekRange(referenceDate: Date = new Date()): {
  start: string;
  end: string;
} {
  return coverageWeekRange(referenceDate);
}

function getEnrollmentWeekRange(referenceDate: Date = new Date()): {
  start: string;
  end: string;
} {
  return enrollmentWeekRange(referenceDate);
}

/** Backwards compatible alias (kept for admin/pricing callers). */
export function getPolicyWeekRange(referenceDate: Date = new Date()): {
  start: string;
  end: string;
} {
  return enrollmentWeekRange(referenceDate);
}
