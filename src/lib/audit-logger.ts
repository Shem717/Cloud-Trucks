import { createAdminClient } from '@/utils/supabase/admin';

export type AuditAction =
  | 'credentials.created'
  | 'credentials.updated'
  | 'credentials.deleted'
  | 'booking.created'
  | 'booking.deleted'
  | 'criteria.created'
  | 'criteria.updated'
  | 'criteria.deleted'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_reset'
  | 'guest.cleanup';

export type AuditLogEntry = {
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from('audit_log').insert({
      user_id: entry.userId || null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      details: entry.details || {},
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
    });

    if (error) {
      console.error('Failed to log audit entry:', error);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

// Helper to extract request metadata
export function getRequestMetadata(request: Request): Pick<AuditLogEntry, 'ipAddress' | 'userAgent'> {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim(),
    userAgent: request.headers.get('user-agent') || undefined,
  };
}
