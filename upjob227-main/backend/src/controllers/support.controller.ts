import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { TenantRequest } from '../middleware/tenant.middleware';
import { AppError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/audit';

export const getSupportStatus = async (req: TenantRequest, res: Response) => {
  const targetTenantId =
    req.userRole === 'super_admin' && typeof (req.query as any)?.tenantId === 'string' && (req.query as any).tenantId.trim()
      ? String((req.query as any).tenantId).trim()
      : req.tenantId;

  const tenant = await (prisma.tenant as any).findUnique({
    where: { id: targetTenantId },
    select: { id: true, supportAccess: true },
  });
  if (!tenant) throw new AppError('Tenant not found', 404);
  res.json({ tenantId: tenant.id, supportAccess: tenant.supportAccess });
};

export const listSupportRequests = async (req: TenantRequest, res: Response) => {
  if (req.userRole !== 'super_admin') throw new AppError('Forbidden', 403);

  const items = await (prisma.tenant as any).findMany({
    where: { supportAccess: 'requested' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      supportAccess: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 500,
  });

  res.json({ items });
};

export const requestSupport = async (req: TenantRequest, res: Response) => {
  if (req.userRole !== 'admin_full') throw new AppError('Forbidden', 403);

  const before = await (prisma.tenant as any).findUnique({
    where: { id: req.tenantId },
    select: { id: true, supportAccess: true },
  });

  const updated = await (prisma.tenant as any).update({
    where: { id: req.tenantId },
    data: { supportAccess: 'requested' },
    select: { id: true, supportAccess: true },
  });

  await writeAuditLog({
    req,
    tenantId: req.tenantId!,
    userId: req.userId || null,
    action: 'support.request',
    entityType: 'Tenant',
    entityId: req.tenantId!,
    before,
    after: updated,
  });

  try {
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'super_admin', isActive: true },
      select: { tenantId: true },
    });
    if (superAdmin?.tenantId) {
      await prisma.integrationNotification.create({
        data: {
          tenantId: superAdmin.tenantId,
          platform: 'system',
          severity: 'warning',
          status: 'open',
          title: 'Support Access Requested',
          reason: `Tenant ${String(req.tenantId)} requested support access`,
          metadata: { tenantId: req.tenantId, requestedBy: req.userId || null },
        },
      });
    }
  } catch {
    // ignore
  }

  res.status(201).json({ tenantId: updated.id, supportAccess: updated.supportAccess });
};

export const revokeSupport = async (req: TenantRequest, res: Response) => {
  if (req.userRole !== 'admin_full') throw new AppError('Forbidden', 403);

  const before = await (prisma.tenant as any).findUnique({
    where: { id: req.tenantId },
    select: { id: true, supportAccess: true },
  });

  const updated = await (prisma.tenant as any).update({
    where: { id: req.tenantId },
    data: { supportAccess: 'denied' },
    select: { id: true, supportAccess: true },
  });

  await writeAuditLog({
    req,
    tenantId: req.tenantId!,
    userId: req.userId || null,
    action: 'support.revoke',
    entityType: 'Tenant',
    entityId: req.tenantId!,
    before,
    after: updated,
  });

  try {
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'super_admin', isActive: true },
      select: { tenantId: true },
    });
    if (superAdmin?.tenantId) {
      await prisma.integrationNotification.create({
        data: {
          tenantId: superAdmin.tenantId,
          platform: 'system',
          severity: 'info',
          status: 'open',
          title: 'Support Access Revoked',
          reason: `Tenant ${String(req.tenantId)} revoked support access`,
          metadata: { tenantId: req.tenantId, revokedBy: req.userId || null },
        },
      });
    }
  } catch {
    // ignore
  }

  res.json({ tenantId: updated.id, supportAccess: updated.supportAccess });
};

export const approveSupport = async (req: TenantRequest, res: Response) => {
  if (req.userRole !== 'super_admin') throw new AppError('Forbidden', 403);

  const targetTenantId = String((req.params as any).tenantId || '').trim();
  if (!targetTenantId) throw new AppError('tenantId is required', 400);

  const before = await (prisma.tenant as any).findUnique({
    where: { id: targetTenantId },
    select: { id: true, supportAccess: true },
  });

  if (!before) throw new AppError('Tenant not found', 404);

  const updated = await (prisma.tenant as any).update({
    where: { id: targetTenantId },
    data: { supportAccess: 'approved' },
    select: { id: true, supportAccess: true },
  });

  await writeAuditLog({
    req,
    tenantId: targetTenantId,
    userId: req.userId || null,
    action: 'support.approve',
    entityType: 'Tenant',
    entityId: targetTenantId,
    before,
    after: updated,
  });

  res.json({ tenantId: updated.id, supportAccess: updated.supportAccess });
};

export const denySupport = async (req: TenantRequest, res: Response) => {
  if (req.userRole !== 'super_admin') throw new AppError('Forbidden', 403);

  const targetTenantId = String((req.params as any).tenantId || '').trim();
  if (!targetTenantId) throw new AppError('tenantId is required', 400);

  const before = await (prisma.tenant as any).findUnique({
    where: { id: targetTenantId },
    select: { id: true, supportAccess: true },
  });

  if (!before) throw new AppError('Tenant not found', 404);

  const updated = await (prisma.tenant as any).update({
    where: { id: targetTenantId },
    data: { supportAccess: 'denied' },
    select: { id: true, supportAccess: true },
  });

  await writeAuditLog({
    req,
    tenantId: targetTenantId,
    userId: req.userId || null,
    action: 'support.deny',
    entityType: 'Tenant',
    entityId: targetTenantId,
    before,
    after: updated,
  });

  res.json({ tenantId: updated.id, supportAccess: updated.supportAccess });
};
