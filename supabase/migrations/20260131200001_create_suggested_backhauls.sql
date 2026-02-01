-- Suggested backhauls table for storing pre-computed backhaul suggestions
-- Links to saved loads and caches search results for quick display

CREATE TABLE IF NOT EXISTS public.suggested_backhauls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Reference to the saved load this backhaul is for
    saved_load_id UUID NOT NULL,
    saved_load_cloudtrucks_id TEXT NOT NULL,

    -- Backhaul route (fronthaul destination -> preferred states)
    origin_city TEXT NOT NULL,
    origin_state TEXT NOT NULL,
    target_states TEXT[],  -- Which preferred states were searched

    -- Results cache
    loads_found INTEGER DEFAULT 0,
    best_rate NUMERIC,
    best_rpm NUMERIC,
    avg_rate NUMERIC,
    avg_rpm NUMERIC,
    top_loads JSONB,  -- Top 3-5 backhaul loads for quick display

    -- Status tracking
    status TEXT DEFAULT 'pending',  -- pending, searching, found, no_results, expired
    last_searched_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT suggested_backhauls_unique UNIQUE (user_id, saved_load_cloudtrucks_id)
);

-- Create indexes for common query patterns
CREATE INDEX idx_suggested_backhauls_user_id ON public.suggested_backhauls(user_id);
CREATE INDEX idx_suggested_backhauls_saved_load ON public.suggested_backhauls(saved_load_cloudtrucks_id);
CREATE INDEX idx_suggested_backhauls_status ON public.suggested_backhauls(status);
CREATE INDEX idx_suggested_backhauls_expires ON public.suggested_backhauls(expires_at);

-- Enable RLS
ALTER TABLE public.suggested_backhauls ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own backhaul suggestions
CREATE POLICY "Users can view own backhaul suggestions"
ON public.suggested_backhauls
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backhaul suggestions"
ON public.suggested_backhauls
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backhaul suggestions"
ON public.suggested_backhauls
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own backhaul suggestions"
ON public.suggested_backhauls
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role can also manage (for cron jobs)
CREATE POLICY "Service role can manage backhaul suggestions"
ON public.suggested_backhauls
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_suggested_backhauls_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suggested_backhauls_updated_at
BEFORE UPDATE ON public.suggested_backhauls
FOR EACH ROW EXECUTE FUNCTION update_suggested_backhauls_timestamp();

-- Add comment for documentation
COMMENT ON TABLE public.suggested_backhauls IS 'Pre-computed backhaul suggestions for saved loads. Caches search results for quick display in the UI.';
