import { Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { writeAuditLog } from '../utils/audit';

// FLOW START: Users Controller (EN)
// จุดเริ่มต้น: Controller ของ Users (TH)

const sanitizeUser = (u: any) => {
  if (!u) return u;
  const { passwordHash: _passwordHash, ...rest } = u;
  return rest;
};

const canAssignRole = (actorRole: string | undefined, targetRole: string): boolean => {
  // Default: no permissions
  if (!actorRole) return false;

  // Super admin can assign anything
  if (actorRole === 'super_admin') return true;

  // Admin full can assign manager/viewer only
  if (actorRole === 'admin_full') {
    return targetRole === 'manager' || targetRole === 'viewer';
  }

  // Admin mess can assign manager/viewer only
  if (actorRole === 'admin_mess') {
    return targetRole === 'manager' || targetRole === 'viewer';
  }

  // Admin test can assign manager/viewer only
  if (actorRole === 'admintest') {
    return targetRole === 'manager' || targetRole === 'viewer';
  }

  // Manager can assign viewer only
  if (actorRole === 'manager') {
    return targetRole === 'viewer';
  }

  // Viewer cannot assign roles
  return false;
};

const canManageTarget = (actorRole: string | undefined, targetRole: string): boolean => {
  if (!actorRole) return false;
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'admin_full') return targetRole === 'manager' || targetRole === 'viewer';
  if (actorRole === 'admin_mess') return targetRole === 'manager' || targetRole === 'viewer';
  if (actorRole === 'manager') return targetRole === 'viewer';
  return false;
};

const buildListUsersVisibilityWhere = (actorRole: string | undefined, actorUserId: string | undefined) => {
  if (!actorRole) return { id: actorUserId || '__none__' };
  if (actorRole === 'super_admin') return {};
  if (actorRole === 'admin_full') {
    return {
      OR: [{ id: actorUserId || '__none__' }, { role: { in: ['manager', 'viewer'] } }],
    };
  }
  if (actorRole === 'admin_mess') {
    return {
      OR: [{ id: actorUserId || '__none__' }, { role: { in: ['manager', 'viewer'] } }],
    };
  }
  if (actorRole === 'manager') {
    return {
      OR: [{ id: actorUserId || '__none__' }, { role: 'viewer' }],
    };
  }
  return { id: actorUserId || '__none__' };
};

const canViewTarget = (actorRole: string | undefined, actorUserId: string | undefined, targetUser: any): boolean => {
  if (!targetUser) return false;
  if (actorUserId && targetUser.id === actorUserId) return true;
  if (!actorRole) return false;
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'admin_full') return targetUser.role === 'manager' || targetUser.role === 'viewer';
  if (actorRole === 'admin_mess') return targetUser.role === 'manager' || targetUser.role === 'viewer';
  if (actorRole === 'manager') return targetUser.role === 'viewer';
  return false;
};

export const listUsers = async (req: TenantRequest, res: Response) => {
  const { page = 1, limit = 20, search, role, isActive } = req.query;

  // Build where clause
  const where: any = { tenantId: req.tenantId! };

  const visibilityWhere = buildListUsersVisibilityWhere(req.userRole, req.userId);
  if (Object.keys(visibilityWhere).length) {
    where.AND = [...(where.AND || []), visibilityWhere];
  }

  if (search) {
    where.OR = [
      { email: { contains: search as string, mode: 'insensitive' } },
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role as string;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        sessions: { select: { id: true, lastActivityAt: true } },
        reports: { select: { id: true } },
        aiQueries: { select: { id: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    users: users.map(sanitizeUser),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
};

export const getUserById = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.findFirst({
    where: { id, tenantId: req.tenantId! },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      sessions: true,
    },
  });
  if (!user) throw new AppError('User not found', 404);

  if (!canViewTarget(req.userRole, req.userId, user)) {
    throw new AppError('Insufficient permissions', 403);
  }
  res.json({ user: sanitizeUser(user) });
};

export const createUser = async (req: TenantRequest, res: Response) => {
  const { email, password, firstName, lastName, role, permissions } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const exists = await prisma.user.findFirst({ where: { email, tenantId: req.tenantId! } });
  if (exists) throw new AppError('User already exists', 409);

  const passwordHash = await bcrypt.hash(password, 10);

  const desiredRole = (role || 'viewer') as string;
  if (!canAssignRole(req.userRole, desiredRole)) {
    throw new AppError('Insufficient permissions', 403);
  }

  const user = await (prisma.user as any).create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: desiredRole,
      permissions:
        req.userRole === 'super_admin' || req.userRole === 'admin_full'
          ? (typeof permissions === 'object' && permissions !== null ? permissions : {})
          : {},
      tenantId: req.tenantId!,
      emailVerified: true,
    },
  });

  await writeAuditLog({
    req,
    tenantId: req.tenantId!,
    userId: req.userId || null,
    action: 'user.create',
    entityType: 'User',
    entityId: user.id,
    before: null,
    after: sanitizeUser(user),
  });

  res.status(201).json({ user: sanitizeUser(user) });
};

export const updateUser = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  const { password, ...rest } = req.body || {};

  const data: any = { ...rest };

  // Only super_admin can change tenantId explicitly.
  if (req.userRole !== 'super_admin') {
    delete data.tenantId;
  }

  // Self-update guard: users can update their own profile, but cannot self-escalate privileges
  const isSelf = Boolean(req.userId && req.userId === id);
  if (isSelf) {
    delete data.role;
    delete data.tenantId;
    delete data.isActive;
    delete data.emailVerified;
    delete data.adminType;
    delete data.permissions;
  }

  if (typeof data.permissions !== 'undefined') {
    if (req.userRole !== 'super_admin' && req.userRole !== 'admin_full') {
      delete data.permissions;
    }
    if (typeof data.permissions !== 'object' || data.permissions === null) {
      delete data.permissions;
    }
  }

  if (typeof data.role === 'string' && data.role.trim()) {
    if (!canAssignRole(req.userRole, data.role)) {
      throw new AppError('Insufficient permissions', 403);
    }
  }
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const existing =
    req.userRole === 'super_admin'
      ? await prisma.user.findUnique({ where: { id } })
      : await prisma.user.findFirst({ where: { id, tenantId: req.tenantId! } });
  if (!existing) throw new AppError('User not found', 404);

  if (!isSelf && !canManageTarget(req.userRole, existing.role)) {
    throw new AppError('Insufficient permissions', 403);
  }

  // Super admin promotion: when setting role to admin_full, create a dedicated tenant and move the user.
  if (
    req.userRole === 'super_admin' &&
    typeof data.role === 'string' &&
    data.role === 'admin_full' &&
    existing.role !== 'admin_full'
  ) {
    const sourceTenantId = String((existing as any).tenantId);
    const [pendingIntegrationSetups, pendingJsonImports] = await Promise.all([
      prisma.tenantSetting.findMany({
        where: {
          tenantId: sourceTenantId,
          key: { startsWith: 'pending_integration_setup:' },
        },
        select: { id: true, key: true, value: true },
      }),
      prisma.tenantSetting.findMany({
        where: {
          tenantId: sourceTenantId,
          key: { startsWith: 'pending_json_import:' },
        },
        select: { id: true, key: true, value: true },
      }),
    ]);

    const makeSlugBase = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);

    const rand = () => Math.random().toString(36).slice(2, 8);

    const email = typeof (existing as any).email === 'string' ? String((existing as any).email) : '';
    const base = makeSlugBase(email.split('@')[0] || 'workspace') || 'workspace';

    let slug = `${base}-${rand()}`;
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const found = await prisma.tenant.findUnique({ where: { slug } });
      if (!found) break;
      slug = `${base}-${rand()}`;
    }

    const displayName =
      `${String((existing as any).firstName || '').trim()} ${String((existing as any).lastName || '').trim()}`.trim() ||
      (email ? `${email} Workspace` : `Workspace ${slug}`);

    const tenant = await prisma.tenant.create({
      data: {
        name: displayName,
        slug,
      },
    });

    data.tenantId = tenant.id;

    // Apply pending setup/json from source tenant into newly created tenant.
    try {
      const targetTenantId = tenant.id;

      await prisma.$transaction(async (tx) => {
        for (const row of pendingIntegrationSetups) {
          const value = (row.value as any) || {};
          const provider =
            typeof value?.provider === 'string' && value.provider.trim() ? value.provider.trim() : String(row.key).split(':').slice(-1)[0];
          const type = typeof value?.type === 'string' && value.type.trim() ? value.type.trim() : provider;
          const credentials = value?.credentials ?? {};
          const config = value?.config ?? {};

          const existingIntegration = await tx.integration.findFirst({
            where: {
              tenantId: targetTenantId,
              provider,
            },
            orderBy: { createdAt: 'desc' },
          });

          if (existingIntegration) {
            await tx.integration.update({
              where: { id: existingIntegration.id },
              data: {
                type,
                name: existingIntegration.name || `${provider} Integration`,
                credentials: credentials as any,
                config: config as any,
              },
            });
          } else {
            await tx.integration.create({
              data: {
                tenantId: targetTenantId,
                provider,
                type,
                name: `${provider} Integration`,
                credentials: credentials as any,
                config: config as any,
                status: 'active',
                isActive: false,
              },
            });
          }

          await tx.tenantSetting.deleteMany({
            where: { tenantId: sourceTenantId, id: row.id },
          });
        }

        for (const row of pendingJsonImports) {
          const value = (row.value as any) || {};
          const name = typeof value?.name === 'string' ? value.name : null;
          const dataPayload = value?.data ?? value;
          const importedAt = typeof value?.importedAt === 'string' ? value.importedAt : new Date().toISOString();

          await tx.tenantSetting.create({
            data: {
              tenantId: targetTenantId,
              key: `json_import:${crypto.randomUUID()}`,
              value: {
                name,
                data: dataPayload,
                importedAt,
              },
            },
          });

          await tx.tenantSetting.deleteMany({
            where: { tenantId: sourceTenantId, id: row.id },
          });
        }
      });
    } catch {
      // ignore
    }
  }

  if (req.userRole === 'super_admin') {
    await (prisma.user as any).update({ where: { id }, data });
  } else {
    const updated = await prisma.user.updateMany({ where: { id, tenantId: req.tenantId! }, data });
    if (!updated.count) throw new AppError('User not found', 404);
  }

  const user = await prisma.user.findFirst({ where: { id, tenantId: req.tenantId! } });
  if (!user) throw new AppError('User not found', 404);

  await writeAuditLog({
    req,
    tenantId: String((existing as any).tenantId),
    userId: req.userId || null,
    action: 'user.update',
    entityType: 'User',
    entityId: id,
    before: sanitizeUser(existing),
    after: sanitizeUser(user),
  });

  if (
    req.userRole === 'super_admin' &&
    typeof data.role === 'string' &&
    data.role === 'admin_full' &&
    existing.role !== 'admin_full'
  ) {
    try {
      await prisma.integrationNotification.updateMany({
        where: {
          tenantId: existing.tenantId,
          platform: 'system',
          title: 'Admin Full Upgrade Request',
          status: 'open',
        },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        },
      });
    } catch {
      // ignore
    }
  }

  res.json({ user: sanitizeUser(user) });
};

export const deleteUser = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.user.findFirst({ where: { id, tenantId: req.tenantId! } });
  if (!existing) throw new AppError('User not found', 404);

  if (!canManageTarget(req.userRole, existing.role)) {
    throw new AppError('Insufficient permissions', 403);
  }

  const deleted = await prisma.user.deleteMany({ where: { id, tenantId: req.tenantId! } });
  if (!deleted.count) throw new AppError('User not found', 404);

  await writeAuditLog({
    req,
    tenantId: req.tenantId!,
    userId: req.userId || null,
    action: 'user.delete',
    entityType: 'User',
    entityId: id,
    before: sanitizeUser(existing),
    after: null,
  });
  res.json({ message: 'User deleted' });
};

export const changePassword = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword) throw new AppError('New password required', 400);

  if (req.userId === id && !currentPassword) {
    throw new AppError('Current password required', 400);
  }

  const user = await prisma.user.findFirst({ where: { id, tenantId: req.tenantId! } });
  if (!user) throw new AppError('User not found', 404);
  if (currentPassword) {
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new AppError('Current password incorrect', 401);
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.updateMany({
    where: { id, tenantId: req.tenantId! },
    data: { passwordHash },
  });
  if (!updated.count) throw new AppError('User not found', 404);
  res.json({ message: 'Password updated' });
};

// FLOW END: Users Controller (EN)
// จุดสิ้นสุด: Controller ของ Users (TH)
