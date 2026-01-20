import { Response } from 'express';
import { TenantRequest } from '../middleware/tenant.middleware';
import { prisma } from '../utils/prisma';

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

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d: Date, days: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const resolveDateRange = (query: any): { start: Date; end: Date } => {
  const now = new Date();
  const end = now;

  const startDate = query?.startDate ? new Date(String(query.startDate)) : null;
  const endDate = query?.endDate ? new Date(String(query.endDate)) : null;

  if (startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
    return { start: startOfDay(startDate), end: endDate };
  }

  const period = String(query?.period || '30d').toLowerCase();
  const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '365d' ? 365 : 30;
  return { start: startOfDay(addDays(now, -(days - 1))), end };
};

const normalizeStatus = (raw: string): string => {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return 'PERFORMING';
  return s;
};

const formatPercent = (value: number): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${n.toFixed(1)}%`;
};

const formatCompact = (value: number): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  try {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  } catch {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return `${Math.round(n)}`;
  }
};

const formatMoneyCompact = (value: number): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0';
  return `$${formatCompact(n)}`;
};

export const getProductPerformance = async (req: TenantRequest, res: Response) => {
  const { start, end } = resolveDateRange(req.query);

  if (String(req.userRole || '').toLowerCase() === 'admintest') {
    res.json({
      success: true,
      data: [],
      meta: {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        count: 0,
      },
    });
    return;
  }

  const metrics = await prisma.metric.findMany({
    where: {
      tenantId: req.tenantId!,
      date: { gte: start, lte: end },
    },
    select: {
      orders: true,
      conversions: true,
      revenue: true,
      metadata: true,
    },
    orderBy: { date: 'desc' },
    take: 5000,
  });

  const byKey = new Map<
    string,
    { name: string; category: string; sales: number; revenue: number; stock: number; status?: string }
  >();

  for (const m of metrics) {
    const md: any = (m as any).metadata || {};
    const name = String(md.productName || md.product || md.itemName || md.name || '').trim();
    if (!name) continue;

    const category = String(md.category || md.productCategory || md.cat || 'Uncategorized').trim() || 'Uncategorized';
    const key = `${name}||${category}`;

    const revenue = toNumber(m.revenue);
    const sales = Number(m.orders ?? m.conversions ?? 0) || 0;
    const stock = Number(md.stock ?? md.inventory ?? md.qty ?? 0) || 0;
    const status = normalizeStatus(md.status);

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { name, category, sales, revenue, stock, status });
    } else {
      existing.sales += sales;
      existing.revenue += revenue;
      existing.stock = Math.max(existing.stock, stock);
      if (!existing.status && status) existing.status = status;
    }
  }

  const products = Array.from(byKey.values()).sort((a, b) => b.revenue - a.revenue);

  const withDerivedStatus = products.map((p, idx) => {
    const derivedStatus = idx === 0 ? 'BEST SELLER' : idx <= 2 ? 'TOP PRODUCT' : 'PERFORMING';
    return {
      ...p,
      revenue: Math.round(p.revenue),
      status: p.status ? normalizeStatus(p.status) : derivedStatus,
    };
  });

  res.json({
    success: true,
    data: withDerivedStatus,
    meta: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      count: withDerivedStatus.length,
    },
  });
};

export const getCommerceOverview = async (req: TenantRequest, res: Response) => {
  const { start, end } = resolveDateRange(req.query);

  if (String(req.userRole || '').toLowerCase() === 'admintest') {
    const months: string[] = [];
    const cursor = new Date(end);
    for (let i = 0; i < 6; i += 1) {
      months.unshift(cursor.toLocaleString('en-US', { month: 'short' }));
      cursor.setMonth(cursor.getMonth() - 1);
    }

    res.json({
      success: true,
      data: {
        realtime: [
          { id: 'revenue', label: 'Total Revenue', value: '$0', helper: '—', positive: true },
          { id: 'orders', label: 'Total Orders', value: '0', helper: '—', positive: true },
          { id: 'aov', label: 'Average Order Value', value: '$0', helper: '—', positive: true },
          { id: 'conversion', label: 'Conversion Rate', value: '0.0%', helper: '—', positive: true },
        ],
        profitability: [
          { label: 'Budget', value: 0, color: '#60a5fa' },
          { label: 'Investment Cost', value: 0, color: '#ec4899' },
          { label: 'Sales Revenue', value: 0, color: '#f97316' },
          { label: 'Net Profit', value: 0, color: '#22c55e' },
        ],
        funnel: [
          { label: 'Impressions', value: 0, color: '#f97316' },
          { label: 'Clicks', value: 0, color: '#fb923c' },
          { label: 'Orders', value: 0, color: '#facc15' },
          { label: 'Revenue', value: 0, color: '#a3e635' },
        ],
        revenueTrend: months.map((month) => ({ month, revenue: 0, orders: 0 })),
        creatives: [],
        productVideos: [],
      },
      meta: {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        compareStart: start.toISOString().slice(0, 10),
        compareEnd: end.toISOString().slice(0, 10),
      },
    });
    return;
  }

  const prevEnd = addDays(start, -1);
  const prevStart = addDays(start, -(Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1)));

  const whereCurrent: any = { tenantId: req.tenantId!, date: { gte: start, lte: end } };
  const wherePrev: any = { tenantId: req.tenantId!, date: { gte: prevStart, lte: prevEnd } };

  const [curAgg, prevAgg] = await Promise.all([
    prisma.metric.aggregate({
      where: whereCurrent,
      _sum: { impressions: true, clicks: true, conversions: true, spend: true, revenue: true, orders: true },
    }),
    prisma.metric.aggregate({
      where: wherePrev,
      _sum: { impressions: true, clicks: true, conversions: true, spend: true, revenue: true, orders: true },
    }),
  ]);

  const curRevenue = toNumber(curAgg._sum.revenue);
  const curSpend = toNumber(curAgg._sum.spend);
  const curOrders = Number(curAgg._sum.orders ?? curAgg._sum.conversions ?? 0);
  const curImpressions = Number(curAgg._sum.impressions ?? 0);
  const curClicks = Number(curAgg._sum.clicks ?? 0);
  const curConversions = Number(curAgg._sum.conversions ?? 0);

  const prevRevenue = toNumber(prevAgg._sum.revenue);
  const prevOrders = Number(prevAgg._sum.orders ?? prevAgg._sum.conversions ?? 0);

  const pct = (a: number, b: number): number => {
    const x = Number(a) || 0;
    const y = Number(b) || 0;
    if (y === 0) return x === 0 ? 0 : 100;
    return ((x - y) / Math.abs(y)) * 100;
  };

  const aov = curOrders > 0 ? curRevenue / curOrders : 0;
  const prevAov = prevOrders > 0 ? prevRevenue / prevOrders : 0;

  const realtime = [
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: formatMoneyCompact(curRevenue),
      helper: `${pct(curRevenue, prevRevenue) >= 0 ? '+' : '-'}${Math.abs(pct(curRevenue, prevRevenue)).toFixed(1)}% from last period`,
      positive: pct(curRevenue, prevRevenue) >= 0,
    },
    {
      id: 'orders',
      label: 'Total Orders',
      value: formatCompact(curOrders),
      helper: `${pct(curOrders, prevOrders) >= 0 ? '+' : '-'}${Math.abs(pct(curOrders, prevOrders)).toFixed(1)}% from last period`,
      positive: pct(curOrders, prevOrders) >= 0,
    },
    {
      id: 'aov',
      label: 'Average Order Value',
      value: formatMoneyCompact(aov),
      helper: `${pct(aov, prevAov) >= 0 ? '+' : '-'}${Math.abs(pct(aov, prevAov)).toFixed(1)}% from last period`,
      positive: pct(aov, prevAov) >= 0,
    },
    {
      id: 'conversion',
      label: 'Conversion Rate',
      value: formatPercent(curClicks > 0 ? (curConversions / curClicks) * 100 : 0),
      helper: '—',
      positive: true,
    },
  ];

  const profitability = [
    { label: 'Budget', value: Math.round(curSpend * 1.2), color: '#60a5fa' },
    { label: 'Investment Cost', value: Math.round(curSpend), color: '#ec4899' },
    { label: 'Sales Revenue', value: Math.round(curRevenue), color: '#f97316' },
    { label: 'Net Profit', value: Math.round(curRevenue - curSpend), color: '#22c55e' },
  ];

  const funnel = [
    { label: 'Impressions', value: curImpressions, color: '#f97316' },
    { label: 'Clicks', value: curClicks, color: '#fb923c' },
    { label: 'Orders', value: curOrders, color: '#facc15' },
    { label: 'Revenue', value: Math.round(curRevenue), color: '#a3e635' },
  ];

  const revenueTrendRows = await prisma.metric.groupBy({
    by: ['date'],
    where: whereCurrent,
    _sum: { revenue: true, orders: true },
    orderBy: { date: 'asc' },
  });

  const monthAgg = new Map<string, { revenue: number; orders: number }>();
  for (const row of revenueTrendRows as any[]) {
    const d = new Date(row.date);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const prev = monthAgg.get(month) || { revenue: 0, orders: 0 };
    prev.revenue += toNumber(row._sum.revenue);
    prev.orders += Number(row._sum.orders ?? 0);
    monthAgg.set(month, prev);
  }

  const revenueTrend = Array.from(monthAgg.entries()).map(([month, v]) => ({
    month,
    revenue: Math.round(v.revenue),
    orders: v.orders,
  }));

  const recentMetrics = await prisma.metric.findMany({
    where: whereCurrent,
    select: { metadata: true, revenue: true },
    orderBy: { date: 'desc' },
    take: 2000,
  });

  const creativesMap = new Map<string, { id: string; name: string; type: string; reach: number; reactions: number; cta: string }>();
  const videosMap = new Map<
    string,
    {
      id: string;
      product: string;
      campaign: string;
      platform: string;
      format: string;
      length: string;
      views: number;
      completionRate: string;
      ctr: string;
      revenue: number;
      status: string;
    }
  >();

  for (const m of recentMetrics as any[]) {
    const md: any = m.metadata || {};

    const creativeId = String(md.creativeId || md.creative_id || '');
    const creativeName = String(md.creativeName || md.creative || '');
    if (creativeName) {
      const id = creativeId || creativeName;
      if (!creativesMap.has(id)) {
        creativesMap.set(id, {
          id,
          name: creativeName,
          type: String(md.creativeType || md.type || 'Creative'),
          reach: Number(md.reach || 0),
          reactions: Number(md.reactions || 0),
          cta: String(md.cta || 'Shop'),
        });
      }
    }

    const videoId = String(md.videoId || md.video_id || '');
    const product = String(md.productName || md.product || md.itemName || md.name || '');
    if (videoId || (md.video && product)) {
      const id = videoId || String(md.video || `${product}-video`);
      if (!videosMap.has(id)) {
        videosMap.set(id, {
          id,
          product: product || 'Product',
          campaign: String(md.videoCampaign || md.campaign || 'Campaign'),
          platform: String(md.videoPlatform || md.platform || 'Shopee'),
          format: String(md.videoFormat || 'Vertical 9:16'),
          length: String(md.videoLength || '15s'),
          views: Number(md.views || 0),
          completionRate: String(md.completionRate || '—'),
          ctr: String(md.videoCtr || '—'),
          revenue: Math.round(toNumber(m.revenue)),
          status: String(md.videoStatus || 'Active'),
        });
      }
    }
  }

  res.json({
    success: true,
    data: {
      realtime,
      profitability,
      funnel,
      revenueTrend,
      creatives: Array.from(creativesMap.values()).slice(0, 12),
      productVideos: Array.from(videosMap.values()).slice(0, 12),
    },
    meta: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      compareStart: prevStart.toISOString().slice(0, 10),
      compareEnd: prevEnd.toISOString().slice(0, 10),
    },
  });
};
