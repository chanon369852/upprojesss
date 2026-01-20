import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const getSeedEmailDomain = () => (process.env.SEED_EMAIL_DOMAIN || 'rga.local').trim();

const getSeedPasswordDefault = () => (process.env.SEED_PASSWORD_DEFAULT || '').trim();

const buildSeedEmail = (localPart: string, envOverride?: string) => {
  const override = envOverride?.trim();
  if (override) return override;
  return `${localPart}@${getSeedEmailDomain()}`;
};

const buildSeedPassword = (fallback: string, envOverride?: string) => {
  const override = envOverride?.trim();
  if (override) return override;
  const globalDefault = getSeedPasswordDefault();
  if (globalDefault) return globalDefault;
  return fallback;
};

const seedMiniCompanyData = async (params: {
  tenant: { id: string; slug: string; name: string };
  admin: { id: string; email: string };
}) => {
  const { tenant, admin } = params;

  const seedNow = new Date();
  const startOfDayUtc = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);
  const metricDays = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07'];
  const metricSource = 'seed';

  const integrationSeeds = [
    { provider: 'facebook', type: 'oauth', name: 'Facebook Ads' },
    { provider: 'googleads', type: 'oauth', name: 'Google Ads' },
    { provider: 'line', type: 'oauth', name: 'LINE OA' },
    { provider: 'tiktok', type: 'oauth', name: 'TikTok Ads' },
  ] as const;

  const integrations: Array<{ id: string; provider: string }> = [];
  for (const i of integrationSeeds) {
    const existing = await prisma.integration.findFirst({
      where: { tenantId: tenant.id, provider: i.provider },
      select: { id: true, provider: true },
    });
    if (existing) {
      const updated = await prisma.integration.update({
        where: { id: existing.id },
        data: {
          type: i.type,
          name: i.name,
          credentials: {},
          config: {},
          status: 'active',
          isActive: true,
          lastSyncAt: seedNow,
          syncFrequencyMinutes: 15,
        },
        select: { id: true, provider: true },
      });
      integrations.push(updated);
      continue;
    }

    const created = await prisma.integration.create({
      data: {
        tenantId: tenant.id,
        provider: i.provider,
        type: i.type,
        name: i.name,
        credentials: {},
        config: {},
        status: 'active',
        isActive: true,
        lastSyncAt: seedNow,
        syncFrequencyMinutes: 15,
      },
      select: { id: true, provider: true },
    });
    integrations.push(created);
  }

  await Promise.all(
    integrations.map((integration) =>
      prisma.integrationSyncState.upsert({
        where: { integrationId: integration.id },
        update: {
          tenantId: tenant.id,
          provider: integration.provider,
          cursor: {},
          lastAttemptAt: seedNow,
          lastSuccessAt: seedNow,
          nextRunAt: new Date(Date.now() + 15 * 60 * 1000),
        },
        create: {
          tenantId: tenant.id,
          integrationId: integration.id,
          provider: integration.provider,
          cursor: {},
          lastAttemptAt: seedNow,
          lastSuccessAt: seedNow,
          nextRunAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      })
    )
  );

  const integrationByProvider = new Map(integrations.map((i) => [i.provider, i] as const));
  const providers = ['facebook', 'googleads', 'line', 'tiktok'] as const;
  const platformByProvider: Record<(typeof providers)[number], string> = {
    facebook: 'Facebook',
    googleads: 'Google Ads',
    line: 'LINE',
    tiktok: 'TikTok',
  };

  const campaigns = await Promise.all(
    Array.from({ length: 6 }, (_, index) => {
      const provider = providers[index % providers.length];
      const platform = platformByProvider[provider];
      const suffix = String(index + 1).padStart(3, '0');
      const externalId = `seed_${tenant.slug}_${provider}_${suffix}`;
      const name = `Seed Campaign - ${tenant.name} - ${platform} ${suffix}`;
      const integration = integrationByProvider.get(provider);
      return prisma.campaign.upsert({
        where: {
          tenantId_platform_externalId: {
            tenantId: tenant.id,
            platform,
            externalId,
          },
        },
        update: {
          tenantId: tenant.id,
          integrationId: integration?.id || null,
          name,
          status: 'active',
          currency: 'THB',
          budget: new Prisma.Decimal(30000),
          budgetType: 'daily',
          objective: 'conversion',
          campaignType: 'seed',
          startDate: startOfDayUtc('2026-01-01'),
          endDate: null,
        },
        create: {
          tenantId: tenant.id,
          integrationId: integration?.id || null,
          platform,
          externalId,
          name,
          status: 'active',
          currency: 'THB',
          budget: new Prisma.Decimal(30000),
          budgetType: 'daily',
          objective: 'conversion',
          campaignType: 'seed',
          startDate: startOfDayUtc('2026-01-01'),
          endDate: null,
        },
      });
    })
  );

  await Promise.all(
    campaigns.flatMap((campaign, idx) =>
      metricDays.map((dayIso, dayIdx) => {
        const impressions = 15000 + idx * 1700 + dayIdx * 600;
        const clicks = Math.max(90, Math.round(impressions * (0.01 + idx * 0.001)));
        const conversions = Math.max(2, Math.round(clicks * (0.022 + (dayIdx % 3) * 0.004)));
        const spendValue = Math.round((8000 + idx * 900 + dayIdx * 350) * 100) / 100;
        const spend = new Prisma.Decimal(spendValue);
        const revenue = new Prisma.Decimal(Math.round((spendValue * (1.7 + (idx % 3) * 0.25)) * 100) / 100);
        return prisma.metric.upsert({
          where: {
            tenantId_campaignId_date_hour_platform_source: {
              tenantId: tenant.id,
              campaignId: campaign.id,
              date: startOfDayUtc(dayIso),
              hour: 0,
              platform: campaign.platform,
              source: metricSource,
            },
          },
          update: {
            tenantId: tenant.id,
            campaignId: campaign.id,
            date: startOfDayUtc(dayIso),
            hour: 0,
            platform: campaign.platform,
            source: metricSource,
            impressions,
            clicks,
            conversions,
            spend,
            revenue,
            orders: conversions,
            metadata: { seedTenant: tenant.slug },
          },
          create: {
            tenantId: tenant.id,
            campaignId: campaign.id,
            date: startOfDayUtc(dayIso),
            hour: 0,
            platform: campaign.platform,
            source: metricSource,
            impressions,
            clicks,
            conversions,
            spend,
            revenue,
            orders: conversions,
            metadata: { seedTenant: tenant.slug },
          },
        });
      })
    )
  );

  for (let dayIdx = 0; dayIdx < metricDays.length; dayIdx += 1) {
    const dayIso = metricDays[dayIdx];
    const sessions = 2600 + dayIdx * 140;
    const bounceRate = new Prisma.Decimal(Math.max(0.2, Math.min(0.7, 0.52 - dayIdx * 0.01)));
    const avgSessionDuration = 65 + dayIdx * 2;
    const revenueValue = 90000 + dayIdx * 4500;
    const orders = 45 + dayIdx * 3;

    const payload = {
      tenantId: tenant.id,
      campaignId: null,
      date: startOfDayUtc(dayIso),
      hour: 0,
      platform: 'ga4',
      source: metricSource,
      organicTraffic: sessions,
      bounceRate,
      avgSessionDuration,
      revenue: new Prisma.Decimal(revenueValue),
      orders,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: new Prisma.Decimal(0),
      metadata: { seedTenant: tenant.slug },
    };

    const existing = await prisma.metric.findFirst({
      where: {
        tenantId: tenant.id,
        campaignId: null,
        date: startOfDayUtc(dayIso),
        hour: 0,
        platform: 'ga4',
        source: metricSource,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.metric.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.metric.create({ data: payload });
    }
  }

  await prisma.seoMetric.upsert({
    where: {
      tenantId_metricType_externalKey: {
        tenantId: tenant.id,
        metricType: 'traffic',
        externalKey: `seed_sessions_${tenant.slug}`,
      },
    },
    update: {
      label: 'Sessions',
      date: startOfDayUtc('2026-01-07'),
      numericValue: new Prisma.Decimal(8450),
      metadata: { seedTenant: tenant.slug },
    },
    create: {
      tenantId: tenant.id,
      metricType: 'traffic',
      externalKey: `seed_sessions_${tenant.slug}`,
      label: 'Sessions',
      date: startOfDayUtc('2026-01-07'),
      numericValue: new Prisma.Decimal(8450),
      metadata: { seedTenant: tenant.slug },
    },
  });

  const reportName = `Seed Report (${tenant.slug})`;
  const existingReport = await prisma.report.findFirst({
    where: { tenantId: tenant.id, name: reportName, reportType: 'overview' },
    select: { id: true },
  });

  const reportPayload = {
    tenantId: tenant.id,
    createdBy: admin.id,
    name: reportName,
    reportType: 'overview',
    description: 'Seeded report entry',
    dateRangeType: 'last_7d',
    startDate: startOfDayUtc('2026-01-01'),
    endDate: startOfDayUtc('2026-01-07'),
    filters: {},
    metrics: [],
    isScheduled: false,
    exportFormat: 'pdf',
  };

  if (existingReport) {
    await prisma.report.update({ where: { id: existingReport.id }, data: reportPayload });
  } else {
    await prisma.report.create({ data: reportPayload });
  }
};

async function main() {
  const superAdminTenant = await prisma.tenant.upsert({
    where: { slug: 'rga-support' },
    update: {},
    create: {
      name: 'RGA Support',
      slug: 'rga-support',
      domain: 'localhost',
      supportAccess: 'denied',
    },
  });

  const companyTenant = await prisma.tenant.upsert({
    where: { slug: 'rga-demo' },
    update: {},
    create: {
      name: 'RGA Demo Company',
      slug: 'rga-demo',
      domain: 'localhost',
      supportAccess: 'denied',
    },
  });

  const companyTenant1 = await prisma.tenant.upsert({
    where: { slug: 'rga-demo-1' },
    update: {},
    create: {
      name: 'RGA Demo Company 1',
      slug: 'rga-demo-1',
      domain: 'localhost',
      supportAccess: 'denied',
    },
  });

  const companyTenant2 = await prisma.tenant.upsert({
    where: { slug: 'rga-demo-2' },
    update: {},
    create: {
      name: 'RGA Demo Company 2',
      slug: 'rga-demo-2',
      domain: 'localhost',
      supportAccess: 'denied',
    },
  });

  const trialTenant = await prisma.tenant.upsert({
    where: { slug: 'rga-trial' },
    update: {},
    create: {
      name: 'RGA Trial Company',
      slug: 'rga-trial',
      domain: 'localhost',
      supportAccess: 'denied',
    },
  });

  // Keep the rest of the seed data attached to the Admin Full company tenant.
  const tenant = companyTenant;

  // Create SUPER ADMIN user (support tenant)
  const email = buildSeedEmail('superadmin', process.env.SEED_SUPER_ADMIN_EMAIL);
  const superAdminPassword = buildSeedPassword('SuperAdmin@123', process.env.SEED_SUPER_ADMIN_PASSWORD);
  const passwordHash = await bcrypt.hash(superAdminPassword, 10);
  const superAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: superAdminTenant.id, email } },
    update: {
      tenantId: superAdminTenant.id,
      role: 'super_admin',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      emailVerified: true,
    },
    create: {
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      tenantId: superAdminTenant.id,
      isActive: true,
      emailVerified: true,
    },
  });

  const adminFullEmail = buildSeedEmail('adminfull', process.env.SEED_ADMIN_FULL_EMAIL);
  const adminFullPassword = buildSeedPassword('AdminFull@123', process.env.SEED_ADMIN_FULL_PASSWORD);
  const adminFullHash = await bcrypt.hash(adminFullPassword, 10);
  const adminFull = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: adminFullEmail } },
    update: {
      tenantId: tenant.id,
      role: 'admin_full',
      passwordHash: adminFullHash,
      firstName: 'Admin',
      lastName: 'Full',
      isActive: true,
      emailVerified: true,
    },
    create: {
      tenantId: tenant.id,
      email: adminFullEmail,
      passwordHash: adminFullHash,
      firstName: 'Admin',
      lastName: 'Full',
      role: 'admin_full',
      isActive: true,
      emailVerified: true,
    },
  });

  const seedUsers = [
    {
      email: buildSeedEmail('manager', process.env.SEED_MANAGER_EMAIL),
      password: buildSeedPassword('Manager@123', process.env.SEED_MANAGER_PASSWORD),
      firstName: 'Manager',
      lastName: 'One',
      role: 'manager',
    },
    {
      email: buildSeedEmail('user', process.env.SEED_USER_EMAIL),
      password: buildSeedPassword('User@123', process.env.SEED_USER_PASSWORD),
      firstName: 'User',
      lastName: 'One',
      role: 'user',
    },
    {
      email: buildSeedEmail('viewer', process.env.SEED_VIEWER_EMAIL),
      password: buildSeedPassword('Viewer@123', process.env.SEED_VIEWER_PASSWORD),
      firstName: 'Viewer',
      lastName: 'One',
      role: 'viewer',
    },
  ] as const;

  await Promise.all(
    seedUsers.map(async (u) => {
      const hash = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
        update: {
          tenantId: tenant.id,
          role: u.role,
          passwordHash: hash,
          firstName: u.firstName,
          lastName: u.lastName,
          isActive: true,
          emailVerified: true,
        },
        create: {
          tenantId: tenant.id,
          email: u.email,
          passwordHash: hash,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          isActive: true,
          emailVerified: true,
        },
      });
    })
  );

  const adminFull1Email = buildSeedEmail('adminfull1', process.env.SEED_ADMIN_FULL_1_EMAIL);
  const adminFull1Password = buildSeedPassword('AdminFull1@123', process.env.SEED_ADMIN_FULL_1_PASSWORD);
  const adminFull1Hash = await bcrypt.hash(adminFull1Password, 10);
  const adminFull1 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: companyTenant1.id, email: adminFull1Email } },
    update: {
      tenantId: companyTenant1.id,
      role: 'admin_full',
      passwordHash: adminFull1Hash,
      firstName: 'Admin',
      lastName: 'Full 1',
      isActive: true,
      emailVerified: true,
    },
    create: {
      tenantId: companyTenant1.id,
      email: adminFull1Email,
      passwordHash: adminFull1Hash,
      firstName: 'Admin',
      lastName: 'Full 1',
      role: 'admin_full',
      isActive: true,
      emailVerified: true,
    },
  });

  const adminFull2Email = buildSeedEmail('adminfull2', process.env.SEED_ADMIN_FULL_2_EMAIL);
  const adminFull2Password = buildSeedPassword('AdminFull2@123', process.env.SEED_ADMIN_FULL_2_PASSWORD);
  const adminFull2Hash = await bcrypt.hash(adminFull2Password, 10);
  const adminFull2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: companyTenant2.id, email: adminFull2Email } },
    update: {
      tenantId: companyTenant2.id,
      role: 'admin_full',
      passwordHash: adminFull2Hash,
      firstName: 'Admin',
      lastName: 'Full 2',
      isActive: true,
      emailVerified: true,
    },
    create: {
      tenantId: companyTenant2.id,
      email: adminFull2Email,
      passwordHash: adminFull2Hash,
      firstName: 'Admin',
      lastName: 'Full 2',
      role: 'admin_full',
      isActive: true,
      emailVerified: true,
    },
  });

  const extraCompanyUsers = [
    { tenantId: companyTenant1.id, email: buildSeedEmail('manager1', process.env.SEED_MANAGER_1_EMAIL), password: buildSeedPassword('Manager1@123', process.env.SEED_MANAGER_1_PASSWORD), firstName: 'Manager', lastName: 'One', role: 'manager' },
    { tenantId: companyTenant1.id, email: buildSeedEmail('user1', process.env.SEED_USER_1_EMAIL), password: buildSeedPassword('User1@123', process.env.SEED_USER_1_PASSWORD), firstName: 'User', lastName: 'One', role: 'user' },
    { tenantId: companyTenant1.id, email: buildSeedEmail('viewer1', process.env.SEED_VIEWER_1_EMAIL), password: buildSeedPassword('Viewer1@123', process.env.SEED_VIEWER_1_PASSWORD), firstName: 'Viewer', lastName: 'One', role: 'viewer' },
    { tenantId: companyTenant2.id, email: buildSeedEmail('manager2', process.env.SEED_MANAGER_2_EMAIL), password: buildSeedPassword('Manager2@123', process.env.SEED_MANAGER_2_PASSWORD), firstName: 'Manager', lastName: 'Two', role: 'manager' },
    { tenantId: companyTenant2.id, email: buildSeedEmail('user2', process.env.SEED_USER_2_EMAIL), password: buildSeedPassword('User2@123', process.env.SEED_USER_2_PASSWORD), firstName: 'User', lastName: 'Two', role: 'user' },
    { tenantId: companyTenant2.id, email: buildSeedEmail('viewer2', process.env.SEED_VIEWER_2_EMAIL), password: buildSeedPassword('Viewer2@123', process.env.SEED_VIEWER_2_PASSWORD), firstName: 'Viewer', lastName: 'Two', role: 'viewer' },
  ] as const;

  await Promise.all(
    extraCompanyUsers.map(async (u) => {
      const hash = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { tenantId_email: { tenantId: u.tenantId, email: u.email } },
        update: {
          tenantId: u.tenantId,
          role: u.role,
          passwordHash: hash,
          firstName: u.firstName,
          lastName: u.lastName,
          isActive: true,
          emailVerified: true,
        },
        create: {
          tenantId: u.tenantId,
          email: u.email,
          passwordHash: hash,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          isActive: true,
          emailVerified: true,
        },
      });
    })
  );

  const adminTestEmail = buildSeedEmail(
    'admintest',
    process.env.SEED_ADMIN_TEST_EMAIL || process.env.SEED_ADMIN_MESS_EMAIL,
  );
  const adminTestPassword = buildSeedPassword(
    'AdminTest@123',
    process.env.SEED_ADMIN_TEST_PASSWORD || process.env.SEED_ADMIN_MESS_PASSWORD,
  );
  const adminTestHash = await bcrypt.hash(adminTestPassword, 10);
  const trialStartedAt = new Date();
  const trialExpiresAt = new Date(trialStartedAt.getTime() + 14 * 24 * 60 * 60 * 1000);

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: trialTenant.id, email: adminTestEmail } },
    update: {
      tenantId: trialTenant.id,
      role: 'admintest',
      passwordHash: adminTestHash,
      firstName: 'Admin',
      lastName: 'Test',
      isActive: true,
      emailVerified: true,
      status: 'active',
      expiresAt: trialExpiresAt,
    },
    create: {
      tenantId: trialTenant.id,
      email: adminTestEmail,
      passwordHash: adminTestHash,
      firstName: 'Admin',
      lastName: 'Test',
      role: 'admintest',
      isActive: true,
      emailVerified: true,
      status: 'active',
      expiresAt: trialExpiresAt,
    },
  });

  try {
    await prisma.integration.createMany({
      data: [
        { tenantId: trialTenant.id, provider: 'googleads', type: 'googleads', name: 'Google Ads Integration', credentials: {}, config: {}, isActive: false },
        { tenantId: trialTenant.id, provider: 'facebook', type: 'facebook', name: 'Facebook Integration', credentials: {}, config: {}, isActive: false },
        { tenantId: trialTenant.id, provider: 'line', type: 'line', name: 'LINE OA Integration', credentials: {}, config: {}, isActive: false },
        { tenantId: trialTenant.id, provider: 'tiktok', type: 'tiktok', name: 'TikTok Integration', credentials: {}, config: {}, isActive: false },
      ],
      skipDuplicates: true,
    });
  } catch {
    // ignore
  }

  const seedNow = new Date();
  const startOfDayUtc = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

  const integrationSeeds = [
    {
      provider: 'facebook',
      type: 'oauth',
      name: 'Facebook Ads',
    },
    {
      provider: 'googleads',
      type: 'oauth',
      name: 'Google Ads',
    },
    {
      provider: 'line',
      type: 'oauth',
      name: 'LINE OA',
    },
    {
      provider: 'tiktok',
      type: 'oauth',
      name: 'TikTok Ads',
    },
  ] as const;

  const integrations: Array<{ id: string; provider: string }> = [];
  for (const integration of integrationSeeds) {
    const existing = await prisma.integration.findFirst({
      where: { tenantId: tenant.id, provider: integration.provider },
      select: { id: true, provider: true },
    });

    if (existing) {
      const updated = await prisma.integration.update({
        where: { id: existing.id },
        data: {
          type: integration.type,
          name: integration.name,
          credentials: {},
          config: {},
          status: 'active',
          isActive: true,
          lastSyncAt: seedNow,
          syncFrequencyMinutes: 15,
        },
        select: { id: true, provider: true },
      });
      integrations.push(updated);
      continue;
    }

    const created = await prisma.integration.create({
      data: {
        tenantId: tenant.id,
        provider: integration.provider,
        type: integration.type,
        name: integration.name,
        credentials: {},
        config: {},
        status: 'active',
        isActive: true,
        lastSyncAt: seedNow,
        syncFrequencyMinutes: 15,
      },
      select: { id: true, provider: true },
    });
    integrations.push(created);
  }

  await Promise.all(
    integrations.map((integration) =>
      prisma.integrationSyncState.upsert({
        where: { integrationId: integration.id },
        update: {
          tenantId: tenant.id,
          provider: integration.provider,
          cursor: {},
          lastAttemptAt: seedNow,
          lastSuccessAt: seedNow,
          nextRunAt: new Date(Date.now() + 15 * 60 * 1000),
        },
        create: {
          tenantId: tenant.id,
          integrationId: integration.id,
          provider: integration.provider,
          cursor: {},
          lastAttemptAt: seedNow,
          lastSuccessAt: seedNow,
          nextRunAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      })
    )
  );

  await seedMiniCompanyData({ tenant: companyTenant1, admin: adminFull1 });
  await seedMiniCompanyData({ tenant: companyTenant2, admin: adminFull2 });

  const campaignSeeds = Array.from({ length: 10 }, (_, index) => {
    const i = index + 1;
    const providers = ['facebook', 'googleads', 'line', 'tiktok'] as const;
    const provider = providers[index % providers.length];
    const platformByProvider: Record<(typeof providers)[number], string> = {
      facebook: 'Facebook',
      googleads: 'Google Ads',
      line: 'LINE',
      tiktok: 'TikTok',
    };
    const platform = platformByProvider[provider];
    const suffix = String(i).padStart(3, '0');
    return {
      platform,
      provider,
      externalId: `seed_${provider}_${suffix}`,
      name: `Seed Campaign - ${platform} ${suffix}`,
    };
  });

  const integrationByProvider = new Map(integrations.map((i) => [i.provider, i] as const));
  const campaigns = await Promise.all(
    campaignSeeds.map(async (seed) => {
      const integration = integrationByProvider.get(seed.provider);
      return prisma.campaign.upsert({
        where: {
          tenantId_platform_externalId: {
            tenantId: tenant.id,
            platform: seed.platform,
            externalId: seed.externalId,
          },
        },
        update: {
          tenantId: tenant.id,
          integrationId: integration?.id || null,
          name: seed.name,
          status: 'active',
          currency: 'THB',
          budget: new Prisma.Decimal(50000),
          budgetType: 'daily',
          objective: 'conversion',
          campaignType: 'seed',
          startDate: startOfDayUtc('2026-01-01'),
          endDate: null,
        },
        create: {
          tenantId: tenant.id,
          integrationId: integration?.id || null,
          platform: seed.platform,
          externalId: seed.externalId,
          name: seed.name,
          status: 'active',
          currency: 'THB',
          budget: new Prisma.Decimal(50000),
          budgetType: 'daily',
          objective: 'conversion',
          campaignType: 'seed',
          startDate: startOfDayUtc('2026-01-01'),
          endDate: null,
        },
      });
    })
  );

  const metricDays = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07'];
  const metricSource = 'seed';
  await Promise.all(
    campaigns.flatMap((campaign, idx) =>
      metricDays.map((dayIso, dayIdx) => {
        const impressions = 20000 + idx * 3500 + dayIdx * 1100;
        const clicks = Math.max(120, Math.round(impressions * (0.012 + idx * 0.002)));
        const conversions = Math.max(4, Math.round(clicks * (0.028 + (dayIdx % 3) * 0.005)));
        const spendValue = Math.round((12000 + idx * 2500 + dayIdx * 900) * 100) / 100;
        const spend = new Prisma.Decimal(spendValue);
        const revenue = new Prisma.Decimal(Math.round((spendValue * (2.1 + (idx % 3) * 0.4)) * 100) / 100);

        const productNames = ['Wireless Earbuds Pro', 'Smart Watch Series 5', 'Premium Phone Case', 'Eco Water Bottle', 'Running Shoes', 'Skincare Serum'];
        const categories = ['Electronics', 'Electronics', 'Accessories', 'Lifestyle', 'Sports', 'Beauty'];
        const productIndex = (idx + dayIdx) % productNames.length;
        const productName = productNames[productIndex];
        const category = categories[productIndex] || 'Uncategorized';
        const creativeName = `Creative ${campaign.platform} ${String(productIndex + 1).padStart(2, '0')}`;
        const creativeType = (productIndex % 3 === 0 ? 'Video' : productIndex % 3 === 1 ? 'Carousel' : 'Banner');
        const videoId = `seed_video_${campaign.id.slice(0, 8)}_${String(dayIdx + 1).padStart(2, '0')}`;

        const metadata: Prisma.InputJsonValue = {
          seedKey: `metric:${campaign.externalId}:${dayIso}`,
          productName,
          category,
          stock: 20 + ((idx * 7 + dayIdx * 3) % 120),
          status: idx % 4 === 0 ? 'BEST SELLER' : idx % 4 === 1 ? 'TOP PRODUCT' : 'PERFORMING',
          creativeId: `seed_creative_${campaign.id.slice(0, 8)}_${productIndex}`,
          creativeName,
          creativeType,
          reach: impressions,
          reactions: Math.max(0, Math.round(clicks * 0.12)),
          cta: productIndex % 2 === 0 ? 'Shop' : 'Learn',
          videoId,
          videoPlatform: campaign.platform,
          videoCampaign: campaign.name,
          videoFormat: 'Vertical 9:16',
          videoLength: productIndex % 2 === 0 ? '15s' : '30s',
          views: Math.max(0, Math.round(impressions * 0.18)),
          completionRate: `${Math.max(35, Math.min(95, Math.round(55 + (idx % 5) * 6)))}%`,
          videoCtr: `${(impressions > 0 ? (clicks / impressions) * 100 : 0).toFixed(1)}%`,
          videoStatus: idx % 3 === 0 ? 'Active' : idx % 3 === 1 ? 'Learning' : 'Paused',
        };

        return prisma.metric.upsert({
          where: {
            tenantId_campaignId_date_hour_platform_source: {
              tenantId: tenant.id,
              campaignId: campaign.id,
              date: startOfDayUtc(dayIso),
              hour: 0,
              platform: campaign.platform,
              source: metricSource,
            },
          },
          update: {
            tenantId: tenant.id,
            campaignId: campaign.id,
            date: startOfDayUtc(dayIso),
            hour: 0,
            platform: campaign.platform,
            source: metricSource,
            impressions,
            clicks,
            conversions,
            spend,
            revenue,
            orders: conversions,
            metadata,
          },
          create: {
            tenantId: tenant.id,
            campaignId: campaign.id,
            date: startOfDayUtc(dayIso),
            hour: 0,
            platform: campaign.platform,
            source: metricSource,
            impressions,
            clicks,
            conversions,
            spend,
            revenue,
            orders: conversions,
            metadata,
          },
        });
      })
    )
  );

  // Seed GA4 metrics (campaignId = null) so SEO dashboard endpoints can aggregate real DB data.
  for (let dayIdx = 0; dayIdx < metricDays.length; dayIdx += 1) {
    const dayIso = metricDays[dayIdx];
    const seedKey = `ga4:${dayIso}`;
    const sessions = 4200 + dayIdx * 260;
    const bounceRate = new Prisma.Decimal(Math.max(0.22, Math.min(0.68, 0.48 - dayIdx * 0.01)));
    const avgSessionDuration = 75 + dayIdx * 3;
    const revenueValue = 120000 + dayIdx * 8000;
    const orders = 60 + dayIdx * 4;

    const existing = await prisma.metric.findFirst({
      where: {
        tenantId: tenant.id,
        campaignId: null,
        date: startOfDayUtc(dayIso),
        hour: 0,
        platform: 'ga4',
        source: metricSource,
      },
      select: { id: true },
    });

    const payload = {
      tenantId: tenant.id,
      campaignId: null,
      date: startOfDayUtc(dayIso),
      hour: 0,
      platform: 'ga4',
      source: metricSource,
      organicTraffic: sessions,
      bounceRate,
      avgSessionDuration,
      revenue: new Prisma.Decimal(revenueValue),
      orders,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: new Prisma.Decimal(0),
      metadata: { seedKey },
    };

    if (existing) {
      await prisma.metric.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await prisma.metric.create({
        data: payload,
      });
    }
  }

  const reportSeeds = Array.from({ length: 10 }, (_, index) => {
    const i = index + 1;
    const suffix = String(i).padStart(3, '0');
    const types = ['overview', 'campaign', 'seo', 'commerce', 'crm'] as const;
    const reportType = types[index % types.length];
    return {
      name: `Seed Report ${suffix} (${reportType})`,
      reportType,
    };
  });

  for (const report of reportSeeds) {
    const existing = await prisma.report.findFirst({
      where: { tenantId: tenant.id, name: report.name, reportType: report.reportType },
      select: { id: true },
    });

    if (existing) {
      await prisma.report.update({
        where: { id: existing.id },
        data: {
          createdBy: adminFull.id,
          description: 'Seeded report entry',
          dateRangeType: 'last_7d',
          startDate: startOfDayUtc('2026-01-01'),
          endDate: startOfDayUtc('2026-01-07'),
          filters: {},
          metrics: [],
          isScheduled: false,
          exportFormat: 'pdf',
        },
      });
    } else {
      await prisma.report.create({
        data: {
          tenantId: tenant.id,
          createdBy: adminFull.id,
          name: report.name,
          reportType: report.reportType,
          description: 'Seeded report entry',
          dateRangeType: 'last_7d',
          startDate: startOfDayUtc('2026-01-01'),
          endDate: startOfDayUtc('2026-01-07'),
          filters: {},
          metrics: [],
          isScheduled: false,
          exportFormat: 'pdf',
        },
      });
    }
  }

  const auditSeeds = Array.from({ length: 10 }, (_, index) => {
    const i = index + 1;
    const actions = ['login', 'create', 'update', 'delete', 'sync'] as const;
    const entityTypes = ['user', 'campaign', 'integration', 'report'] as const;

    const action = actions[index % actions.length];
    const entityType = entityTypes[index % entityTypes.length];
    const entityId =
      entityType === 'user'
        ? adminFull.id
        : entityType === 'campaign'
          ? campaigns[index % campaigns.length]?.id
          : entityType === 'integration'
            ? integrations[index % integrations.length]?.id
            : null;

    return { action, entityType, entityId };
  });

  for (const log of auditSeeds) {
    const entityId = log.entityId || null;
    const existing = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        userId: superAdmin.id,
        action: log.action,
        entityType: log.entityType,
        entityId,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.auditLog.update({
        where: { id: existing.id },
        data: {
          changes: {},
          ipAddress: '127.0.0.1',
          userAgent: 'seed',
        },
      });
    } else {
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: adminFull.id,
          action: log.action,
          entityType: log.entityType,
          entityId,
          changes: {},
          ipAddress: '127.0.0.1',
          userAgent: 'seed',
        },
      });
    }
  }

  for (let index = 0; index < 10; index += 1) {
    const integration = integrations[index % integrations.length];
    const seedKey = `syncHistory:${String(index + 1).padStart(3, '0')}`;

    const existing = await prisma.syncHistory.findFirst({
      where: {
        tenantId: tenant.id,
        integrationId: integration.id,
        platform: integration.provider,
        data: {
          path: ['seedKey'],
          equals: seedKey,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.syncHistory.update({
        where: { id: existing.id },
        data: {
          status: 'success',
          data: { seeded: true, seedKey },
          error: null,
          syncedAt: seedNow,
        },
      });
    } else {
      await prisma.syncHistory.create({
        data: {
          tenantId: tenant.id,
          integrationId: integration.id,
          platform: integration.provider,
          status: 'success',
          data: { seeded: true, seedKey },
          error: null,
          syncedAt: seedNow,
        },
      });
    }
  }

  const integrationNotificationSeeds = Array.from({ length: 10 }, (_, index) => {
    const i = index + 1;
    const providers = ['facebook', 'googleads', 'line', 'tiktok'] as const;
    const platform = providers[index % providers.length];
    const suffix = String(i).padStart(3, '0');
    const severities = ['info', 'warning', 'critical'] as const;
    const statuses = ['open', 'resolved'] as const;
    const severity = severities[index % severities.length];
    const status = statuses[index % statuses.length];
    return {
      seedKey: `integrationNotification:${platform}:${suffix}`,
      platform,
      title: `Seed Notification ${suffix} (${platform})`,
      severity,
      status,
    };
  });

  for (const n of integrationNotificationSeeds) {
    const integration = integrationByProvider.get(n.platform);
    const existing = await prisma.integrationNotification.findFirst({
      where: {
        tenantId: tenant.id,
        platform: n.platform,
        metadata: {
          path: ['seedKey'],
          equals: n.seedKey,
        },
      },
      select: { id: true },
    });

    const payload = {
      tenantId: tenant.id,
      integrationId: integration?.id || null,
      platform: n.platform,
      severity: n.severity,
      status: n.status,
      title: n.title,
      reason: 'Seeded notification',
      metadata: { seedKey: n.seedKey },
      resolvedAt: n.status === 'resolved' ? seedNow : null,
    };

    if (existing) {
      await prisma.integrationNotification.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await prisma.integrationNotification.create({
        data: payload,
      });
    }
  }

  const leadSeeds = Array.from({ length: 10 }, (_, index) => {
    const i = index + 1;
    const suffix = String(i).padStart(3, '0');
    const statuses = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;
    const stages = ['qualified', 'proposal', 'negotiation', 'closing', 'followup'] as const;
    return {
      name: `Seed Lead ${suffix}`,
      company: `Seed Company ${suffix}`,
      status: statuses[index % statuses.length],
      stage: stages[index % stages.length],
      email: `lead${suffix}@example.com`,
    };
  });

  for (const lead of leadSeeds) {
    const existing = await prisma.lead.findFirst({
      where: { tenantId: tenant.id, email: lead.email },
      select: { id: true },
    });

    if (existing) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          name: lead.name,
          company: lead.company,
          status: lead.status,
          stage: lead.stage,
          source: 'seed',
        },
      });
    } else {
      await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          name: lead.name,
          company: lead.company,
          status: lead.status,
          stage: lead.stage,
          email: lead.email,
          source: 'seed',
        },
      });
    }
  }

  await Promise.all(
    [
      {
        metricType: 'traffic',
        externalKey: 'seed_sessions',
        label: 'Sessions',
        numericValue: new Prisma.Decimal(12450),
      },
      {
        metricType: 'keyword',
        externalKey: 'seed_keyword_rga',
        label: 'rga dashboard',
        numericValue: new Prisma.Decimal(72),
      },
    ].map((row) =>
      prisma.seoMetric.upsert({
        where: {
          tenantId_metricType_externalKey: {
            tenantId: tenant.id,
            metricType: row.metricType,
            externalKey: row.externalKey,
          },
        },
        update: {
          label: row.label,
          date: startOfDayUtc('2026-01-07'),
          numericValue: row.numericValue,
          metadata: {},
        },
        create: {
          tenantId: tenant.id,
          metricType: row.metricType,
          externalKey: row.externalKey,
          label: row.label,
          date: startOfDayUtc('2026-01-07'),
          numericValue: row.numericValue,
          metadata: {},
        },
      })
    )
  );

  // Seed 10 Google Search Console-like rows for SEO dashboard calculations.
  const gscSeedRows = Array.from({ length: 10 }, (_, index) => {
    const i = index + 1;
    const suffix = String(i).padStart(3, '0');
    const clicks = 80 + index * 12;
    const impressions = 1200 + index * 180;
    const position = Math.max(1.2, 18 - index * 1.2);
    return {
      metricType: 'search_performance',
      externalKey: `seed_gsc_${suffix}`,
      label: `keyword_${suffix}`,
      date: startOfDayUtc(metricDays[Math.min(metricDays.length - 1, index % metricDays.length)]),
      metadata: {
        query: `keyword_${suffix}`,
        page: `/landing/${suffix}`,
        device: index % 2 === 0 ? 'mobile' : 'desktop',
        country: index % 3 === 0 ? 'TH' : index % 3 === 1 ? 'SG' : 'MY',
        clicks,
        impressions,
        position,
      },
    };
  });

  await Promise.all(
    gscSeedRows.map((row) =>
      prisma.seoMetric.upsert({
        where: {
          tenantId_metricType_externalKey: {
            tenantId: tenant.id,
            metricType: row.metricType,
            externalKey: row.externalKey,
          },
        },
        update: {
          label: row.label,
          date: row.date,
          numericValue: new Prisma.Decimal(Number(row.metadata.impressions || 0)),
          metadata: row.metadata as any,
        },
        create: {
          tenantId: tenant.id,
          metricType: row.metricType,
          externalKey: row.externalKey,
          label: row.label,
          date: row.date,
          numericValue: new Prisma.Decimal(Number(row.metadata.impressions || 0)),
          metadata: row.metadata as any,
        },
      })
    )
  );

  // Example alert
  // Create an example alert if not exists for this tenant
  const existingAlert = await prisma.alert.findFirst({
    where: { tenantId: tenant.id, name: 'Low CTR', metric: 'ctr', operator: '<' }
  });
  if (!existingAlert) {
    await prisma.alert.create({
      data: {
        tenantId: tenant.id,
        name: 'Low CTR',
        alertType: 'threshold',
        metric: 'ctr',
        operator: '<',
        threshold: new Prisma.Decimal(0.5),
        isActive: true,
        recipients: JSON.parse('["superadmin@rga.local"]'),
        notificationChannels: JSON.parse('["email"]'),
      },
    });
  }

  const uiAssets = [
    {
      name: 'Overview Dashboard',
      category: 'dashboard',
      description: 'High-level analytics cockpit mockup',
      fileName: 'Overview.jpg',
      filePath: '/uxui/Overview.jpg',
      tags: ['overview', 'dashboard', 'analytics'],
    },
    {
      name: 'Checklist Experience',
      category: 'onboarding',
      description: 'Integration checklist layout',
      fileName: 'Checklist.jpg',
      filePath: '/uxui/Checklist.jpg',
      tags: ['checklist', 'integration'],
    },
    {
      name: 'Login Experience',
      category: 'auth',
      description: 'Dark glitter login concept',
      fileName: 'LOGIN.jpg',
      filePath: '/uxui/LOGIN.jpg',
      tags: ['auth', 'login'],
    },
    {
      name: 'Campaign - Google Ads',
      category: 'campaign',
      description: 'Google Ads campaign analytics section',
      fileName: 'Campaign (Google Adds).jpg',
      filePath: '/uxui/Campaign (Google Adds).jpg',
      tags: ['campaign', 'google', 'ads'],
    },
    {
      name: 'Campaign - Facebook Ads',
      category: 'campaign',
      description: 'Facebook Ads campaign analytics section',
      fileName: 'Campaign (Facebook Adds).jpg',
      filePath: '/uxui/Campaign (Facebook Adds).jpg',
      tags: ['campaign', 'facebook', 'ads'],
    },
    {
      name: 'Campaign - LINE Ads',
      category: 'campaign',
      description: 'LINE Ads campaign analytics section',
      fileName: 'Campaign (Line Adds).jpg',
      filePath: '/uxui/Campaign (Line Adds).jpg',
      tags: ['campaign', 'line', 'ads'],
    },
    {
      name: 'Campaign - TikTok Ads',
      category: 'campaign',
      description: 'TikTok Ads campaign analytics section',
      fileName: 'Campaign (TIKTOK Adds).jpg',
      filePath: '/uxui/Campaign (TIKTOK Adds).jpg',
      tags: ['campaign', 'tiktok', 'ads'],
    },
    {
      name: 'CRM & Leads',
      category: 'crm',
      description: 'CRM pipeline and leads tracking UI',
      fileName: 'CRM & Leads.jpg',
      filePath: '/uxui/CRM & Leads.jpg',
      tags: ['crm', 'leads'],
    },
    {
      name: 'E-commerce Overview',
      category: 'commerce',
      description: 'E-commerce metrics snapshot',
      fileName: 'E-commerce.jpg',
      filePath: '/uxui/E-commerce.jpg',
      tags: ['commerce', 'orders'],
    },
    {
      name: 'SEO & Web Analytics',
      category: 'seo',
      description: 'SEO visibility and traffic cards',
      fileName: 'SEO & Web Analytics.jpg',
      filePath: '/uxui/SEO & Web Analytics.jpg',
      tags: ['seo', 'web'],
    },
    {
      name: 'Trend Analysis',
      category: 'insight',
      description: 'Trends and anomalies visualization',
      fileName: 'Trend Analysis.jpg',
      filePath: '/uxui/Trend Analysis.jpg',
      tags: ['trend', 'analysis'],
    },
    {
      name: 'Reporting Center',
      category: 'report',
      description: 'Reports library concept',
      fileName: 'Report.jpg',
      filePath: '/uxui/Report.jpg',
      tags: ['report', 'export'],
    },
    {
      name: 'Settings & Profile',
      category: 'settings',
      description: 'Settings management UI',
      fileName: 'Setting.jpg',
      filePath: '/uxui/Setting.jpg',
      tags: ['settings', 'profile'],
    },
  ];

  await Promise.all(
    uiAssets.map((asset) =>
      prisma.uiAsset.upsert({
        where: {
          tenantId_fileName: {
            tenantId: tenant.id,
            fileName: asset.fileName,
          },
        },
        update: {
          name: asset.name,
          category: asset.category,
          description: asset.description,
          filePath: asset.filePath,
          tags: asset.tags,
        },
        create: {
          tenantId: tenant.id,
          ...asset,
        },
      })
    )
  );

  console.log('Seed complete:', { tenant: tenant.slug, superAdmin: superAdmin.email });
  console.log('Login credentials (DEV):');
  console.table([
    { role: 'super_admin', email: buildSeedEmail('superadmin', process.env.SEED_SUPER_ADMIN_EMAIL), password: superAdminPassword },
    { role: 'admin_full', email: buildSeedEmail('adminfull', process.env.SEED_ADMIN_FULL_EMAIL), password: buildSeedPassword('AdminFull@123', process.env.SEED_ADMIN_FULL_PASSWORD) },
    { role: 'admin_full', email: buildSeedEmail('adminfull1', process.env.SEED_ADMIN_FULL_1_EMAIL), password: buildSeedPassword('AdminFull1@123', process.env.SEED_ADMIN_FULL_1_PASSWORD) },
    { role: 'admin_full', email: buildSeedEmail('adminfull2', process.env.SEED_ADMIN_FULL_2_EMAIL), password: buildSeedPassword('AdminFull2@123', process.env.SEED_ADMIN_FULL_2_PASSWORD) },
    {
      role: 'admintest',
      email: buildSeedEmail('admintest', process.env.SEED_ADMIN_TEST_EMAIL || process.env.SEED_ADMIN_MESS_EMAIL),
      password: buildSeedPassword('AdminTest@123', process.env.SEED_ADMIN_TEST_PASSWORD || process.env.SEED_ADMIN_MESS_PASSWORD),
    },
    { role: 'manager', email: buildSeedEmail('manager', process.env.SEED_MANAGER_EMAIL), password: buildSeedPassword('Manager@123', process.env.SEED_MANAGER_PASSWORD) },
    { role: 'viewer', email: buildSeedEmail('viewer', process.env.SEED_VIEWER_EMAIL), password: buildSeedPassword('Viewer@123', process.env.SEED_VIEWER_PASSWORD) },
    { role: 'manager', email: buildSeedEmail('manager1', process.env.SEED_MANAGER_1_EMAIL), password: buildSeedPassword('Manager1@123', process.env.SEED_MANAGER_1_PASSWORD) },
    { role: 'user', email: buildSeedEmail('user1', process.env.SEED_USER_1_EMAIL), password: buildSeedPassword('User1@123', process.env.SEED_USER_1_PASSWORD) },
    { role: 'viewer', email: buildSeedEmail('viewer1', process.env.SEED_VIEWER_1_EMAIL), password: buildSeedPassword('Viewer1@123', process.env.SEED_VIEWER_1_PASSWORD) },
    { role: 'manager', email: buildSeedEmail('manager2', process.env.SEED_MANAGER_2_EMAIL), password: buildSeedPassword('Manager2@123', process.env.SEED_MANAGER_2_PASSWORD) },
    { role: 'user', email: buildSeedEmail('user2', process.env.SEED_USER_2_EMAIL), password: buildSeedPassword('User2@123', process.env.SEED_USER_2_PASSWORD) },
    { role: 'viewer', email: buildSeedEmail('viewer2', process.env.SEED_VIEWER_2_EMAIL), password: buildSeedPassword('Viewer2@123', process.env.SEED_VIEWER_2_PASSWORD) },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
