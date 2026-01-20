-- Enable RLS for public.interested_loads table
ALTER TABLE IF EXISTS public.interested_loads ENABLE ROW LEVEL SECURITY;

-- Policies assume interested_loads.user_id is the authenticated user's UUID.

DROP POLICY IF EXISTS "Users can view own interested loads" ON public.interested_loads;
DROP POLICY IF EXISTS "Users can insert own interested loads" ON public.interested_loads;
DROP POLICY IF EXISTS "Users can update own interested loads" ON public.interested_loads;
DROP POLICY IF EXISTS "Users can delete own interested loads" ON public.interested_loads;

-- Create policy: Users can only see their own interested loads
CREATE POLICY "Users can view own interested loads"
ON public.interested_loads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy: Users can only insert their own interested loads
CREATE POLICY "Users can insert own interested loads"
ON public.interested_loads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can only update their own interested loads
CREATE POLICY "Users can update own interested loads"
ON public.interested_loads
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can only delete their own interested loads
CREATE POLICY "Users can delete own interested loads"
ON public.interested_loads
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
