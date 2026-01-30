-- Audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common query patterns
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can write, users can read their own
CREATE POLICY "Service role can insert audit logs"
ON public.audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Users can view own audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.audit_log IS 'Audit log for tracking sensitive operations. Retention: 90 days (manual cleanup via cron).';
