import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.middleware';
import { getRolePermissions, type Permission } from '../constants/rbac';
import { prisma } from '../utils/prisma';

// FLOW START: Tenant Middleware (EN)
// จุดเริ่มต้น: Middleware จัดการ Tenant (TH)

export interface TenantRequest extends Request {
  tenantId?: string;
  userId?: string;
  userRole?: string;
  userPermissions?: any;
}

export const tenantMiddleware = async (req: TenantRequest, _res: Response, next: NextFunction) => {
  // Allow public OAuth callbacks without tenant context.
  // These requests originate from external providers and won't include x-tenant-id or Bearer tokens.
  if (
    req.method === 'GET' &&
    (req.originalUrl.includes('/api/v1/integrations/oauth/callback') ||
      req.originalUrl.includes('/api/v1/integrations/') && req.originalUrl.includes('/oauth/callback'))
  ) {
    next();
    return;
  }

  // Resolve tenantId
  // Priority:
  // 1) tenantId already set on req (e.g. by authenticate)
  // 2) if Bearer token exists, derive tenantId from JWT (prevents spoofing)
  //    - allow super_admin to override with explicit x-tenant-id/body.tenantId
  // 3) fall back to x-tenant-id/body.tenantId (legacy)

  const headerTenantId = (req.headers['x-tenant-id'] as string) || undefined;
  const bodyTenantId = (req.body?.tenantId as string) || undefined;
  const explicitTenantId = (headerTenantId || bodyTenantId)?.toString();

  const authHeader = req.headers.authorization;
  const hasBearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');

  let tenantId = req.tenantId;

  if (!tenantId && hasBearer) {
    const token = (authHeader as string).substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const tokenTenantId = decoded?.tenantId ? String(decoded.tenantId) : undefined;
      const tokenRole = decoded?.role ? String(decoded.role) : undefined;
      const tokenUserId = decoded?.userId ? String(decoded.userId) : undefined;

      if (tokenTenantId) {
        if (explicitTenantId && explicitTenantId !== tokenTenantId) {
          if (tokenRole === 'super_admin') {
            try {
              const tenant = await (prisma.tenant as any).findUnique({
                where: { id: explicitTenantId },
                select: { supportAccess: true },
              });
              const supportAccess = tenant?.supportAccess ? String(tenant.supportAccess) : 'denied';
              if (supportAccess !== 'approved' && supportAccess !== 'requested') {
                return next(new AppError('Support access not approved', 403));
              }
            } catch {
              return next(new AppError('Support access not approved', 403));
            }
            tenantId = explicitTenantId;
          } else {
            if (tokenUserId && explicitTenantId) {
              prisma.user
                .findUnique({ where: { id: tokenUserId }, select: { tenantId: true } })
                .then((u) => {
                  if (u && String(u.tenantId) === explicitTenantId) {
                    req.tenantId = explicitTenantId;
                    next();
                    return;
                  }
                  next(new AppError('Tenant ID mismatch', 403));
                })
                .catch(() => next(new AppError('Tenant ID mismatch', 403)));
              return;
            }
            return next(new AppError('Tenant ID mismatch', 403));
          }
        } else {
          tenantId = tokenTenantId;
        }
      }
    } catch {
      return next(new AppError('Invalid token', 401));
    }
  }

  if (!tenantId) {
    tenantId = explicitTenantId;
  }

  if (!tenantId) {
    return next(new AppError('Tenant ID is required', 400));
  }

  // Add tenant ID to request
  req.tenantId = tenantId;

  next();
};

export const requireRole = (roles: string[]) => {
  return (req: TenantRequest, _res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};

export const selfOrRoles = (paramKey: string, roles: string[]) => {
  return (req: TenantRequest, _res: Response, next: NextFunction) => {
    const targetId = req.params?.[paramKey];
    if (targetId && req.userId === targetId) return next();
    if (req.userRole && roles.includes(req.userRole)) return next();
    return next(new AppError('Insufficient permissions', 403));
  };
};

export const requireAnyRole = (roles: string[]) => {
  return (req: TenantRequest, _res: Response, next: NextFunction) => {
    if (req.userRole && roles.includes(req.userRole)) return next();
    return next(new AppError('Insufficient permissions', 403));
  };
};

export const requirePermission = (perm: Permission) => {
  return (req: TenantRequest, _res: Response, next: NextFunction) => {
    const base = getRolePermissions(req.userRole);
    const userPerms = (req.userPermissions as any) || {};
    const allow = Array.isArray(userPerms.allow) ? (userPerms.allow as any[]).map(String) : [];
    const deny = Array.isArray(userPerms.deny) ? (userPerms.deny as any[]).map(String) : [];
    const effective = Array.from(new Set([...base, ...allow])).filter((p) => !deny.includes(p));
    if (effective.includes(perm)) return next();
    return next(new AppError('Insufficient permissions', 403));
  };
};

export const requireAnyPermission = (required: Permission[]) => {
  return (req: TenantRequest, _res: Response, next: NextFunction) => {
    const base = getRolePermissions(req.userRole);
    const userPerms = (req.userPermissions as any) || {};
    const allow = Array.isArray(userPerms.allow) ? (userPerms.allow as any[]).map(String) : [];
    const deny = Array.isArray(userPerms.deny) ? (userPerms.deny as any[]).map(String) : [];
    const effective = Array.from(new Set([...base, ...allow])).filter((p) => !deny.includes(p));
    if (required.some((perm) => effective.includes(perm))) return next();
    return next(new AppError('Insufficient permissions', 403));
  };
};

// FLOW END: Tenant Middleware (EN)
// จุดสิ้นสุด: Middleware จัดการ Tenant (TH)
