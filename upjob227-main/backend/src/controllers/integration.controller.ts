import { Response } from 'express';
import { TenantRequest } from '../middleware/tenant.middleware';
import { prisma } from '../utils/prisma';
import { validationResult } from 'express-validator';
import Stripe from 'stripe';
import { facebookService } from '../services/facebook.service';
import { googleAdsService } from '../services/googleads.service';
import { lineService } from '../services/line.service';
import { tiktokService } from '../services/tiktok.service';
import { shopeeService } from '../services/shopee.service';
import { normalizeProviderKey, syncIntegrationWithFallback } from '../services/syncRegistry';

// FLOW START: Integrations Controller (EN)
// จุดเริ่มต้น: Controller ของ Integrations (TH)

const storeSyncHistory = async (params: {
  tenantId: string;
  integrationId: string;
  platform: string;
  status: 'success' | 'error';
  data?: any;
  error?: string;
}) => {
  const { tenantId, integrationId, platform, status, data, error } = params;
  await prisma.syncHistory.create({
    data: {
      tenantId,
      integrationId,
      platform,
      status,
      data: data ?? undefined,
      error,
      syncedAt: new Date(),
    },
  });
};

export const getSyncHistory = async (req: TenantRequest, res: Response) => {
  try {
    const { platform, status, limit, offset } = req.query as any;
    const take = Math.max(1, Math.min(200, Number(limit ?? 50)));
    const skip = Math.max(0, Number(offset ?? 0));

    const where: any = {
      tenantId: req.tenantId!,
    };
    if (platform) where.platform = String(platform);
    if (status) where.status = String(status);

    const [total, histories] = await Promise.all([
      prisma.syncHistory.count({ where }),
      prisma.syncHistory.findMany({
        where,
        orderBy: { syncedAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          tenantId: true,
          integrationId: true,
          platform: true,
          status: true,
          data: true,
          error: true,
          syncedAt: true,
        },
      }),
    ]);

    return res.json({ histories, total });
  } catch (error) {
    console.error('Get sync history error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getIntegrations = async (req: TenantRequest, res: Response) => {
  try {
    const integrations = await prisma.integration.findMany({
      where: { tenantId: req.tenantId! },
      select: {
        id: true,
        tenantId: true,
        type: true,
        provider: true,
        name: true,
        status: true,
        isActive: true,
        lastSyncAt: true,
        syncFrequencyMinutes: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose credentials
      },
    });

    res.json({ integrations });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getIntegrationNotifications = async (req: TenantRequest, res: Response) => {
  try {
    const { status } = req.query;

    const notifications = await prisma.integrationNotification.findMany({
      where: {
        tenantId: req.tenantId!,
        ...(status ? { status: status as string } : {}),
      },
      include: {
        integration: {
          select: {
            id: true,
            name: true,
            provider: true,
            lastSyncAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Get integration notifications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getIntegrationById = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const integration = await prisma.integration.findFirst({
      where: { id, tenantId: req.tenantId! },
      select: {
        id: true,
        provider: true,
        name: true,
        isActive: true,
        config: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

    if (!integration) {
      res.status(404).json({ message: 'Integration not found' });
      return;
    }

    res.json({ integration });
    return;
  } catch (error) {
    console.error('Get integration by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const createIntegration = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { provider: providerRaw, type, name } = req.body;
    const config = req.body?.config ?? {};
    const credentials = req.body?.credentials ?? req.body?.config ?? {};
    const provider = (providerRaw || type) as string;
    const integrationType = (type || provider) as string;

    const providerKey = normalizeProviderKey(String(provider || ''));

    // Check if integration already exists
    const aliasKeys = Array.from(new Set([String(provider || '').trim(), providerKey].filter(Boolean)));
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        tenantId: req.tenantId!,
        OR: aliasKeys.map((p) => ({ provider: p })),
      },
    });

    if (existingIntegration) {
      res.status(400).json({ message: 'Integration for this provider already exists' });
      return;
    }

    // Validate credentials based on provider
    let isValid = false;
    switch (providerKey) {
      case 'facebook':
        isValid = await facebookService.validateCredentials(credentials);
        break;
      case 'google_ads':
        isValid = await googleAdsService.validateCredentials(credentials);
        break;
      case 'line_ads':
        isValid = await lineService.validateCredentials(credentials);
        break;
      case 'tiktok':
        isValid = await tiktokService.validateCredentials(credentials);
        break;
      case 'shopee':
        isValid = await shopeeService.validateCredentials(credentials);
        break;
      default:
        res.status(400).json({ message: 'Invalid provider' });
        return;
    }

    if (!isValid) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const integration = await prisma.integration.create({
      data: {
        tenantId: req.tenantId!,
        provider,
        type: integrationType,
        credentials,
        config,
        name: name || `${provider} Integration`,
        isActive: true,
      },
    });

    res.status(201).json({ integration });
    return;
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const updateIntegration = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  const integration = await prisma.integration.updateMany({
    where: { id, tenantId: req.tenantId! },
    data: req.body,
  });

  res.json({ integration });
};

export const deleteIntegration = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  await prisma.integration.deleteMany({
    where: { id, tenantId: req.tenantId! },
  });

  res.json({ message: 'Integration deleted successfully' });
};

export const syncIntegration = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const integration = await prisma.integration.findFirst({
      where: { id, tenantId: req.tenantId! },
    });

    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    if (!integration.isActive) {
      return res.status(400).json({ message: 'Integration is not active' });
    }

    const startedAt = Date.now();
    const { provider, mode, result } = await syncIntegrationWithFallback(integration);
    const durationMs = Date.now() - startedAt;

    const ok = (result as any)?.status !== 'error';
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        status: ok ? 'active' : 'error',
      },
    });

    await storeSyncHistory({
      tenantId: req.tenantId!,
      integrationId: integration.id,
      platform: provider,
      status: ok ? 'success' : 'error',
      data: { result, durationMs, mode, trigger: 'manual' },
      error: ok ? undefined : (result as any)?.message || (result as any)?.error,
    });

    return res.json({
      message: 'Sync completed',
      provider,
      integrationId: integration.id,
      mode,
      durationMs,
      result,
    });
  } catch (error: any) {
    console.error('Sync integration error:', error);

    try {
      await storeSyncHistory({
        tenantId: req.tenantId!,
        integrationId: req.params.id,
        platform: normalizeProviderKey('unknown'),
        status: 'error',
        data: undefined,
        error: error.message,
      });
    } catch {
      // ignore
    }

    return res.status(500).json({
      message: 'Sync failed',
      error: error.message,
    });
  }
};

export const syncAllIntegrations = async (req: TenantRequest, res: Response) => {
  try {
    const providersRaw = Array.isArray((req.body as any)?.providers) ? ((req.body as any).providers as any[]) : null;
    const providers = providersRaw
      ? providersRaw
          .map((p) => normalizeProviderKey(String(p)))
          .filter((p) => Boolean(p))
      : null;

    const allIntegrations = await prisma.integration.findMany({
      where: {
        tenantId: req.tenantId!,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const integrations = providers?.length
      ? allIntegrations.filter((i) => providers.includes(normalizeProviderKey(i.provider)))
      : allIntegrations;

    const results: Array<{
      integrationId: string;
      provider: string;
      ok: boolean;
      result?: any;
      error?: string;
    }> = [];

    for (const integration of integrations) {
      const providerKey = normalizeProviderKey(integration.provider);
      const startedAt = Date.now();
      try {
        const { provider, mode, result } = await syncIntegrationWithFallback(integration);
        const durationMs = Date.now() - startedAt;
        const ok = (result as any)?.status !== 'error';

        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
            status: ok ? 'active' : 'error',
          },
        });

        await storeSyncHistory({
          tenantId: req.tenantId!,
          integrationId: integration.id,
          platform: provider,
          status: ok ? 'success' : 'error',
          data: { result, durationMs, mode, trigger: 'manual_bulk' },
          error: ok ? undefined : (result as any)?.message || (result as any)?.error,
        });

        results.push({ integrationId: integration.id, provider, ok, result });
      } catch (e: any) {
        const durationMs = Date.now() - startedAt;
        await prisma.integration.update({
          where: { id: integration.id },
          data: { status: 'error', lastSyncAt: new Date() },
        });

        await storeSyncHistory({
          tenantId: req.tenantId!,
          integrationId: integration.id,
          platform: providerKey,
          status: 'error',
          data: { durationMs, trigger: 'manual_bulk' },
          error: e?.message || 'Unknown error',
        });

        results.push({
          integrationId: integration.id,
          provider: providerKey,
          ok: false,
          error: e?.message || 'Unknown error',
        });
      }
    }

    return res.json({
      message: 'Sync all completed',
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Sync all integrations error:', error);
    return res.status(500).json({
      message: 'Sync all failed',
      error: error.message,
    });
  }
};

export const testIntegration = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  const integration = await prisma.integration.findFirst({
    where: { id, tenantId: req.tenantId! },
    select: {
      id: true,
      provider: true,
      credentials: true,
      config: true,
      isActive: true,
      status: true,
    },
  });
  if (!integration) return res.status(404).json({ message: 'Integration not found' });

  const providerRaw = String(integration.provider || '').toLowerCase();
  const provider = normalizeProviderKey(providerRaw);
  const credentials = (integration as any).credentials ?? (integration as any).config ?? {};

  try {
    let ok = false;
    switch (provider) {
      case 'facebook':
        ok = await facebookService.validateCredentials(credentials);
        break;
      case 'google_ads':
        ok = await googleAdsService.validateCredentials(credentials);
        break;
      case 'line_ads':
        ok = await lineService.validateCredentials(credentials);
        break;
      case 'tiktok':
        ok = await tiktokService.validateCredentials(credentials);
        break;
      case 'shopee':
        ok = await shopeeService.validateCredentials(credentials);
        break;
      default:
        return res.status(400).json({ message: 'Invalid provider' });
    }

    if (!ok) {
      return res.status(400).json({
        ok: false,
        message: 'Integration credentials are invalid',
        provider,
        integrationId: id,
      });
    }

    return res.json({
      ok: true,
      message: 'Integration verified',
      provider,
      integrationId: id,
    });
  } catch (error: any) {
    return res.status(400).json({
      ok: false,
      message: error?.message || 'Integration verification failed',
      provider,
      integrationId: id,
    });
  }
};

const BILLING_PAYMENT_METHOD_KEY = 'billing:payment_method';
const BILLING_PROMO_KEY = 'billing:promo';
const BILLING_STRIPE_CUSTOMER_KEY = 'billing:stripe_customer';
const BILLING_STRIPE_PAYMENT_METHOD_KEY = 'billing:stripe_payment_method';
const PENDING_INTEGRATION_SETUP_PREFIX = 'pending_integration_setup:';

const getTenantSetting = async (tenantId: string, key: string) => {
  const row = await prisma.tenantSetting.findUnique({
    where: {
      tenantId_key: {
        tenantId,
        key,
      },
    },
    select: { id: true, key: true, value: true, createdAt: true, updatedAt: true },
  });
  return row;
};

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export const createStripeSetupIntent = async (req: TenantRequest, res: Response) => {
  try {
    if (!stripe) return res.status(500).json({ message: 'Stripe is not configured' });

    const tenantId = req.tenantId!;
    const existingCustomer = await getTenantSetting(tenantId, BILLING_STRIPE_CUSTOMER_KEY);
    const existingCustomerValue = (existingCustomer?.value as any) || {};
    let customerId = typeof existingCustomerValue?.customerId === 'string' ? existingCustomerValue.customerId : undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { tenantId } });
      customerId = customer.id;
      await upsertTenantSetting(tenantId, BILLING_STRIPE_CUSTOMER_KEY, { customerId });
    }

    const intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return res.status(201).json({
      clientSecret: intent.client_secret,
      setupIntentId: intent.id,
      customerId,
    });
  } catch (error) {
    console.error('Create Stripe setup intent error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const confirmStripeSetupIntent = async (req: TenantRequest, res: Response) => {
  try {
    if (!stripe) return res.status(500).json({ message: 'Stripe is not configured' });

    const tenantId = req.tenantId!;
    const setupIntentIdRaw = (req.body as any)?.setupIntentId;
    const setupIntentId = typeof setupIntentIdRaw === 'string' ? setupIntentIdRaw.trim() : '';
    if (!setupIntentId) return res.status(400).json({ message: 'setupIntentId is required' });

    const intent = await stripe.setupIntents.retrieve(setupIntentId, { expand: ['payment_method'] });
    if (intent.status !== 'succeeded') {
      return res.status(400).json({ message: `SetupIntent not succeeded: ${intent.status}` });
    }

    const pm = intent.payment_method as Stripe.PaymentMethod | null;
    if (!pm || typeof pm !== 'object') return res.status(400).json({ message: 'No payment method on setup intent' });

    const brand = (pm.card?.brand ?? '').toUpperCase() || null;
    const last4 = pm.card?.last4 ?? null;

    const stripeValue = {
      paymentMethodId: pm.id,
      customerId: typeof intent.customer === 'string' ? intent.customer : null,
      brand,
      last4,
      linkedAt: new Date().toISOString(),
      setupIntentId,
    };

    await upsertTenantSetting(tenantId, BILLING_STRIPE_PAYMENT_METHOD_KEY, stripeValue);

    await upsertTenantSetting(tenantId, BILLING_PAYMENT_METHOD_KEY, {
      linked: true,
      brand,
      last4,
      linkedAt: stripeValue.linkedAt,
    });

    return res.status(201).json({ ok: true, paymentMethod: stripeValue });
  } catch (error) {
    console.error('Confirm Stripe setup intent error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTrialStatus = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId;
    const role = req.userRole;

    if (!userId || role !== 'admintest') {
      return res.json({
        role,
        active: false,
        expired: false,
        startedAt: null,
        expiresAt: null,
        msRemaining: null,
      });
    }

    const key = `trial:admintest:${userId}`;
    const row = await getTenantSetting(tenantId, key);
    const value = (row?.value as any) || {};

    let startedAtRaw = typeof value?.startedAt === 'string' ? value.startedAt : null;
    let expiresAtRaw = typeof value?.expiresAt === 'string' ? value.expiresAt : null;

    if (!startedAtRaw || !expiresAtRaw) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true, expiresAt: true },
      });
      const createdAtIso = user?.createdAt ? new Date(user.createdAt).toISOString() : null;
      const expiresAtIso = user?.expiresAt ? new Date(user.expiresAt).toISOString() : null;
      startedAtRaw = startedAtRaw || createdAtIso;
      expiresAtRaw = expiresAtRaw || expiresAtIso;
    }

    const startedAtMs = startedAtRaw ? Date.parse(startedAtRaw) : NaN;
    const expiresAtMs = expiresAtRaw ? Date.parse(expiresAtRaw) : NaN;

    const now = Date.now();
    const active = Number.isFinite(expiresAtMs) ? now < expiresAtMs : false;
    const expired = Number.isFinite(expiresAtMs) ? now >= expiresAtMs : false;
    const msRemaining = Number.isFinite(expiresAtMs) ? Math.max(0, expiresAtMs - now) : null;

    return res.json({
      role,
      active,
      expired,
      startedAt: Number.isFinite(startedAtMs) ? new Date(startedAtMs).toISOString() : null,
      expiresAt: Number.isFinite(expiresAtMs) ? new Date(expiresAtMs).toISOString() : null,
      msRemaining,
    });
  } catch (error) {
    console.error('Get trial status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const listPendingIntegrationSetup = async (req: TenantRequest, res: Response) => {
  try {
    const rows = await prisma.tenantSetting.findMany({
      where: {
        tenantId: req.tenantId!,
        key: { startsWith: PENDING_INTEGRATION_SETUP_PREFIX },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, key: true, value: true, createdAt: true, updatedAt: true },
    });

    return res.json({ items: rows });
  } catch (error) {
    console.error('List pending integration setup error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const upsertPendingIntegrationSetup = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const providerRaw = (req.body as any)?.provider;
    const provider = typeof providerRaw === 'string' ? providerRaw.trim().toLowerCase() : '';
    if (!provider) return res.status(400).json({ message: 'provider is required' });

    const typeRaw = (req.body as any)?.type;
    const type = typeof typeRaw === 'string' && typeRaw.trim() ? typeRaw.trim().toLowerCase() : provider;
    const credentials = (req.body as any)?.credentials ?? {};
    const config = (req.body as any)?.config ?? {};

    const key = `${PENDING_INTEGRATION_SETUP_PREFIX}${provider}`;
    const value = {
      provider,
      type,
      credentials,
      config,
      status: 'pending',
      updatedAt: new Date().toISOString(),
    };

    const row = await upsertTenantSetting(tenantId, key, value);
    return res.status(201).json({ item: row });
  } catch (error) {
    console.error('Upsert pending integration setup error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deletePendingIntegrationSetup = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const providerRaw = (req.params as any)?.provider;
    const provider = typeof providerRaw === 'string' ? providerRaw.trim().toLowerCase() : '';
    if (!provider) return res.status(400).json({ message: 'provider is required' });

    const key = `${PENDING_INTEGRATION_SETUP_PREFIX}${provider}`;
    const deleted = await prisma.tenantSetting.deleteMany({
      where: {
        tenantId,
        key,
      },
    });

    if (!deleted.count) return res.status(404).json({ message: 'Not found' });

    return res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete pending integration setup error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const upsertTenantSetting = async (tenantId: string, key: string, value: any) => {
  const row = await prisma.tenantSetting.upsert({
    where: {
      tenantId_key: {
        tenantId,
        key,
      },
    },
    create: {
      tenantId,
      key,
      value,
    },
    update: {
      value,
    },
    select: { id: true, key: true, value: true, createdAt: true, updatedAt: true },
  });
  return row;
};

export const getUpgradeStatus = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const payment = await getTenantSetting(tenantId, BILLING_PAYMENT_METHOD_KEY);
    const stripePayment = await getTenantSetting(tenantId, BILLING_STRIPE_PAYMENT_METHOD_KEY);
    const promo = await getTenantSetting(tenantId, BILLING_PROMO_KEY);

    const [pendingSetupCount, pendingJsonCount] = await Promise.all([
      prisma.tenantSetting.count({
        where: { tenantId, key: { startsWith: PENDING_INTEGRATION_SETUP_PREFIX } },
      }),
      prisma.tenantSetting.count({
        where: { tenantId, key: { startsWith: 'pending_json_import:' } },
      }),
    ]);

    let trial: any = null;
    if (req.userRole === 'admintest' && req.userId) {
      const trialKey = `trial:admintest:${req.userId}`;
      const row = await getTenantSetting(tenantId, trialKey);
      const value = (row?.value as any) || {};
      const startedAt = typeof value?.startedAt === 'string' ? value.startedAt : null;
      const expiresAt = typeof value?.expiresAt === 'string' ? value.expiresAt : null;
      const expiresAtMs = expiresAt ? Date.parse(expiresAt) : NaN;
      const now = Date.now();
      trial = {
        startedAt,
        expiresAt,
        active: Number.isFinite(expiresAtMs) ? now < expiresAtMs : false,
        expired: Number.isFinite(expiresAtMs) ? now >= expiresAtMs : false,
        msRemaining: Number.isFinite(expiresAtMs) ? Math.max(0, expiresAtMs - now) : null,
      };
    }

    const paymentValue = (payment?.value as any) || {};
    const stripePaymentValue = (stripePayment?.value as any) || {};
    const promoValue = (promo?.value as any) || {};

    const hasStripePaymentMethod = Boolean(stripePaymentValue?.paymentMethodId);
    const hasPaymentMethod = hasStripePaymentMethod || Boolean(paymentValue?.linked && paymentValue?.last4);
    const hasPromo = Boolean(promoValue?.code);

    const brand = stripePaymentValue?.brand || paymentValue?.brand || null;
    const last4 = stripePaymentValue?.last4 || paymentValue?.last4 || null;
    const linkedAt = stripePaymentValue?.linkedAt || paymentValue?.linkedAt || null;

    return res.json({
      role: req.userRole,
      paymentMethod: {
        linked: hasPaymentMethod,
        brand,
        last4,
        linkedAt,
      },
      promo: {
        code: promoValue?.code || null,
        appliedAt: promoValue?.appliedAt || null,
      },
      trial,
      pending: {
        integrationSetups: pendingSetupCount,
        jsonImports: pendingJsonCount,
      },
      canRequestUpgrade: hasStripePaymentMethod,
      note: hasPromo ? null : 'Promo code is optional',
    });
  } catch (error) {
    console.error('Get upgrade status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const setPaymentMethod = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const brandRaw = (req.body as any)?.brand;
    const last4Raw = (req.body as any)?.last4;

    const brand = typeof brandRaw === 'string' && brandRaw.trim() ? brandRaw.trim().slice(0, 30) : undefined;
    const last4 = typeof last4Raw === 'string' ? last4Raw.trim() : String(last4Raw ?? '').trim();

    if (!brand) return res.status(400).json({ message: 'brand is required' });
    if (!/^[0-9]{4}$/.test(last4)) return res.status(400).json({ message: 'last4 must be 4 digits' });

    const value = {
      linked: true,
      brand,
      last4,
      linkedAt: new Date().toISOString(),
    };

    const row = await upsertTenantSetting(tenantId, BILLING_PAYMENT_METHOD_KEY, value);
    return res.status(201).json({ item: row });
  } catch (error) {
    console.error('Set payment method error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const applyPromoCode = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const codeRaw = (req.body as any)?.code;
    const code = typeof codeRaw === 'string' && codeRaw.trim() ? codeRaw.trim().slice(0, 50) : undefined;
    if (!code) return res.status(400).json({ message: 'code is required' });

    const value = {
      code,
      appliedAt: new Date().toISOString(),
    };

    const row = await upsertTenantSetting(tenantId, BILLING_PROMO_KEY, value);
    return res.status(201).json({ item: row });
  } catch (error) {
    console.error('Apply promo code error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const requestAdminFullUpgrade = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId;
    const currentRole = req.userRole;
    const messageRaw = (req.body as any)?.message;
    const message = typeof messageRaw === 'string' && messageRaw.trim() ? messageRaw.trim() : undefined;

    const contactRaw = (req.body as any)?.contact;
    const contact =
      contactRaw && typeof contactRaw === 'object'
        ? {
            name:
              typeof (contactRaw as any).name === 'string' && (contactRaw as any).name.trim()
                ? (contactRaw as any).name.trim().slice(0, 100)
                : undefined,
            phone:
              typeof (contactRaw as any).phone === 'string' && (contactRaw as any).phone.trim()
                ? (contactRaw as any).phone.trim().slice(0, 50)
                : undefined,
            email:
              typeof (contactRaw as any).email === 'string' && (contactRaw as any).email.trim()
                ? (contactRaw as any).email.trim().slice(0, 150)
                : undefined,
            lineId:
              typeof (contactRaw as any).lineId === 'string' && (contactRaw as any).lineId.trim()
                ? (contactRaw as any).lineId.trim().slice(0, 80)
                : undefined,
            note:
              typeof (contactRaw as any).note === 'string' && (contactRaw as any).note.trim()
                ? (contactRaw as any).note.trim().slice(0, 500)
                : undefined,
          }
        : undefined;

    const contactParts: string[] = [];
    if (contact?.name) contactParts.push(`name=${contact.name}`);
    if (contact?.phone) contactParts.push(`phone=${contact.phone}`);
    if (contact?.email) contactParts.push(`email=${contact.email}`);
    if (contact?.lineId) contactParts.push(`lineId=${contact.lineId}`);
    if (contact?.note) contactParts.push(`note=${contact.note}`);
    const contactSummary = contactParts.length ? ` Contact: ${contactParts.join(', ')}` : '';

    const payment = await getTenantSetting(tenantId, BILLING_PAYMENT_METHOD_KEY);
    const stripePayment = await getTenantSetting(tenantId, BILLING_STRIPE_PAYMENT_METHOD_KEY);
    const promo = await getTenantSetting(tenantId, BILLING_PROMO_KEY);
    const paymentValue = (payment?.value as any) || {};
    const stripePaymentValue = (stripePayment?.value as any) || {};
    const promoValue = (promo?.value as any) || {};

    const hasStripePaymentMethod = Boolean(stripePaymentValue?.paymentMethodId);
    if (!hasStripePaymentMethod) {
      return res.status(400).json({
        message: 'กรุณาผูกบัตรเครดิตก่อน แล้วจึงส่งคำขออัปเกรดเป็น admin_full',
      });
    }

    const brand = stripePaymentValue?.brand || paymentValue?.brand || null;
    const last4 = stripePaymentValue?.last4 || paymentValue?.last4 || null;
    const linkedAt = stripePaymentValue?.linkedAt || paymentValue?.linkedAt || null;

    const existing = await prisma.integrationNotification.findFirst({
      where: {
        tenantId,
        platform: 'system',
        status: 'open',
        title: 'Admin Full Upgrade Request',
      },
      orderBy: { createdAt: 'desc' },
    });

    const payload = {
      tenantId,
      platform: 'system',
      severity: 'info',
      status: 'open',
      title: 'Admin Full Upgrade Request',
      reason: message
        ? `Request to upgrade from ${currentRole} to admin_full. Message: ${message}.${contactSummary}`
        : `Request to upgrade from ${currentRole} to admin_full to enable API integrations.${contactSummary}`,
      actionUrl: '/users',
      metadata: {
        requestedBy: userId,
        currentRole,
        requestedRole: 'admin_full',
        message,
        contact,
        billing: {
          paymentMethod: {
            brand,
            last4,
            linkedAt,
          },
          promo: {
            code: promoValue?.code || null,
            appliedAt: promoValue?.appliedAt || null,
          },
        },
      },
    } as const;

    const notification = existing
      ? await prisma.integrationNotification.update({
          where: { id: existing.id },
          data: {
            ...payload,
            updatedAt: new Date(),
          },
        })
      : await prisma.integrationNotification.create({
          data: payload,
        });

    return res.status(201).json({ notification });
  } catch (error) {
    console.error('Request admin full upgrade error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// FLOW END: Integrations Controller (EN)
// จุดสิ้นสุด: Controller ของ Integrations (TH)
