import { z } from 'zod';

export class LlmStructuredOutputError extends Error {
  name = 'LlmStructuredOutputError' as const;
  constructor(
    message: string,
    public readonly details?: {
      rawText?: string;
      extractedJson?: string;
      zodIssues?: unknown;
    },
  ) {
    super(message);
  }
}

/**
 * Extract the first JSON object from a model response.
 * Designed to be resilient to surrounding prose or code-fences.
 */
export function extractFirstJsonObject(text: string): string | null {
  const raw = (text ?? '').trim();
  if (!raw) return null;

  // Fast path: response is already a JSON object
  if (raw.startsWith('{') && raw.endsWith('}')) return raw;

  // Common: fenced code block
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const inside = fenced[1].trim();
    if (inside.startsWith('{') && inside.includes('}')) {
      const m = inside.match(/\{[\s\S]*\}/);
      if (m) return m[0];
    }
  }

  // General: first {...} block
  const match = raw.match(/\{[\s\S]*?\}/);
  return match?.[0] ?? null;
}

export function parseLlmJsonWithSchema<T extends z.ZodTypeAny>(
  schema: T,
  rawText: string,
): z.infer<T> {
  const extracted = extractFirstJsonObject(rawText);
  if (!extracted) {
    throw new LlmStructuredOutputError('Model did not return a JSON object.', { rawText });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch {
    throw new LlmStructuredOutputError('Model returned invalid JSON.', {
      rawText,
      extractedJson: extracted,
    });
  }

  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    throw new LlmStructuredOutputError('Model JSON failed schema validation.', {
      rawText,
      extractedJson: extracted,
      zodIssues: validated.error.issues,
    });
  }
  return validated.data;
}

