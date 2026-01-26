-- Add min_rpm to search criteria tables
ALTER TABLE search_criteria
ADD COLUMN IF NOT EXISTS min_rpm numeric;

ALTER TABLE guest_search_criteria
ADD COLUMN IF NOT EXISTS min_rpm numeric;

COMMENT ON COLUMN search_criteria.min_rpm IS 'Minimum dollars per mile (RPM)';
COMMENT ON COLUMN guest_search_criteria.min_rpm IS 'Minimum dollars per mile (RPM)';
