-- Create RPC function to increment scan count for loads
-- This is called after upsert to track how many times a load has been rescanned

CREATE OR REPLACE FUNCTION increment_scan_count(
    load_ids TEXT[],
    criteria_id_param UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE found_loads
    SET scan_count = scan_count + 1,
        updated_at = NOW()
    WHERE cloudtrucks_load_id = ANY(load_ids)
      AND criteria_id = criteria_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_scan_count(TEXT[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_scan_count(TEXT[], UUID) TO service_role;

-- Create similar function for guest loads
CREATE OR REPLACE FUNCTION increment_guest_scan_count(
    load_ids TEXT[],
    criteria_id_param UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE guest_found_loads
    SET scan_count = scan_count + 1,
        updated_at = NOW()
    WHERE cloudtrucks_load_id = ANY(load_ids)
      AND criteria_id = criteria_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_guest_scan_count(TEXT[], UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_guest_scan_count(TEXT[], UUID) TO service_role;
