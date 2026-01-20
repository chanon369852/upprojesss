import { Response } from 'express';
import { TenantRequest } from '../middleware/tenant.middleware';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';

const toNumber = (value: any): number => {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value?.toString === 'function') {
    const n = Number(value.toString());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

// FLOW START: Campaign Controller (EN)
// จุดเริ่มต้น: Controller ของ Campaign (TH)

export const getCampaigns = async (req: TenantRequest, res: Response) => {
  const { platform, status, page = 1, limit = 20 } = req.query;

  const where = {
    tenantId: req.tenantId!,
    ...(platform && { platform: platform as string }),
    ...(status && { status: status as string }),
  };

  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      integration: {
        select: { name: true, type: true },
      },
      metrics: {
        orderBy: { date: 'desc' },
        take: 7,
        select: {
          id: true,
          date: true,
          impressions: true,
          clicks: true,
          conversions: true,
          spend: true,
          revenue: true,
          orders: true,
        },
      },
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
  });

  const total = await prisma.campaign.count({ where });

  res.json({ campaigns, total, page: Number(page), limit: Number(limit) });
};

export const getCampaignById = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      tenantId: req.tenantId!,
    },
    include: {
      integration: true,
      metrics: {
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  });

  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }

  res.json({ campaign });
};

export const createCampaign = async (req: TenantRequest, res: Response) => {
  if (req.userRole !== 'super_admin' && req.userRole !== 'admin_full') {
    throw new AppError('Insufficient permissions', 403);
  }

  const campaign = await prisma.campaign.create({
    data: {
      ...req.body,
      tenantId: req.tenantId!,
    },
  });

  res.status(201).json({ campaign });
};

export const updateCampaign = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  if (req.userRole !== 'super_admin' && req.userRole !== 'admin_full') {
    throw new AppError('Insufficient permissions', 403);
  }

  const campaign = await prisma.campaign.updateMany({
    where: {
      id,
      tenantId: req.tenantId!,
    },
    data: req.body,
  });

  res.json({ campaign });
};

export const deleteCampaign = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  if (req.userRole !== 'super_admin' && req.userRole !== 'admin_full') {
    throw new AppError('Insufficient permissions', 403);
  }

  await prisma.campaign.deleteMany({
    where: {
      id,
      tenantId: req.tenantId!,
    },
  });

  res.json({ message: 'Campaign deleted successfully' });
};

export const getCampaignMetrics = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  const metrics = await prisma.metric.findMany({
    where: {
      campaignId: id,
      tenantId: req.tenantId!,
      ...(startDate &&
        endDate && {
          date: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        }),
    },
    orderBy: { date: 'asc' },
  });

  res.json({
    success: true,
    data: metrics,
    meta: {
      campaignId: id,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      count: metrics.length,
    },
  });
};

export const getCampaignPerformance = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  // Aggregate metrics
  const performance = await prisma.metric.aggregate({
    where: {
      campaignId: id,
      tenantId: req.tenantId!,
    },
    _sum: {
      impressions: true,
      clicks: true,
      conversions: true,
      spend: true,
      revenue: true,
    },
    _avg: {
      ctr: true,
      conversionRate: true,
      roas: true,
    },
  });

  res.json({
    success: true,
    data: {
      ...performance,
      _sum: {
        impressions: performance._sum.impressions ?? 0,
        clicks: performance._sum.clicks ?? 0,
        conversions: performance._sum.conversions ?? 0,
        spend: toNumber(performance._sum.spend),
        revenue: toNumber(performance._sum.revenue),
      },
      _avg: {
        ctr: toNumber(performance._avg.ctr),
        conversionRate: toNumber(performance._avg.conversionRate),
        roas: toNumber(performance._avg.roas),
      },
    },
    meta: { campaignId: id },
  });
};

export const getCampaignInsights = async (req: TenantRequest, res: Response) => {
  const { period = '30d', startDate: startDateRaw, endDate: endDateRaw } = req.query as any;
  const now = new Date();
  const end = typeof endDateRaw === 'string' ? new Date(endDateRaw) : now;

  if (String(req.userRole || '').toLowerCase() === 'admintest') {
    res.json({
      success: true,
      data: [
        {
          id: 'google',
          label: 'Google Ads',
          logo: 'https://cdn.simpleicons.org/google/ea4335',
          accent: '#ea4335',
          summary: [
            { id: 'google-total', label: 'Total Campaigns', value: '0', delta: '—', positive: true },
            { id: 'google-spend', label: 'Total SpendRate', value: '$0', delta: '—', positive: true },
            { id: 'google-conv', label: 'Total Conversions', value: '0', delta: '—', positive: true },
            { id: 'google-roi', label: 'Avg. ROI', value: '0%', delta: '—', positive: true },
          ],
          campaigns: [],
          ageRange: [],
          genderDistribution: [],
          conversionRate: [],
          adPerformance: [],
          creatives: [],
        },
      ],
      meta: {
        period: String(period),
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        sources: 1,
      },
    });
    return;
  }

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const start = (() => {
    if (typeof startDateRaw === 'string') {
      const parsed = new Date(startDateRaw);
      if (!Number.isNaN(parsed.getTime())) return startOfDay(parsed);
    }
    const key = String(period || '30d').toLowerCase();
    const days = key === '7d' ? 7 : key === '90d' ? 90 : key === '365d' ? 365 : 30;
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1));
    return startOfDay(d);
  })();

  const metricRows = await prisma.metric.groupBy({
    by: ['campaignId'],
    where: {
      tenantId: req.tenantId!,
      campaignId: { not: null },
      date: { gte: start, lte: end },
    },
    _sum: {
      impressions: true,
      clicks: true,
      conversions: true,
      spend: true,
      revenue: true,
      orders: true,
    },
  });

  const campaignIds = metricRows
    .map((r: any) => (typeof r.campaignId === 'string' ? r.campaignId : null))
    .filter(Boolean) as string[];

  const campaigns = campaignIds.length
    ? await prisma.campaign.findMany({
        where: { tenantId: req.tenantId!, id: { in: campaignIds } },
        select: { id: true, name: true, platform: true, status: true, budget: true, createdAt: true, startDate: true },
      })
    : [];

  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  const sourceIdForPlatform = (platform: string) => {
    const p = String(platform || '').toLowerCase();
    if (p === 'ga4' || p.includes('analytics')) return 'google-analytics';
    if (p.includes('google')) return 'google';
    if (p.includes('facebook') || p.includes('meta')) return 'facebook';
    if (p.includes('tiktok')) return 'tiktok';
    if (p.includes('line')) return 'line';
    if (p.includes('shopee')) return 'shopee';
    return p || 'other';
  };

  const metaBySourceId: Record<string, { label: string; logo: string; accent: string }> = {
    google: { label: 'Google Ads', logo: 'https://cdn.simpleicons.org/google/ea4335', accent: '#ea4335' },
    'google-analytics': { label: 'Google Analytics', logo: 'https://cdn.simpleicons.org/googleanalytics/f9ab00', accent: '#f9ab00' },
    facebook: { label: 'Facebook Ads', logo: 'https://cdn.simpleicons.org/facebook/3b82f6', accent: '#1877f2' },
    tiktok: { label: 'TikTok Ads', logo: 'https://cdn.simpleicons.org/tiktok/FFFFFF', accent: '#111827' },
    line: { label: 'LINE', logo: 'https://cdn.simpleicons.org/line/06C755', accent: '#06C755' },
    shopee: { label: 'Shopee', logo: 'https://cdn.simpleicons.org/shopee/f97316', accent: '#f97316' },
  };

  const bySource = new Map<string, any[]>();

  const num = (v: any) => toNumber(v);

  for (const row of metricRows as any[]) {
    const campaignId = String(row.campaignId);
    const camp = campaignById.get(campaignId);
    if (!camp) continue;

    const impressions = Number(row._sum?.impressions ?? 0);
    const clicks = Number(row._sum?.clicks ?? 0);
    const conversions = Number(row._sum?.conversions ?? 0);
    const spend = num(row._sum?.spend);
    const revenue = num(row._sum?.revenue);
    const profit = revenue - spend;
    const roi = spend > 0 ? (profit / spend) * 100 : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

    const when = camp.startDate || camp.createdAt;
    const date = when instanceof Date ? when.toISOString().slice(0, 10) : '';

    const sourceId = sourceIdForPlatform(String(camp.platform || ''));
    const list = bySource.get(sourceId) || [];
    list.push({
      id: camp.id,
      name: camp.name,
      date,
      status: String(camp.status || 'active').toLowerCase(),
      budget: num(camp.budget),
      spent: Math.round(spend),
      conversions,
      roi: Math.round(roi * 10) / 10,
      roas: Math.round(roas * 100) / 100,
      impressions,
      clicks,
      ctr: Math.round(ctr * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      cpm: Math.round(cpm * 100) / 100,
    });
    bySource.set(sourceId, list);
  }

  const sources = Array.from(bySource.entries()).map(([sourceId, campaignList]) => {
    const meta = metaBySourceId[sourceId] || { label: sourceId.toUpperCase(), logo: '', accent: '#94a3b8' };

    const totalCampaigns = campaignList.length;
    const totalSpend = campaignList.reduce((sum, c) => sum + Number(c.spent || 0), 0);
    const totalConversions = campaignList.reduce((sum, c) => sum + Number(c.conversions || 0), 0);
    const avgRoi = totalCampaigns > 0 ? campaignList.reduce((sum, c) => sum + Number(c.roi || 0), 0) / totalCampaigns : 0;

    const summary = [
      { id: `${sourceId}-total`, label: 'Total Campaigns', value: String(totalCampaigns), delta: '—', positive: true },
      { id: `${sourceId}-spend`, label: 'Total SpendRate', value: `$${Math.round(totalSpend).toLocaleString('en-US')}`, delta: '—', positive: true },
      { id: `${sourceId}-conv`, label: 'Total Conversions', value: totalConversions.toLocaleString('en-US'), delta: '—', positive: true },
      { id: `${sourceId}-roi`, label: 'Avg. ROI', value: `${Math.round(avgRoi)}%`, delta: '—', positive: avgRoi >= 0 },
    ];

    const adPerformance = campaignList.map((c) => ({
      campaign: c.name,
      spend: Number(c.spent || 0),
      impressions: Number(c.impressions || 0),
      clicks: Number(c.clicks || 0),
      ctr: Number(c.ctr || 0),
      cpc: Number(c.cpc || 0),
      cpm: Number(c.cpm || 0),
    }));

    const conversionRate = campaignList.map((c) => ({
      label: c.name,
      value: Number(c.conversions || 0) > 0 && Number(c.clicks || 0) > 0 ? (Number(c.conversions) / Number(c.clicks)) * 100 : 0,
      color: meta.accent,
    }));

    return {
      id: sourceId,
      label: meta.label,
      logo: meta.logo,
      accent: meta.accent,
      summary,
      campaigns: campaignList,
      ageRange: [],
      genderDistribution: [],
      conversionRate,
      adPerformance,
      creatives: [],
    };
  });

  res.json({
    success: true,
    data: sources,
    meta: {
      period: String(period),
      start: start.toISOString(),
      end: end.toISOString(),
      sources: sources.length,
    },
  });
};

// FLOW END: Campaign Controller (EN)
// จุดสิ้นสุด: Controller ของ Campaign (TH)
