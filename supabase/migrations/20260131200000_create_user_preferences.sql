-- User preferences table for storing user-level settings
-- Includes sorting defaults, load preferences, location preferences, and backhaul settings

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Sorting Preferences
    default_sort TEXT DEFAULT 'newest',

    -- Load Preferences (global defaults for new search criteria)
    preferred_min_rate NUMERIC,
    preferred_min_rpm NUMERIC,
    preferred_max_weight INTEGER,
    preferred_min_weight INTEGER,
    preferred_equipment_type TEXT,
    preferred_booking_type TEXT,
    preferred_pickup_distance INTEGER DEFAULT 50,

    -- Location Preferences
    home_city TEXT,
    home_state TEXT,
    preferred_destination_states TEXT[],  -- For backhaul targeting
    avoid_states TEXT[],

    -- Backhaul Settings
    auto_suggest_backhauls BOOLEAN DEFAULT true,
    backhaul_max_deadhead INTEGER DEFAULT 100,
    backhaul_min_rpm NUMERIC DEFAULT 2.00,

    -- Fuel Settings (migrate from localStorage)
    fuel_mpg NUMERIC DEFAULT 6.5,
    fuel_price_per_gallon NUMERIC DEFAULT 3.80,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own preferences
CREATE POLICY "Users can view own preferences"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON public.user_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.user_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
ON public.user_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION update_user_preferences_timestamp();

-- Add comment for documentation
COMMENT ON TABLE public.user_preferences IS 'User-level preferences including sorting defaults, load criteria, location preferences, and backhaul settings.';
