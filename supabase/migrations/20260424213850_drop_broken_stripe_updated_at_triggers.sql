-- Stop legacy Stripe sync work that is no longer part of the Razorpay-based Oasis flow.
-- pg_stat_statements showed the stripe sync worker as the dominant database load source.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'stripe-sync-worker') then
    perform cron.unschedule('stripe-sync-worker');
  end if;
exception
  when undefined_function then
    update cron.job
    set active = false
    where jobname = 'stripe-sync-worker';
end $$;

-- The Stripe extension/sync tables do not have updated_at columns, but a prior setup
-- attached public.set_updated_at() triggers to them. Each update then raises:
-- "record NEW has no field updated_at".
do $$
declare
  trigger_target record;
begin
  for trigger_target in
    select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    where not t.tgisinternal
      and n.nspname = 'stripe'
      and p.proname = 'set_updated_at'
      and not exists (
        select 1
        from information_schema.columns col
        where col.table_schema = n.nspname
          and col.table_name = c.relname
          and col.column_name = 'updated_at'
      )
  loop
    execute format(
      'drop trigger if exists %I on %I.%I',
      trigger_target.trigger_name,
      trigger_target.schema_name,
      trigger_target.table_name
    );
  end loop;
end $$;

-- Merge rider/admin SELECT policies to avoid multiple permissive RLS policies for the
-- same table/action. This removes extra policy evaluation from frequent dashboard reads.
drop policy if exists "Admins can view all policies" on public.weekly_policies;
drop policy if exists "Users can view own policies" on public.weekly_policies;
create policy "Users and admins can view policies"
  on public.weekly_policies
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

drop policy if exists "Admins can view all claims" on public.parametric_claims;
drop policy if exists "Users can view own claims" on public.parametric_claims;
create policy "Users and admins can view claims"
  on public.parametric_claims
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.weekly_policies wp
      where wp.id = policy_id
        and wp.profile_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

drop policy if exists "Admins can view all payouts" on public.payout_ledger;
drop policy if exists "Riders see own payouts" on public.payout_ledger;
create policy "Users and admins can view payouts"
  on public.payout_ledger
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );
