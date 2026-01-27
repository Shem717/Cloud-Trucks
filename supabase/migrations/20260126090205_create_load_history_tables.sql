-- Create load_history table to preserve historical scan data
-- This allows us to track how load details (price, weather, etc.) change over time

CREATE TABLE IF NOT EXISTS load_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criteria_id UUID NOT NULL REFERENCES search_criteria(id) ON DELETE CASCADE,
    cloudtrucks_load_id TEXT NOT NULL,
    details JSONB NOT NULL,
    status TEXT DEFAULT 'found',
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for efficient queries
    CONSTRAINT load_history_criteria_fkey FOREIGN KEY (criteria_id) REFERENCES search_criteria(id) ON DELETE CASCADE
);

-- Create guest version
CREATE TABLE IF NOT EXISTS guest_load_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criteria_id UUID NOT NULL REFERENCES guest_search_criteria(id) ON DELETE CASCADE,
    cloudtrucks_load_id TEXT NOT NULL,
    details JSONB NOT NULL,
    status TEXT DEFAULT 'found',
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT guest_load_history_criteria_fkey FOREIGN KEY (criteria_id) REFERENCES guest_search_criteria(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_load_history_criteria_load ON load_history(criteria_id, cloudtrucks_load_id);
CREATE INDEX IF NOT EXISTS idx_load_history_scanned_at ON load_history(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_load_history_criteria_load ON guest_load_history(criteria_id, cloudtrucks_load_id);
CREATE INDEX IF NOT EXISTS idx_guest_load_history_scanned_at ON guest_load_history(scanned_at DESC);

-- Enable RLS
ALTER TABLE load_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_load_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for load_history
CREATE POLICY "Users can view their own load history"
    ON load_history FOR SELECT
    USING (
        criteria_id IN (
            SELECT id FROM search_criteria WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for guest_load_history (guests can view during session TTL)
CREATE POLICY "Guests can view their own load history"
    ON guest_load_history FOR SELECT
    USING (
        criteria_id IN (
            SELECT id FROM guest_search_criteria 
            WHERE guest_session = current_setting('request.headers', true)::json->>'x-guest-session'
            AND created_at > NOW() - INTERVAL '4 days'
        )
    );

-- Auto-cleanup: Delete history older than 30 days (keep storage manageable)
CREATE OR REPLACE FUNCTION cleanup_old_load_history()
RETURNS void AS $$
BEGIN
    DELETE FROM load_history WHERE scanned_at < NOW() - INTERVAL '30 days';
    DELETE FROM guest_load_history WHERE scanned_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: You can run this periodically via cron if needed
