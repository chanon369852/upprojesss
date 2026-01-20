export interface Metric {
  id: string;
  tenantId: string;
  campaignId: string | null;
  date: string;
  hour: number | null;
  platform: string;
  source: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: string | null;
  organicTraffic?: number;
  bounceRate?: string;
  avgSessionDuration?: number;
  revenue?: string;
  orders?: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  campaign?: {
    id: string;
    name: string;
    platform: string;
  };
}

export interface DashboardMetricPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
}

export interface Campaign {
  id: string;
  tenantId: string;
  integrationId: string;
  externalId: string;
  name: string;
  platform: string;
  status: string;
  objective?: string;
  budget?: string;
  budgetType?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  metrics?: Metric[];
}

export interface Integration {
  id: string;
  tenantId: string;
  type: string;
  provider: string;
  name: string;
  credentials?: any;
  config?: any;
  status?: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncFrequencyMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JsonImportListItem {
  id: string;
  key: string;
  name?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JsonImportItem {
  id: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  title?: string | null;
  location?: string | null;
  lastLogin?: string | null;
  team?: string | null;
  timezone?: string | null;
  language?: string | null;
  bio?: string | null;
  social?: Record<string, string> | null;
  role: string;
  tenantId: string;
  createdAt?: string;
  expiresAt?: string | null;
  status?: string | null;
  tenant?: TenantInfo;
}

export interface ManagedUser extends CurrentUser {
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
}

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type UsersListResponse = {
  users: ManagedUser[];
  pagination: PaginationMeta;
};

export interface AuthResponse {
  token?: string;
  user: CurrentUser;
  message?: string;
  verificationToken?: string;
}

export interface WebhookEvent {
  id: string;
  tenantId: string;
  platform: string;
  type: string;
  data: any;
  signature?: string;
  receivedAt: string;
}

export interface OAuthState {
  id: string;
  integrationId?: string;
  state: string;
  redirectUri: string;
  expiresAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  changes?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export type HistoryScope = 'system' | 'admin' | 'users' | 'me';

export type HistoryListResponse = {
  items: AuditLog[];
  total: number;
};

export interface SyncHistory {
  id: string;
  tenantId: string;
  integrationId?: string;
  platform: string;
  status: string;
  data?: any;
  error?: string;
  syncedAt: string;
}

export interface IntegrationNotification {
  id: string;
  tenantId: string;
  integrationId?: string;
  platform: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'resolved';
  title: string;
  reason?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  integration?: Pick<Integration, 'id' | 'name' | 'provider' | 'lastSyncAt'>;
}

export interface Alert {
  id: string;
  tenantId: string;
  campaignId?: string | null;
  name: string;
  description?: string | null;
  alertType: string;
  metric: string;
  operator: string;
  threshold?: string | number | null;
  notificationChannels?: any;
  recipients?: any;
  isActive: boolean;
  lastTriggeredAt?: string | null;
  triggerCount?: number;
  createdAt: string;
  updatedAt: string;
  campaign?: {
    name?: string;
  } | null;
}

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  company?: string | null;
  source?: string | null;
  status: string;
  stage: string;
  gender?: string | null;
  income?: number | null;
  estimatedValue?: number | null;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  reportType: string;
  dateRangeType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  exportFormat?: string;
  fileUrl?: string | null;
  fileSize?: number | null;
  isScheduled?: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export interface AiInsight {
  id: string;
  tenantId: string;
  campaignId?: string | null;
  title: string;
  description?: string | null;
  type?: string | null;
  status?: string;
  priority?: string;
  createdAt: string;
  updatedAt: string;
  campaign?: {
    name?: string;
  } | null;
}

export interface OAuthStatus {
  isConnected: boolean;
  lastSync?: string;
  expiresAt?: string;
  canRefresh: boolean;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  limit: number;
}
