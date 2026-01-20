-- Add multi-state columns to search_criteria table
ALTER TABLE search_criteria
ADD COLUMN IF NOT EXISTS origin_states TEXT[],
ADD COLUMN IF NOT EXISTS destination_states TEXT[];

-- Add index for array queries (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_search_criteria_origin_states ON search_criteria USING GIN (origin_states);
CREATE INDEX IF NOT EXISTS idx_search_criteria_destination_states ON search_criteria USING GIN (destination_states);

-- Comment the columns
COMMENT ON COLUMN search_criteria.origin_states IS 'Array of origin state codes for multi-state region selection';
COMMENT ON COLUMN search_criteria.destination_states IS 'Array of destination state codes for multi-state region selection';
