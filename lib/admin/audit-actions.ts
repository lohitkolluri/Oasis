/** Stable action strings for admin_audit_log.action */

export const AUDIT = {
  CLAIM_REVIEW: 'claim.review',
  POLICY_UPDATE: 'policy.update',
  ROLE_UPDATE: 'role.update',
  GOVERNMENT_ID_UPDATE: 'rider.government_id',
  RULE_SET_CREATE: 'parametric_rule_set.create',
} as const;
