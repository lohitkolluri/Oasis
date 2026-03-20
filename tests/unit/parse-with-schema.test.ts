import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseWithSchema } from '@/lib/validations/parse';

describe('parseWithSchema', () => {
  const schema = z.object({
    email: z.string().email(),
    age: z.number().min(18),
  });

  it('returns typed data on successful parse', () => {
    const result = parseWithSchema(schema, {
      email: 'rider@example.com',
      age: 24,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('rider@example.com');
      expect(result.data.age).toBe(24);
    }
  });

  it('returns 400 response and field details on validation failure', async () => {
    const result = parseWithSchema(schema, {
      email: 'not-an-email',
      age: 16,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBeTruthy();
      expect(body.details).toHaveProperty('email');
      expect(body.details).toHaveProperty('age');
    }
  });
});
