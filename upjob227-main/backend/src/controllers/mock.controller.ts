import { Response } from 'express';
import { TenantRequest } from '../middleware/tenant.middleware';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcrypt';
import * as mockGa4 from '../services/mockGa4';
import * as mockFacebook from '../services/mockFacebook';
import * as mockTiktok from '../services/mockTiktok';
import * as mockLine from '../services/mockLine';
import * as mockShopee from '../services/mockShopee';
import { seedSampleTenantData } from '../services/sampleData.service';

const toDateOnly = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const runProviderMockSyncs = async (tenantId: string, providers: string[], lookbackDays: number) => {
  const results: any[] = [];

  for (const provider of providers) {
    const existing = await prisma.integration.findFirst({
      where: { type: provider, tenantId },
    });
    if (!existing) {
      const created = await prisma.integration.create({
        data: {
          tenantId,
          type: provider,
          provider: provider,
          name: `${provider.toUpperCase()} Sample Integration`,
          credentials: { mock: true },
          config: { lookbackDays },
          status: 'active',
        },
      });
      results.push({ provider, action: 'created', integrationId: created.id });
    } else {
      await prisma.integration.update({
        where: { id: existing.id },
        data: { config: { lookbackDays } as any },
      });
      results.push({ provider, action: 'existing', integrationId: existing.id });
    }
  }

  for (const provider of providers) {
    const integration = await prisma.integration.findFirst({
      where: { type: provider, tenantId },
    });
    if (!integration) continue;

    let result: any;
    if (provider === 'ga4') {
      result = await mockGa4.sync({ ...integration, config: { lookbackDays } as any } as any);
    } else if (provider === 'facebook') {
      result = await mockFacebook.sync({ ...integration, config: { lookbackDays } as any } as any);
    } else if (provider === 'tiktok') {
      result = await mockTiktok.sync({ ...integration, config: { lookbackDays } as any } as any);
    } else if (provider === 'line') {
      result = await mockLine.sync({ ...integration, config: { lookbackDays } as any } as any);
    } else if (provider === 'shopee') {
      result = await mockShopee.sync({ ...integration, config: { lookbackDays } as any } as any);
    } else {
      result = { status: 'skipped', provider };
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    results.push({ provider, syncResult: result });
  }

  return results;
};

// FLOW START: Mock Controller (EN)
// จุดเริ่มต้น: Controller ของ Mock Data (TH)

export const generateMockData = async (req: TenantRequest, res: Response) => {
  const { providers, lookbackDays } = req.body as {
    providers?: string[];
    lookbackDays?: number;
  };
  const selectedProviders = providers || ['ga4', 'facebook'];
  const days = lookbackDays || 30;

  const results = await runProviderMockSyncs(req.tenantId!, selectedProviders, days);

  res.json({ message: 'Sample data generated', results });
};

export const seedAllMockData = async (req: TenantRequest, res: Response) => {
  const { providers, lookbackDays, force } = req.body as {
    providers?: string[];
    lookbackDays?: number;
    force?: boolean;
  };

  const selectedProviders = providers || ['ga4', 'facebook', 'line', 'tiktok', 'shopee'];
  const days = lookbackDays || 30;
  const tenantId = req.tenantId!;
  const userId = req.userId || null;

  const results = await runProviderMockSyncs(tenantId, selectedProviders, days);

  const anyCampaign = await prisma.campaign.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  const alertCount = await prisma.alert.count({ where: { tenantId } });
  const reportCount = await prisma.report.count({ where: { tenantId } });
  const insightCount = await prisma.aiInsight.count({ where: { tenantId } });
  const leadCount = await prisma.lead.count({ where: { tenantId } });
  const seoCount = await prisma.seoMetric.count({ where: { tenantId } });

  let alertsCreated = 0;
  let reportsCreated = 0;
  let insightsCreated = 0;
  let leadsCreated = 0;
  let seoCreated = 0;

  if (force || alertCount === 0) {
    const created = await prisma.alert.createMany({
      data: [
        {
          tenantId,
          campaignId: anyCampaign?.id || null,
          name: 'Revenue Spike Alert',
          description: 'Triggered when revenue exceeds a threshold',
          alertType: 'kpi',
          metric: 'revenue',
          operator: '>',
          threshold: 1000,
          notificationChannels: ['email'],
          recipients: [],
          isActive: true,
        } as any,
        {
          tenantId,
          campaignId: anyCampaign?.id || null,
          name: 'Spend Drop Alert',
          description: 'Triggered when spend falls below a threshold',
          alertType: 'kpi',
          metric: 'spend',
          operator: '<',
          threshold: 200,
          notificationChannels: ['email'],
          recipients: [],
          isActive: true,
        } as any,
      ],
    });
    alertsCreated = created.count;
  }

  if (force || reportCount === 0) {
    const now = new Date();
    const endDate = toDateOnly(now);
    const startDate = toDateOnly(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

    const created = await prisma.report.createMany({
      data: [
        {
          tenantId,
          createdBy: userId,
          name: 'Weekly Performance Summary',
          description: 'Auto-generated summary report',
          reportType: 'summary',
          dateRangeType: 'custom',
          startDate,
          endDate,
          exportFormat: 'pdf',
          filters: { seeded: true },
          metrics: [],
          isScheduled: false,
        } as any,
      ],
    });
    reportsCreated = created.count;
  }

  if (force || insightCount === 0) {
    const created = await prisma.aiInsight.createMany({
      data: [
        {
          tenantId,
          campaignId: anyCampaign?.id || null,
          insightType: 'performance',
          title: 'Increase budget on top-performing campaign',
          description: 'ROAS looks healthy; consider scaling spend to capture more demand.',
          analysis: { seeded: true },
          recommendedAction: 'Increase budget by 10% for 7 days',
          expectedImpact: 'Higher conversions with stable ROAS',
          priority: 'medium',
          status: 'new',
        },
        {
          tenantId,
          campaignId: anyCampaign?.id || null,
          insightType: 'creative',
          title: 'Refresh creatives to reduce fatigue',
          description: 'CTR is flattening; new creatives can improve engagement.',
          analysis: { seeded: true },
          recommendedAction: 'Test 3 new creatives',
          expectedImpact: 'Improved CTR and conversions',
          priority: 'low',
          status: 'new',
        },
      ],
    });
    insightsCreated = created.count;
  }

  if (force || leadCount === 0) {
    const created = await prisma.lead.createMany({
      data: [
        {
          tenantId,
          name: 'Sarah Johnson',
          company: 'Tech Corp',
          source: 'Website',
          status: 'New',
          stage: 'New',
          gender: 'female',
          income: 65000,
          estimatedValue: 15000,
          email: 'sarah@example.com',
          phone: '+66 81 000 0001',
        } as any,
        {
          tenantId,
          name: 'Michael Chen',
          company: 'StartupIO',
          source: 'Referral',
          status: 'In Progress',
          stage: 'In Progress',
          gender: 'male',
          income: 82000,
          estimatedValue: 23000,
          email: 'michael@example.com',
          phone: '+66 81 000 0002',
        } as any,
        {
          tenantId,
          name: 'Emily Davis',
          company: 'Enterprise Ltd',
          source: 'Social Media',
          status: 'Converted',
          stage: 'Converted',
          gender: 'female',
          income: 120000,
          estimatedValue: 45000,
          email: 'emily@example.com',
          phone: '+66 81 000 0003',
        } as any,
      ],
    });
    leadsCreated = created.count;
  }

  if (force || seoCount === 0) {
    const queries = [
      'digital marketing agency thailand',
      'line oa automation',
      'tiktok ads expert',
      'performance marketing dashboard',
      'facebook ads agency',
    ];
    const pages = [
      '/insights/marketing-automation',
      '/playbooks/line-oa-guide',
      '/blog/tiktok-creative-lab',
      '/resources/roi-dashboard',
      '/services/performance',
    ];

    const data: any[] = [];
    for (let i = 0; i < queries.length; i += 1) {
      data.push({
        tenantId,
        metricType: 'search_performance',
        label: queries[i],
        date: null,
        externalKey: `q:${queries[i]}`,
        numericValue: null,
        volume: null,
        sessions: null,
        share: null,
        trend: null,
        metadata: {
          query: queries[i],
          page: pages[i % pages.length],
          device: i % 2 === 0 ? 'mobile' : 'desktop',
          country: 'TH',
          clicks: 120 + i * 42,
          impressions: 2400 + i * 680,
          position: 3 + i * 0.7,
        },
      });
    }

    const created = await prisma.seoMetric.createMany({ data: data as any, skipDuplicates: true });
    seoCreated = created.count;
  }

  res.json({
    message: 'Seeded full sample dataset',
    results,
    created: {
      alerts: alertsCreated,
      reports: reportsCreated,
      insights: insightsCreated,
      leads: leadsCreated,
      seoMetrics: seoCreated,
    },
  });
};

export const getMockMetrics = async (req: TenantRequest, res: Response) => {
  const { startDate, endDate, platform } = req.query as any;
  const where: any = { tenantId: req.tenantId! };
  if (platform) where.platform = platform;
  if (startDate && endDate) {
    where.date = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const metrics = await prisma.metric.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      campaign: { select: { id: true, name: true, platform: true } },
    },
    take: 500,
  });

  res.json({ metrics });
};

export const getMockCampaigns = async (req: TenantRequest, res: Response) => {
  const { platform } = req.query as any;
  const where: any = { tenantId: req.tenantId! };
  if (platform) where.platform = platform;

  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      metrics: {
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  });

  res.json({ campaigns });
};

export const seedTestAccounts = async (req: TenantRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not Found' });
  }

  const tenantId = req.tenantId!;
  const seedSampleData = Boolean((req.body as any)?.seedSampleData);

  const superAdminEmail =
    typeof (req.body as any)?.superAdminEmail === 'string' && (req.body as any).superAdminEmail.trim()
      ? (req.body as any).superAdminEmail.trim()
      : 'superadmin@rga.local';
  const superAdminPassword =
    typeof (req.body as any)?.superAdminPassword === 'string' && (req.body as any).superAdminPassword.trim()
      ? (req.body as any).superAdminPassword.trim()
      : 'SuperAdmin@123';

  const adminTestEmail =
    typeof (req.body as any)?.adminTestEmail === 'string' && (req.body as any).adminTestEmail.trim()
      ? (req.body as any).adminTestEmail.trim()
      : 'admintest@rga.local';
  const adminTestPassword =
    typeof (req.body as any)?.adminTestPassword === 'string' && (req.body as any).adminTestPassword.trim()
      ? (req.body as any).adminTestPassword.trim()
      : 'AdminTest@123';

  const [superAdminHash, adminTestHash] = await Promise.all([
    bcrypt.hash(superAdminPassword, 10),
    bcrypt.hash(adminTestPassword, 10),
  ]);

  const superAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: superAdminEmail } },
    update: {
      role: 'super_admin',
      passwordHash: superAdminHash,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      emailVerified: true,
    },
    create: {
      tenantId,
      email: superAdminEmail,
      passwordHash: superAdminHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      isActive: true,
      emailVerified: true,
    },
    select: { id: true, email: true, role: true, tenantId: true },
  });

  const adminTest = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: adminTestEmail } },
    update: {
      role: 'admintest',
      passwordHash: adminTestHash,
      firstName: 'Admin',
      lastName: 'Test',
      isActive: true,
      emailVerified: true,
    },
    create: {
      tenantId,
      email: adminTestEmail,
      passwordHash: adminTestHash,
      firstName: 'Admin',
      lastName: 'Test',
      role: 'admintest',
      isActive: true,
      emailVerified: true,
    },
    select: { id: true, email: true, role: true, tenantId: true },
  });

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + 24 * 60 * 60 * 1000);

  await prisma.tenantSetting.upsert({
    where: {
      tenantId_key: {
        tenantId,
        key: `trial:admintest:${adminTest.id}`,
      },
    },
    create: {
      tenantId,
      key: `trial:admintest:${adminTest.id}`,
      value: {
        startedAt: startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    },
    update: {},
  });

  await prisma.integration.createMany({
    data: [
      {
        tenantId,
        provider: 'googleads',
        type: 'googleads',
        name: 'Google Ads Integration',
        credentials: {},
        config: {},
        isActive: false,
      },
      {
        tenantId,
        provider: 'facebook',
        type: 'facebook',
        name: 'Facebook Integration',
        credentials: {},
        config: {},
        isActive: false,
      },
      {
        tenantId,
        provider: 'line',
        type: 'line',
        name: 'LINE OA Integration',
        credentials: {},
        config: {},
        isActive: false,
      },
      {
        tenantId,
        provider: 'tiktok',
        type: 'tiktok',
        name: 'TikTok Integration',
        credentials: {},
        config: {},
        isActive: false,
      },
    ],
    skipDuplicates: true,
  });

  if (seedSampleData) {
    await seedSampleTenantData(tenantId);
  }

  return res.json({
    tenantId,
    users: {
      superAdmin: {
        email: superAdminEmail,
        password: superAdminPassword,
        id: superAdmin.id,
      },
      adminTest: {
        email: adminTestEmail,
        password: adminTestPassword,
        id: adminTest.id,
      },
    },
    seeded: {
      sampleData: seedSampleData,
    },
  });
};

// FLOW END: Mock Controller (EN)
// จุดสิ้นสุด: Controller ของ Mock Data (TH)
