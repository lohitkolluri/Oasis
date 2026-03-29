-- Realtime for admin governance console (rule sets + audit log)
ALTER PUBLICATION supabase_realtime ADD TABLE parametric_rule_sets;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_audit_log;
