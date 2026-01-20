import { Integration, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

// FLOW START: Mock Shopee Sync Service (EN)
// จุดเริ่มต้น: Service ซิงค์ Mock Shopee (TH)

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals = 2): Prisma.Decimal {
  const val = Math.random() * (max - min) + min;
  return new Prisma.Decimal(val.toFixed(decimals));
}

function parseJson<T = any>(value: any, fallback: T): T {
  try {
    if (!value) return fallback;
    return typeof value === 'string' ? JSON.parse(value) : (value as T);
  } catch {
    return fallback;
  }
}

const products = [
  { name: 'Wireless Earbuds Pro', category: 'Electronics' },
  { name: 'Smart Watch Series 5', category: 'Electronics' },
  { name: 'Premium Phone Case', category: 'Accessories' },
  { name: 'USB-C Cable 2m', category: 'Accessories' },
  { name: 'Laptop Stand Aluminum', category: 'Office' },
];

const creatives = [
  { id: 'creative-001', name: 'Search | Product A', type: 'Video', cta: 'Shop' },
  { id: 'creative-002', name: 'Shopping | Electronics', type: 'Carousel', cta: 'View' },
  { id: 'creative-003', name: 'Display | Retargeting', type: 'Banner', cta: 'Learn' },
];

export async function sync(integration: Integration) {
  const config = parseJson<any>(integration.config, {});
  const lookbackDays = Number(config.lookbackDays || 30);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (lookbackDays - 1));

  // Shopee usually commerce orders; we create a single pseudo campaign to attach metrics to
  const camp = await prisma.campaign.upsert({
    where: {
      tenantId_platform_externalId: {
        tenantId: integration.tenantId,
        platform: 'shopee',
        externalId: 'mock_shopee_store',
      },
    },
    update: {
      name: 'Shopee Store',
      status: 'active',
      objective: 'SALES',
      budget: randomDecimal(200, 3000),
      budgetType: 'lifetime',
    },
    create: {
      tenantId: integration.tenantId,
      integrationId: integration.id,
      externalId: 'mock_shopee_store',
      name: 'Shopee Store',
      platform: 'shopee',
      status: 'active',
      objective: 'SALES',
      budget: randomDecimal(200, 3000),
      budgetType: 'lifetime',
      currency: 'THB',
      startDate: start,
    },
  });

  // Daily metrics
  let metricDays = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    day.setUTCHours(0, 0, 0, 0);
    const existing = await prisma.metric.findFirst({
      where: {
        tenantId: integration.tenantId,
        campaignId: camp.id,
        date: day as any,
        hour: null,
        platform: 'shopee',
        source: 'shopee',
      },
      select: { id: true },
    });

    const orders = randomBetween(0, 40);
    const aov = randomDecimal(150, 900);
    const revenue = new Prisma.Decimal((Number(aov) * orders).toFixed(2));

    const product = products[randomBetween(0, products.length - 1)];
    const creative = creatives[randomBetween(0, creatives.length - 1)];
    const stock = randomBetween(0, 240);
    const views = randomBetween(5000, 180000);
    const completionRate = `${randomBetween(35, 85)}%`;
    const videoCtr = `${(randomBetween(12, 60) / 10).toFixed(1)}%`;

    const payload = {
      impressions: randomBetween(1000, 8000),
      clicks: randomBetween(50, 1000),
      conversions: orders,
      orders: orders,
      averageOrderValue: aov,
      spend: randomDecimal(20, 500),
      revenue: revenue,
      metadata: {
        mock: true,
        productName: product.name,
        category: product.category,
        stock,
        creativeId: creative.id,
        creativeName: creative.name,
        creativeType: creative.type,
        reach: randomBetween(5000, 90000),
        reactions: randomBetween(10, 1200),
        cta: creative.cta,
        videoId: `video-${product.name.replace(/\s+/g, '-').toLowerCase()}`,
        videoCampaign: 'Spark Ads • Mega Sale',
        videoPlatform: 'TikTok',
        videoFormat: 'Vertical 9:16',
        videoLength: '15s',
        views,
        completionRate,
        videoCtr,
        videoStatus: orders > 0 ? 'Active' : 'Paused',
      },
    } as const;

    if (existing) {
      const updated = await prisma.metric.updateMany({
        where: { id: existing.id, tenantId: integration.tenantId },
        data: payload as any,
      });
      if (!updated.count) {
        await prisma.metric.create({
          data: {
            tenantId: integration.tenantId,
            campaignId: camp.id,
            date: day as any,
            hour: null,
            platform: 'shopee',
            source: 'shopee',
            ...payload,
          } as any,
        });
      }
    } else {
      await prisma.metric.create({
        data: {
          tenantId: integration.tenantId,
          campaignId: camp.id,
          date: day as any,
          hour: null,
          platform: 'shopee',
          source: 'shopee',
          ...payload,
        } as any,
      });
    }
    metricDays += 1;
  }

  return {
    status: 'ok',
    provider: 'shopee',
    integrationId: integration.id,
    mock: true,
    campaigns: 1,
    metricDays,
    days: lookbackDays,
  };
}

// FLOW END: Mock Shopee Sync Service (EN)
// จุดสิ้นสุด: Service ซิงค์ Mock Shopee (TH)
