import { Metric } from './api';

export interface OverviewRealtimeMetric {
  id: string;
  label: string;
  value: string | number;
  delta: string;
  deltaTarget?: string;
  positive: boolean;
}

export interface AiSummaryMetric {
  id: string;
  label: string; // e.g., 'CPM', 'CTR'
  value: string;
  delta: string;
  positive: boolean;
  periodLabel: string; // e.g., 'From last period'
  accentColor?: string; // tailwind class or hex
}

export interface FinancialBreakdownItem {
  label: string;
  value: number;
  delta: string;
  accent: string;
}

export interface FinancialOverviewData {
  revenue: number;
  revenueChange: string;
  profit: number;
  profitChange: string;
  cost: number;
  costChange: string;
  roi: string;
  roiChange: string;
  breakdown: Array<{ name: string; value: number; color: string }>; // Standardized to 'name' for charts
  details: FinancialBreakdownItem[];
}

export interface ConversionFunnelStep {
  label: string;
  value: number;
  color: string;
}

export interface ActiveCampaignMetric {
  id: string;
  campaignName: string;
  platform: string;
  conversions: number;
  cpa: number;
  budget: number;
}

export interface ConversionPlatformMetric {
  id: string;
  platform: string;
  value: number; // e.g. conversion count or percentage
  color: string;
  connectionStatus?: 'connected' | 'disconnected';
}

export interface LtvCacTrendPoint {
  name: string; // Generic x-axis label (Month, Week, etc.)
  ltv: number;
  cac: number;
}

export interface LtvCacData {
  currentRatio: number;
  movement: string; // e.g., "+0.2"
  movementLabel: string; // e.g., "vs last month"
  avgLtv: number;
  avgCac: number;
  trend: LtvCacTrendPoint[];
}

export interface DashboardOverviewProvenancePlatform {
  platform: string;
  minDate: string | null;
  maxDate: string | null;
  lastUpdatedAt: string | null;
}

export interface DashboardOverviewProvenance {
  source: {
    table: string;
  };
  currentRange: {
    start: string;
    end: string;
    label: string;
  };
  dataRange: {
    minDate: string | null;
    maxDate: string | null;
  };
  lastUpdatedAt: string | null;
  perPlatform: DashboardOverviewProvenancePlatform[];
}

export interface DashboardOverviewMeta {
  range?: string;
  start?: string;
  end?: string;
  compareStart?: string;
  compareEnd?: string;
  days?: number;
  provenance?: DashboardOverviewProvenance;
}

export interface OverviewDashboardData {
  realtimeMessages: OverviewRealtimeMetric[];
  aiSummaries: AiSummaryMetric[];
  financial: FinancialOverviewData;
  conversionFunnel: ConversionFunnelStep[];
  activeCampaigns: ActiveCampaignMetric[];
  conversionPlatforms: ConversionPlatformMetric[];
  ltvCac: LtvCacData;
}

export interface DashboardOverviewResponse {
  data: OverviewDashboardData;
  meta?: DashboardOverviewMeta;
}
