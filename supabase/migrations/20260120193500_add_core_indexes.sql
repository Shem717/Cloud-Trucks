-- Add indexes for common query patterns.

-- ==============================
-- cloudtrucks_credentials
-- ==============================
CREATE INDEX IF NOT EXISTS idx_cloudtrucks_credentials_is_valid
  ON public.cloudtrucks_credentials(is_valid);

CREATE INDEX IF NOT EXISTS idx_cloudtrucks_credentials_last_validated_at
  ON public.cloudtrucks_credentials(last_validated_at DESC);


-- ==============================
-- search_criteria
-- ==============================
-- Fast-path for "active scouts" fetches.
CREATE INDEX IF NOT EXISTS idx_search_criteria_user_active_true
  ON public.search_criteria(user_id)
  WHERE active IS TRUE;

-- Fast-path for listing criteria in the default (non-trash) view.
CREATE INDEX IF NOT EXISTS idx_search_criteria_user_not_deleted
  ON public.search_criteria(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Multi-state array indexes (safe if already present).
CREATE INDEX IF NOT EXISTS idx_search_criteria_origin_states
  ON public.search_criteria USING GIN (origin_states);

CREATE INDEX IF NOT EXISTS idx_search_criteria_destination_states
  ON public.search_criteria USING GIN (destination_states);


-- ==============================
-- found_loads
-- ==============================
CREATE INDEX IF NOT EXISTS idx_found_loads_criteria_created_at
  ON public.found_loads(criteria_id, created_at DESC);


-- ==============================
-- interested_loads
-- ==============================
CREATE INDEX IF NOT EXISTS idx_interested_loads_user_status_created_at
  ON public.interested_loads(user_id, status, created_at DESC);


-- ==============================
-- booked_loads (optional)
-- ==============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'booked_loads'
      AND c.relkind = 'r'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_booked_loads_user_id ON public.booked_loads(user_id)';
  END IF;
END
$$;
