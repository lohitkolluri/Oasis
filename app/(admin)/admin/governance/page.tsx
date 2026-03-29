import { GovernanceDashboard } from '@/components/admin/GovernanceDashboard';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function GovernancePage() {
  const supabase = createAdminClient();
  const [rulesRes, auditRes] = await Promise.all([
    supabase
      .from('parametric_rule_sets')
      .select(
        'id,version_label,effective_from,effective_until,excluded_subtypes,notes,created_at',
      )
      .order('effective_from', { ascending: false })
      .limit(30),
    supabase
      .from('admin_audit_log')
      .select('id,created_at,actor_email,action,resource_type,resource_id,metadata')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const rules = rulesRes.error ? [] : (rulesRes.data ?? []);
  const audits = auditRes.error ? [] : (auditRes.data ?? []);

  return (
    <GovernanceDashboard
      initialRules={rules}
      initialAudits={audits}
    />
  );
}
