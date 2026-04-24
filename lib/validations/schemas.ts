/**
 * Zod request schemas for API validation. Use parseWithSchema in handlers.
 */

import { z } from 'zod';

const uuid = z.string().uuid('Invalid UUID');

export const createCheckoutSchema = z.object({
  planId: uuid.optional(),
});

export const updatePolicySchema = z.object({
  policyId: uuid,
  isActive: z.boolean().optional(),
  planId: uuid.optional(),
});

export const updateRoleSchema = z.object({
  profileId: uuid,
  role: z.enum(['rider', 'admin']),
});

const payoutLadderStepSchema = z.object({
  severity_min: z.number().min(0).max(10),
  severity_max: z.number().min(0).max(10),
  multiplier: z.number().min(0).max(10),
});

export const createRuleSetSchema = z.object({
  versionLabel: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[\w.\-]+$/, 'Use letters, numbers, dots, hyphens only'),
  effectiveFrom: z.string().datetime().optional(),
  triggers: z.record(z.string(), z.number()).optional(),
  payoutLadder: z.array(payoutLadderStepSchema).optional(),
  excludedSubtypes: z.array(z.string().min(1)).optional(),
  notes: z.string().max(2000).optional(),
});

const demoSubtypes = [
  'extreme_heat',
  'heavy_rain',
  'severe_aqi',
  'traffic_gridlock',
  'zone_curfew',
] as const;

export const demoTriggerSchema = z
  .object({
    eventSubtype: z.enum(demoSubtypes),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    radiusKm: z.number().min(0.1).max(100).optional(),
    severity: z.number().min(1).max(10).optional(),
    riderId: z.string().uuid().optional(),
    /** Optional label shown in admin demo run logs. */
    runLabel: z.string().max(120).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.riderId) return;
    if (value.lat == null || value.lng == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lat and lng are required when riderId is not provided',
        path: ['lat'],
      });
    }
  });

/** Multi-step demo: runs triggers in order (e.g. rain → traffic) with optional pause. */
export const demoBatchSchema = z.object({
  steps: z
    .array(
      z.object({
        eventSubtype: z.enum(demoSubtypes),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radiusKm: z.number().min(0.1).max(100).optional(),
        severity: z.number().min(1).max(10).optional(),
      }),
    )
    .min(1)
    .max(8),
  pauseBetweenMs: z.number().min(0).max(120_000).optional().default(500),
  riderId: z.string().uuid().optional(),
  batchLabel: z.string().max(120).optional(),
});

export const reviewClaimSchema = z.object({
  claimId: uuid,
  action: z.enum(['approved', 'rejected']),
});

export const disruptionWebhookSchema = z.object({
  type: z.enum(['weather', 'traffic', 'social']),
  subtype: z.string().optional(),
  severity: z.number().optional(),
  lat: z.number(),
  lng: z.number(),
  radius_km: z.number().optional(),
  raw: z.record(z.unknown()).optional(),
});

export const simulatePayoutSchema = z.object({
  claim_id: uuid,
  profile_id: uuid,
  amount_inr: z.number().positive(),
  payout_method: z.string().optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
export type CreateRuleSetInput = z.infer<typeof createRuleSetSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type DemoTriggerInput = z.infer<typeof demoTriggerSchema>;
export type DemoBatchInput = z.infer<typeof demoBatchSchema>;
export type ReviewClaimInput = z.infer<typeof reviewClaimSchema>;
export type DisruptionWebhookInput = z.infer<typeof disruptionWebhookSchema>;
export type SimulatePayoutInput = z.infer<typeof simulatePayoutSchema>;
