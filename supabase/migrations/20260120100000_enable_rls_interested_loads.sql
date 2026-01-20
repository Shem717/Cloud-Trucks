-- Enable RLS for public.interested_loads table
ALTER TABLE public.interested_loads ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own interested loads
CREATE POLICY "Users can view own interested loads"
ON public.interested_loads
FOR SELECT
USING (auth.uid()::text = user_id OR user_id = (current_setting('app.guest_user_id', true)));

-- Create policy: Users can only insert their own interested loads
CREATE POLICY "Users can insert own interested loads"
ON public.interested_loads
FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR user_id = (current_setting('app.guest_user_id', true)));

-- Create policy: Users can only update their own interested loads
CREATE POLICY "Users can update own interested loads"
ON public.interested_loads
FOR UPDATE
USING (auth.uid()::text = user_id OR user_id = (current_setting('app.guest_user_id', true));

-- Create policy: Users can only delete their own interested loads
CREATE POLICY "Users can delete own interested loads"
ON public.interested_loads
FOR DELETE
USING (auth.uid()::text = user_id OR user_id = (current_setting('app.guest_user_id', true)));
