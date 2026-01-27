-- Add update tracking fields to found_loads and guest_found_loads
-- This enables us to track when loads were last updated and how many times they've been scanned

-- Add update tracking to found_loads
ALTER TABLE found_loads
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 1;

-- Add update tracking to guest_found_loads
ALTER TABLE guest_found_loads
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 1;

-- Create indexes for performance on updated_at (for sorting by freshness)
CREATE INDEX IF NOT EXISTS idx_found_loads_updated_at ON found_loads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_found_loads_updated_at ON guest_found_loads(updated_at DESC);

-- Add composite index for efficient deduplication queries
CREATE INDEX IF NOT EXISTS idx_found_loads_dedup ON found_loads(cloudtrucks_load_id, criteria_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_found_loads_dedup ON guest_found_loads(cloudtrucks_load_id, criteria_id, updated_at DESC);

-- Update existing rows to have initial values
UPDATE found_loads SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE guest_found_loads SET updated_at = created_at WHERE updated_at IS NULL;
