import type { SupabaseAdmin } from '@/lib/adjudicator/types';
import { logger } from '@/lib/logger';

export type AdminAuditInput = {
  actorId: string | null;
  actorEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function insertAdminAuditLog(
  admin: SupabaseAdmin,
  input: AdminAuditInput,
): Promise<void> {
  const { error } = await admin.from('admin_audit_log').insert({
    actor_id: input.actorId,
    actor_email: input.actorEmail ?? null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    logger.warn('admin_audit_log insert failed', { message: error.message, action: input.action });
  }
}
