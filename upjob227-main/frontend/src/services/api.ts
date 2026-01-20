import axios from 'axios';
import {
  Metric,
  Campaign,
  Integration,
  AuthResponse,
  WebhookEvent,
  OAuthStatus,
  SyncHistory,
  CurrentUser,
  CampaignListResponse,
  DashboardMetricPoint,
  IntegrationNotification,
  Alert,
  Report,
  AiInsight,
  Lead,
  type HistoryScope,
  type HistoryListResponse,
  type ManagedUser,
  type UsersListResponse,
  type JsonImportListItem,
  type JsonImportItem,
} from '../types/api';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

const normalizeLooseKey = (value: unknown) => {
  if (value == null) return '';
  return String(value).trim().toLowerCase();
};

const getDedupeKey = (item: any): string | null => {
  if (!item || typeof item !== 'object') return null;
  if (item.id != null && String(item.id).trim()) return `id:${String(item.id).trim()}`;
  if (item.name != null && normalizeLooseKey(item.name)) return `name:${normalizeLooseKey(item.name)}`;
  if (item.title != null && normalizeLooseKey(item.title)) return `title:${normalizeLooseKey(item.title)}`;
  return null;
};

const dedupeList = <T>(items: T[]): T[] => {
  if (!Array.isArray(items) || items.length <= 1) return items as T[];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = getDedupeKey(item as any);
    if (!key) {
      out.push(item);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const applyAuthResponse = (data: AuthResponse) => {
  if (data.token) {
    localStorage.setItem('token', data.token);
  }

  const resolvedTenantId = data.user?.tenantId;
  if (resolvedTenantId) {
    localStorage.setItem('tenantId', resolvedTenantId);
    localStorage.removeItem('tenantSlug');
  }

  const role = data.user?.role || 'user';
  localStorage.setItem('userRole', role);
};

// Add auth token to requests
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  return config;
});

// Auth
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const tenantId = localStorage.getItem('tenantId') || undefined;
  const tenantSlug = localStorage.getItem('tenantSlug') || undefined;
  const response = await api.post('/auth/login', {
    email,
    password,
    ...(tenantId ? { tenantId } : {}),
    ...(tenantSlug ? { tenantSlug } : {}),
  });
  const data = response.data;
  applyAuthResponse(data);
  return data;
};

export const register = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  tenant?: string,
): Promise<AuthResponse> => {
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const trimmedTenant = (tenant || '').trim();
  const payload: any = {
    email,
    password,
    firstName,
    lastName,
  };

  payload.role = 'admintest';

  if (trimmedTenant) {
    Object.assign(
      payload,
      uuidLike.test(trimmedTenant) ? { tenantId: trimmedTenant } : { tenantSlug: trimmedTenant },
    );
  }

  const response = await api.post('/auth/register', payload);
  const data = response.data;

  const resolvedTenantId = data.user?.tenantId;
  if (resolvedTenantId) {
    localStorage.setItem('tenantId', resolvedTenantId);
    localStorage.removeItem('tenantSlug');
  } else if (trimmedTenant) {
    localStorage.removeItem('tenantId');
    localStorage.setItem('tenantSlug', trimmedTenant);
  }

  return data;
};

export const verifyEmail = async (token: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/verify-email', { token });
  const data = response.data;
  if (data?.token && data?.user) {
    applyAuthResponse(data);
  }
  return data;
};

export const resendVerificationEmail = async (
  email: string,
): Promise<{ message: string; verificationToken?: string }> => {
  const response = await api.post('/auth/resend-verification', { email });
  return response.data;
};

export const forgotPassword = async (email: string): Promise<any> => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string): Promise<any> => {
  const response = await api.post('/auth/reset-password', { token, newPassword });
  return response.data;
};

export const getCurrentUser = async (): Promise<CurrentUser> => {
  const response = await api.get('/auth/me', {
    params: { _ts: Date.now() },
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
  return response.data.user;
};

export const getUserById = async (id: string): Promise<CurrentUser> => {
  const response = await api.get(`/users/${id}`);
  return response.data.user;
};

export const updateUser = async (
  id: string,
  payload: Partial<Pick<CurrentUser, 'firstName' | 'lastName' | 'email' | 'phone' | 'avatarUrl'>> & {
    password?: string;
    role?: string;
    isActive?: boolean;
  },
): Promise<CurrentUser> => {
  const response = await api.put(`/users/${id}`, payload);
  return response.data.user;
};

export const listUsers = async (filters?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}): Promise<UsersListResponse> => {
  const response = await api.get('/users', { params: filters });
  const data = response.data as UsersListResponse;
  return {
    ...data,
    users: dedupeList(Array.isArray(data?.users) ? data.users : []),
  };
};

export const createUser = async (payload: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}): Promise<ManagedUser> => {
  const response = await api.post('/users', payload);
  return response.data.user;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const setUserActive = async (id: string, isActive: boolean): Promise<ManagedUser> => {
  const response = await api.put(`/users/${id}`, { isActive });
  return response.data.user;
};

// Integrations
export const getIntegrations = async (): Promise<Integration[]> => {
  const response = await api.get('/integrations');
  return dedupeList(Array.isArray(response.data?.integrations) ? response.data.integrations : []);
};

export const getIntegrationNotifications = async (status?: 'open' | 'resolved'): Promise<IntegrationNotification[]> => {
  const response = await api.get('/integrations/notifications', {
    params: status ? { status } : undefined,
  });
  return dedupeList(Array.isArray(response.data?.notifications) ? response.data.notifications : []);
};

export const requestAdminFullUpgrade = async (payload?: {
  message?: string;
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
    lineId?: string;
    note?: string;
  };
}): Promise<IntegrationNotification> => {
  const response = await api.post('/integrations/upgrade-request', payload || undefined);
  return response.data.notification as IntegrationNotification;
};

export const getUpgradeStatus = async (): Promise<{
  role?: string;
  paymentMethod: { linked: boolean; brand: string | null; last4: string | null; linkedAt: string | null };
  promo: { code: string | null; appliedAt: string | null };
  trial?: {
    startedAt: string | null;
    expiresAt: string | null;
    active: boolean;
    expired: boolean;
    msRemaining: number | null;
  } | null;
  pending?: {
    integrationSetups: number;
    jsonImports: number;
  };
  canRequestUpgrade: boolean;
  note: string | null;
}> => {
  const response = await api.get('/integrations/upgrade-status');
  return response.data;
};

export const getTrialStatus = async (): Promise<{
  role?: string;
  active: boolean;
  expired: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  msRemaining: number | null;
}> => {
  const response = await api.get('/integrations/trial-status');
  return response.data;
};

export const listPendingIntegrationSetup = async (): Promise<any[]> => {
  const response = await api.get('/integrations/pending/setup');
  return Array.isArray(response.data?.items) ? response.data.items : [];
};

export const upsertPendingIntegrationSetup = async (payload: {
  provider: string;
  type?: string;
  credentials?: any;
  config?: any;
}): Promise<any> => {
  const response = await api.post('/integrations/pending/setup', payload);
  return response.data.item;
};

export const deletePendingIntegrationSetup = async (provider: string): Promise<void> => {
  await api.delete(`/integrations/pending/setup/${provider}`);
};

export const setPaymentMethod = async (payload: { brand: string; last4: string }): Promise<any> => {
  const response = await api.post('/integrations/payment-method', payload);
  return response.data;
};

export const applyPromoCode = async (payload: { code: string }): Promise<any> => {
  const response = await api.post('/integrations/promo', payload);
  return response.data;
};

export const createStripeSetupIntent = async (): Promise<{
  clientSecret: string;
  setupIntentId: string;
  customerId: string;
}> => {
  const response = await api.post('/integrations/billing/stripe/setup-intent');
  return response.data;
};

export const confirmStripeSetupIntent = async (payload: { setupIntentId: string }): Promise<any> => {
  const response = await api.post('/integrations/billing/stripe/confirm', payload);
  return response.data;
};

export const getIntegration = async (id: string): Promise<Integration> => {
  const response = await api.get(`/integrations/${id}`);
  return response.data.integration;
};

export const createIntegration = async (integration: Partial<Integration>): Promise<Integration> => {
  const response = await api.post('/integrations', integration);
  return response.data.integration;
};

export const updateIntegration = async (id: string, integration: Partial<Integration>): Promise<Integration> => {
  const response = await api.put(`/integrations/${id}`, integration);
  return response.data.integration;
};

export const deleteIntegration = async (id: string): Promise<void> => {
  await api.delete(`/integrations/${id}`);
};

// Settings / JSON imports
export const listJsonImports = async (): Promise<JsonImportListItem[]> => {
  const response = await api.get('/settings/json-imports');
  return Array.isArray(response.data?.items) ? (response.data.items as JsonImportListItem[]) : [];
};

export const listPendingJsonImports = async (): Promise<JsonImportListItem[]> => {
  const response = await api.get('/settings/pending/json-imports');
  return Array.isArray(response.data?.items) ? (response.data.items as JsonImportListItem[]) : [];
};

export const getJsonImport = async (id: string): Promise<JsonImportItem> => {
  const response = await api.get(`/settings/json-imports/${id}`);
  return response.data.item as JsonImportItem;
};

export const getPendingJsonImport = async (id: string): Promise<JsonImportItem> => {
  const response = await api.get(`/settings/pending/json-imports/${id}`);
  return response.data.item as JsonImportItem;
};

export const createJsonImport = async (payload: { name?: string; data: any }): Promise<JsonImportItem> => {
  const response = await api.post('/settings/json-imports', payload);
  return response.data.item as JsonImportItem;
};

export const createPendingJsonImport = async (payload: { name?: string; data: any }): Promise<JsonImportItem> => {
  const response = await api.post('/settings/pending/json-imports', payload);
  return response.data.item as JsonImportItem;
};

export const deleteJsonImport = async (id: string): Promise<void> => {
  await api.delete(`/settings/json-imports/${id}`);
};

export const deletePendingJsonImport = async (id: string): Promise<void> => {
  await api.delete(`/settings/pending/json-imports/${id}`);
};

export const syncIntegration = async (id: string): Promise<any> => {
  const response = await api.post(`/integrations/${id}/sync`);
  return response.data;
};

export const testIntegration = async (id: string): Promise<any> => {
  const response = await api.post(`/integrations/${id}/test`);
  return response.data;
};

// OAuth
export const startOAuth = async (id: string, redirectUri: string): Promise<any> => {
  const response = await api.post(`/integrations/${id}/oauth/start`, { redirectUri });
  return response.data;
};

export const handleOAuthCallback = async (id: string, code: string, state: string): Promise<any> => {
  const response = await api.get(`/integrations/${id}/oauth/callback?code=${code}&state=${state}`);
  return response.data;
};

export const refreshOAuthToken = async (id: string): Promise<any> => {
  const response = await api.post(`/integrations/${id}/oauth/refresh`);
  return response.data;
};

export const getOAuthStatus = async (id: string): Promise<OAuthStatus> => {
  const response = await api.get(`/integrations/${id}/oauth/status`);
  return response.data;
};

export const revokeOAuthAccess = async (id: string): Promise<any> => {
  const response = await api.post(`/integrations/${id}/oauth/revoke`);
  return response.data;
};

// Data
export const getFacebookData = async (type: string, dateFrom?: string, dateTo?: string): Promise<any> => {
  const params = new URLSearchParams({ type });
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  const response = await api.get(`/data/facebook?${params}`);
  return response.data.data;
};

export const getGoogleAdsData = async (type: string, dateFrom?: string, dateTo?: string): Promise<any> => {
  const params = new URLSearchParams({ type });
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  const response = await api.get(`/data/googleads?${params}`);
  return response.data.data;
};

export const getLINEData = async (type: string, dateFrom?: string, dateTo?: string, userId?: string): Promise<any> => {
  const params = new URLSearchParams({ type });
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (userId) params.append('userId', userId);
  const response = await api.get(`/data/line?${params}`);
  return response.data.data;
};

export const getTikTokData = async (type: string, dateFrom?: string, dateTo?: string): Promise<any> => {
  const params = new URLSearchParams({ type });
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  const response = await api.get(`/data/tiktok?${params}`);
  return response.data.data;
};

export const getShopeeData = async (type: string, dateFrom?: string, dateTo?: string): Promise<any> => {
  const params = new URLSearchParams({ type });
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  const response = await api.get(`/data/shopee?${params}`);
  return response.data.data;
};

export const getAllData = async (dateFrom?: string, dateTo?: string): Promise<any> => {
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  const response = await api.get(`/data/all?${params}`);
  return response.data.data;
};

// Real metrics/campaign data
export const getDashboardMetrics = async (
  options:
    | { period?: '24h' | '7d' | '30d' | '90d' | '365d'; startDate?: string; endDate?: string }
    | '24h'
    | '7d'
    | '30d'
    | '90d'
    | '365d' = '7d'
): Promise<DashboardMetricPoint[]> => {
  const params =
    typeof options === 'string'
      ? { period: options }
      : {
          period: options.period || '7d',
          ...(options.startDate ? { startDate: options.startDate } : {}),
          ...(options.endDate ? { endDate: options.endDate } : {}),
        };
  const response = await api.get('/metrics/dashboard', { params });
  return response.data.data;
};

export const getMetricsPlatformBreakdown = async (params?: {
  period?: '24h' | '7d' | '30d' | '90d' | '365d';
  startDate?: string;
  endDate?: string;
}): Promise<
  Array<{
    platform: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
  }>
> => {
  const response = await api.get('/metrics/platform-breakdown', { params });
  return response.data.data;
};

export const bulkCreateMetrics = async (
  metrics: Array<{
    date: string;
    platform: string;
    source?: string;
    campaignId?: string | null;
    hour?: number | null;
    impressions?: number;
    clicks?: number;
    conversions?: number;
    spend?: number;
    revenue?: number;
  }>
): Promise<{ created: { count: number } }> => {
  const response = await api.post('/metrics/bulk', { metrics });
  return response.data;
};

export const getCampaigns = async (params?: { platform?: string; status?: string; page?: number; limit?: number }): Promise<CampaignListResponse> => {
  const response = await api.get('/campaigns', { params });
  const data = response.data as CampaignListResponse;

  const campaigns = Array.isArray(data?.campaigns)
    ? data.campaigns.map((campaign: any) => ({
        ...campaign,
        integrationId: typeof campaign?.integrationId === 'string' ? campaign.integrationId : String(campaign?.integrationId ?? ''),
        externalId: typeof campaign?.externalId === 'string' ? campaign.externalId : String(campaign?.externalId ?? ''),
      }))
    : [];

  return {
    ...data,
    campaigns: dedupeList(campaigns),
  };
};

export const createCampaign = async (payload: {
  name: string;
  platform: string;
  externalId?: string | null;
  integrationId?: string | null;
  campaignType?: string | null;
  objective?: string | null;
  status?: string;
  budget?: number | null;
  budgetType?: string | null;
  currency?: string;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<Campaign> => {
  const response = await api.post('/campaigns', payload);
  return response.data.campaign;
};

export const getCampaignPerformance = async (campaignId: string) => {
  const response = await api.get(`/campaigns/${campaignId}/performance`);
  const payload = response.data;
  if (payload && typeof payload === 'object') {
    if (payload.data != null) return payload.data;
    if (payload.performance != null) return payload.performance;
  }
  return null;
};

export const getCampaignMetrics = async (campaignId: string, range?: { startDate?: string; endDate?: string }): Promise<Metric[]> => {
  const response = await api.get(`/campaigns/${campaignId}/metrics`, { params: range });
  const payload = response.data;
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.metrics)
      ? payload.metrics
      : [];
  return dedupeList(Array.isArray(rows) ? (rows as Metric[]) : []);
};

export const getCampaignInsights = async (params?: { period?: '7d' | '30d' | '90d' | '365d'; startDate?: string; endDate?: string }): Promise<any[]> => {
  const response = await api.get('/campaigns/insights', { params });
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

// Alerts
export const getAlerts = async (): Promise<Alert[]> => {
  const response = await api.get('/alerts');
  return dedupeList(Array.isArray(response.data?.alerts) ? response.data.alerts : []);
};

export const createAlert = async (payload: {
  name: string;
  alertType: string;
  metric: string;
  operator: string;
  threshold?: number;
  recipients?: string[];
  notificationChannels?: string[];
  campaignId?: string | null;
  description?: string;
}): Promise<Alert> => {
  const response = await api.post('/alerts', payload);
  return response.data.alert;
};

// Reports
export const getReports = async (): Promise<Report[]> => {
  const response = await api.get('/reports');
  return dedupeList(Array.isArray(response.data?.reports) ? response.data.reports : []);
};

export const createReport = async (payload: {
  name: string;
  reportType: string;
  description?: string;
  dateRangeType?: string;
  startDate?: string;
  endDate?: string;
  exportFormat?: string;
  filters?: any;
  metrics?: string[];
  isScheduled?: boolean;
}): Promise<Report> => {
  const response = await api.post('/reports', payload);
  return response.data.report;
};

// AI
export const getAiInsights = async (params?: { status?: string; priority?: string }): Promise<AiInsight[]> => {
  const response = await api.get('/ai/insights', { params });
  return dedupeList(Array.isArray(response.data?.insights) ? response.data.insights : []);
};

// Dashboard overview
export const getDashboardOverview = async (params?: { range?: 'Today' | '7D' | '30D' }): Promise<any> => {
  const response = await api.get('/dashboard/overview', { params });
  return response.data;
};

// CRM
export const getCrmLeads = async (params?: { status?: string; stage?: string; limit?: number; offset?: number }): Promise<{ leads: Lead[]; total: number; limit: number; offset: number }> => {
  const response = await api.get('/crm/leads', { params });
  const data = response.data;

  const leads = Array.isArray(data?.data)
    ? (data.data as Lead[])
    : Array.isArray(data?.leads)
      ? (data.leads as Lead[])
      : [];

  const meta = (data?.meta && typeof data.meta === 'object' ? data.meta : {}) as any;
  const total = typeof meta.total === 'number' ? meta.total : typeof data?.total === 'number' ? data.total : leads.length;
  const limit = typeof meta.limit === 'number' ? meta.limit : typeof data?.limit === 'number' ? data.limit : Number(params?.limit ?? 50);
  const offset = typeof meta.offset === 'number' ? meta.offset : typeof data?.offset === 'number' ? data.offset : Number(params?.offset ?? 0);

  return { leads, total, limit, offset };
};

// Commerce
export const getProductPerformance = async (params?: { period?: '7d' | '30d' | '90d' | '365d'; startDate?: string; endDate?: string }): Promise<any[]> => {
  const response = await api.get('/commerce/products/performance', { params });
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const getCommerceOverview = async (params?: { period?: '7d' | '30d' | '90d' | '365d'; startDate?: string; endDate?: string }): Promise<any> => {
  const response = await api.get('/commerce/overview', { params });
  return response.data.data;
};

export const getTrendDashboard = async (params?: { period?: '7d' | '30d' | '90d' | '365d'; startDate?: string; endDate?: string }): Promise<any> => {
  const response = await api.get('/dashboard/trend', { params });
  return response.data?.data;
};

export const getSeoDashboard = async (params?: { dateFrom?: string; dateTo?: string; limit?: number }): Promise<any> => {
  const response = await api.get('/seo/dashboard', { params });
  return response.data?.data;
};

// Webhook Events
export const getWebhookEvents = async (filters?: {
  platform?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ events: WebhookEvent[]; total: number }> => {
  const response = await api.get('/webhooks/events', { params: filters });
  const data = response.data as { events: WebhookEvent[]; total: number };
  return {
    ...data,
    events: dedupeList(Array.isArray(data?.events) ? data.events : []),
  };
};

export const replayWebhookEvent = async (id: string): Promise<any> => {
  const response = await api.post(`/webhooks/events/${id}/replay`);
  return response.data;
};

export const deleteWebhookEvent = async (id: string): Promise<void> => {
  await api.delete(`/webhooks/events/${id}`);
};

export const validateWebhookSignature = async (platform: string, payload: any, signature: string): Promise<{ isValid: boolean }> => {
  const response = await api.post('/webhooks/validate', { platform, payload, signature });
  return response.data;
};

// Audit History
export const getHistory = async (
  scope: HistoryScope,
  filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    action?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<HistoryListResponse> => {
  const response = await api.get(`/history/${scope}`, { params: filters });
  const data = response.data as HistoryListResponse;
  return {
    ...data,
    items: dedupeList(Array.isArray(data?.items) ? data.items : []),
  };
};

export const exportHistoryCsv = async (filters?: {
  scope?: HistoryScope;
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  entityType?: string;
}) => {
  const response = await api.get('/history/export', {
    params: filters,
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'history.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// Sync History
export const getSyncHistory = async (filters?: {
  platform?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ histories: SyncHistory[]; total: number }> => {
  const response = await api.get('/integrations/sync-history', { params: filters });
  const data = response.data as { histories: SyncHistory[]; total: number };
  return {
    ...data,
    histories: dedupeList(Array.isArray(data?.histories) ? data.histories : []),
  };
};

export const syncAllIntegrations = async (providers?: string[]): Promise<any> => {
  const response = await api.post('/integrations/sync-all', {
    ...(providers?.length ? { providers } : {}),
  });
  return response.data;
};

export const runPipeline = async (payload?: {
  providers?: string[];
  forceSync?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}): Promise<any> => {
  const response = await api.post('/pipeline/run', payload || {});
  return response.data;
};

// Platform-specific OAuth URLs
export const getPlatformOAuthUrl = (platform: string, integrationId: string): string => {
  const baseUrl = window.location.origin;
  const redirectUri = `${baseUrl}/oauth/callback`;
  return redirectUri;
};

export const startPlatformOAuth = async (integrationId: string, redirectUri: string): Promise<{ authorizeUrl: string }> => {
  const result = await startOAuth(integrationId, redirectUri);
  const authorizeUrl = String((result as any)?.authorizeUrl || '');
  if (!authorizeUrl) {
    throw new Error('Missing authorizeUrl');
  }
  return { authorizeUrl };
};

// Google OAuth Functions
export const initiateGoogleAuth = (tenantId: string, returnUrl: string = '/dashboard'): string => {
  return `${API_BASE}/auth/google?tenantId=${encodeURIComponent(tenantId)}&returnUrl=${encodeURIComponent(returnUrl)}`;
};

export const exchangeGoogleToken = async (code: string, tenantId: string): Promise<any> => {
  const response = await api.post('/auth/google/token', { code, tenantId });
  return response.data;
};

export const refreshGoogleToken = async (refreshToken: string): Promise<any> => {
  const response = await api.post('/auth/google/refresh', { refreshToken });
  return response.data;
};

export const revokeGoogleAccess = async (): Promise<any> => {
  const response = await api.delete('/auth/google/revoke');
  return response.data;
};

export const getGoogleCalendarEvents = async (maxResults: number = 10): Promise<any> => {
  const response = await api.get(`/auth/google/calendar?maxResults=${maxResults}`);
  return response.data;
};

export const getGoogleDriveFiles = async (maxResults: number = 10): Promise<any> => {
  const response = await api.get(`/auth/google/drive?maxResults=${maxResults}`);
  return response.data;
};

export default api;

// Data (seed) helpers
export const generateMockData = async (
  providers?: string[],
  lookbackDays?: number
): Promise<any> => {
  const response = await api.post('/mock/generate', {
    providers,
    lookbackDays,
  });
  return response.data;
};

// SEO
export const getSeoOverview = async (params?: { dateFrom?: string; dateTo?: string; limit?: number }): Promise<any> => {
  const response = await api.get('/seo/overview', { params });
  return response.data.data;
};
