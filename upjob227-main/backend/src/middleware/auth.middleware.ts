import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.middleware';
import { TenantRequest } from './tenant.middleware';
import { prisma } from '../utils/prisma';
import { writeAuditLog } from '../utils/audit';

// FLOW START: Auth Middleware (EN)
// จุดเริ่มต้น: Middleware ตรวจสอบสิทธิ์ (TH)

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export const authenticate = async (req: TenantRequest, _res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Check if user exists and is active
    const user = (await (prisma.user as any).findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        permissions: true,
        expiresAt: true,
        status: true,
        isActive: true,
        emailVerified: true, // Include email verification status
        createdAt: true,
      },
    })) as any;

    if (!user || !user.isActive) {
      return next(new AppError('User not found or inactive', 401));
    }

    if (!user.emailVerified) {
      return next(new AppError('Email not verified. Please verify your email to continue.', 403));
    }

    const normalizeRole = (raw: any): string => {
      const role = String(raw || '').trim().toLowerCase();
      if (role === 'superadmin' || role === 'super_admin') return 'super_admin';
      if (role === 'admin' || role === 'admin_full' || role === 'adminfull') return 'admin_full';
      if (role === 'admin_test' || role === 'admintest') return 'admintest';
      if (role === 'admin_mess') return 'admin_mess';
      if (role === 'manager') return 'manager';
      if (role === 'user') return 'user';
      if (role === 'viewer') return 'viewer';
      return role;
    };

    let effectiveRole = normalizeRole(user.role);

    if (effectiveRole === 'admintest') {
      const trialMs = 14 * 24 * 60 * 60 * 1000;
      const createdAtMs =
        user.createdAt instanceof Date ? user.createdAt.getTime() : Date.parse(String(user.createdAt));
      const expiresAtMs = user.expiresAt
        ? user.expiresAt instanceof Date
          ? user.expiresAt.getTime()
          : Date.parse(String(user.expiresAt))
        : Number.isFinite(createdAtMs)
          ? createdAtMs + trialMs
          : NaN;

      const expired = Number.isFinite(expiresAtMs) ? Date.now() >= expiresAtMs : false;

      if (expired || user.status === 'expired') {
        effectiveRole = 'viewer';
        try {
          const before = {
            role: user.role,
            status: user.status,
            expiresAt: user.expiresAt,
          };
          await (prisma.user as any).update({
            where: { id: user.id },
            data: {
              role: 'viewer',
              status: 'expired',
              expiresAt: Number.isFinite(expiresAtMs) ? new Date(expiresAtMs) : user.expiresAt,
            },
          });

          await writeAuditLog({
            req,
            tenantId: user.tenantId,
            userId: user.id,
            action: 'user.trial_expired',
            entityType: 'User',
            entityId: user.id,
            before,
            after: {
              role: 'viewer',
              status: 'expired',
              expiresAt: Number.isFinite(expiresAtMs) ? new Date(expiresAtMs) : user.expiresAt,
            },
          });
        } catch {
          // ignore
        }
      } else if (!user.expiresAt && Number.isFinite(expiresAtMs)) {
        try {
          await (prisma.user as any).update({
            where: { id: user.id },
            data: {
              expiresAt: new Date(expiresAtMs),
              status: 'active',
            },
          });
        } catch {
          // ignore
        }
      }
    }

    const allowedRoles = new Set([
      'super_admin',
      'admin_full',
      'admin_mess',
      'admintest',
      'user',
      'manager',
      'viewer',
    ]);
    if (!allowedRoles.has(effectiveRole)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    if (effectiveRole === 'admin_mess') {
      const trialMs = 7 * 24 * 60 * 60 * 1000;
      const createdAtMs = user.createdAt instanceof Date ? user.createdAt.getTime() : Date.parse(String(user.createdAt));
      if (Number.isFinite(createdAtMs)) {
        const expired = Date.now() - createdAtMs >= trialMs;
        if (expired) {
          return next(new AppError('กรุณาติดต่อเพื่อขอใช้สิทธิ์เข้าถึงระบบ', 403));
        }
      }
    }

    // Add user info to request
    req.userId = user.id;
    req.tenantId = user.tenantId;
    req.userRole = effectiveRole;
    req.userPermissions = user.permissions;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

// FLOW END: Auth Middleware (EN)
// จุดสิ้นสุด: Middleware ตรวจสอบสิทธิ์ (TH)
