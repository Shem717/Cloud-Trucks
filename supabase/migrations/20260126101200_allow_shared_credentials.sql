-- Allow shared credentials by making user_id nullable
ALTER TABLE cloudtrucks_credentials
ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint: either user_id is set (user credential) OR it's null (shared credential)
-- This is implicitly satisfied, but we can add a comment for clarity
COMMENT ON COLUMN cloudtrucks_credentials.user_id IS 
'User ID for personal credentials. NULL for shared demo credentials used by guest sessions.';

-- Create index for faster lookup of shared credentials
CREATE INDEX IF NOT EXISTS idx_cloudtrucks_credentials_shared 
ON cloudtrucks_credentials(last_validated_at DESC) 
WHERE user_id IS NULL AND is_valid = true;
