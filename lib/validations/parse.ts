/**
 * Parse request body with Zod schema; return 400 NextResponse on validation failure.
 */

import { NextResponse } from 'next/server';
import type { z } from 'zod';

export function parseWithSchema<T extends z.ZodType>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as z.infer<T> };
  }
  const errors = result.error.flatten();
  const message =
    errors.formErrors?.[0] ??
    (errors.fieldErrors && Object.values(errors.fieldErrors).flat()[0]) ??
    'Validation failed';
  return {
    success: false,
    response: NextResponse.json(
      { error: message, details: errors.fieldErrors },
      { status: 400 },
    ),
  };
}
