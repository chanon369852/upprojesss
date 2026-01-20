import { prisma } from './prisma';
import { TenantRequest } from '../middleware/tenant.middleware';

const looksLikeUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const writeAuditLog = async (params: {
  req?: TenantRequest;
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  before?: any;
  after?: any;
}) => {
  const { req, tenantId, userId, action, entityType, entityId, before, after } = params;

  const safeEntityId = looksLikeUuid(entityId) ? entityId : undefined;

  const changes =
    before !== undefined || after !== undefined
      ? {
          before: before === undefined ? null : before,
          after: after === undefined ? null : after,
          ...(safeEntityId ? {} : { rawEntityId: entityId ?? null }),
        }
      : undefined;

  const userAgent = typeof req?.headers?.['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;

  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? null,
        action,
        entityType: entityType ?? null,
        entityId: safeEntityId,
        changes: changes as any,
        ipAddress: req?.ip,
        userAgent,
      },
    });
  } catch {
    // ignore
  }
};
