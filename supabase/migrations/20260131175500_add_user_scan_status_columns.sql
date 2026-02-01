-- Add scan tracking columns to search_criteria (user table) to match guest_search_criteria
-- This allows the frontend to show "Last scanned" times for logged-in users

ALTER TABLE search_criteria
ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scan_status TEXT,
ADD COLUMN IF NOT EXISTS scan_error TEXT,
ADD COLUMN IF NOT EXISTS last_scan_loads_found INTEGER;

-- Add index for efficient querying of recent scans if needed later
CREATE INDEX IF NOT EXISTS idx_search_criteria_last_scanned_at ON search_criteria(last_scanned_at);
