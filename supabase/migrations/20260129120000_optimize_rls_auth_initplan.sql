-- Optimize RLS policies to prevent per-row re-evaluation of auth functions
-- Fix: Wrap auth.uid() and current_setting() in subqueries (select ...)
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ==============================
-- cloudtrucks_credentials
-- ==============================
DROP POLICY IF EXISTS "Users can view own credentials" ON public.cloudtrucks_credentials;
DROP POLICY IF EXISTS "Users can insert own credentials" ON public.cloudtrucks_credentials;
DROP POLICY IF EXISTS "Users can update own credentials" ON public.cloudtrucks_credentials;
DROP POLICY IF EXISTS "Users can delete own credentials" ON public.cloudtrucks_credentials;

CREATE POLICY "Users can view own credentials"
ON public.cloudtrucks_credentials
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own credentials"
ON public.cloudtrucks_credentials
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own credentials"
ON public.cloudtrucks_credentials
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own credentials"
ON public.cloudtrucks_credentials
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);


-- ==============================
-- search_criteria
-- ==============================
DROP POLICY IF EXISTS "Users can view own criteria" ON public.search_criteria;
DROP POLICY IF EXISTS "Users can insert own criteria" ON public.search_criteria;
DROP POLICY IF EXISTS "Users can update own criteria" ON public.search_criteria;
DROP POLICY IF EXISTS "Users can delete own criteria" ON public.search_criteria;

CREATE POLICY "Users can view own criteria"
ON public.search_criteria
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own criteria"
ON public.search_criteria
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own criteria"
ON public.search_criteria
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own criteria"
ON public.search_criteria
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);


-- ==============================
-- found_loads
-- ==============================
DROP POLICY IF EXISTS "Users can view own loads" ON public.found_loads;
DROP POLICY IF EXISTS "Users can update own loads" ON public.found_loads;
DROP POLICY IF EXISTS "Users can delete own loads" ON public.found_loads;

CREATE POLICY "Users can view own loads"
ON public.found_loads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.search_criteria sc
    WHERE sc.id = found_loads.criteria_id
      AND sc.user_id = (select auth.uid())
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
      AND sc.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.search_criteria sc
    WHERE sc.id = found_loads.criteria_id
      AND sc.user_id = (select auth.uid())
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
      AND sc.user_id = (select auth.uid())
  )
);


-- ==============================
-- booked_loads
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
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own booked loads" ON public.booked_loads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own booked loads" ON public.booked_loads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own booked loads" ON public.booked_loads';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own booked loads" ON public.booked_loads';

    EXECUTE $$
      CREATE POLICY "Users can view own booked loads"
      ON public.booked_loads
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = user_id)
    $$;

    EXECUTE $$
      CREATE POLICY "Users can insert own booked loads"
      ON public.booked_loads
      FOR INSERT
      TO authenticated
      WITH CHECK ((select auth.uid()) = user_id)
    $$;

    EXECUTE $$
      CREATE POLICY "Users can update own booked loads"
      ON public.booked_loads
      FOR UPDATE
      TO authenticated
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id)
    $$;

    EXECUTE $$
      CREATE POLICY "Users can delete own booked loads"
      ON public.booked_loads
      FOR DELETE
      TO authenticated
      USING ((select auth.uid()) = user_id)
    $$;
  END IF;
END
$$;


-- ==============================
-- load_history
-- ==============================
DROP POLICY IF EXISTS "Users can view their own load history" ON public.load_history;

CREATE POLICY "Users can view their own load history"
ON public.load_history
FOR SELECT
USING (
  criteria_id IN (
    SELECT id FROM public.search_criteria WHERE user_id = (select auth.uid())
  )
);


-- ==============================
-- guest_load_history
-- ==============================
DROP POLICY IF EXISTS "Guests can view their own load history" ON public.guest_load_history;

CREATE POLICY "Guests can view their own load history"
ON public.guest_load_history
FOR SELECT
USING (
  criteria_id IN (
    SELECT id FROM public.guest_search_criteria
    WHERE guest_session = (select current_setting('request.headers', true)::json->>'x-guest-session')
    AND created_at > NOW() - INTERVAL '4 days'
  )
);


-- ==============================
-- interested_loads
-- ==============================
-- Drop both naming variations that may exist
DROP POLICY IF EXISTS "Users can view own interested loads" ON public.interested_loads;
DROP POLICY IF EXISTS "Users can insert own interested loads" ON public.interested_loads;
DROP POLICY IF EXISTS "Users can update own interested loads" ON public.interested_loads;
DROP POLICY IF EXISTS "Users can delete own interested loads" ON public.interested_loads;
DROP POLICY IF EXISTS "Users can view their own interested loads" ON public.interested_loads;
DROP POLICY IF EXISTS "Users can insert their own interested loads" ON public.interested_loads;
DROP POLICY IF EXISTS "Users can update their own interested loads" ON public.interested_loads;
DROP POLICY IF EXISTS "Users can delete their own interested loads" ON public.interested_loads;

CREATE POLICY "Users can view their own interested loads"
ON public.interested_loads
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own interested loads"
ON public.interested_loads
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own interested loads"
ON public.interested_loads
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own interested loads"
ON public.interested_loads
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);


-- ==============================
-- guest_search_criteria
-- ==============================
DROP POLICY IF EXISTS "Guests can view their own search criteria" ON public.guest_search_criteria;
DROP POLICY IF EXISTS "Guests can insert their own search criteria" ON public.guest_search_criteria;
DROP POLICY IF EXISTS "Guests can update their own search criteria" ON public.guest_search_criteria;
DROP POLICY IF EXISTS "Guests can delete their own search criteria" ON public.guest_search_criteria;

CREATE POLICY "Guests can view their own search criteria"
ON public.guest_search_criteria
FOR SELECT
USING (
  guest_session = (select current_setting('request.headers', true)::json->>'x-guest-session')
  AND created_at > NOW() - INTERVAL '4 days'
);

CREATE POLICY "Guests can insert their own search criteria"
ON public.guest_search_criteria
FOR INSERT
WITH CHECK (
  guest_session = (select current_setting('request.headers', true)::json->>'x-guest-session')
);

CREATE POLICY "Guests can update their own search criteria"
ON public.guest_search_criteria
FOR UPDATE
USING (
  guest_session = (select current_setting('request.headers', true)::json->>'x-guest-session')
  AND created_at > NOW() - INTERVAL '4 days'
)
WITH CHECK (
  guest_session = (select current_setting('request.headers', true)::json->>'x-guest-session')
);

CREATE POLICY "Guests can delete their own search criteria"
ON public.guest_search_criteria
FOR DELETE
USING (
  guest_session = (select current_setting('request.headers', true)::json->>'x-guest-session')
  AND created_at > NOW() - INTERVAL '4 days'
);


-- ==============================
-- guest_found_loads
-- ==============================
DROP POLICY IF EXISTS "Guests can view their own found loads" ON public.guest_found_loads;

CREATE POLICY "Guests can view their own found loads"
ON public.guest_found_loads
FOR SELECT
USING (
  criteria_id IN (
    SELECT id FROM public.guest_search_criteria
    WHERE guest_session = (select current_setting('request.headers', true)::json->>'x-guest-session')
    AND created_at > NOW() - INTERVAL '4 days'
  )
);
