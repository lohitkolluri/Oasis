-- Self-report verification queue using pgmq
-- - Creates pgmq extension (if not already enabled)
-- - Adds verification_status column on rider_delivery_reports
-- - Creates a dedicated queue and RPC helpers for enqueueing and draining jobs

-- Enable pgmq extension in its own schema (Supabase Queues also expects this)
create schema if not exists pgmq;
create extension if not exists pgmq with schema pgmq;

-- Track verification lifecycle for rider delivery reports
alter table public.rider_delivery_reports
  add column if not exists verification_status text not null default 'pending';

create or replace function public.pgmq_send_self_report_verification(msg jsonb)
returns bigint
language sql
security definer
as $$
  select * from pgmq.send(
    queue_name => 'self_report_verification',
    msg        => msg
  );
$$;

comment on function public.pgmq_send_self_report_verification(jsonb) is
  'Enqueue a self-report verification job into the pgmq self_report_verification queue.';

create or replace function public.pgmq_read_self_report_verification(qty integer, vt integer)
returns setof jsonb
language sql
security definer
as $$
  select jsonb_build_object('msg_id', msg_id, 'message', message)
  from pgmq.read(
    queue_name => 'self_report_verification',
    vt         => vt,
    qty        => qty
  );
$$;

comment on function public.pgmq_read_self_report_verification(integer, integer) is
  'Read up to qty self-report verification messages with visibility timeout vt seconds.';

create or replace function public.pgmq_delete_self_report_verification(msg_id bigint)
returns boolean
language sql
security definer
as $$
  select pgmq.delete(
    queue_name => 'self_report_verification',
    msg_id     => msg_id
  );
$$;

comment on function public.pgmq_delete_self_report_verification(bigint) is
  'Delete a self-report verification message from the queue by msg_id.';

