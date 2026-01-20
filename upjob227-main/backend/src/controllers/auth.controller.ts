import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { TenantRequest } from '../middleware/tenant.middleware';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';
import { emailService } from '../services/email.service';
import { seedSampleTenantData } from '../services/sampleData.service';

// FLOW START: Auth Controller (EN)
// จุดเริ่มต้น: Controller ของ Auth (TH)

// Generate JWT token
const generateToken = (userId: string, tenantId: string, email: string, role: string) => {
  return jwt.sign({ userId, tenantId, email, role }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

// Register
export const register = async (req: TenantRequest, res: Response) => {
  const { email, password, firstName, lastName, tenantId, tenantSlug } = req.body;
  const resolvedTenantId = tenantId || process.env.DEFAULT_TENANT_ID;
  const resolvedTenantSlug = tenantSlug || process.env.DEFAULT_TENANT_SLUG;

  const existingEmailGlobal = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
  if (existingEmailGlobal) {
    throw new AppError('User already exists', 409);
  }

  // Find tenant by ID or slug
  let tenant;
  if (resolvedTenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: resolvedTenantId },
    });
  } else if (resolvedTenantSlug) {
    tenant = await prisma.tenant.findUnique({
      where: { slug: resolvedTenantSlug },
    });
  } else {
    const baseRaw = String(email || '').split('@')[0] || 'tenant';
    const base = baseRaw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 30);

    let slug = '';
    for (let i = 0; i < 5; i += 1) {
      const suffix = Math.random().toString(36).slice(2, 8);
      const candidate = `${base || 'tenant'}-${suffix}`;
      // eslint-disable-next-line no-await-in-loop
      const exists = await prisma.tenant.findUnique({ where: { slug: candidate } });
      if (!exists) {
        slug = candidate;
        break;
      }
    }

    if (!slug) {
      throw new AppError('Failed to create tenant', 500);
    }

    tenant = await prisma.tenant.create({
      data: {
        name: String(email || 'Tenant'),
        slug,
      },
    });
  }

  if (!tenant) {
    throw new AppError(
      process.env.NODE_ENV !== 'production'
        ? 'Tenant not found. Please create a tenant first or set DEFAULT_TENANT_SLUG in backend .env'
        : 'Tenant not found',
      404,
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Create user
  const signupRole = 'admintest';
  const user = await (prisma.user as any).create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      tenantId: tenant.id,
      role: signupRole, // Self-registration default role
      status: 'active',
      expiresAt,
      emailVerified: false,
    },
  });

  try {
    await prisma.tenantSetting.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: `trial:admintest:${user.id}`,
        },
      },
      create: {
        tenantId: tenant.id,
        key: `trial:admintest:${user.id}`,
        value: {
          startedAt: startedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      },
      update: {},
    });
  } catch {
    // ignore
  }

  try {
    await prisma.integration.createMany({
      data: [
        { tenantId: tenant.id, provider: 'googleads', type: 'googleads', name: 'Google Ads Integration', credentials: {}, config: {}, isActive: false },
        { tenantId: tenant.id, provider: 'facebook', type: 'facebook', name: 'Facebook Integration', credentials: {}, config: {}, isActive: false },
        { tenantId: tenant.id, provider: 'line', type: 'line', name: 'LINE OA Integration', credentials: {}, config: {}, isActive: false },
        { tenantId: tenant.id, provider: 'tiktok', type: 'tiktok', name: 'TikTok Integration', credentials: {}, config: {}, isActive: false },
      ],
      skipDuplicates: true,
    });
  } catch {
    // ignore
  }

  try {
    const enableSeed =
      String(
        process.env.ADMINTEST_AUTO_SEED_SAMPLE_DATA ||
          process.env.ADMINTESТ_AUTO_SEED_SAMPLE_DATA ||
          '',
      ).toLowerCase() === 'true';
    if (enableSeed && signupRole === 'admintest') {
      await seedSampleTenantData(tenant.id);
    }
  } catch {
    // ignore
  }

  // Generate verification token (valid for 24 hours)
  const verificationToken = jwt.sign(
    { userId: user.id, email: user.email, type: 'email_verification' },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' },
  );

  // Send verification email
  try {
    await emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.firstName || undefined,
    );
  } catch (error: any) {
    // Log error but don't fail registration
    console.error('Failed to send verification email:', error);
  }

  res.status(201).json({
    message: 'User registered successfully. Please check your email to verify your account.',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      emailVerified: user.emailVerified,
    },
    verificationToken: process.env.NODE_ENV !== 'production' ? verificationToken : undefined,
  });
};

// Login
export const login = async (req: TenantRequest, res: Response): Promise<void> => {
  const { email, password, tenantId, tenantSlug } = req.body;

  // Find tenant by ID or slug
  let tenant;
  if (tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
  } else if (tenantSlug) {
    tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
  }

  // Find user
  // - If tenant is provided, authenticate within that tenant.
  // - If tenant is NOT provided, authenticate by email+password across tenants.
  let user = null as null | {
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    tenantId: string;
    firstName: string | null;
    lastName: string | null;
    emailVerified: boolean;
    createdAt: Date;
    expiresAt?: Date | null;
    status?: string;
  };

  if (tenantId || tenantSlug) {
    if (!tenant) {
      throw new AppError('Invalid credentials', 401);
    }

    user = await prisma.user.findFirst({
      where: {
        email,
        tenantId: tenant.id,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }
  } else {
    const candidates = await prisma.user.findMany({
      where: {
        email,
        isActive: true,
      },
    });

    if (!candidates.length) {
      throw new AppError('Invalid credentials', 401);
    }

    const matched: any[] = [];
    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await bcrypt.compare(password, candidate.passwordHash);
      if (ok) matched.push(candidate);
    }

    if (matched.length > 1) {
      throw new AppError('Tenant is required', 400);
    }

    if (matched.length === 1) {
      user = matched[0];
    }

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
  }

  // Require email verification
  if (!user.emailVerified) {
    res.status(403).json({
      message: 'Email not verified. Please verify your email to continue.',
      requiresEmailVerification: true,
    });
    return;
  }

  let effectiveRole = user.role;

  if (effectiveRole === 'admintest') {
    const trialMs = 14 * 24 * 60 * 60 * 1000;
    const createdAtMs = user.createdAt instanceof Date ? user.createdAt.getTime() : Date.parse(String(user.createdAt));
    const expiresAtMs = user.expiresAt
      ? user.expiresAt instanceof Date
        ? user.expiresAt.getTime()
        : Date.parse(String(user.expiresAt))
      : Number.isFinite(createdAtMs)
        ? createdAtMs + trialMs
        : NaN;

    const expired = Number.isFinite(expiresAtMs) ? Date.now() >= expiresAtMs : false;
    const status = typeof (user as any).status === 'string' ? String((user as any).status) : undefined;

    if (expired || status === 'expired') {
      effectiveRole = 'viewer';
      try {
        await (prisma.user as any).update({
          where: { id: user.id },
          data: {
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
          data: { expiresAt: new Date(expiresAtMs), status: 'active' },
        });
      } catch {
        // ignore
      }
    }
  }

  // admintest: by default do not auto-seed data. Dashboard should show 0/empty until setup.

  if (user.role === 'admin_mess') {
    const trialMs = 7 * 24 * 60 * 60 * 1000;
    const createdAtMs = user.createdAt instanceof Date ? user.createdAt.getTime() : Date.parse(String(user.createdAt));
    if (Number.isFinite(createdAtMs)) {
      const expired = Date.now() - createdAtMs >= trialMs;
      if (expired) {
        res.status(403).json({
          message: 'กรุณาติดต่อเพื่อขอใช้สิทธิ์เข้าถึงระบบ',
        });
        return;
      }
    }
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate token
  const token = generateToken(user.id, user.tenantId, user.email, effectiveRole);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: effectiveRole,
      tenantId: user.tenantId,
      emailVerified: user.emailVerified, // Include verification status
    },
    ...(user.emailVerified
      ? {}
      : {
          warning: 'Please verify your email to access all features',
        }),
  });
  return;
};

// Get current user
export const getCurrentUser = async (req: TenantRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      tenantId: true,
      createdAt: true,
      expiresAt: true,
      status: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return res.json({ user });
};

// Refresh token
export const refreshToken = async (req: TenantRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token required', 401);
    }

    const token = authHeader.substring(7);

    // Verify token (even if expired, we can still decode it)
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', {
        ignoreExpiration: true, // Allow expired tokens for refresh
      });
    } catch (error) {
      throw new AppError('Invalid token', 401);
    }

    // Check if user still exists and is active
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        tenantId: decoded.tenantId,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('User not found or inactive', 401);
    }

    // Generate new token
    const newToken = generateToken(user.id, user.tenantId, user.email, user.role);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to refresh token', 500);
  }
};

// Forgot password
export const forgotPassword = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findFirst({
      where: { email },
      include: { tenant: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({
        message: 'If an account with this email exists, a password reset link has been sent.',
      });
      return;
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName || undefined,
      );
    } catch (error: any) {
      console.error('Failed to send password reset email:', error);
      // Still return success to prevent email enumeration
    }

    res.json({
      message: 'If an account with this email exists, a password reset link has been sent.',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined, // Only in dev mode
      resetUrl:
        process.env.NODE_ENV === 'development'
          ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
          : undefined,
    });
    return;
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Reset password
export const resetPassword = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    // Verify reset token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, email: decoded.email },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid reset token' });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    res.json({ message: 'Password reset successfully' });
    return;
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Verify email
export const verifyEmail = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

      // Check token type
      if (decoded.type !== 'email_verification') {
        throw new AppError('Invalid token type', 400);
      }
    } catch (error) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        email: decoded.email,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if already verified
    if (user.emailVerified) {
      const authToken = generateToken(user.id, user.tenantId, user.email, user.role);
      res.json({
        message: 'Email already verified',
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
          emailVerified: user.emailVerified,
        },
      });
      return;
    }

    // Update user to verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        role: user.role === 'manager' ? 'viewer' : user.role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        role: true,
        tenantId: true,
      },
    });

    const authToken = generateToken(
      updatedUser.id,
      updatedUser.tenantId,
      updatedUser.email,
      updatedUser.role,
    );

    res.json({
      message: 'Email verified successfully',
      token: authToken,
      user: updatedUser,
    });
    return;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to verify email', 500);
  }
};

// Resend verification email
export const resendVerificationEmail = async (
  req: TenantRequest,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({
        message: 'If an account with this email exists, a verification email has been sent.',
      });
      return;
    }

    // Check if already verified
    if (user.emailVerified) {
      res.json({
        message: 'Email is already verified',
      });
      return;
    }

    // Generate new verification token
    const verificationToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'email_verification' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' },
    );

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName || undefined,
      );
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
    }

    res.json({
      message: 'If an account with this email exists, a verification email has been sent.',
      verificationToken: process.env.NODE_ENV !== 'production' ? verificationToken : undefined,
    });
    return;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to resend verification email', 500);
  }
};

// Logout
export const logout = async (_req: TenantRequest, res: Response): Promise<void> => {
  // Implement logout logic (invalidate token/session)
  res.json({ message: 'Logout successful' });
  return;
};

// FLOW END: Auth Controller (EN)
// จุดสิ้นสุด: Controller ของ Auth (TH)
