-- Enforce single weekly_policies row per (profile_id, week_start_date).
-- Prevents race conditions creating duplicate pending/paid policies for same rider-week.
-- Also deduplicates any existing rows by re-pointing dependent tables and deleting older duplicates.

DO $$
BEGIN
  -- 1) If duplicates already exist, pick a canonical "keeper" row and repoint FKs.
  WITH ranked AS (
    SELECT
      id,
      profile_id,
      week_start_date,
      -- Prefer paid rows, then active rows, then newest.
      ROW_NUMBER() OVER (
        PARTITION BY profile_id, week_start_date
        ORDER BY
          (payment_status = 'paid') DESC NULLS LAST,
          is_active DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id DESC
      ) AS rn,
      FIRST_VALUE(id) OVER (
        PARTITION BY profile_id, week_start_date
        ORDER BY
          (payment_status = 'paid') DESC NULLS LAST,
          is_active DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id DESC
      ) AS keep_id
    FROM public.weekly_policies
  ),
  dups AS (
    SELECT id, keep_id
    FROM ranked
    WHERE rn > 1
  )
  UPDATE public.payment_transactions pt
  SET weekly_policy_id = d.keep_id
  FROM dups d
  WHERE pt.weekly_policy_id = d.id;

  WITH ranked AS (
    SELECT
      id,
      profile_id,
      week_start_date,
      ROW_NUMBER() OVER (
        PARTITION BY profile_id, week_start_date
        ORDER BY
          (payment_status = 'paid') DESC NULLS LAST,
          is_active DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id DESC
      ) AS rn,
      FIRST_VALUE(id) OVER (
        PARTITION BY profile_id, week_start_date
        ORDER BY
          (payment_status = 'paid') DESC NULLS LAST,
          is_active DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id DESC
      ) AS keep_id
    FROM public.weekly_policies
  ),
  dups AS (
    SELECT id, keep_id
    FROM ranked
    WHERE rn > 1
  )
  UPDATE public.parametric_claims pc
  SET policy_id = d.keep_id
  FROM dups d
  WHERE pc.policy_id = d.id;

  WITH ranked AS (
    SELECT
      id,
      profile_id,
      week_start_date,
      ROW_NUMBER() OVER (
        PARTITION BY profile_id, week_start_date
        ORDER BY
          (payment_status = 'paid') DESC NULLS LAST,
          is_active DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id DESC
      ) AS rn,
      FIRST_VALUE(id) OVER (
        PARTITION BY profile_id, week_start_date
        ORDER BY
          (payment_status = 'paid') DESC NULLS LAST,
          is_active DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id DESC
      ) AS keep_id
    FROM public.weekly_policies
  ),
  dups AS (
    SELECT id, keep_id
    FROM ranked
    WHERE rn > 1
  )
  UPDATE public.automated_holds ah
  SET policy_id = d.keep_id
  FROM dups d
  WHERE ah.policy_id = d.id;

  -- Delete the duplicate weekly policies now that dependents are repointed.
  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY profile_id, week_start_date
        ORDER BY
          (payment_status = 'paid') DESC NULLS LAST,
          is_active DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id DESC
      ) AS rn
    FROM public.weekly_policies
  )
  DELETE FROM public.weekly_policies wp
  USING ranked r
  WHERE wp.id = r.id
    AND r.rn > 1;

  -- 2) Add DB-level constraint to prevent future duplicates.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'weekly_policies_profile_week_unique'
  ) THEN
    ALTER TABLE public.weekly_policies
      ADD CONSTRAINT weekly_policies_profile_week_unique
      UNIQUE (profile_id, week_start_date);
  END IF;
END $$;
