/**
 * Zod request schemas for API validation. Use parseWithSchema in handlers.
 */

import { z } from 'zod';

const uuid = z.string().uuid('Invalid UUID');

export const createCheckoutSchema = z.object({
  planId: uuid.optional(),
  weekStart: z.string().min(1, 'weekStart required'),
  weekEnd: z.string().min(1, 'weekEnd required'),
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

const demoSubtypes = [
  'extreme_heat',
  'heavy_rain',
  'severe_aqi',
  'traffic_gridlock',
  'zone_curfew',
] as const;

export const demoTriggerSchema = z.object({
  eventSubtype: z.enum(demoSubtypes),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(0.1).max(100).optional(),
  severity: z.number().min(1).max(10).optional(),
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
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type DemoTriggerInput = z.infer<typeof demoTriggerSchema>;
export type ReviewClaimInput = z.infer<typeof reviewClaimSchema>;
export type DisruptionWebhookInput = z.infer<typeof disruptionWebhookSchema>;
export type SimulatePayoutInput = z.infer<typeof simulatePayoutSchema>;
