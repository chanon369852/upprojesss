import { Response } from 'express';
import { TenantRequest } from '../middleware/tenant.middleware';
import { prisma } from '../utils/prisma';

// FLOW START: SEO Controller (EN)
// จุดเริ่มต้น: Controller ของ SEO (TH)

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export const getSeoOverview = async (req: TenantRequest, res: Response) => {
  const { dateFrom, dateTo, limit } = req.query as any;
  const start = parseDate(dateFrom);
  const end = parseDate(dateTo);
  const topLimit = Math.max(1, Math.min(100, Number(limit) || 10));

  if (String(req.userRole || '').toLowerCase() === 'admintest') {
    res.json({
      success: true,
      data: {
        ga4: {
          sessions: 0,
          bounceRate: 0,
          avgSessionDuration: 0,
          revenue: 0,
          orders: 0,
          trend: [],
        },
        gsc: {
          clicks: 0,
          impressions: 0,
          ctr: 0,
          position: 0,
          topQueries: [],
          topPages: [],
          byDevice: [],
          byCountry: [],
        },
      },
      meta: {
        dateFrom: start ? start.toISOString() : undefined,
        dateTo: end ? end.toISOString() : undefined,
        limit: topLimit,
      },
    });
    return;
  }

  const whereMetric: any = { tenantId: req.tenantId!, platform: 'ga4', campaignId: null };
  if (start || end) {
    whereMetric.date = {} as any;
    if (start) whereMetric.date.gte = start;
    if (end) whereMetric.date.lte = end;
  }

  const ga4Metrics = await prisma.metric.findMany({
    where: whereMetric,
    orderBy: { date: 'asc' },
    select: {
      date: true,
      organicTraffic: true,
      bounceRate: true,
      avgSessionDuration: true,
      revenue: true,
      orders: true,
    },
  });

  const sessionsTotal = ga4Metrics.reduce((sum, m) => sum + Number(m.organicTraffic || 0), 0);
  const bounceRates = ga4Metrics.map((m) => Number(m.bounceRate || 0)).filter((v) => Number.isFinite(v));
  const avgDurations = ga4Metrics.map((m) => Number(m.avgSessionDuration || 0)).filter((v) => Number.isFinite(v));
  const revenueTotal = ga4Metrics.reduce((sum, m) => sum + Number(m.revenue || 0), 0);
  const ordersTotal = ga4Metrics.reduce((sum, m) => sum + Number(m.orders || 0), 0);
  const bounceRateAvg = bounceRates.length ? bounceRates.reduce((a, b) => a + b, 0) / bounceRates.length : 0;
  const avgSessionDuration = avgDurations.length ? Math.round(avgDurations.reduce((a, b) => a + b, 0) / avgDurations.length) : 0;

  const trend = ga4Metrics.map((m) => ({ date: m.date, sessions: Number(m.organicTraffic || 0) }));

  const whereSeo: any = { tenantId: req.tenantId!, metricType: 'search_performance' };
  if (start || end) {
    const dateWhere: any = {};
    if (start) dateWhere.gte = start;
    if (end) dateWhere.lte = end;

    const createdAtWhere: any = {};
    if (start) createdAtWhere.gte = start;
    if (end) createdAtWhere.lte = end;

    whereSeo.OR = [
      { date: dateWhere },
      { date: null, createdAt: createdAtWhere },
    ];
  }

  const seoRows = await prisma.seoMetric.findMany({ where: whereSeo, select: { metadata: true } });
  let gscClicks = 0;
  let gscImpressions = 0;
  let positions: number[] = [];
  const queryAgg = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();
  const pageAgg = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();
  const deviceAgg = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();
  const countryAgg = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();

  for (const row of seoRows) {
    const md: any = row.metadata || {};
    const clicks = Number(md.clicks || 0);
    const impressions = Number(md.impressions || 0);
    const pos = Number(md.position || 0);
    const query = String(md.query || '');
    const page = String(md.page || '');
    const device = String(md.device || '');
    const country = String(md.country || '');

    gscClicks += clicks;
    gscImpressions += impressions;
    if (Number.isFinite(pos)) positions.push(pos);

    if (query) {
      const prev = queryAgg.get(query) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
      prev.clicks += clicks;
      prev.impressions += impressions;
      prev.position = prev.position ? (prev.position + pos) / 2 : pos;
      prev.ctr = prev.impressions > 0 ? prev.clicks / prev.impressions : 0;
      queryAgg.set(query, prev);
    }
    if (page) {
      const prev = pageAgg.get(page) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
      prev.clicks += clicks;
      prev.impressions += impressions;
      prev.position = prev.position ? (prev.position + pos) / 2 : pos;
      prev.ctr = prev.impressions > 0 ? prev.clicks / prev.impressions : 0;
      pageAgg.set(page, prev);
    }

    if (device) {
      const prev = deviceAgg.get(device) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
      prev.clicks += clicks;
      prev.impressions += impressions;
      prev.position = prev.position ? (prev.position + pos) / 2 : pos;
      prev.ctr = prev.impressions > 0 ? prev.clicks / prev.impressions : 0;
      deviceAgg.set(device, prev);
    }

    if (country) {
      const prev = countryAgg.get(country) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
      prev.clicks += clicks;
      prev.impressions += impressions;
      prev.position = prev.position ? (prev.position + pos) / 2 : pos;
      prev.ctr = prev.impressions > 0 ? prev.clicks / prev.impressions : 0;
      countryAgg.set(country, prev);
    }
  }

  const avgCtr = gscImpressions > 0 ? gscClicks / gscImpressions : 0;
  const avgPosition = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : 0;

  const topQueries = Array.from(queryAgg.entries())
    .map(([query, v]) => ({ query, ...v }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, topLimit);
  const topPages = Array.from(pageAgg.entries())
    .map(([page, v]) => ({ page, ...v }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, topLimit);

  const byDevice = Array.from(deviceAgg.entries())
    .map(([device, v]) => ({ device, ...v }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, topLimit);

  const byCountry = Array.from(countryAgg.entries())
    .map(([country, v]) => ({ country, ...v }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, topLimit);

  res.json({
    success: true,
    data: {
      ga4: {
        sessions: sessionsTotal,
        bounceRate: bounceRateAvg,
        avgSessionDuration,
        revenue: revenueTotal,
        orders: ordersTotal,
        trend,
      },
      gsc: {
        clicks: gscClicks,
        impressions: gscImpressions,
        ctr: avgCtr,
        position: avgPosition,
        topQueries,
        topPages,
        byDevice,
        byCountry,
      },
    },
    meta: {
      dateFrom: start ? start.toISOString() : undefined,
      dateTo: end ? end.toISOString() : undefined,
      limit: topLimit,
    },
  });
};

export const getSeoDashboard = async (req: TenantRequest, res: Response) => {
  const { dateFrom, dateTo, limit } = req.query as any;
  const start = parseDate(dateFrom);
  const end = parseDate(dateTo);
  const topLimit = Math.max(1, Math.min(100, Number(limit) || 10));

  if (String(req.userRole || '').toLowerCase() === 'admintest') {
    res.json({
      success: true,
      data: {
        seoRealtimeStats: [
          { id: 'seo-traffic', label: 'Organic Sessions', value: '0', delta: '—', positive: true },
          { id: 'seo-goals', label: 'Goal Completions', value: '0', delta: '—', positive: true },
          { id: 'seo-position', label: 'Avg. Position', value: '0.0', delta: '—', positive: true },
          { id: 'seo-ctr', label: 'Search CTR', value: '0.0%', delta: '—', positive: true },
        ],
        seoSnapshots: {
          healthScore: 0,
          avgPosition: 0,
          organicSessions: 0,
          sessionTrend: [],
          keywords: [],
          channels: [],
        },
        seoConversionSummary: {
          total: 0,
          goalName: 'SEO Conversions',
          delta: '—',
          breakdown: [],
        },
        seoIssues: [],
        seoKeywordsDetailed: [],
        seoCompetitors: [],
        seoPositionDistribution: [
          { range: 'Top 1-3', value: 0 },
          { range: 'Top 4-10', value: 0 },
          { range: 'Top 11-20', value: 0 },
          { range: 'Top 21-50', value: 0 },
          { range: 'Top 51-100', value: 0 },
        ],
        seoCompetitiveMap: [],
        seoRegionalPerformance: [],
        seoTechnicalScores: [],
        seoAuthorityScores: [],
        seoBacklinkHighlights: {
          totalBacklinks: 0,
          referringDomains: 0,
          keywords: 0,
          trafficCost: '$0',
        },
        seoOrganicSearch: {
          keywords: 0,
          trafficCost: '$0',
          traffic: '0',
        },
        seoAnchors: [],
        seoReferringDomains: [],
        seoRightRailStats: [],
        seoUrlRatings: [],
      },
      meta: {
        dateFrom: start ? start.toISOString() : undefined,
        dateTo: end ? end.toISOString() : undefined,
        limit: topLimit,
      },
    });
    return;
  }

  const whereMetric: any = { tenantId: req.tenantId!, platform: 'ga4', campaignId: null };
  if (start || end) {
    whereMetric.date = {} as any;
    if (start) whereMetric.date.gte = start;
    if (end) whereMetric.date.lte = end;
  }

  const ga4Metrics = await prisma.metric.findMany({
    where: whereMetric,
    orderBy: { date: 'asc' },
    select: {
      date: true,
      organicTraffic: true,
      bounceRate: true,
      avgSessionDuration: true,
      revenue: true,
      orders: true,
    },
  });

  const sessionsTotal = ga4Metrics.reduce((sum, m) => sum + Number(m.organicTraffic || 0), 0);
  const bounceRates = ga4Metrics.map((m) => Number(m.bounceRate || 0)).filter((v) => Number.isFinite(v));
  const avgDurations = ga4Metrics.map((m) => Number(m.avgSessionDuration || 0)).filter((v) => Number.isFinite(v));
  const ordersTotal = ga4Metrics.reduce((sum, m) => sum + Number(m.orders || 0), 0);
  const bounceRateAvg = bounceRates.length ? bounceRates.reduce((a, b) => a + b, 0) / bounceRates.length : 0;
  const avgSessionDuration = avgDurations.length
    ? Math.round(avgDurations.reduce((a, b) => a + b, 0) / avgDurations.length)
    : 0;

  const trend = ga4Metrics.map((m) => Number(m.organicTraffic || 0));

  const whereSeo: any = { tenantId: req.tenantId!, metricType: 'search_performance' };
  if (start || end) {
    const dateWhere: any = {};
    if (start) dateWhere.gte = start;
    if (end) dateWhere.lte = end;

    const createdAtWhere: any = {};
    if (start) createdAtWhere.gte = start;
    if (end) createdAtWhere.lte = end;

    whereSeo.OR = [{ date: dateWhere }, { date: null, createdAt: createdAtWhere }];
  }

  const seoRows = await prisma.seoMetric.findMany({ where: whereSeo, select: { metadata: true } });

  const whereReferral: any = { tenantId: req.tenantId!, metricType: 'referral_domain' };
  if (start || end) {
    whereReferral.date = {} as any;
    if (start) whereReferral.date.gte = start;
    if (end) whereReferral.date.lte = end;
  }

  const referralRows = await prisma.seoMetric.findMany({
    where: whereReferral,
    select: { label: true, sessions: true, numericValue: true, metadata: true },
  });

  const domainAgg = new Map<string, { sessions: number; revenue: number; orders: number }>();
  for (const row of referralRows) {
    const md: any = row.metadata || {};
    const domain = String(md.domain || row.label || '').trim();
    if (!domain) continue;
    const sessions = Number(row.sessions || md.sessions || 0);
    const revenue = Number(row.numericValue || md.revenue || 0);
    const orders = Number(md.orders || 0);

    const prev = domainAgg.get(domain) || { sessions: 0, revenue: 0, orders: 0 };
    prev.sessions += Number.isFinite(sessions) ? sessions : 0;
    prev.revenue += Number.isFinite(revenue) ? revenue : 0;
    prev.orders += Number.isFinite(orders) ? orders : 0;
    domainAgg.set(domain, prev);
  }

  const competitorTotals = Array.from(domainAgg.entries())
    .map(([domain, v]) => ({ domain, ...v }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, topLimit);

  const totalReferralSessions = competitorTotals.reduce((sum, row) => sum + Number(row.sessions || 0), 0);
  const seoCompetitors = competitorTotals.map((row) => {
    const level = totalReferralSessions > 0 ? (row.sessions / totalReferralSessions) * 100 : 0;
    return {
      domain: row.domain,
      level: Math.round(level),
      keywords: Math.round(row.orders || 0),
      referringDomains: Math.round(row.sessions || 0),
      revenue: row.revenue || 0,
    };
  });
  let gscClicks = 0;
  let gscImpressions = 0;
  let positions: number[] = [];
  const queryAgg = new Map<string, { clicks: number; impressions: number; position: number }>();

  if (ga4Metrics.length === 0 && seoRows.length === 0 && referralRows.length === 0) {
    res.json({
      success: true,
      data: {
        seoRealtimeStats: [],
        seoSnapshots: {
          healthScore: 0,
          avgPosition: 0,
          organicSessions: 0,
          sessionTrend: [],
          keywords: [],
          channels: [],
        },
        seoConversionSummary: {
          total: 0,
          goalName: 'SEO Conversions',
          delta: '—',
          breakdown: [],
        },
        seoIssues: [],
        seoKeywordsDetailed: [],
        seoCompetitors: [],
        seoPositionDistribution: [],
        seoCompetitiveMap: [],
        seoRegionalPerformance: [],
        seoTechnicalScores: [],
        seoAuthorityScores: [],
        seoBacklinkHighlights: {
          totalBacklinks: 0,
          referringDomains: 0,
          keywords: 0,
          trafficCost: '$0',
        },
        seoOrganicSearch: {
          keywords: 0,
          trafficCost: '$0',
          traffic: '0',
        },
        seoAnchors: [],
        seoReferringDomains: [],
        seoRightRailStats: [],
        seoUrlRatings: [],
      },
      meta: {
        dateFrom: start ? start.toISOString() : undefined,
        dateTo: end ? end.toISOString() : undefined,
        limit: topLimit,
      },
    });
    return;
  }

  for (const row of seoRows) {
    const md: any = row.metadata || {};
    const clicks = Number(md.clicks || 0);
    const impressions = Number(md.impressions || 0);
    const pos = Number(md.position || 0);
    const query = String(md.query || '');
    gscClicks += clicks;
    gscImpressions += impressions;
    if (Number.isFinite(pos)) positions.push(pos);
    if (query) {
      const prev = queryAgg.get(query) || { clicks: 0, impressions: 0, position: 0 };
      prev.clicks += clicks;
      prev.impressions += impressions;
      prev.position = prev.position ? (prev.position + pos) / 2 : pos;
      queryAgg.set(query, prev);
    }
  }

  const avgPosition = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : 0;

  const positionBucket = {
    top1to3: 0,
    top4to10: 0,
    top11to20: 0,
    beyond20: 0,
  };

  for (const pos of positions) {
    if (!Number.isFinite(pos) || pos <= 0) continue;
    if (pos <= 3) positionBucket.top1to3 += 1;
    else if (pos <= 10) positionBucket.top4to10 += 1;
    else if (pos <= 20) positionBucket.top11to20 += 1;
    else positionBucket.beyond20 += 1;
  }

  const keywords = Array.from(queryAgg.entries())
    .map(([keyword, v]) => ({
      keyword,
      pos: Math.round(v.position * 10) / 10,
      volume: Math.round(v.impressions),
      cpu: 0,
      traffic: Math.round(v.clicks),
    }))
    .sort((a, b) => b.traffic - a.traffic)
    .slice(0, topLimit);

  const seoRealtimeStats = [
    { id: 'seo-traffic', label: 'Organic Sessions', value: sessionsTotal.toLocaleString('en-US'), delta: '—', positive: true },
    { id: 'seo-goals', label: 'Goal Completions', value: ordersTotal.toLocaleString('en-US'), delta: '—', positive: true },
    { id: 'seo-position', label: 'Avg. Position', value: avgPosition.toFixed(1), delta: '—', positive: avgPosition <= 10 },
    { id: 'seo-time', label: 'Avg. Time on Page', value: `${Math.floor(avgSessionDuration / 60)}m ${avgSessionDuration % 60}s`, delta: '—', positive: true },
  ];

  const seoSnapshots = {
    healthScore: Math.max(0, Math.min(100, Math.round(100 - bounceRateAvg))),
    avgPosition: avgPosition,
    organicSessions: sessionsTotal,
    sessionTrend: trend,
    keywords: keywords.slice(0, 3).map((k) => ({ keyword: k.keyword, position: k.pos, change: '0', volume: k.volume })),
    channels: [],
  };

  const seoConversionSummary = {
    total: ordersTotal,
    goalName: 'SEO Conversions',
    delta: '—',
    breakdown: [],
  };

  const seoIssues: any[] = [];

  res.json({
    success: true,
    data: {
      seoRealtimeStats,
      seoSnapshots,
      seoConversionSummary,
      seoIssues,
      seoKeywordsDetailed: keywords,
      seoCompetitors,
      seoPositionDistribution: [
        { range: 'Top 1-3', value: positionBucket.top1to3 },
        { range: 'Top 4-10', value: positionBucket.top4to10 },
        { range: 'Top 11-20', value: positionBucket.top11to20 },
        { range: 'Beyond 20', value: positionBucket.beyond20 },
      ],
      seoCompetitiveMap: [],
      seoRegionalPerformance: [],
      seoTechnicalScores: [],
      seoAuthorityScores: [],
      seoBacklinkHighlights: {
        totalBacklinks: 0,
        referringDomains: 0,
        keywords: keywords.length,
        trafficCost: '$0',
      },
      seoOrganicSearch: {
        keywords: keywords.length,
        trafficCost: '$0',
        traffic: `${sessionsTotal}`,
      },
      seoAnchors: [],
      seoReferringDomains: [],
      seoRightRailStats: [],
      seoUrlRatings: [],
    },
    meta: {
      dateFrom: start ? start.toISOString() : undefined,
      dateTo: end ? end.toISOString() : undefined,
      limit: topLimit,
    },
  });
};

// FLOW END: SEO Controller (EN)
// จุดสิ้นสุด: Controller ของ SEO (TH)
