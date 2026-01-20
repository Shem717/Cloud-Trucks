-- Enable RLS and create authenticated-user policies for core tables.
--
-- Notes
-- - These policies assume user-owned rows use auth.uid() (UUID) as the tenant key.
-- - Guest sandbox tables are made server-only by enabling RLS without policies.

-- ==============================
-- cloudtrucks_credentials
-- ==============================
ALTER TABLE IF EXISTS public.cloudtrucks_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credentials" ON public.cloudtrucks_credentials;
DROP POLICY IF EXISTS "Users can insert own credentials" ON public.cloudtrucks_credentials;
DROP POLICY IF EXISTS "Users can update own credentials" ON public.cloudtrucks_credentials;
DROP POLICY IF EXISTS "Users can delete own credentials" ON public.cloudtrucks_credentials;

CREATE POLICY "Users can view own credentials"
ON public.cloudtrucks_credentials
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
ON public.cloudtrucks_credentials
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
ON public.cloudtrucks_credentials
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
ON public.cloudtrucks_credentials
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ==============================
-- search_criteria
-- ==============================
ALTER TABLE IF EXISTS public.search_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own criteria" ON public.search_criteria;
DROP POLICY IF EXISTS "Users can insert own criteria" ON public.search_criteria;
DROP POLICY IF EXISTS "Users can update own criteria" ON public.search_criteria;
DROP POLICY IF EXISTS "Users can delete own criteria" ON public.search_criteria;

CREATE POLICY "Users can view own criteria"
ON public.search_criteria
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own criteria"
ON public.search_criteria
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own criteria"
ON public.search_criteria
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own criteria"
ON public.search_criteria
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ==============================
-- found_loads (tenant via search_criteria ownership)
-- ==============================
ALTER TABLE IF EXISTS public.found_loads ENABLE ROW LEVEL SECURITY;

-- Drop legacy names observed in production.
DROP POLICY IF EXISTS "Users can view own loads" ON public.found_loads;
DROP POLICY IF EXISTS "Users can update own loads" ON public.found_loads;

-- Drop any repo/local variants.
DROP POLICY IF EXISTS "Users can view own found loads" ON public.found_loads;
DROP POLICY IF EXISTS "Users can insert own found loads" ON public.found_loads;
DROP POLICY IF EXISTS "Users can update own found loads" ON public.found_loads;
DROP POLICY IF EXISTS "Users can delete own found loads" ON public.found_loads;
DROP POLICY IF EXISTS "Users can delete own loads" ON public.found_loads;
-- Legacy/open policy observed in production metadata.
DROP POLICY IF EXISTS "System can insert loads" ON public.found_loads;

CREATE POLICY "Users can view own loads"
ON public.found_loads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.search_criteria sc
    WHERE sc.id = found_loads.criteria_id
      AND sc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own loads"
ON public.found_loads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.search_criteria sc
    WHERE sc.id = found_loads.criteria_id
      AND sc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.search_criteria sc
    WHERE sc.id = found_loads.criteria_id
      AND sc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own loads"
ON public.found_loads
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.search_criteria sc
    WHERE sc.id = found_loads.criteria_id
      AND sc.user_id = auth.uid()
  )
);


-- ==============================
-- booked_loads (optional: table may not exist in all environments)
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
    EXECUTE 'ALTER TABLE public.booked_loads ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Users can view own booked loads" ON public.booked_loads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own booked loads" ON public.booked_loads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own booked loads" ON public.booked_loads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own booked loads" ON public.booked_loads';

    EXECUTE $$
      CREATE POLICY "Users can view own booked loads"
      ON public.booked_loads
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id)
    $$;

    EXECUTE $$
      CREATE POLICY "Users can insert own booked loads"
      ON public.booked_loads
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id)
    $$;

    EXECUTE $$
      CREATE POLICY "Users can update own booked loads"
      ON public.booked_loads
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
    $$;

    EXECUTE $$
      CREATE POLICY "Users can delete own booked loads"
      ON public.booked_loads
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id)
    $$;
  END IF;
END
$$;


-- ==============================
-- Guest sandbox tables: server-only
-- ==============================
ALTER TABLE IF EXISTS public.guest_search_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guest_found_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guest_interested_loads ENABLE ROW LEVEL SECURITY;
