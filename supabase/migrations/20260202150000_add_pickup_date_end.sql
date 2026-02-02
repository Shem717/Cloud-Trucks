ALTER TABLE search_criteria ADD COLUMN IF NOT EXISTS pickup_date_end date;
ALTER TABLE guest_search_criteria ADD COLUMN IF NOT EXISTS pickup_date_end date;
