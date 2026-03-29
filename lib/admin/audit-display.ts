import { AUDIT } from '@/lib/admin/audit-actions';

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Short human label for the audit row (complements the raw `action` code). */
export function auditActionTitle(action: string): string {
  switch (action) {
    case AUDIT.CLAIM_REVIEW:
      return 'Claim review';
    case AUDIT.POLICY_UPDATE:
      return 'Weekly policy update';
    case AUDIT.ROLE_UPDATE:
      return 'Profile role change';
    case AUDIT.RULE_SET_CREATE:
      return 'Rule set published';
    case AUDIT.GOVERNMENT_ID_UPDATE:
      return 'Government ID update';
    default:
      return action
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export type AuditDisplayRow = {
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
};

/** One or more lines to show in the Details column. */
export function auditDetailLines(row: AuditDisplayRow): string[] {
  const m = row.metadata ?? {};
  switch (row.action) {
    case AUDIT.ROLE_UPDATE: {
      const role = m.role;
      return [`Assigned role: ${str(role) || '—'}`];
    }
    case AUDIT.CLAIM_REVIEW: {
      const lines: string[] = [];
      const decision = str(m.action);
      if (decision) lines.push(`Decision: ${decision}`);
      if (m.payout_change != null && String(m.payout_change).length > 0) {
        lines.push(`Payout effect: ${str(m.payout_change)}`);
      }
      if (m.prior_status != null) lines.push(`Previous claim status: ${str(m.prior_status)}`);
      if (m.prior_admin_review != null && String(m.prior_admin_review).length > 0) {
        lines.push(`Previous admin review: ${str(m.prior_admin_review)}`);
      }
      return lines.length ? lines : ['Claim review recorded.'];
    }
    case AUDIT.POLICY_UPDATE: {
      const lines: string[] = [];
      const patch = m.patch;
      if (patch && typeof patch === 'object') {
        const p = patch as Record<string, unknown>;
        if ('isActive' in p) lines.push(`Active (after): ${str(p.isActive)}`);
        if ('planId' in p) lines.push(`Plan ID (after): ${str(p.planId)}`);
      }
      const before = m.before;
      if (before && typeof before === 'object' && Object.keys(before as object).length > 0) {
        const b = before as Record<string, unknown>;
        const keys = Object.keys(b);
        const preview = keys
          .slice(0, 5)
          .map((k) => `${k}=${str(b[k])}`)
          .join(', ');
        lines.push(`Prior state: ${preview}${keys.length > 5 ? ' …' : ''}`);
      }
      return lines.length ? lines : ['Policy row updated.'];
    }
    case AUDIT.RULE_SET_CREATE: {
      const lines: string[] = [];
      if (m.version_label != null) lines.push(`Version label: ${str(m.version_label)}`);
      if (m.effective_from != null) lines.push(`Effective from (UTC): ${str(m.effective_from)}`);
      const ex = m.excluded_subtypes;
      if (Array.isArray(ex) && ex.length) lines.push(`Excluded trigger types: ${ex.join(', ')}`);
      return lines.length ? lines : ['New parametric rule set created.'];
    }
    default: {
      const entries = Object.entries(m).filter(
        ([, v]) => v !== undefined && v !== null && String(v).length > 0,
      );
      if (!entries.length) {
        return row.resource_id ? [`See resource id →`] : ['No metadata on this entry.'];
      }
      return entries.slice(0, 8).map(([k, v]) => {
        const raw = typeof v === 'object' ? JSON.stringify(v) : str(v);
        const val = raw.length > 140 ? `${raw.slice(0, 137)}…` : raw;
        return `${k}: ${val}`;
      });
    }
  }
}

/** Lowercase blob for client-side filtering. */
export function auditSearchBlob(row: AuditDisplayRow & { created_at: string; actor_email: string | null }): string {
  const d = new Date(row.created_at);
  const parts = [
    row.created_at,
    d.toISOString(),
    d.toLocaleString(),
    d.toLocaleDateString(),
    d.toLocaleTimeString(),
    row.actor_email,
    row.action,
    row.resource_type,
    row.resource_id,
    JSON.stringify(row.metadata ?? {}),
    auditActionTitle(row.action),
    ...auditDetailLines(row),
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}
