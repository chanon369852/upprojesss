import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useMetrics, useCampaigns } from '../hooks/useApi';
import { useOverviewData } from '../hooks/useOverviewData';
import { getIntegrations, updateIntegration, getCrmLeads, getCommerceOverview, getTrendDashboard, getSeoDashboard, getProductPerformance, getReports, createReport, getCampaignInsights, getTrialStatus, testIntegration } from '../services/api';
import { useIntegrationNotifications } from '../hooks/useIntegrationNotifications';
import { Integration, IntegrationNotification } from '../types/api';
import api from '../services/api';
import { getStoredRole, hasAnyPermission, hasPermission, PERMISSIONS, type Role } from '../lib/rbac';
import DashboardShell, { ThemeTokens } from './dashboard/DashboardShell';
import SectionTitle from './dashboard/SectionTitle';
import StatCard from './dashboard/StatCard';
import RealTimeCard from './dashboard/RealTimeCard';
import DataRefreshCard from './dashboard/DataRefreshCard';
import AI from './AI';
import OverviewSection from './dashboard/sections/overviewSection';
import CampaignSection from './dashboard/sections/campaignSection';
import SeoSection from './dashboard/sections/seoSection';
import CommerceSection from './dashboard/sections/commerceSection';
import CrmSection from './dashboard/sections/crmSection';
import TrendSection from './dashboard/sections/trendSection';
import SettingsSection from './dashboard/sections/settingsSection';
import ReportsSection from './dashboard/sections/reportsSection';
import {
  LayoutDashboard,
  BarChart3,
  Search,
  ShoppingBag,
  Users,
  Target,
  Settings,
  FileText,
  TrendingUp,
  Clock,
  Filter,
  RefreshCw,
  CheckSquare,
  Share2,
  Bell,
  Calendar,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Facebook,
  MessageCircle,
  Music,
  Printer,
  Download,
} from 'lucide-react';
import { MetricsLineChart, MetricsBarChart, ChartDatum } from './Charts';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
  Sector,
} from 'recharts';
import {
  dashboardDefaultSettings,
  KPI_ALERT_MENU_OPTIONS,
  KPI_METRIC_OPTIONS,
  KPI_CONDITION_OPTIONS,
  KPI_METRIC_SUMMARY,
  type DashboardSettingsData,
} from '../constants/dashboardDefaults';
import { useCurrentUser } from '../hooks/useCurrentUser';

type SectionKey =
  | 'overview'
  | 'commerce'
  | 'campaign'
  | 'trend'
  | 'crm'
  | 'seo'
  | 'settings'
  | 'reports';

type SettingsData = {
  shortcuts: DashboardSettingsData['shortcuts'];
  kpis: DashboardSettingsData['kpis'];
  branding: DashboardSettingsData['branding'];
  refresh: DashboardSettingsData['refresh'];
  integrations: DashboardSettingsData['integrations'];
  users: DashboardSettingsData['users'];
  alerts: DashboardSettingsData['alerts'];
};

type KpiSettingRow = SettingsData['kpis'][number];
type IntegrationSettingRow = SettingsData['integrations'][number];
type UserSettingRow = SettingsData['users'][number];
type AlertTypeSettingRow = SettingsData['alerts']['alertTypes'][number];
type DeliveryChannelSettingRow = SettingsData['alerts']['deliveryChannels'][number];

type ThemeName = 'Light' | 'Dark';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const buildDefaultSettings = (): SettingsData => clone(dashboardDefaultSettings);

const hexToRgba = (hex: string | undefined, alpha = 1) => {
  if (!hex) return `rgba(249, 115, 22, ${alpha})`;
  let sanitized = hex.replace('#', '');
  if (![3, 6].includes(sanitized.length)) {
    return `rgba(249, 115, 22, ${alpha})`;
  }
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = parseInt(sanitized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const normalizeHex = (value?: string) => {
  if (!value) return '#000000';
  let hex = value.trim();
  if (!hex.startsWith('#')) {
    hex = `#${hex}`;
  }
  hex = `#${hex.replace(/[^0-9a-f]/gi, '')}`;
  if (hex.length === 4) {
    hex =
      '#' +
      hex
        .slice(1)
        .split('')
        .map((char) => char + char)
        .join('');
  }
  if (hex.length !== 7) {
    hex = (hex + '000000').slice(0, 7);
  }
  return hex;
};

const adjustHexColor = (hex: string | undefined, amount = 0) => {
  const normalized = normalizeHex(hex);
  const num = parseInt(normalized.slice(1), 16);
  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  const r = clamp(((num >> 16) & 255) + amount * 255);
  const g = clamp(((num >> 8) & 255) + amount * 255);
  const b = clamp((num & 255) + amount * 255);
  return `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)}`;
};

const formatCompactInteger = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs < 1000) return `${sign}${Math.round(abs)}`;
  if (abs < 1_000_000) return `${sign}${Math.round(abs / 1000)}K`;
  if (abs < 1_000_000_000) return `${sign}${Math.round(abs / 1_000_000)}M`;
  return `${sign}${Math.round(abs / 1_000_000_000)}B`;
};

const normalizeColorInput = (value: string) => normalizeHex(value);

const accentGradient = (hex: string | undefined, startAlpha = 0.12, endAlpha = 0.35) =>
  `linear-gradient(135deg, ${hexToRgba(hex, startAlpha)}, ${hexToRgba(hex, endAlpha)})`;

const themedSectionClass = 'theme-section rounded-3xl p-6 shadow-lg space-y-6';
const themedCardBase = 'theme-card rounded-3xl border border-gray-100';
const themedCardClass = `${themedCardBase} p-6 space-y-4`;
const themedCardTightClass = `${themedCardBase} p-5 space-y-4`;
const themePanelBase = 'theme-panel rounded-3xl border border-gray-100';
const themePanelClass = `${themePanelBase} p-6 space-y-6`;
const themePanelTightClass = `${themePanelBase} p-6 space-y-4`;
const themePanelCompactClass = `${themePanelBase} p-5 space-y-4`;

const DASHBOARD_HEADER_OFFSET_PX = 96;
const DASHBOARD_SCROLL_RETRY_MAX_ATTEMPTS = 30;
const DASHBOARD_SCROLL_RETRY_DELAY_MS = 50;
const FONT_AWESOME_LINK_SELECTOR = 'link[data-fontawesome="true"]';
const FONT_AWESOME_LINK_HREF = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';

const csvEscapeValue = (value: string | number) => {
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

const buildCsvContent = (headers: string[], rows: Array<Array<string | number>>) => {
  return [headers, ...rows].map((row) => row.map(csvEscapeValue).join(',')).join('\n');
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === 'object' && 'message' in err) {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
  }
  return fallback;
};

const getAxiosLikeErrorMessage = (err: unknown): string | null => {
  if (!err || typeof err !== 'object') return null;
  const response = (err as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return null;
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const message = (data as { message?: unknown }).message;
  return typeof message === 'string' ? message : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object';
};

type RealtimeSummaryItem = {
  id?: string | number;
  label?: string;
  value?: string | number;
  delta?: string | number;
  positive?: boolean;
};

const themeOptions: ThemeName[] = ['Light', 'Dark'];

const dashboardColorPairs = [
  // 🔴 Red – พื้นหลังชมพูอ่อน อ่านง่าย
  { id: 'pair-1', name: 'Neutral Red', bg: '#FCA5A5', text: '#991B1B' },
  // 🔵 Blue – ฟ้าอ่อน + น้ำเงินเข้ม
  { id: 'pair-2', name: 'Corporate Blue', bg: '#BFDBFE', text: '#1E40AF' },
  // 🟢 Green – เขียวมิ้นต์อ่อน + เขียวเข้ม
  { id: 'pair-3', name: 'System Green', bg: '#BBF7D0', text: '#166534' },
  // 🟡 Yellow – เหลืองพาสเทล + น้ำตาลทอง
  { id: 'pair-4', name: 'Soft Yellow', bg: '#FDE68A', text: '#92400E' },
  // 🟣 Purple – ม่วงอ่อน + ม่วงเข้ม
  { id: 'pair-5', name: 'SaaS Purple', bg: '#DDD6FE', text: '#3730A3' },
  // ⚫ Grey – เทากลาง / Universal
  { id: 'pair-6', name: 'Universal Grey', bg: '#E5E7EB', text: '#111827' },
  // 🟠 Orange – ส้มพาสเทล + ส้มไหม้เข้ม
  { id: 'pair-7', name: 'Accent Orange', bg: '#FED7AA', text: '#9A3412' },
];

const BRANDING_STORAGE_BASE_KEY = 'dashboardBranding';
const SETTINGS_STORAGE_BASE_KEY = 'dashboardSettings';

const getUserScopedStorageKeys = () => {
  if (typeof window === 'undefined') {
    return {
      settingsKey: SETTINGS_STORAGE_BASE_KEY,
      brandingKey: BRANDING_STORAGE_BASE_KEY,
      legacySettingsKey: SETTINGS_STORAGE_BASE_KEY,
      legacyBrandingKey: BRANDING_STORAGE_BASE_KEY,
      roleSettingsKey: SETTINGS_STORAGE_BASE_KEY,
      roleBrandingKey: BRANDING_STORAGE_BASE_KEY,
    };
  }

  const tenant =
    (window.localStorage.getItem('tenantId') ||
      window.localStorage.getItem('tenantSlug') ||
      'default')
      .trim() || 'default';

  const role = getStoredRole();
  const userId = (window.localStorage.getItem('currentUserId') || '').trim() || 'anonymous';

  return {
    settingsKey: `${SETTINGS_STORAGE_BASE_KEY}:${tenant}:${userId}`,
    brandingKey: `${BRANDING_STORAGE_BASE_KEY}:${tenant}:${userId}`,
    legacySettingsKey: SETTINGS_STORAGE_BASE_KEY,
    legacyBrandingKey: BRANDING_STORAGE_BASE_KEY,
    roleSettingsKey: `${SETTINGS_STORAGE_BASE_KEY}:${tenant}:${role}`,
    roleBrandingKey: `${BRANDING_STORAGE_BASE_KEY}:${tenant}:${role}`,
  };
};

const SCHEDULE_REPORT_MENU_OPTIONS = [
  'Overview Dashboard',
  'Campaign Performance',
  'SEO & Web Analytics',
  'E-commerce Insights',
  'CRM & Leads',
  'Trend Analysis & History',
];

const splitRecipients = (value: string) => {
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const ScheduleReportCard: React.FC<{
  schedule: any;
  recipientOptions: string[];
  platformOptions: string[];
  onReportCreated?: () => void;
}> = ({
  schedule,
  recipientOptions,
  platformOptions,
  onReportCreated,
}) => {
    const [reportName, setReportName] = useState<string>('');
    const normalizeScheduleMenu = useCallback((value: string) => {
      const raw = typeof value === 'string' ? value.trim() : '';
      const legacyMap: Record<string, string> = {
        Campaign: 'Campaign Performance',
        SEO: 'SEO & Web Analytics',
        Commerce: 'E-commerce Insights',
        CRM: 'CRM & Leads',
      };
      const normalized = legacyMap[raw] || raw;
      if (KPI_METRIC_OPTIONS?.[normalized]) return normalized;
      return 'Campaign Performance';
    }, []);

    const [menu, setMenu] = useState<string>(() => normalizeScheduleMenu(schedule.menu || 'Campaign Performance'));
    const [scheduleTime, setScheduleTime] = useState<string>(() => schedule.scheduleTime || new Date().toISOString().slice(0, 10));
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    const [emailRecipients, setEmailRecipients] = useState<string>('');
    const [selectedPlatform, setSelectedPlatform] = useState<string>('');
    const scheduleDateInputRef = useRef<HTMLInputElement | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const selectedRecipients = useMemo(() => {
      return splitRecipients(emailRecipients);
    }, [emailRecipients]);

    const toggleRecipient = useCallback((email: string) => {
      const normalized = email.trim();
      if (!normalized) return;

      setEmailRecipients((prev) => {
        const current = splitRecipients(prev);
        const exists = current.includes(normalized);
        const next = exists ? current.filter((item) => item !== normalized) : [...current, normalized];
        return next.join(', ');
      });
    }, []);

    const handleSubmit = useCallback(async () => {
      if (submitting) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const recipients = splitRecipients(emailRecipients);
        const safeName = reportName.trim() || `Scheduled Report (${menu})`;
        const dateStr = (scheduleTime || '').trim();
        const startDate = dateStr ? new Date(`${dateStr}T00:00:00.000Z`).toISOString() : new Date().toISOString();
        const endDate = dateStr ? new Date(`${dateStr}T23:59:59.999Z`).toISOString() : new Date().toISOString();

        await createReport({
          name: safeName,
          description: `Scheduled from Dashboard (${menu})`,
          reportType: 'summary',
          dateRangeType: 'custom',
          startDate,
          endDate,
          exportFormat: 'pdf',
          filters: {
            menu,
            platform: menu === 'Campaign Performance' ? selectedPlatform : '',
            recipients,
            scheduleDate: scheduleTime,
          },
          metrics: Array.isArray(selectedMetrics) ? selectedMetrics : [],
          isScheduled: true,
        });

        setReportName('');
        setSelectedMetrics([]);
        setEmailRecipients(recipients.join(', '));
        setSelectedPlatform('');

        onReportCreated?.();
      } catch (err: unknown) {
        setSubmitError(getAxiosLikeErrorMessage(err) || 'Unable to create report');
      } finally {
        setSubmitting(false);
      }
    }, [emailRecipients, menu, onReportCreated, reportName, scheduleTime, selectedMetrics, selectedPlatform, submitting]);

    const metricOptions = useMemo(() => {
      const kpiKey = normalizeScheduleMenu(menu);
      const options = KPI_METRIC_OPTIONS?.[kpiKey] || [];
      return Array.isArray(options) ? options : [];
    }, [menu, normalizeScheduleMenu]);

    const metricSummary = useMemo(() => {
      if (!selectedMetrics.length) return '-';
      return selectedMetrics.join(', ');
    }, [selectedMetrics]);

    const toggleMetric = useCallback((metric: string) => {
      setSelectedMetrics((prev) => {
        if (prev.includes(metric)) {
          return prev.filter((item) => item !== metric);
        }
        return [...prev, metric];
      });
    }, []);

    return (
      <div className="theme-card rounded-3xl p-5 flex flex-col h-full">
        <p className="font-semibold theme-text !text-[20px] !leading-tight !mb-0">Schedule Report</p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] theme-muted">Report name</p>
            <input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm theme-input focus:outline-none"
              style={{ borderColor: 'var(--theme-border)' }}
            />
          </div>

          <div>
            <p className="text-[11px] theme-muted">Menu</p>
            <select
              value={menu}
              onChange={(e) => {
                const next = e.target.value;
                setMenu(normalizeScheduleMenu(next));
                setSelectedMetrics([]);
                setSelectedPlatform('');
              }}
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm theme-input focus:outline-none"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <option value={menu} hidden>
                {menu}
              </option>
              {SCHEDULE_REPORT_MENU_OPTIONS
                .filter((option) => option !== menu)
                .map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <p className="text-[11px] theme-muted">Metrics</p>
            <input
              value={metricSummary}
              readOnly
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm theme-input focus:outline-none"
              style={{ borderColor: 'var(--theme-border)' }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {metricOptions.map((opt) => {
                const active = selectedMetrics.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleMetric(opt)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                    style={{
                      borderColor: 'var(--theme-border)',
                      backgroundColor: active ? 'var(--accent-color)' : 'var(--theme-surface)',
                      color: active ? '#ffffff' : 'var(--theme-text)',
                    }}
                    title={active ? 'Remove metric' : 'Add metric'}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] theme-muted">Schedule date</p>
            <div
              className="mt-2 relative"
              onClick={() => {
                const el = scheduleDateInputRef.current;
                if (!el) return;
                try {
                  const picker = (el as HTMLInputElement & { showPicker?: () => void }).showPicker;
                  picker?.();
                } catch {
                  // ignore
                }
                el.focus();
              }}
            >
              <Calendar
                className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--theme-muted)' }}
              />
              <input
                type="date"
                ref={scheduleDateInputRef}
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full rounded-xl border pl-10 pr-3 py-2 text-sm theme-input focus:outline-none"
                style={{ borderColor: 'var(--theme-border)' }}
                placeholder="YYYY-MM-DD"
              />
            </div>

            {menu === 'Campaign Performance' && platformOptions.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] theme-muted">Platform</p>
                <select
                  value={selectedPlatform}
                  onChange={(event) => setSelectedPlatform(event.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm theme-input focus:outline-none"
                  style={{ borderColor: 'var(--theme-border)' }}
                >
                  <option value={selectedPlatform} hidden>
                    {selectedPlatform || 'Select platform'}
                  </option>
                  {platformOptions
                    .filter((option) => option !== selectedPlatform)
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[11px] theme-muted">Email recipients</p>
          <input
            value={emailRecipients}
            onChange={(e) => setEmailRecipients(e.target.value)}
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm theme-input focus:outline-none"
            style={{ borderColor: 'var(--theme-border)' }}
            placeholder="-"
          />

          {Array.isArray(recipientOptions) && recipientOptions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {recipientOptions.map((email) => {
                const active = selectedRecipients.includes(email);
                return (
                  <button
                    key={email}
                    type="button"
                    onClick={() => toggleRecipient(email)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                    style={{
                      borderColor: 'var(--theme-border)',
                      backgroundColor: active ? 'var(--accent-color)' : 'var(--theme-surface)',
                      color: active ? '#ffffff' : 'var(--theme-text)',
                    }}
                    title={active ? 'Remove recipient' : 'Add recipient'}
                  >
                    {email}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-auto pt-5">
          <button
            type="button"
            className="w-full rounded-2xl py-3 text-sm font-semibold border"
            style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            <span className="inline-flex items-center gap-2 justify-center">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--theme-muted)' }} /> : <Calendar className="h-4 w-4" style={{ color: 'var(--theme-muted)' }} />}
              {submitting ? 'Scheduling...' : 'Schedule Report'}
            </span>
          </button>
          {submitError ? (
            <p className="mt-3 text-xs text-rose-600">{submitError}</p>
          ) : null}
        </div>
      </div>
    );
  };

const ReportStatusTable: React.FC<{ rows: any[] }> = ({ rows }) => {
  const roleStyle = (role: string) => {
    const normalized = (role || '').toLowerCase();
    if (normalized === 'admin') {
      return {
        backgroundColor: 'rgba(249, 115, 22, 0.14)',
        border: '1px solid rgba(249, 115, 22, 0.30)',
        color: '#fb923c',
      };
    }
    if (normalized === 'executive') {
      return {
        backgroundColor: 'rgba(148, 163, 184, 0.14)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        color: 'var(--theme-text)',
      };
    }
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.14)',
      border: '1px solid rgba(148, 163, 184, 0.25)',
      color: 'var(--theme-text)',
    };
  };

  const statusStyle = (status: string) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'scheduled') {
      return {
        backgroundColor: 'rgba(249, 115, 22, 0.14)',
        border: '1px solid rgba(249, 115, 22, 0.30)',
        color: '#fb923c',
      };
    }
    if (normalized === 'download') {
      return {
        backgroundColor: 'rgba(56, 189, 248, 0.18)',
        border: '1px solid rgba(56, 189, 248, 0.40)',
        color: '#38bdf8',
      };
    }
    if (normalized === 'notified') {
      return {
        backgroundColor: 'rgba(34, 197, 94, 0.14)',
        border: '1px solid rgba(34, 197, 94, 0.30)',
        color: '#22c55e',
      };
    }
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      border: '1px solid rgba(148, 163, 184, 0.22)',
      color: 'var(--theme-muted)',
    };
  };

  const formatMetrics = (metrics: string[] | undefined) => {
    if (!Array.isArray(metrics) || metrics.length === 0) return '—';
    if (metrics.length <= 2) return metrics.join(', ');
    return `${metrics.slice(0, 2).join(', ')} +${metrics.length - 2}`;
  };

  return (
    <div className="theme-card rounded-3xl p-5 space-y-4 h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold theme-text !text-[20px] !leading-tight !mb-0">Report Status</p>
          <p className="text-xs theme-muted !mb-0">Scheduled reports and automation health</p>
        </div>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold border whitespace-nowrap"
          style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }}
        >
          {rows.length} records
        </span>
      </div>

      <div className="overflow-x-hidden">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase theme-muted">
              <th className="py-2 pr-6 w-[38%]">Name</th>
              <th className="py-2 pr-4 w-[16%]">Role</th>
              <th className="py-2 pr-4 w-[16%]">Status</th>
              <th className="py-2 pr-4 w-[20%]">Metrics</th>
              <th className="py-2 w-[10%]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--theme-border)' }}>
            {rows.map((row) => (
              <tr key={`${row.email}-${row.date}-${row.status}`} className="theme-text align-top">
                <td className="py-4 pr-6 min-w-0">
                  <p className="font-semibold theme-text !text-[15px] !leading-tight !mb-0">{row.name}</p>
                  <p className="text-xs theme-muted !mb-0 break-words">{row.email}</p>
                </td>
                <td className="py-4 pr-4 whitespace-nowrap">
                  <span
                    className="inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold"
                    style={roleStyle(row.role)}
                  >
                    {row.role}
                  </span>
                </td>
                <td className="py-4 pr-4 whitespace-nowrap">
                  <span
                    className="inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold"
                    style={statusStyle(row.status)}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="py-4 pr-4 min-w-0">
                  <span
                    className="block text-xs theme-muted truncate"
                    title={Array.isArray(row.metrics) ? row.metrics.join(', ') : undefined}
                  >
                    {formatMetrics(row.metrics)}
                  </span>
                </td>
                <td className="py-4 text-xs theme-muted whitespace-nowrap">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KPI_OVERVIEW_SUBMENU_OPTIONS = [
  'Campaign Performance',
  'SEO & Web Analytics',
  'E-commerce Insights',
  'CRM & Leads',
  'Trend Analysis & History',
];

const getBaseKpiAlertMenuOptions = () => {
  return Array.isArray(KPI_ALERT_MENU_OPTIONS) && KPI_ALERT_MENU_OPTIONS.length > 0
    ? KPI_ALERT_MENU_OPTIONS
    : ['Overview Dashboard'];
};

const normalizeKpiAlertName = (kpiAlertName: unknown, baseMenuOptions: string[]) => {
  const rawAlertName = typeof kpiAlertName === 'string' ? kpiAlertName.trim() : '';
  return baseMenuOptions.includes(rawAlertName) ? rawAlertName : baseMenuOptions[0];
};

const getVisibleKpiMenuOptions = (currentAlertName: string, baseMenuOptions: string[]) => {
  return currentAlertName === 'Overview Dashboard' ? KPI_OVERVIEW_SUBMENU_OPTIONS : baseMenuOptions;
};

const getKpiMetricOptionsForMenu = (menu: string, fallbackMenu: string) => {
  const options = KPI_METRIC_OPTIONS?.[menu] || KPI_METRIC_OPTIONS?.[fallbackMenu] || ['Financial Overview'];
  return Array.isArray(options) ? options : ['Financial Overview'];
};

const KpiSettingsTable: React.FC<{
  settingsData: SettingsData;
  settingsLoading: boolean;
  onUpdateKpi: (id: string, patch: Partial<KpiSettingRow>) => void;
  onAddKpi: () => void;
  onRemoveKpi: (id: string) => void;
  platformOptions: string[];
}> = ({ settingsData, settingsLoading, onUpdateKpi, onAddKpi, onRemoveKpi, platformOptions }) => {
  const baseMenuOptions = getBaseKpiAlertMenuOptions();
  const showPlatformColumn = settingsData.kpis.some(
    (kpi) => normalizeKpiAlertName(kpi.alertName, baseMenuOptions) === 'Campaign Performance',
  );
  const emptyColSpan = showPlatformColumn ? 6 : 5;

  return (
    <div className="theme-card rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900 !text-[20px] !leading-tight !mb-0">KPI Alert Thresholds</p>
          <p className="text-gray-500 !text-[12px] !leading-tight !mb-0">Configure when to trigger alerts for key metrics</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="py-3 pr-4 whitespace-nowrap">Menu</th>
              <th className="py-3 pr-4 whitespace-nowrap">Metric</th>
              {showPlatformColumn ? <th className="py-3 pr-4 whitespace-nowrap">Platform</th> : null}
              <th className="py-3 pr-4 whitespace-nowrap">Condition</th>
              <th className="py-3 pr-4 whitespace-nowrap">Threshold(%)</th>
              <th className="py-3 whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {settingsData.kpis.length > 0 ? (
              settingsData.kpis.map((kpi) => (
                <tr key={kpi.id} className="text-gray-800">
                  <td className="py-4 pr-4">
                    {(() => {
                      const baseMenuOptions = getBaseKpiAlertMenuOptions();
                      const currentAlertName = normalizeKpiAlertName(kpi.alertName, baseMenuOptions);
                      const visibleMenuOptions = getVisibleKpiMenuOptions(currentAlertName, baseMenuOptions);
                      const fallbackMenu = baseMenuOptions[0];

                      return (
                        <select
                          className="theme-input rounded-2xl border px-3 py-2 text-sm"
                          style={{ borderColor: 'var(--theme-border)' }}
                          value={currentAlertName}
                          onChange={(event) => {
                            const nextAlertName = event.target.value;
                            const nextMetricOptions = getKpiMetricOptionsForMenu(nextAlertName, fallbackMenu);
                            const nextMetric = nextMetricOptions[0];
                            const summary = KPI_METRIC_SUMMARY?.[nextMetric];
                            onUpdateKpi(kpi.id, {
                              alertName: nextAlertName,
                              metric: nextMetric,
                              ...(summary
                                ? {
                                  threshold: summary.threshold,
                                  status: summary.status,
                                  condition: summary.condition || KPI_CONDITION_OPTIONS[0],
                                }
                                : null),
                            });
                          }}
                        >
                          <option value={currentAlertName} hidden>
                            {currentAlertName}
                          </option>
                          {visibleMenuOptions
                            .filter((option) => option !== currentAlertName)
                            .map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                        </select>
                      );
                    })()}
                  </td>
                  <td className="py-4 pr-4">
                    {(() => {
                      const baseMenuOptions = getBaseKpiAlertMenuOptions();
                      const currentAlertName = normalizeKpiAlertName(kpi.alertName, baseMenuOptions);
                      const fallbackMenu = baseMenuOptions[0];
                      const metricOptions = getKpiMetricOptionsForMenu(currentAlertName, fallbackMenu);
                      const currentMetric =
                        typeof kpi.metric === 'string' && metricOptions.includes(kpi.metric) ? kpi.metric : metricOptions[0];
                      return (
                        <select
                          className="theme-input rounded-2xl border px-3 py-2 text-sm"
                          style={{ borderColor: 'var(--theme-border)' }}
                          value={currentMetric}
                          onChange={(event) => {
                            const nextMetric = event.target.value;
                            const summary = KPI_METRIC_SUMMARY?.[nextMetric];
                            onUpdateKpi(kpi.id, {
                              metric: nextMetric,
                              ...(summary
                                ? {
                                  threshold: summary.threshold,
                                  status: summary.status,
                                  condition: summary.condition || KPI_CONDITION_OPTIONS[0],
                                }
                                : null),
                            });
                          }}
                        >
                          <option value={currentMetric} hidden>
                            {currentMetric}
                          </option>
                          {metricOptions
                            .filter((option) => option !== currentMetric)
                            .map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                        </select>
                      );
                    })()}
                  </td>
                  {showPlatformColumn ? (
                    <td className="py-4 pr-4">
                      {(() => {
                        const currentAlertName = normalizeKpiAlertName(kpi.alertName, baseMenuOptions);
                        const currentPlatform = typeof (kpi as any).platform === 'string' ? (kpi as any).platform : '';

                        if (currentAlertName !== 'Campaign Performance') {
                          return null;
                        }

                        if (!Array.isArray(platformOptions) || platformOptions.length === 0) {
                          return null;
                        }

                        return (
                          <select
                            className="theme-input rounded-2xl border px-3 py-2 text-sm min-w-[160px]"
                            style={{ borderColor: 'var(--theme-border)' }}
                            value={currentPlatform}
                            onChange={(event) =>
                              onUpdateKpi(kpi.id, { platform: event.target.value } as Partial<KpiSettingRow>)
                            }
                          >
                            <option value={currentPlatform} hidden>
                              {currentPlatform || 'Select platform'}
                            </option>
                            {platformOptions
                              .filter((option) => option !== currentPlatform)
                              .map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                          </select>
                        );
                      })()}
                    </td>
                  ) : null}
                  <td className="py-4 pr-4">
                    {(() => {
                      const currentCondition =
                        typeof kpi.condition === 'string' && (KPI_CONDITION_OPTIONS as readonly string[]).includes(kpi.condition)
                          ? kpi.condition
                          : KPI_CONDITION_OPTIONS[0];
                      return (
                        <select
                          className="theme-input rounded-2xl border px-3 py-2 text-sm"
                          style={{ borderColor: 'var(--theme-border)' }}
                          value={currentCondition}
                          onChange={(event) => onUpdateKpi(kpi.id, { condition: event.target.value })}
                        >
                          <option value={currentCondition} hidden>
                            {currentCondition}
                          </option>
                          {(KPI_CONDITION_OPTIONS as readonly string[])
                            .filter((option) => option !== currentCondition)
                            .map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                        </select>
                      );
                    })()}
                  </td>
                  <td className="py-4 pr-4">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="theme-input rounded-2xl border px-3 py-2 text-sm w-[140px]"
                      style={{ borderColor: 'var(--theme-border)' }}
                      value={typeof kpi.threshold === 'string' ? kpi.threshold : String(kpi.threshold ?? '')}
                      onChange={(event) => onUpdateKpi(kpi.id, { threshold: event.target.value })}
                      placeholder="e.g. 5"
                    />
                  </td>
                  <td className="py-4">
                    <button
                      type="button"
                      aria-label="Remove KPI"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-xl border"
                      style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                      onClick={() => onRemoveKpi(kpi.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M3 6h18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8 6V4h8v2"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 6l1 16h10l1-16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10 11v6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M14 11v6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={emptyColSpan} className="py-8 text-center text-gray-500">
                  {settingsLoading ? 'Loading...' : 'No KPI alerts configured'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="w-full mt-4 rounded-2xl border py-3 text-sm font-semibold"
        style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
        onClick={onAddKpi}
      >
        + Add KPI
      </button>

    </div>
  );
};

const ThemeBrandingCard: React.FC<{
  settingsData: SettingsData;
  onSelectTheme: (theme: ThemeName) => void;
  onMenuChange: (value: string) => void;
  onResetBranding: () => void;
}> = ({ settingsData, onSelectTheme, onMenuChange, onResetBranding }) => {

  const currentMenuColor = settingsData.branding.menuColor || '#0F172A';
  const selectedPair =
    dashboardColorPairs.find((pair) => pair.bg.toLowerCase() === currentMenuColor.toLowerCase()) || dashboardColorPairs[0];

  return (
    <div className="theme-card rounded-3xl border border-gray-100 p-5 space-y-4">
      <p className="font-semibold text-gray-900 !text-[20px] !leading-tight !mb-0">Theme & Branding</p>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500">Color Theme</p>
          <div className="mt-1 flex gap-2">
            {themeOptions.map((themeOption) => (
              <button
                key={themeOption}
                onClick={() => onSelectTheme(themeOption)}
                className={`flex-1 px-3 py-1 rounded-full border text-xs font-semibold ${settingsData.branding.theme === themeOption
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
              >
                {themeOption}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">Color Menu</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="h-6 w-6 rounded-full border flex items-center justify-center text-[10px] font-semibold"
              style={{
                backgroundColor: selectedPair.bg,
                color: selectedPair.text,
              }}
            >
              A
            </span>
            <select
              className="theme-input flex-1 rounded border px-2 py-1 text-xs"
              value={selectedPair.id}
              onChange={(event) => {
                const next = dashboardColorPairs.find((pair) => pair.id === event.target.value) || dashboardColorPairs[0];
                onMenuChange(next.bg);
              }}
            >
              {dashboardColorPairs.map((pair) => (
                <option key={pair.id} value={pair.id}>
                  {pair.name} ({pair.bg} / {pair.text})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">Company Name</p>
          <p className="mt-1 font-semibold text-gray-900">{settingsData.branding.companyName || 'Your Company'}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm mt-1">
        <button
          className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-shadow shadow-sm hover:shadow-md"
          onClick={onResetBranding}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
};

const API_INTEGRATION_PROVIDER_OPTIONS = ['ga4', 'facebook', 'tiktok', 'line', 'shopee'] as const;

const ApiIntegrationCard: React.FC<{ settingsData: SettingsData; settingsLoading: boolean }> = ({
  settingsData,
  settingsLoading,
}) => {
  return (
    <div className="theme-card rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">API Integration</p>
      </div>
      <div className="space-y-3">
        {settingsData.integrations.length > 0 ? (
          settingsData.integrations.map((integration: IntegrationSettingRow) => {
            const integrationRecord = integration as unknown as Record<string, unknown>;
            const platformLabel =
              typeof integrationRecord.platform === 'string' && integrationRecord.platform.trim()
                ? integrationRecord.platform
                : typeof integrationRecord.name === 'string' && integrationRecord.name.trim()
                  ? integrationRecord.name
                  : 'Unknown Platform';
            const statusText = typeof integrationRecord.status === 'string' ? integrationRecord.status : '';
            const connected =
              typeof integrationRecord.connected === 'boolean'
                ? integrationRecord.connected
                : /connected|active|synced/i.test(statusText);
            const integrationKey = typeof integrationRecord.id === 'string' && integrationRecord.id.trim() ? integrationRecord.id : platformLabel;
            return (
              <div key={integrationKey} className="flex items-center justify-between rounded-2xl border border-gray-100 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500">
                    {(platformLabel.charAt(0) || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{platformLabel}</p>
                    <p className="text-xs text-gray-500">{statusText || 'Not configured'}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                >
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            {settingsLoading ? 'Loading...' : 'No integrations configured'}
          </div>
        )}
      </div>
    </div>
  );
};

const DownloadOptionsModal: React.FC<{
  open: boolean;
  section: string | null;
  options: string[];
  onClose: () => void;
  onSelectOption: (option: string) => void;
}> = ({ open, section, options, onClose, onSelectOption }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-1">
          <p className="text-[24px] font-semibold text-gray-900">Download options</p>
          <p className="text-[18px] text-gray-500">{section}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {options.map((option) => (
            <button
              key={option}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              onClick={() => onSelectOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const UserRolesCard: React.FC<{ settingsData: SettingsData; settingsLoading: boolean }> = ({
  settingsData,
  settingsLoading,
}) => (
  <div className="theme-card rounded-3xl p-5 space-y-4">
    <div className="flex items-center justify-between">
      <p className="font-semibold theme-text !text-[20px] !leading-tight !mb-0">User Roles & Permissions</p>
      <button
        className="px-3 py-1 rounded-full border text-xs theme-text"
        style={{ borderColor: 'var(--theme-border)', backgroundColor: 'transparent' }}
      >
        + Add User
      </button>
    </div>
    <div className="space-y-3 text-sm">
      {settingsData.users.length > 0 ? (
        settingsData.users.map((user: UserSettingRow) => (
          <div key={user.id} className="flex items-center justify-between rounded-2xl theme-panel px-4 py-3">
            <div>
              <p className="font-semibold theme-text !text-[15px] !leading-tight !mb-0">{user.name}</p>
              <p className="text-xs theme-muted">{user.email}</p>
            </div>
            <span
              className="px-2 py-1 rounded-full text-xs font-semibold border"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
                color: user.role === 'admin' ? 'var(--accent-color)' : 'var(--theme-text)',
              }}
            >
              {user.role}
            </span>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          {settingsLoading ? 'Loading...' : 'No users configured'}
        </div>
      )}
    </div>
    <div className="mt-4 p-3 theme-panel rounded-2xl">
      <p className="font-semibold theme-text !text-[15px] !leading-tight !mb-1">Role Permissions:</p>
      <p className="theme-muted !text-[12px] !leading-tight !mb-0">Admin: Full access.</p>
      <p className="theme-muted !text-[12px] !leading-tight !mb-0">Analyst: View-only (dashboards, reports, KPIs).</p>
      <p className="theme-muted !text-[12px] !leading-tight !mb-0">Executive: View-only (dashboards, reports).</p>
    </div>
  </div>
);

const AlertSettingsCard: React.FC<{
  settingsData: SettingsData;
  themeMode: 'light' | 'dark';
  onToggle: (group: keyof SettingsData['alerts'], label: string) => void;
  onAddRecipient: (email: string) => void;
  onRemoveRecipient: (email: string) => void;
  defaultRecipientEmail?: string;
}> = ({ settingsData, themeMode, onToggle, onAddRecipient, onRemoveRecipient, defaultRecipientEmail }) => (
  <div className="theme-card rounded-3xl p-5 space-y-4">
    <p className="font-semibold theme-text !text-[20px] !leading-tight !mb-0">Alert & Notification Settings</p>
    <div className="space-y-4 text-sm">
      <div>
        <p className="uppercase theme-muted !text-[14px] !leading-tight !mb-0">Alert Types</p>
        <div className="mt-2 space-y-2">
          {settingsData.alerts.alertTypes.length > 0 ? (
            settingsData.alerts.alertTypes.map((alert: AlertTypeSettingRow) => {
              const enabled = Boolean(alert.enabled);
              const isDark = themeMode === 'dark';
              return (
                <div key={alert.label} className="flex items-center justify-between">
                  <span className={enabled ? 'theme-text font-semibold' : 'theme-muted font-medium'}>{alert.label}</span>
                  <button
                    type="button"
                    onClick={() => onToggle('alertTypes', alert.label)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full border transition-colors"
                    style={{
                      backgroundColor: enabled ? '#f97316' : isDark ? '#020617' : '#e5e7eb',
                      borderColor: enabled ? '#fb923c' : isDark ? '#64748b' : '#d1d5db',
                      boxShadow: enabled
                        ? isDark
                          ? '0 0 10px rgba(249,115,22,0.7)'
                          : '0 0 8px rgba(249,115,22,0.45)'
                        : 'none',
                    }}
                    aria-pressed={enabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      style={{
                        backgroundColor: '#ffffff',
                        boxShadow: enabled
                          ? '0 2px 4px rgba(0,0,0,0.35)'
                          : '0 1px 3px rgba(0,0,0,0.25)',
                      }}
                    />
                  </button>
                </div>
              );
            })
          ) : (
            <p className="theme-muted">No alert types configured</p>
          )}
        </div>
      </div>
      <div>
        <p className="text-xs uppercase theme-muted">Delivery Channels</p>
        <div className="mt-2 space-y-2">
          {settingsData.alerts.deliveryChannels.length > 0 ? (
            settingsData.alerts.deliveryChannels.map((channel: DeliveryChannelSettingRow) => {
              const enabled = Boolean(channel.enabled);
              const isDark = themeMode === 'dark';
              return (
                <div key={channel.label} className="flex items-center justify-between">
                  <span className={enabled ? 'theme-text font-semibold' : 'theme-muted font-medium'}>{channel.label}</span>
                  <button
                    type="button"
                    onClick={() => onToggle('deliveryChannels', channel.label)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full border transition-colors"
                    style={{
                      backgroundColor: enabled ? '#f97316' : isDark ? '#020617' : '#e5e7eb',
                      borderColor: enabled ? '#fb923c' : isDark ? '#64748b' : '#d1d5db',
                      boxShadow: enabled
                        ? isDark
                          ? '0 0 10px rgba(249,115,22,0.7)'
                          : '0 0 8px rgba(249,115,22,0.45)'
                        : 'none',
                    }}
                    aria-pressed={enabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      style={{
                        backgroundColor: '#ffffff',
                        boxShadow: enabled
                          ? '0 2px 4px rgba(0,0,0,0.35)'
                          : '0 1px 3px rgba(0,0,0,0.25)',
                      }}
                    />
                  </button>
                </div>
              );
            })
          ) : (
            <p className="theme-muted">No delivery channels configured</p>
          )}
        </div>
      </div>
      <div>
        <p className="text-xs uppercase theme-muted">Email Recipients</p>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Add email for alerts"
              className="flex-1 rounded-2xl px-3 py-2 text-sm theme-input border border-gray-300 bg-white"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onAddRecipient((event.target as HTMLInputElement).value);
                  (event.target as HTMLInputElement).value = '';
                }
              }}
            />
            <button
              type="button"
              className="rounded-2xl px-4 py-2 text-xs font-medium text-white"
              style={{ backgroundColor: 'var(--accent-color)' }}
              onClick={(event) => {
                const container = (event.currentTarget.parentElement as HTMLElement) || null;
                const input = container?.querySelector('input[type="email"]') as HTMLInputElement | null;
                if (input && input.value.trim()) {
                  onAddRecipient(input.value);
                  input.value = '';
                }
              }}
            >
              Add
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {settingsData.alerts.recipients.length > 0 ? (
              settingsData.alerts.recipients.map((email: string) => (
                (() => {
                  const normalizedDefault = (defaultRecipientEmail || '').trim();
                  const isDefault = Boolean(normalizedDefault) && email === normalizedDefault;
                  return (
                    <div
                      key={email}
                      className="flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs sm:text-sm theme-text"
                      style={{ borderColor: 'var(--theme-border)' }}
                    >
                      <span className="truncate">{email}</span>
                      <button
                        type="button"
                        className={`text-[11px] px-2 py-1 rounded-xl border theme-muted ${isDefault ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                          }`}
                        style={{ borderColor: 'var(--theme-border)' }}
                        onClick={() => onRemoveRecipient(email)}
                        disabled={isDefault}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })()
              ))
            ) : (
              <p className="theme-muted !text-[12px] !leading-tight !mb-0">No email recipients configured</p>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SeoConversionCard: React.FC<{ summary: any }> = ({ summary }) => {
  return (
    <div className="theme-card rounded-3xl border border-gray-100 bg-white p-6 space-y-6 shadow-sm">
      <header className="space-y-2">
        <span className="px-3 py-1 inline-flex rounded-full border border-orange-200 text-[11px] uppercase  text-orange-500 bg-white">
          Conversions · SEO
        </span>
        <h3 className="text-3xl lg:text-[36px] font-semibold text-gray-900 leading-tight">Register SEO Conversions</h3>
      </header>
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        <div className="relative w-full max-w-xs h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={summary.breakdown}
                dataKey="value"
                nameKey="label"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={4}
                stroke="#fff"
                strokeWidth={2}
              >
                {summary.breakdown.map((segment) => (
                  <Cell key={segment.label} fill={segment.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <p className="text-[11px] uppercase theme-muted"></p>
            <p className="text-4xl font-semibold theme-text">{summary.total.toLocaleString('en-US')}</p>
          </div>
        </div>
        <div className="flex-1 space-y-3 text-center lg:text-left">
          <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start">
            <div className="rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-600 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              {summary.delta}
            </div>
          </div>
          <p className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600">
            Track how each segment contributes to the total goal. The highest values bubble to the top so you can focus instantly.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {summary.breakdown.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-700 font-medium">{item.label}</span>
            </div>
            <span className="font-semibold text-gray-900">{item.value.toLocaleString('en-US')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChannelComparisonChart: React.FC<{ data: any[] }> = ({ data }) => {
  const totals = useMemo(() => {
    const revenue = data.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
    const cost = data.reduce((sum, row) => sum + Number(row.cost ?? 0), 0);
    const profit = revenue - cost;
    const topRevenue = data.reduce(
      (best, row) => (Number(row.revenue ?? 0) > Number(best.revenue ?? 0) ? row : best),
      data[0] ?? { channel: '-', revenue: 0, cost: 0 }
    );
    return { revenue, cost, profit, topRevenueChannel: topRevenue?.channel ?? '-' };
  }, [data]);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
      <p className="text-[15.68px] font-semibold text-gray-900">Revenue and costs by channel</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">Total Rev: {totals.revenue}K</span>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">Total Cost: {totals.cost}K</span>
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Profit: {totals.profit}K</span>
        <span className="inline-flex items-center rounded-full bg-pink-50 px-3 py-1 font-semibold text-pink-700">Top: {totals.topRevenueChannel}</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={10} barCategoryGap={24} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={52} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}K`} />
            <RechartsTooltip
              cursor={{ fill: 'rgba(17,24,39,0.04)' }}
              formatter={(value: any, name: any) => [`${value}K`, name === 'revenue' ? 'Revenue' : 'Cost']}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              wrapperStyle={{ fontSize: 12, color: '#6b7280', paddingBottom: 8 }}
              formatter={(value) => (value === 'revenue' ? 'Revenue' : 'Cost')}
            />
            <Bar dataKey="cost" fill="#9ca3af" radius={[6, 6, 0, 0]} maxBarSize={30} />
            <Bar dataKey="revenue" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SalesFunnelChart: React.FC<{ stages: any[] }> = ({ stages }) => {
  const normalizedStages = stages
    .map((item: any) => ({
      label: item.stage ?? item.platform ?? 'Stage',
      value: Number(item.value ?? 0),
    }))
    .filter((item: any) => item.label && Number.isFinite(item.value));

  const funnelSummary = useMemo(() => {
    if (normalizedStages.length === 0) {
      return {
        overallConversion: null as number | null,
        biggestDrop: null as { from: string; to: string; conversion: number } | null,
      };
    }

    const first = normalizedStages[0].value;
    const last = normalizedStages[normalizedStages.length - 1].value;
    const overallConversion = first > 0 ? (last / first) * 100 : 0;

    let biggestDrop: { from: string; to: string; conversion: number } | null = null;
    for (let i = 1; i < normalizedStages.length; i += 1) {
      const prev = normalizedStages[i - 1];
      const curr = normalizedStages[i];
      const conversion = prev.value > 0 ? (curr.value / prev.value) * 100 : 0;
      if (!biggestDrop || conversion < biggestDrop.conversion) {
        biggestDrop = { from: prev.label, to: curr.label, conversion };
      }
    }

    return { overallConversion, biggestDrop };
  }, [normalizedStages]);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
      <p className="text-[15.68px] font-semibold text-gray-900">Sales Funnel</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
          Overall: {funnelSummary.overallConversion == null ? '-' : `${funnelSummary.overallConversion.toFixed(1)}%`}
        </span>
        {funnelSummary.biggestDrop ? (
          <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 font-semibold text-orange-700">
            Biggest drop: {funnelSummary.biggestDrop.from} → {funnelSummary.biggestDrop.to} ({funnelSummary.biggestDrop.conversion.toFixed(1)}%)
          </span>
        ) : null}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={normalizedStages} layout="vertical" margin={{ top: 12, right: 16, left: 18, bottom: 10 }}>
            <CartesianGrid stroke="#e5e7eb" vertical horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 1400]}
              ticks={[0, 300, 700, 1000, 1400]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={96}
            />
            <RechartsTooltip
              cursor={{ fill: 'rgba(17,24,39,0.04)' }}
              formatter={(value: any) => [Number(value).toLocaleString(), 'Leads']}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
            />
            <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const RevenueTrendChart: React.FC<{ data: any[] }> = ({ data }) => {
  const chartData = useMemo(() => {
    const windowSize = 3;
    const safeData = Array.isArray(data) ? data : [];
    return safeData.map((point, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const window = safeData.slice(start, index + 1);
      const values = window
        .map((row) => Number((row as any)?.revenue2026))
        .filter((v) => Number.isFinite(v));
      const sum = values.reduce((acc, v) => acc + v, 0);
      const ma = values.length ? sum / values.length : null;
      return { ...point, movingAvg: ma };
    });
  }, [data]);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
      <p className="text-[15.68px] font-semibold text-gray-900">Revenue Trend</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="revenue2026Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
            />
            <RechartsTooltip
              cursor={{ fill: 'rgba(17,24,39,0.04)' }}
              formatter={(value: any, name: any) => [
                `$${Math.round(Number(value) / 1000)}k`,
                name === 'revenue2025'
                  ? '2025 Baseline'
                  : name === 'movingAvg'
                    ? '2026 Moving Avg'
                    : '2026 Actual',
              ]}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="revenue2025"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="revenue2026"
              stroke="#7c3aed"
              strokeWidth={3}
              connectNulls={false}
              dot={{ r: 4, strokeWidth: 2, stroke: '#7c3aed', fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#7c3aed', fill: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="revenue2026"
              fill="url(#revenue2026Gradient)"
              stroke="none"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="movingAvg"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const YtdRevenueCard: React.FC<{ data: any[] }> = ({ data }) => {
  const total2025 = data.reduce((sum, point: any) => sum + Number(point?.revenue2025 ?? 0), 0);
  const total2026 = data.reduce((sum, point: any) => sum + Number(point?.revenue2026 ?? 0), 0);
  const actual2026 = data.filter((point: any) => Number(point?.revenue2026 ?? 0) > 0);
  const peak = actual2026.length
    ? actual2026.reduce(
        (prev: any, curr: any) =>
          Number(curr?.revenue2026 ?? 0) > Number(prev?.revenue2026 ?? 0) ? curr : prev,
        actual2026[0]
      )
    : null;
  const low = actual2026.length
    ? actual2026.reduce(
        (prev: any, curr: any) =>
          Number(curr?.revenue2026 ?? 0) < Number(prev?.revenue2026 ?? 0) ? curr : prev,
        actual2026[0]
      )
    : null;
  const avg = Math.round(actual2026.length ? total2026 / actual2026.length : 0);
  const annualTarget = 650_000;
  const targetProgress = annualTarget > 0 ? Math.min(100, (total2026 / annualTarget) * 100) : 0;
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
      <p className="text-[15.68px] font-semibold text-gray-900">YTD revenue</p>
      <div className="space-y-1">
        <p className="text-3xl font-semibold text-indigo-600">${Math.round(total2026 / 1000).toLocaleString('en-US')}k</p>
        <div className="text-xs text-gray-400">2025 total: ${Math.round(total2025 / 1000).toLocaleString('en-US')}k</div>
        <div className="text-xs text-emerald-600 font-semibold">2026 just started - showing YTD so far</div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-700 font-semibold">Pacing</span>
          <span className="text-gray-500">{targetProgress.toFixed(0)}% of annual target</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${targetProgress}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>${Math.round(total2026 / 1000).toLocaleString('en-US')}k</span>
          <span>${Math.round(annualTarget / 1000).toLocaleString('en-US')}k</span>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-emerald-500" />
            <span className="text-gray-700">Peak: {peak ? `$${Math.round(Number(peak?.revenue2026 ?? 0) / 1000).toLocaleString('en-US')}k (${peak?.month ?? '-'})` : '-'}</span>
          </div>
          <span className="text-emerald-600 text-xs font-semibold">↗ 8.2%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-red-500" />
            <span className="text-gray-700">Lowest: {low ? `$${Math.round(Number(low?.revenue2026 ?? 0) / 1000).toLocaleString('en-US')}k (${low?.month ?? '-'})` : '-'}</span>
          </div>
          <span className="text-red-500 text-xs font-semibold">↘ 8.2%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-amber-500" />
            <span className="text-gray-700">Average: ${Math.round(avg / 1000).toLocaleString('en-US')}k</span>
          </div>
          <span className="text-emerald-600 text-xs font-semibold">↗ 8.2%</span>
        </div>
      </div>
    </div>
  );
};

const formatUsdCompact = (value: unknown) => {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(String(value).replace(/[^0-9.-]/g, ''))
        : Number(value);

  if (!Number.isFinite(numeric)) return '$0';
  if (Math.abs(numeric) < 1000) return `$${Math.round(numeric).toLocaleString('en-US')}`;

  const formatted = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: Math.abs(numeric) >= 1_000_000 ? 1 : 0,
  }).format(numeric);

  return `$${formatted}`;
};

const LeadSourceTable: React.FC<{ sources: any[] }> = ({ sources }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
    <p className="text-[15.68px] font-semibold text-gray-900">Where Leads Come From</p>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-xs uppercase text-gray-500">
            <th className="py-2 pr-4 text-left">Source</th>
            <th className="py-2 pr-4 text-center">Leads</th>
            <th className="py-2 pr-4 text-center">Cost</th>
            <th className="py-2 pr-4 text-center">Revenue</th>
            <th className="py-2 text-center">ROI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sources.map((row) => (
            <tr key={row.source} className="text-gray-800">
              <td className="py-3 pr-4 text-left font-semibold">{row.source}</td>
              <td className="py-3 pr-4 text-center">{row.leads}</td>
              <td className="py-3 pr-4 text-center">{formatUsdCompact(row.cost)}</td>
              <td className="py-3 pr-4 text-center">{formatUsdCompact(row.revenue)}</td>
              <td className="py-3 text-center">{row.roi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const SalesRepTable: React.FC<{ reps: any[] }> = ({ reps }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
    <p className="text-[15.68px] font-semibold text-gray-900">Who Closed The Deal</p>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-xs uppercase text-gray-500">
            <th className="py-2 pr-4 text-left">Sales Rep</th>
            <th className="py-2 pr-4 text-center">Leads Assigned</th>
            <th className="py-2 pr-4 text-center">Conversion Rate</th>
            <th className="py-2 text-center">Revenue Closed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reps.map((rep) => (
            <tr key={rep.rep} className="text-gray-800">
              <td className="py-3 pr-4 text-left font-semibold">{rep.rep}</td>
              <td className="py-3 pr-4 text-center">{rep.leadsAssigned}</td>
              <td className="py-3 pr-4 text-center">{rep.conversionRate}</td>
              <td className="py-3 text-center">{formatUsdCompact(rep.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const CrmStageChart: React.FC<{ stages: any[] }> = ({ stages }) => {
  const max = Math.max(...stages.map((stage) => stage.value), 1);
  const data = stages.map((stage) => ({ name: stage.label, value: stage.value, color: stage.color }));
  return (
    <div className={themePanelCompactClass}>
      <p className="text-sm font-semibold theme-text">Pipeline status</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--theme-border)" />
            <XAxis
              type="number"
              domain={[0, Math.max(3, Math.ceil(max))]}
              tick={{ fontSize: 10, fill: 'var(--theme-muted)' }}
              axisLine={{ stroke: 'var(--theme-border)' }}
              tickLine={{ stroke: 'var(--theme-border)' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--theme-muted)' }}
              axisLine={{ stroke: 'var(--theme-border)' }}
              tickLine={{ stroke: 'var(--theme-border)' }}
              width={90}
            />
            <RechartsTooltip
              cursor={{ fill: 'rgba(148,163,184,0.16)' }}
              formatter={(value: any) => [`${Number(value).toFixed(1)}x`, 'Stage strength']}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CrmAgeDonut: React.FC<{ ranges: any[] }> = ({ ranges }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const safeRanges = useMemo(
    () =>
      (Array.isArray(ranges) ? ranges : []).map((range) => ({
        label: String((range as any)?.label ?? ''),
        customers: Number((range as any)?.customers ?? 0),
        value: String((range as any)?.value ?? ''),
        roi: String((range as any)?.roi ?? ''),
        color: String((range as any)?.color ?? '#60a5fa'),
      })),
    [ranges]
  );

  const total = safeRanges.reduce((sum, range) => sum + (Number.isFinite(range.customers) ? range.customers : 0), 0);
  const chartData = useMemo(
    () => safeRanges.map((range) => ({ name: range.label, value: range.customers, color: range.color })),
    [safeRanges]
  );

  const parseCompactMoney = (raw: string) => {
    const input = String(raw ?? '').trim();
    if (!input) return null;
    const normalized = input.replace(/[,$\s]/g, '');
    const match = normalized.match(/([+-]?[0-9]*\.?[0-9]+)([kKmMbB])?/);
    if (!match) return null;
    const base = Number(match[1]);
    if (!Number.isFinite(base)) return null;
    const unit = (match[2] || '').toLowerCase();
    const multiplier = unit === 'b' ? 1_000_000_000 : unit === 'm' ? 1_000_000 : unit === 'k' ? 1_000 : 1;
    return base * multiplier;
  };

  const formatCompact = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    } catch {
      const abs = Math.abs(value);
      if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
      if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return `${Math.round(value)}`;
    }
  };

  const formatAvg = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) return '—';
    if (Math.abs(value) < 1000) return value.toFixed(1);
    return formatCompact(value);
  };

  return (
    <div className={themePanelCompactClass}>
      <p className="text-sm font-semibold theme-text">Age Range</p>
      <div className="flex items-center gap-4">
        <div className="relative h-36 w-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="90%"
                paddingAngle={3}
                stroke="#fff"
                strokeWidth={2}
                activeIndex={activeIndex}
                activeShape={(props) => (
                  <Sector {...props} outerRadius={(Number(props.outerRadius) || 0) + 6} />
                )}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value: number, _name: string, payload) => {
                  const rowName = (payload as { payload?: { name?: string } } | undefined)?.payload?.name;
                  return [Number(value ?? 0).toLocaleString('en-US'), rowName];
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
            <p className="text-[10px] uppercase text-gray-400 tracking-wide">TOTAL</p>
            <p className="text-xl font-semibold theme-text leading-tight whitespace-nowrap">{total.toLocaleString('en-US')}</p>
            <p className="text-[10px] theme-muted">Customers</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="space-y-3">
            <p className="text-sm font-semibold theme-text">Lead ที่มีมูลค่า</p>

            <div className="space-y-2">
              {safeRanges.map((range) => {
                const isActive = activeIndex >= 0 && chartData[activeIndex]?.name === range.label;
                const customers = Number.isFinite(range.customers) ? range.customers : 0;
                const totalValue = parseCompactMoney(range.value);
                const avg = totalValue != null && customers > 0 ? totalValue / customers : null;

                return (
                  <div
                    key={range.label}
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      borderColor: 'var(--theme-border)',
                      backgroundColor: isActive ? 'rgba(148,163,184,0.10)' : 'transparent',
                    }}
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[200px,1fr] md:items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: range.color }} />
                        <span className="text-xs theme-muted truncate">{range.label}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-[10px] uppercase theme-muted">Lead ทั้งหมด</p>
                          <p className="mt-1 text-base font-semibold tabular-nums" style={{ color: range.color }}>
                            {customers.toLocaleString('en-US')}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-[10px] uppercase theme-muted">THB</p>
                          <p className="mt-1 text-base font-semibold tabular-nums" style={{ color: range.color }}>
                            {range.value}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-[10px] uppercase theme-muted">ค่าเฉลี่ย</p>
                          <p className="mt-1 text-base font-semibold tabular-nums" style={{ color: range.color }}>
                            {formatAvg(avg)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeadTrackingTable: React.FC<{ leads: any[] }> = ({ leads }) => (
  <div className={themePanelCompactClass}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold theme-text">Lead Tracking</p>
        <p className="text-xs theme-muted">7 leads</p>
      </div>
      <button
        className="px-3 py-1 rounded-full border text-xs theme-text"
        style={{ borderColor: 'var(--theme-border)', backgroundColor: 'transparent' }}
      >
        Export
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase theme-muted">
            <th className="py-2 pr-4">Lead</th>
            <th className="py-2 pr-4">Company</th>
            <th className="py-2 pr-4">Source</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Value</th>
            <th className="py-2">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <tr key={`${lead.lead}-${lead.company}`} className="theme-text">
              <td className="py-3 pr-4">
                <p className="font-semibold">{lead.lead}</p>
                <p className="text-xs theme-muted">{lead.lead.toLowerCase().replace(' ', '.')}@example.com</p>
              </td>
              <td className="py-3 pr-4">{lead.company}</td>
              <td className="py-3 pr-4">{lead.source}</td>
              <td className="py-3 pr-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${lead.status === 'Converted'
                    ? 'bg-emerald-50 text-emerald-600'
                    : lead.status === 'In Progress'
                      ? 'bg-amber-50 text-amber-600'
                      : lead.status === 'Lost'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                >
                  {lead.status}
                </span>
              </td>
              <td className="py-3 pr-4">{lead.value}</td>
              <td className="py-3">{lead.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const CommerceFunnelChart: React.FC<{ steps: any[] }> = ({ steps }) => {
  const max = steps[0]?.value || 1;
  const animated = useAnimatedReveal();
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#0b1220] to-[#101a33] p-6 shadow-lg">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">Conversion Rate</p>
        <p className="text-xs text-sky-100/70">User journey effectiveness</p>
      </div>

      <div className="mt-6 space-y-5">
        {steps.map((step) => {
          const width = Math.max(0, Math.min(100, (Number(step.value) / Math.max(1, max)) * 100));
          const highlightColor = adjustHexColor(step.color, 0.2);
          return (
            <div key={step.label} className="flex flex-col items-center gap-2">
              <div className="w-full max-w-[620px]">
                <div className="h-9 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(148,163,184,0.14)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: animated ? `${width}%` : '0%',
                      background: `linear-gradient(90deg, ${step.color}, ${highlightColor})`,
                      filter: 'brightness(1.05)',
                    }}
                  />
                </div>
              </div>
              <div className="text-xs flex items-center gap-2">
                <span className="font-semibold text-white">{step.label}</span>
                <span className="text-sky-100/70">{step.value}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-xs text-sky-100/70">
        {steps.map((step) => (
          <span key={step.label} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: step.color }} />
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const SeoIssuesCard: React.FC<{ issues: any[] }> = ({ issues }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
    <p className="text-sm font-semibold text-gray-900">Platform health</p>
    <div className="space-y-3">
      {issues.map((issue) => (
        <div key={issue.label} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">{issue.label}</p>
            <p className="text-xs text-gray-500">{issue.helper}</p>
          </div>
          <span className={`text-sm font-semibold ${issue.positive ? 'text-emerald-600' : 'text-orange-500'}`}>{issue.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const ZeroState: React.FC<{ message?: string }> = ({ message }) => (
  <div className="bg-gradient-to-br from-white to-orange-50 border border-dashed border-orange-200 rounded-3xl p-6 text-center">
    <p className="text-lg font-semibold text-gray-900">No data available</p>
    <p className="text-sm text-gray-500 mt-2">{message || 'Sample data only • connect your live API sources when ready'}</p>
  </div>
);

const AlertBadge: React.FC<{ label: string; severity?: 'info' | 'warning' | 'success' }> = ({ label, severity = 'info' }) => {
  const styles = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-800',
    success: 'bg-emerald-100 text-emerald-700',
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[severity]}`}>{label}</span>;
};

const NotificationCenter: React.FC<{
  notifications: IntegrationNotification[];
  loading: boolean;
  error: string | null;
}> = ({ notifications, loading, error }) => {
  const normalizeSeverity = (severity: IntegrationNotification['severity']): 'info' | 'warning' | 'success' => {
    if (severity === 'critical') return 'warning';
    if (severity === 'warning') return 'warning';
    return 'info';
  };

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const severityClass = (severity: string) => {
    if (severity === 'warning') return 'bg-amber-50 border-amber-100 text-amber-800';
    if (severity === 'success') return 'bg-emerald-50 border-emerald-100 text-emerald-800';
    return 'bg-blue-50 border-blue-100 text-blue-800';
  };

  const displayNotifications = (Array.isArray(notifications) ? notifications : []).map((n) => ({
    id: n.id,
    severity: normalizeSeverity(n.severity),
    title: n.title,
    message: n.reason || '',
    time: n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US') : '',
  }));

  return (
    <div className="relative" ref={panelRef}>
      <button
        className="relative inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-700 hover:border-gray-300"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <Bell className="h-7 w-7" />
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center">
          {displayNotifications.length}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-80 rounded-3xl border border-gray-100 bg-white p-4 shadow-2xl z-20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            <button className="text-xs text-gray-500" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-auto scrollbar-hide">
            {error ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                Loading notifications...
              </div>
            ) : null}

            {!loading && displayNotifications.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                No notifications
              </div>
            ) : null}

            {displayNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-3 space-y-1 ${severityClass(notification.severity)}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{notification.title}</span>
                  <span>{notification.time}</span>
                </div>
                {notification.message ? <p className="text-sm">{notification.message}</p> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const useAnimatedReveal = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return ready;
};

const ProfitabilityChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-base font-semibold text-gray-900">Profitability and Cost Analysis</p>
          <p className="text-sm text-gray-500">Budget vs cost vs revenue snapshot</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-600 font-semibold">
            Final Cash Balance
          </div>
          <div className="text-right">
            <p className="text-xs uppercase  text-gray-400">Growth</p>
            <p className="text-lg font-semibold text-emerald-600">+5.8% from last period</p>
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#21c45d" />
            <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 12, fill: '#5fa5fa' }} />
            <YAxis tickLine={false} tick={{ fontSize: 12, fill: '#fa7516' }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
            <RechartsTooltip formatter={(value, name) => [`$${Number(value).toLocaleString('en-US')}`, name]} />
            <Bar dataKey="value" barSize={32} radius={[12, 12, 0, 0]}>
              {data.map((entry, index) => {
                const colors = ['#21c45d', '#5fa5fa', '#fa7516'];
                const color = colors[index % colors.length];
                return (
                  <Cell
                    key={entry.label}
                    fill={color}
                    fillOpacity={0.9}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {data.map((item, index) => {
          const colors = ['#21c45d', '#5fa5fa', '#fa7516'];
          const color = colors[index % colors.length];
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <div>
                <p className="font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">${item.value.toLocaleString('en-US')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RevenueOrdersTrendChart: React.FC<{ data: any[] }> = ({ data }) => {
  const safeRows = useMemo(
    () =>
      (Array.isArray(data) ? data : []).map((row: any) => ({
        month: String(row?.month ?? row?.label ?? row?.date ?? ''),
        revenue: Number(row?.revenue ?? 0),
        orders: Number(row?.orders ?? 0),
      })),
    [data]
  );

  const formatMoneyCompact = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(safe);
    } catch (_err) {
      const abs = Math.abs(safe);
      if (abs >= 1_000_000) return `$${(safe / 1_000_000).toFixed(2)}M`;
      if (abs >= 1_000) return `$${(safe / 1_000).toFixed(1)}K`;
      return `$${Math.round(safe).toLocaleString('en-US')}`;
    }
  };

  const totalRevenue = safeRows.reduce((sum, row) => sum + (Number.isFinite(row.revenue) ? row.revenue : 0), 0);
  const totalOrders = safeRows.reduce((sum, row) => sum + (Number.isFinite(row.orders) ? row.orders : 0), 0);
  const monthsCount = safeRows.length || 0;
  const avgRevenue = monthsCount ? totalRevenue / monthsCount : 0;
  const avgOrders = monthsCount ? totalOrders / monthsCount : 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const peakRevenueRow = safeRows.reduce((best, row) => (row.revenue > best.revenue ? row : best), safeRows[0] || { month: '', revenue: 0, orders: 0 });
  const peakOrdersRow = safeRows.reduce((best, row) => (row.orders > best.orders ? row : best), safeRows[0] || { month: '', revenue: 0, orders: 0 });

  const firstRevenue = safeRows[0]?.revenue ?? 0;
  const lastRevenue = safeRows[safeRows.length - 1]?.revenue ?? 0;
  const revenueGrowthPct = firstRevenue > 0 ? ((lastRevenue - firstRevenue) / firstRevenue) * 100 : 0;

  const firstRpo = safeRows[0]?.orders > 0 ? (safeRows[0]?.revenue || 0) / safeRows[0].orders : 0;
  const lastRpo = safeRows[safeRows.length - 1]?.orders > 0 ? (lastRevenue || 0) / (safeRows[safeRows.length - 1]?.orders || 1) : 0;
  const rpoTrendLabel = lastRpo > firstRpo ? 'Improving' : lastRpo < firstRpo ? 'Declining' : 'Stable';

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-gray-900">Revenue & Orders Trend</p>
            <p className="text-sm text-gray-500">6-month revenue bars with order trend line</p>
          </div>
          <span className="text-[11px] uppercase  text-gray-400">Live</span>
        </div>
        <div className="flex items-center justify-end gap-6 text-xs font-semibold text-gray-500">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
            <span>Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
            <span>Orders</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 items-center">
        <div className="lg:w-1/2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={safeRows} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12, fill: '#475569' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  domain={[0, 'auto']}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#475569' }}
                  tickFormatter={(value) => `${value}`}
                  domain={[0, 'auto']}
                />
                <RechartsTooltip
                  formatter={(value, name) => {
                    if (name === 'orders') return [Number(value).toLocaleString('en-US'), 'Orders'];
                    return [`$${Number(value).toLocaleString('en-US')}`, 'Revenue'];
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Revenue"
                  fill="#f97316"
                  barSize={28}
                  radius={[10, 10, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-6 space-y-4 flex flex-col justify-center">
          <div className="space-y-2">
            <p className="text-base font-semibold text-gray-900">Revenue & Orders Summary</p>
            <p className="text-sm text-gray-500">Key insights from {monthsCount || 0}-month performance</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                <span className="text-sm font-semibold text-gray-700">Revenue</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Total Revenue</span>
                  <span className="text-sm font-semibold text-gray-900">{formatMoneyCompact(totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Average Monthly</span>
                  <span className="text-sm font-semibold text-gray-900">{formatMoneyCompact(avgRevenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Peak Month</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {peakRevenueRow?.month ? `${peakRevenueRow.month} (${formatMoneyCompact(peakRevenueRow.revenue)})` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Growth Trend</span>
                  <span className={`text-sm font-semibold ${revenueGrowthPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {monthsCount >= 2 ? `${revenueGrowthPct >= 0 ? '+' : ''}${revenueGrowthPct.toFixed(1)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                <span className="text-sm font-semibold text-gray-700">Orders</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Total Orders</span>
                  <span className="text-sm font-semibold text-gray-900">{Math.round(totalOrders).toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Average Monthly</span>
                  <span className="text-sm font-semibold text-gray-900">{monthsCount ? Math.round(avgOrders).toLocaleString('en-US') : '0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Peak Month</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {peakOrdersRow?.month ? `${peakOrdersRow.month} (${Math.round(peakOrdersRow.orders).toLocaleString('en-US')})` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Avg Order Value</span>
                  <span className="text-sm font-semibold text-gray-900">{formatMoneyCompact(avgOrderValue)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Revenue per Order Trend</span>
              <span className="text-xs font-semibold text-orange-600">{monthsCount >= 2 ? rpoTrendLabel : '—'}</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {monthsCount >= 2
                ? `Revenue and orders trends are based on actual synced data for the selected period.`
                : 'No data available for the selected period.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DonutChart: React.FC<{ segments: { name: string; value: number; color: string }[] }> = ({ segments }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const safeSegments = useMemo(
    () =>
      (Array.isArray(segments) ? segments : [])
        .map((seg) => ({
          name: String((seg as any)?.name ?? (seg as any)?.label ?? ''),
          value: Number.isFinite(seg?.value) ? Number(seg.value) : 0,
          color: String(seg?.color ?? '#60a5fa'),
        }))
        .filter((seg) => seg.name),
    [segments]
  );

  const total = safeSegments.reduce((sum, seg) => sum + seg.value, 0);

  const compactCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(value);
    } catch (_err) {
      const abs = Math.abs(value);
      if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
      if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
      return `$${Math.round(value).toLocaleString('en-US')}`;
    }
  };

  const formatMoney = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;

  if (!safeSegments.length) {
    return <p className="text-sm text-gray-500">No data available.</p>;
  }

  return (
    <div className="flex items-center justify-center w-full">
      <div className="flex flex-col md:flex-row items-center md:items-center gap-5 w-full">
        <div className="relative w-full max-w-[320px]">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={safeSegments}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="92%"
                paddingAngle={3}
                stroke="#fff"
                strokeWidth={3}
                activeIndex={activeIndex}
                activeShape={(props) => (
                  <Sector {...props} outerRadius={(Number(props.outerRadius) || 0) + 6} />
                )}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {safeSegments.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value: number, _name: string, payload) => {
                  const rowName = (payload as { payload?: { name?: string } } | undefined)?.payload?.name;
                  return [formatMoney(typeof value === 'number' ? value : Number(value)), rowName];
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
            <p className="text-[10px] uppercase text-gray-400 tracking-wide">TOTAL</p>
            <p className="text-3xl font-semibold text-gray-900 leading-tight whitespace-nowrap">{compactCurrency(total)}</p>
          </div>
        </div>

        <div className="w-full md:flex-1 space-y-2 text-sm">
          {safeSegments.map((seg) => (
            <div
              key={seg.name}
              className="rounded-2xl px-4 py-3 flex items-center justify-between border"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
                boxShadow: 'var(--theme-card-shadow)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="font-semibold theme-text truncate">{seg.name}</span>
              </div>
              <span className="font-semibold theme-text whitespace-nowrap">{formatMoney(seg.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SeoSparkline: React.FC<{ values: number[]; color?: string }> = ({ values, color = '#f97316' }) => {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-16">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
};

const SearchVisibilityCard: React.FC<{ snapshot: any }> = ({ snapshot }) => {
  const safeSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const gaugeValue = Math.min(100, Math.max(0, Number((safeSnapshot as any).healthScore ?? 0)));
  const gscClicks = Number((safeSnapshot as any).clicks ?? 0);
  const gscImpressions = Number((safeSnapshot as any).impressions ?? 0);
  const ctrRatio = gscImpressions > 0 ? gscClicks / gscImpressions : 0;
  const healthColor = (() => {
    if (gaugeValue <= 20) return '#ef4444'; // red
    if (gaugeValue <= 40) return '#f97316'; // red-orange
    if (gaugeValue <= 60) return '#fb923c'; // orange
    if (gaugeValue <= 80) return '#22c55e'; // green
    return '#16a34a'; // dark green
  })();

  const healthSegments = [
    { name: 'Health', value: gaugeValue, color: healthColor },
    { name: 'Remaining', value: Math.max(0, 100 - gaugeValue), color: '#f3f4f6' },
  ];

  return (
    <div className="rounded-3xl border border-gray-100 p-6 space-y-6 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900">Search Visibility</p>
          <p className="text-sm text-gray-500">Live health and ranking signals</p>
        </div>
        <span className="text-xs text-gray-400">Updated 5 min ago</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[auto_auto_1fr] gap-8 lg:items-center">
        <div
          className="shrink-0 rounded-3xl border p-4 shadow-sm"
          style={{
            borderColor: hexToRgba(healthColor, 0.45),
            background: `linear-gradient(135deg, ${hexToRgba(healthColor, 0.16)}, ${hexToRgba('#ffffff', 0.95)})`,
          }}
        >
          <div className="relative h-24 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthSegments}
                  dataKey="value"
                  innerRadius={30}
                  outerRadius={42}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                  stroke="#ffffff"
                  strokeWidth={3}
                >
                  {healthSegments.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-semibold text-gray-900 leading-none">{gaugeValue}%</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Health</p>
            </div>
          </div>
        </div>

        <div className="min-w-0 grid grid-cols-2 gap-6 text-gray-900">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Avg. Position</p>
            <p className="mt-1 text-3xl font-semibold truncate">{(safeSnapshot as any).avgPosition}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Organic Sessions</p>
            <p className="mt-1 text-3xl font-semibold truncate">{Number((safeSnapshot as any).organicSessions ?? 0).toLocaleString('en-US')}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Clicks</p>
            <p className="mt-1 text-2xl font-semibold truncate">{gscClicks.toLocaleString('en-US')}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Impressions / CTR</p>
            <p className="mt-1 text-2xl font-semibold truncate">{gscImpressions.toLocaleString('en-US')} · {(ctrRatio * 100).toFixed(2)}%</p>
          </div>
        </div>

        <div className="border-t lg:border-t-0 lg:border-l border-dashed border-gray-200 pt-6 lg:pt-0 lg:pl-8">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Sessions (7d)</p>
          <p className="text-base font-medium text-gray-900">Week-on-week trend</p>
          <SeoSparkline values={Array.isArray((safeSnapshot as any).sessionTrend) ? (safeSnapshot as any).sessionTrend : []} color={healthColor} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-base">
        {(Array.isArray((safeSnapshot as any).keywords) ? (safeSnapshot as any).keywords : []).map((keyword: any) => (
          <div key={keyword.keyword} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
            <p className="text-sm font-semibold text-gray-900 truncate">{keyword.keyword}</p>
            <p className="text-2xl font-semibold text-gray-900">#{keyword.position}</p>
            <p className="text-sm text-emerald-500">{keyword.change} • Vol. {keyword.volume.toLocaleString('en-US')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const TechnicalScoreList: React.FC<{ scores: any[] }> = ({ scores }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
    <p className="text-sm font-semibold text-gray-900">Technical Readiness</p>
    <div className="space-y-3">
      {scores.map((score) => (
        <div key={score.label} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">{score.label}</p>
            <p className="text-xs text-gray-500">{score.helper}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">{Number(score.value ?? 0)}%</span>
            <div className="w-24 h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500" style={{ width: `${Number(score.value ?? 0)}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SeoChannelMix: React.FC<{ channels: any[] }> = ({ channels }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
    <p className="text-sm font-semibold text-gray-900">Organic Channel Mix</p>
    <div className="space-y-3 text-sm">
      {channels.map((channel) => (
        <div key={channel.label}>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{channel.label}</span>
            <span>{channel.value}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${channel.value}%`, backgroundColor: channel.color }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SeoKeywordsTable: React.FC<{ keywords: any[]; downloadFileName?: string }> = ({
  keywords,
  downloadFileName = 'top-organic-keywords.csv',
}) => {

  const getVolumeColor = (val: number) => {
    if (val <= 20) return { bg: '#fee2e2', text: '#ef4444' }; // Red
    if (val <= 40) return { bg: '#ffedd5', text: '#f97316' }; // Orange
    if (val <= 60) return { bg: '#fef9c3', text: '#eab308' }; // Yellow
    if (val <= 80) return { bg: '#dcfce7', text: '#84cc16' }; // Lime
    return { bg: '#dcfce7', text: '#22c55e' }; // Green (using same bg as lime for consistency or distinct if needed)
  };

  const handleDownload = () => {
    const rows = Array.isArray(keywords) ? keywords : [];
    const header = ['Keyword', 'Position', 'Volume', 'CPU(USD)', 'Traffic(%)'];
    const escape = (value: unknown) => {
      const text = String(value ?? '');
      const escaped = text.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvLines = [
      header.map(escape).join(','),
      ...rows.map((row: any) => [
        escape(row.keyword),
        escape(row.pos),
        escape(row.volume),
        escape(row.cpu),
        escape(row.traffic),
      ].join(',')),
    ];

    const csv = `\ufeff${csvLines.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[18px] font-semibold text-gray-900">Top Organic Keywords</p>
        <button
          className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-all download-pill hover:bg-white/5"
          style={{ color: 'var(--theme-text)', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent' }}
          title="Download"
          onClick={handleDownload}
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="pb-3 pr-4 font-medium">Keywords</th>
              <th className="pb-3 pr-4 font-medium text-center">pos.</th>
              <th className="pb-3 pr-4 font-medium text-center">Volume</th>
              <th className="pb-3 pr-4 font-medium text-center">CPU(USD)</th>
              <th className="pb-3 font-medium text-center">Traffic,%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(Array.isArray(keywords) ? keywords : []).map((row: any, index: number) => {
              const color = getVolumeColor(row.volume);
              return (
                <tr key={`${row.keyword}-${index}`} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4 font-medium text-blue-500">{row.keyword}</td>
                  <td className="py-3 pr-4 text-gray-700 text-center">{row.pos}</td>
                  <td className="py-3 pr-4 text-center">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold"
                      style={{ backgroundColor: color.bg, color: color.text }}
                    >
                      {row.volume}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-700 text-center">{row.cpu}</td>
                  <td className="py-3 text-center text-gray-700">{row.traffic}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SeoCompetitorsCard: React.FC<{ competitors: any[] }> = ({ competitors }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
    <p className="text-sm font-semibold text-gray-900">Top organic Competitors</p>
    <div className="space-y-3 text-sm">
      {competitors.map((competitor) => (
        <div key={competitor.name} className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{competitor.name}</p>
            <p className="text-xs text-gray-500">Com. Level {competitor.competition}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">Com.keyWords {competitor.keywords}</span>
            <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
              {competitor.refDomains}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SeoBacklinkSummaryCard: React.FC<{
  highlights: any;
  anchors: any[];
  referringDomains: any[];
}> = ({ highlights, anchors, referringDomains }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
    <p className="text-sm font-semibold text-gray-900">Backlinks overview</p>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-xs text-gray-500">Backlinks</p>
        <p className="text-2xl font-semibold text-gray-900">{Number(highlights?.totalBacklinks ?? 0).toLocaleString('en-US')}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Referring Domains</p>
        <p className="text-2xl font-semibold text-gray-900">{Number(highlights?.referringDomains ?? 0).toLocaleString('en-US')}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Keywords</p>
        <p className="text-2xl font-semibold text-gray-900">{Number(highlights?.keywords ?? 0).toLocaleString('en-US')}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Traffic Cost</p>
        <p className="text-2xl font-semibold text-gray-900">{String(highlights?.trafficCost ?? '$0')}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-xs uppercase  text-gray-500 mb-2">Anchors</p>
        <div className="space-y-2">
          {(Array.isArray(anchors) ? anchors : []).map((anchor: any) => (
            <div key={String(anchor.anchor)} className="flex items-center justify-between">
              <span className="text-gray-700 truncate pr-2">{String(anchor.anchor)}</span>
              <span className="font-semibold text-gray-900">{String(anchor.percent)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs uppercase  text-gray-500 mb-2">Referring domains</p>
        <div className="space-y-2">
          {(Array.isArray(referringDomains) ? referringDomains : []).map((item: any) => (
            <div key={String(item.label)} className="flex items-center justify-between">
              <span className="text-gray-600">{String(item.label)}</span>
              <span className="font-semibold text-gray-900">{String(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const SeoRightRailCard: React.FC<{ stats: any[]; urlRatings: any[] }> = ({ stats, urlRatings }) => (
  <div className="theme-card rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
    <p className="text-sm font-semibold text-gray-900">Crawled metrics</p>
    <div className="space-y-2 text-sm">
      {(Array.isArray(stats) ? stats : []).map((stat: any) => (
        <div key={String(stat.label)} className="flex items-center justify-between">
          <span>{String(stat.label)}</span>
          <span className="font-semibold text-gray-900">{String(stat.value)}</span>
        </div>
      ))}
    </div>
    <div>
      <p className="text-xs uppercase  text-gray-500 mb-2">URL Rating Distribution</p>
      <div className="space-y-2">
        {(Array.isArray(urlRatings) ? urlRatings : []).map((rating: any) => (
          <div key={String(rating.label)} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: String(rating.label) === '81-100' ? '#22c55e' : String(rating.label) === '61-80' ? '#10b981' : String(rating.label) === '41-60' ? '#facc15' : String(rating.label) === '21-40' ? '#fb923c' : '#f87171' }} />
              <span>{String(rating.label)}</span>
            </div>
            <span className="text-gray-700">{String(rating.value)} • {String(rating.percent)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SeoRegionalPerformanceCard: React.FC<{ regions: any[] }> = ({ regions }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
    <p className="text-sm font-semibold text-gray-900">Regional SEO Performance</p>
    <div className="flex items-center gap-4">
      <div className="h-32 w-32 rounded-full" style={{ background: `conic-gradient(${(Array.isArray(regions) ? regions : []).map((r: any) => `${String(r.color)} ${Number(r.value || 0)}%`).join(', ')})` }}>
        <div className="h-full w-full flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center text-2xl font-semibold text-gray-900">110</div>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        {(Array.isArray(regions) ? regions : []).map((region: any) => (
          <div key={String(region.region)} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: String(region.color) }} />
            <span className="w-20 text-gray-600">{String(region.region)}</span>
            <span className="font-semibold text-gray-900">{Number(region.value || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SeoAuthorityCard: React.FC<{ scores: any[] }> = ({ scores }) => {
  const getScoreColor = (label: string) => {
    if (label.includes('UR') || label.includes('Rating')) return '#22c55e'; // Green
    return '#f59e0b'; // Orange for DR/others
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Authority metrics</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Array.isArray(scores) ? scores : []).map((score: any) => (
          <div key={score.label} className="relative overflow-hidden rounded-2xl bg-[#0f172a] p-5 shadow-sm flex flex-col items-center justify-center text-center group transition-transform hover:scale-[1.01]">
            <div className="absolute top-4 left-4">
              <p className="text-sm font-bold text-white">{score.label}</p>
            </div>

            <div className="relative h-44 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ value: score.value }, { value: 100 - score.value }]}
                    cx="50%"
                    cy="75%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                  >
                    <Cell fill={getScoreColor(score.label)} />
                    <Cell fill="#334155" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-5 left-0 right-0 flex justify-center">
                <div className={`px-4 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/5`}>
                  <span className="text-2xl font-bold text-white">{score.value}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-[-20px] pb-2">{String(score.helper || '')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const SeoOrganicSummaryCard: React.FC<{ summary: any }> = ({ summary }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-3">
    <p className="text-sm font-semibold text-gray-900">Organic Search</p>
    <div className="grid grid-cols-3 gap-4 text-sm">
      <div>
        <p className="text-xs text-gray-500">Keywords</p>
        <p className="text-xl font-semibold text-gray-900">{Number(summary?.keywords ?? 0).toLocaleString('en-US')}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Traff. Cost</p>
        <p className="text-xl font-semibold text-gray-900">{String(summary?.trafficCost ?? '$0')}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Traffic</p>
        <p className="text-xl font-semibold text-gray-900">{String(summary?.traffic ?? '0')}</p>
      </div>
    </div>
  </div>
);

const SeoPositionDistributionCard: React.FC<{ distribution: any[] }> = ({ distribution }) => {
  const max = Math.max(...distribution.map((item) => item.value), 1);
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
      <p className="text-sm font-semibold text-gray-900">Organic Position Distribution</p>
      <div className="space-y-3">
        {distribution.map((item) => (
          <div key={item.range}>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{item.range}</span>
              <span>{item.value}%</span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SeoCompetitiveMapCard: React.FC<{ snapshot: any[] }> = ({ snapshot }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-base font-semibold text-gray-900">Competitive Positioning Map</p>
        <p className="text-sm text-gray-500">Authority vs share of voice • SERP snapshot</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>↑ Authority</span>
        <span className="px-2 py-1 rounded-full border border-gray-200">→ Momentum</span>
      </div>
    </div>
    <div className="relative h-64 bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-gray-100 overflow-hidden">
      <div className="absolute inset-6 border border-dashed border-gray-200 rounded-2xl">
        {snapshot.map((brand) => (
          <div
            key={brand.brand}
            className="absolute flex flex-col items-center"
            style={{
              left: `${brand.authority * 0.9}%`,
              bottom: `${brand.share * 0.8}%`,
            }}
          >
            <div
              className="rounded-full shadow-lg text-xs font-semibold text-white flex items-center justify-center"
              style={{
                width: `${Math.max(32, brand.share / 1.5)}px`,
                height: `${Math.max(32, brand.share / 1.5)}px`,
                background: `linear-gradient(135deg, ${hexToRgba(brand.color, 0.9)}, ${hexToRgba(brand.color, 0.6)})`,
              }}
            >
              {brand.brand}
            </div>
            <span className="mt-1 text-[11px] text-gray-500">{brand.share}% SoV</span>
          </div>
        ))}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between text-xs text-gray-500">
      <span>Bubble size = share of voice</span>
      <span>Position = authority & momentum</span>
    </div>
  </div>
);

type CampaignSummaryItem = {
  id?: string | number;
  label: string;
  value: string | number;
  delta?: string | number;
  positive?: boolean;
};

type CampaignRow = {
  id: string;
  name: string;
  date?: string;
  status: string;
  budget?: number;
  spent?: number;
  conversions?: number;
  roi?: number;
  roas?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
};

type CampaignAgeRangeRow = { name: string; value: number; color: string };
type CampaignConversionRateRow = { label: string; value: number; color?: string };
type CampaignGenderDistributionRow = { segment: string; male: number; female: number; unknown: number };
type CampaignAdPerformanceRow = {
  campaign: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
};

type CampaignCreativeRow = {
  id: string;
  name: string;
  type?: string;
  reach?: number;
  reactions?: number;
  cta?: string;
};

type CampaignSource = {
  id: string;
  label: string;
  logo?: string;
  accent?: string;
  summary: CampaignSummaryItem[];
  campaigns: CampaignRow[];
  ageRange: CampaignAgeRangeRow[];
  conversionRate: CampaignConversionRateRow[];
  genderDistribution: CampaignGenderDistributionRow[];
  adPerformance: CampaignAdPerformanceRow[];
  creatives: CampaignCreativeRow[];
};

const AgeRangeDonut: React.FC<{ ranges: CampaignSource['ageRange'] }> = ({ ranges }) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  if (!ranges.length) {
    return <p className="text-sm text-gray-500">No age-range data available.</p>;
  }
  const topRange = ranges.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), ranges[0]);
  const topPercent = topRange?.value || 0;

  return (
    <div className="flex items-center justify-center w-full">
      <div className="relative w-full max-w-[520px] min-w-[260px]">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={ranges}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="90%"
              paddingAngle={3}
              stroke="#fff"
              strokeWidth={2}
              activeIndex={activeIndex}
              activeShape={(props) => (
                <Sector
                  {...props}
                  outerRadius={(Number(props.outerRadius) || 0) + 6}
                />
              )}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(-1)}
            >
              {ranges.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value: number, _name: string, payload) => {
                const percent = typeof value === 'number' ? value.toFixed(1) + '%' : value;
                const rowName = (payload as { payload?: { name?: string } } | undefined)?.payload?.name;
                return [percent, rowName];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
          style={{ opacity: activeIndex === -1 ? 1 : 0, transition: 'opacity 150ms ease-out' }}
        >
          <p className="text-xs uppercase  text-gray-400">Top</p>
          <p className="text-4xl font-semibold text-gray-900 leading-tight">{topPercent.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
};

const ConversionRateBars: React.FC<{ data: CampaignSource['conversionRate'] }> = ({ data }) => {
  const [activeLabel, setActiveLabel] = useState(data[0]?.label || '');
  const activeMetric = useMemo(() => data.find((item) => item.label === activeLabel) || data[0], [data, activeLabel]);
  const best = useMemo(() => data.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), data[0]), [data]);
  const lowest = useMemo(() => data.reduce((prev, curr) => (curr.value < prev.value ? curr : prev), data[0]), [data]);

  if (!data.length) {
    return <p className="text-sm text-gray-500">No conversion data available.</p>;
  }

  return (
    <div className="flex flex-col justify-between space-y-5">
      <div className="flex flex-wrap gap-2">
        {data.map((item) => {
          const isActive = item.label === activeMetric?.label;
          return (
            <button
              key={item.label}
              onClick={() => setActiveLabel(item.label)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className={`${themePanelClass} space-y-5 shadow-inner`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase theme-muted">Active Channel</p>
            <p className="text-lg font-semibold theme-text">{activeMetric?.label}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase theme-muted">Conversion Rate</p>
            <p className="text-4xl font-semibold theme-text">{activeMetric?.value}%</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="theme-panel-soft rounded-2xl p-4 border border-orange-200/70">
            <p className="text-xs uppercase text-orange-500">Insight</p>
            <p className="text-sm theme-muted mt-1">
              {activeMetric?.label} converts {((activeMetric!.value / best.value - 1) * 100).toFixed(1)}% {activeMetric?.value === best.value ? 'higher than average' : 'vs best channel'} driven by optimized targeting.
            </p>
          </div>
          <div className="theme-panel-soft rounded-2xl p-4 border border-gray-100/60 benchmark-card">
            <p className="text-xs uppercase theme-muted">Benchmark</p>
            <p className="text-sm theme-muted mt-1">
              Top: {best.label} ({best.value}%). Lowest: {lowest.label} ({lowest.value}%). Keep {activeMetric?.label.toLowerCase()} above {best.value - 2}% to stay competitive.
            </p>
          </div>
          <div className="theme-panel-soft rounded-2xl p-4 border border-emerald-200/70">
            <p className="text-xs uppercase text-emerald-400">Action</p>
            <p className="text-sm theme-muted mt-1">Double down on creatives performing in {activeMetric?.label}. Test new offer variants to close the gap with {best.label}.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const GenderDistributionChart: React.FC<{ data: CampaignSource['genderDistribution'] }> = ({ data }) => {
  const chartData = data.map((segment) => ({
    segment: segment.segment,
    Male: segment.male,
    Female: segment.female,
    Unknown: segment.unknown,
  }));

  const colors = {
    Male: '#3b82f6',
    Female: '#ec4899',
    Unknown: '#94a3b8',
  };

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={530}>
        <BarChart data={chartData} margin={{ top: 60, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" />
          <XAxis dataKey="segment" tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} interval={0} angle={-8} height={30} />
          <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
          <RechartsTooltip cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
          <Legend wrapperStyle={{ fontSize: 14, paddingTop: '8px' }} payload={[
            { value: 'Male', type: 'square', color: '#3b82f6' },
            { value: 'Female', type: 'square', color: '#ec4899' },
            { value: 'Unknown', type: 'square', color: '#94a3b8' },
          ]} />
          {(['Male', 'Female', 'Unknown'] as const).map((key) => (
            <Bar key={key} dataKey={key} fill={colors[key]} radius={[6, 6, 0, 0]} barSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const CampaignSourceTabs: React.FC<{
  sources: CampaignSource[];
  themeMode: 'light' | 'dark';
  onDownload?: (section: string) => void;
  themePanelClass: string;
  RealTimeCard: React.ComponentType<any>;
  realtimeModeEnabled: boolean;
  visualizationRef?: React.RefObject<HTMLDivElement>;
}> = ({ sources, themeMode, onDownload, themePanelClass, RealTimeCard, realtimeModeEnabled, visualizationRef }) => {
  const [activeSourceId, setActiveSourceId] = useState(sources[0]?.id || '');
  const [chartTheme, setChartTheme] = useState<'sunset' | 'carbon'>('sunset');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [campaignQuery, setCampaignQuery] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all' | 'active' | 'paused' | 'ended'>('all');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const campaignColumnsStorageKey = 'dashboard.campaignTable.visibleColumns';
  const campaignColumnsOrderStorageKey = 'dashboard.campaignTable.columnOrder';

  const [campaignNameTooltip, setCampaignNameTooltip] = useState<null | { name: string; left: number; top: number }>(null);

  const showCampaignNameTooltip = useCallback((event: React.MouseEvent<HTMLElement>, name: string) => {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxWidth = 520;
    const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - maxWidth - 12));
    const top = Math.max(12, rect.top - 10);
    setCampaignNameTooltip({ name, left, top });
  }, []);

  const hideCampaignNameTooltip = useCallback(() => {
    setCampaignNameTooltip(null);
  }, []);

  useEffect(() => {
    if (!sources.length) {
      setActiveSourceId('');
      return;
    }
    if (!sources.find((source) => source.id === activeSourceId)) {
      setActiveSourceId(sources[0].id);
    }
  }, [sources, activeSourceId]);
  const campaignColumnDefs = useMemo(
    () => [
      { key: 'budget', label: 'Budget' },
      { key: 'spent', label: 'Spent' },
      { key: 'conversions', label: 'Conversions' },
      { key: 'roi', label: 'ROI' },
      { key: 'roas', label: 'ROAS' },
      { key: 'impressions', label: 'Impressions' },
      { key: 'clicks', label: 'Clicks' },
      { key: 'ctr', label: 'CTR' },
      { key: 'cpc', label: 'CPC' },
      { key: 'cpm', label: 'CPM' },
    ],
    []
  );

  const [visibleCampaignColumns, setVisibleCampaignColumns] = useState<Record<string, boolean>>(() => ({
    ...(typeof window !== 'undefined'
      ? (() => {
        try {
          const raw = window.localStorage.getItem(campaignColumnsStorageKey);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object') return null;
          return parsed as Record<string, boolean>;
        } catch {
          return null;
        }
      })()
      : null),
    budget: true,
    spent: true,
    conversions: true,
    roi: true,
    roas: false,
    impressions: false,
    clicks: false,
    ctr: false,
    cpc: false,
    cpm: false,
  }));

  const [campaignColumnOrder, setCampaignColumnOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(campaignColumnsOrderStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const allowed = new Set(campaignColumnDefs.map((col) => col.key));
      const cleaned = parsed.filter((key) => typeof key === 'string' && allowed.has(key));
      return cleaned;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(campaignColumnsStorageKey, JSON.stringify(visibleCampaignColumns));
    } catch {
      // Ignore storage errors (e.g. private mode)
    }
  }, [campaignColumnsStorageKey, visibleCampaignColumns]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(campaignColumnsOrderStorageKey, JSON.stringify(campaignColumnOrder));
    } catch {
      // Ignore storage errors
    }
  }, [campaignColumnsOrderStorageKey, campaignColumnOrder]);

  const toggleCampaignColumn = useCallback((key: string) => {
    setVisibleCampaignColumns((prev) => {
      const isCurrentlyVisible = prev[key] !== false;
      const nextValue = !isCurrentlyVisible;

      setCampaignColumnOrder((orderPrev) => {
        if (nextValue) {
          if (orderPrev.includes(key)) return orderPrev;
          return [...orderPrev, key];
        }
        return orderPrev.filter((k) => k !== key);
      });

      return { ...prev, [key]: nextValue };
    });
  }, []);

  const displayedCampaignColumns = useMemo(() => {
    const allKeys = campaignColumnDefs.map((col) => col.key);
    const selectedKeysDefaultOrder = allKeys.filter((key) => visibleCampaignColumns[key] !== false);
    const selectedKeysByOrder = campaignColumnOrder.filter((key) => visibleCampaignColumns[key] !== false);
    const selectedKeys = selectedKeysByOrder.length
      ? [...selectedKeysByOrder, ...selectedKeysDefaultOrder.filter((key) => !selectedKeysByOrder.includes(key))]
      : selectedKeysDefaultOrder;

    const unselectedKeys = allKeys.filter((key) => visibleCampaignColumns[key] === false);
    return [...selectedKeys, ...unselectedKeys];
  }, [campaignColumnDefs, campaignColumnOrder, visibleCampaignColumns]);

  const campaignColumnMeta = useMemo(() => {
    const map: Record<string, { label: string; minWidthClass: string }> = {
      budget: { label: 'Budget', minWidthClass: 'min-w-[140px]' },
      spent: { label: 'Spent', minWidthClass: 'min-w-[140px]' },
      conversions: { label: 'Conversions', minWidthClass: 'min-w-[140px]' },
      roi: { label: 'ROI', minWidthClass: 'min-w-[120px]' },
      roas: { label: 'ROAS', minWidthClass: 'min-w-[120px]' },
      impressions: { label: 'Impressions', minWidthClass: 'min-w-[150px]' },
      clicks: { label: 'Clicks', minWidthClass: 'min-w-[120px]' },
      ctr: { label: 'CTR', minWidthClass: 'min-w-[110px]' },
      cpc: { label: 'CPC', minWidthClass: 'min-w-[110px]' },
      cpm: { label: 'CPM', minWidthClass: 'min-w-[110px]' },
    };
    return map;
  }, []);
  const campaignTableScrollRef = useRef<HTMLDivElement | null>(null);
  const campaignTableBottomScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingCampaignTableScroll = useRef<'main' | 'bottom' | null>(null);
  const [campaignTableScrollWidth, setCampaignTableScrollWidth] = useState(0);
  const detailedAdPerformanceScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollDetailedLeft, setCanScrollDetailedLeft] = useState(false);
  const [canScrollDetailedRight, setCanScrollDetailedRight] = useState(false);

  const [comparedCampaignColumns, setComparedCampaignColumns] = useState<string[]>([]);
  const draggingCampaignColumnKeyRef = useRef<string | null>(null);

  const activeSource = useMemo(() => {
    if (!sources.length) return null;
    return sources.find((source) => source.id === activeSourceId) || sources[0];
  }, [sources, activeSourceId]);

  const activeSourceRealtimeCards = useMemo(() => {
    if (!activeSource?.summary?.length) return [];
    const normalize = (value: unknown) =>
      String(value ?? '')
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const preferredLabels = ['Total Campaigns', 'Total SpendRate', 'Total Conversions', 'Avg. ROI'].map(normalize);
    const labelAliases: Record<string, string[]> = {
      [normalize('Total Campaigns')]: [normalize('Campaigns')],
      [normalize('Total SpendRate')]: [normalize('Total Spend Rate'), normalize('Spend Rate'), normalize('SpendRate'), normalize('Spend')],
      [normalize('Total Conversions')]: [normalize('Conversions')],
      [normalize('Avg. ROI')]: [normalize('Avg ROI'), normalize('Average ROI')],
    };

    const asSummaryItem = (value: unknown): RealtimeSummaryItem | null => {
      if (!isRecord(value)) return null;
      const label = typeof value.label === 'string' ? value.label : '';
      if (!label.trim()) return null;
      return {
        id: typeof value.id === 'string' || typeof value.id === 'number' ? value.id : undefined,
        label,
        value: typeof value.value === 'string' || typeof value.value === 'number' ? value.value : '',
        delta: typeof value.delta === 'string' || typeof value.delta === 'number' ? value.delta : '',
        positive: typeof value.positive === 'boolean' ? value.positive : undefined,
      };
    };

    const byLabel = new Map<string, RealtimeSummaryItem>();
    const byId = new Map<string, RealtimeSummaryItem>();
    activeSource.summary.forEach((item: unknown) => {
      const summaryItem = asSummaryItem(item);
      if (!summaryItem) return;
      const idKey = String(summaryItem.id ?? '').trim();
      const labelKey = normalize(summaryItem.label);
      if (idKey && !byId.has(idKey)) {
        byId.set(idKey, summaryItem);
      }
      if (labelKey && !byLabel.has(labelKey)) {
        byLabel.set(labelKey, summaryItem);
      }
    });

    const picked: RealtimeSummaryItem[] = [];
    const seen = new Set<string>();

    preferredLabels.forEach((labelKey) => {
      const candidates = [labelKey, ...(labelAliases[labelKey] ?? [])];
      const foundKey = candidates.find((candidate) => byLabel.has(candidate));
      const item = foundKey ? byLabel.get(foundKey) : undefined;
      if (!item) return;
      const idKey = String(item.id ?? '').trim();
      const uniqueKey = idKey ? `id:${idKey}` : `label:${normalize(item.label)}`;
      if (seen.has(uniqueKey)) return;
      seen.add(uniqueKey);
      picked.push(item);
      if (idKey) {
        byId.delete(idKey);
      }
      if (foundKey) {
        byLabel.delete(foundKey);
      }
    });

    Array.from(byId.values()).some((item) => {
      if (picked.length >= 4) return true;
      const idKey = String(item.id ?? '').trim();
      const uniqueKey = idKey ? `id:${idKey}` : `label:${normalize(item.label)}`;
      if (!uniqueKey || seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);
      picked.push(item);
      return false;
    });

    return picked.slice(0, 4);
  }, [activeSource]);

  const hasSelectedCampaigns = selectedCampaignIds.length > 0;

  const toggleComparedCampaignColumn = useCallback((key: string) => {
    setComparedCampaignColumns((prev) => {
      const isCurrentlyCompared = prev.includes(key);
      const nextCompared = isCurrentlyCompared
        ? prev.filter((k) => k !== key)
        : prev.length >= 3
          ? [...prev.slice(1), key]
          : [...prev, key];

      setCampaignColumnOrder((orderPrev) => {
        const allowed = new Set(campaignColumnDefs.map((col) => col.key));
        const base = orderPrev.length ? orderPrev.filter((k) => allowed.has(k)) : campaignColumnDefs.map((col) => col.key);
        const baseVisible = base.filter((k) => visibleCampaignColumns[k] !== false);

        const prioritized = nextCompared.filter((k) => baseVisible.includes(k));
        const rest = baseVisible.filter((k) => !prioritized.includes(k));
        return [...prioritized, ...rest];
      });

      return nextCompared;
    });
  }, [campaignColumnDefs, visibleCampaignColumns]);

  const moveCampaignColumn = useCallback(
    (fromKey: string, toKey: string) => {
      if (!fromKey || !toKey || fromKey === toKey) return;
      const visibleKeys = displayedCampaignColumns.filter((key) => visibleCampaignColumns[key] !== false);
      if (!visibleKeys.includes(fromKey) || !visibleKeys.includes(toKey)) return;

      const nextVisible = [...visibleKeys];
      const fromIndex = nextVisible.indexOf(fromKey);
      const toIndex = nextVisible.indexOf(toKey);
      if (fromIndex < 0 || toIndex < 0) return;
      nextVisible.splice(fromIndex, 1);
      nextVisible.splice(toIndex, 0, fromKey);

      setCampaignColumnOrder((prevOrder) => {
        const allowed = new Set(campaignColumnDefs.map((col) => col.key));
        const current = prevOrder.filter((key) => allowed.has(key));
        const base = current.length ? current : visibleKeys;
        const baseSet = new Set(base);
        const next = nextVisible.filter((key) => baseSet.has(key));
        const rest = base.filter((key) => !next.includes(key));
        return [...next, ...rest];
      });
    },
    [campaignColumnDefs, displayedCampaignColumns, visibleCampaignColumns]
  );

  useEffect(() => {
    setSelectedCampaignIds([]);
    setCampaignQuery('');
    setCampaignStatusFilter('all');
    setShowSelectedOnly(false);
  }, [activeSourceId]);

  const toggleCampaignSelection = useCallback((campaignId: string) => {
    setSelectedCampaignIds((prev) => {
      if (prev.includes(campaignId)) {
        return prev.filter((id) => id !== campaignId);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, campaignId];
    });
  }, []);

  const updateDetailedAdPerformanceScrollState = useCallback(() => {
    const el = detailedAdPerformanceScrollRef.current;
    if (!el) return;
    const maxLeft = el.scrollWidth - el.clientWidth;
    setCanScrollDetailedLeft(el.scrollLeft > 0);
    setCanScrollDetailedRight(el.scrollLeft < maxLeft - 1);
  }, []);

  useEffect(() => {
    updateDetailedAdPerformanceScrollState();
    window.addEventListener('resize', updateDetailedAdPerformanceScrollState);
    return () => window.removeEventListener('resize', updateDetailedAdPerformanceScrollState);
  }, [activeSourceId, updateDetailedAdPerformanceScrollState]);

  const scrollDetailedAdPerformance = useCallback((direction: 'left' | 'right') => {
    const el = detailedAdPerformanceScrollRef.current;
    if (!el) return;
    const amount = Math.max(240, Math.floor(el.clientWidth * 0.6));
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  const palette = useMemo(() => {
    const accent = activeSource?.accent || '#f97316';
    return chartTheme === 'sunset'
      ? {
        primary: accent,
        secondary: '#fef08a',
        tertiary: '#fb923c',
        card: 'from-white to-orange-50/40',
        border: 'border-orange-100',
        text: 'text-gray-900',
        subtext: 'text-gray-600',
        legend: '#0f172a',
        area: 'rgba(249, 115, 22, 0.18)',
      }
      : {
        primary: '#0f172a',
        secondary: '#475569',
        tertiary: '#f97316',
        card: 'from-gray-900 via-gray-800 to-gray-900',
        border: 'border-gray-800',
        text: 'text-white',
        subtext: 'text-gray-300',
        legend: '#e5e7eb',
        area: 'rgba(15, 23, 42, 0.35)',
      };
  }, [activeSource, chartTheme]);

  const selectedCampaigns = useMemo(() => {
    if (!activeSource) return [];
    return activeSource.campaigns.filter((campaign) => selectedCampaignIds.includes(campaign.id));
  }, [activeSource, selectedCampaignIds]);

  const filteredCampaigns = useMemo(() => {
    if (!activeSource) return [];

    const query = campaignQuery.trim().toLowerCase();
    return activeSource.campaigns.filter((campaign) => {
      const matchesQuery = !query || campaign.name.toLowerCase().includes(query);
      const matchesStatus =
        campaignStatusFilter === 'all' || campaign.status.toLowerCase() === campaignStatusFilter;
      const matchesSelected = !showSelectedOnly || selectedCampaignIds.includes(campaign.id);
      return matchesQuery && matchesStatus && matchesSelected;
    });
  }, [activeSource, campaignQuery, campaignStatusFilter, showSelectedOnly, selectedCampaignIds]);

  useEffect(() => {
    const updateWidth = () => {
      const el = campaignTableScrollRef.current;
      if (!el) return;
      setCampaignTableScrollWidth(el.scrollWidth);
    };

    updateWidth();
    const raf = window.requestAnimationFrame(updateWidth);
    window.addEventListener('resize', updateWidth);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateWidth);
    };
  }, [displayedCampaignColumns, filteredCampaigns.length]);

  const handleCampaignTableScroll = useCallback(() => {
    const main = campaignTableScrollRef.current;
    const bottom = campaignTableBottomScrollRef.current;
    if (!main || !bottom) return;
    if (isSyncingCampaignTableScroll.current === 'bottom') {
      isSyncingCampaignTableScroll.current = null;
      return;
    }
    isSyncingCampaignTableScroll.current = 'main';
    bottom.scrollLeft = main.scrollLeft;
    isSyncingCampaignTableScroll.current = null;
  }, []);

  const handleCampaignTableBottomScroll = useCallback(() => {
    const main = campaignTableScrollRef.current;
    const bottom = campaignTableBottomScrollRef.current;
    if (!main || !bottom) return;
    if (isSyncingCampaignTableScroll.current === 'main') {
      isSyncingCampaignTableScroll.current = null;
      return;
    }
    isSyncingCampaignTableScroll.current = 'bottom';
    main.scrollLeft = bottom.scrollLeft;
    isSyncingCampaignTableScroll.current = null;
  }, []);

  const summaryCampaigns = useMemo(() => {
    if (!activeSource) return [];
    return (activeSource.campaigns || []).filter(
      (campaign) => (campaign.status || '').toLowerCase() === 'active'
    );
  }, [activeSource]);

  const summarySubtitle = useMemo(() => {
    if (summaryCampaigns.length === 0) {
      return 'No active campaigns within this source';
    }
    return `Summary based on ${summaryCampaigns.length} active campaign${summaryCampaigns.length === 1 ? '' : 's'} within this source`;
  }, [summaryCampaigns.length]);

  const performanceSummary = useMemo(() => {
    if (!activeSource) {
      return {
        spent: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
      };
    }

    const nameSet = new Set(summaryCampaigns.map((campaign) => campaign.name));
    const rows = activeSource.adPerformance.filter((row) => nameSet.has(row.campaign));

    const totals = rows.reduce(
      (acc, row) => {
        acc.spent += row.spend;
        acc.impressions += row.impressions;
        acc.clicks += row.clicks;
        return acc;
      },
      { spent: 0, impressions: 0, clicks: 0 }
    );

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spent / totals.clicks : 0;
    const cpm = totals.impressions > 0 ? (totals.spent / totals.impressions) * 1000 : 0;

    return {
      spent: totals.spent,
      impressions: totals.impressions,
      clicks: totals.clicks,
      ctr,
      cpc,
      cpm,
    };
  }, [activeSource, summaryCampaigns]);

  const campaignSummary = useMemo(() => {
    const totalBudget = summaryCampaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
    const totalSpent = summaryCampaigns.reduce((sum, campaign) => sum + campaign.spent, 0);
    const totalConversions = summaryCampaigns.reduce((sum, campaign) => sum + campaign.conversions, 0);
    const avgRoi = summaryCampaigns.length
      ? summaryCampaigns.reduce((sum, campaign) => sum + campaign.roi, 0) / summaryCampaigns.length
      : 0;
    const spendRate = totalBudget > 0 ? totalSpent / totalBudget : 0;
    const costPerConversion = totalConversions > 0 ? totalSpent / totalConversions : 0;

    const statuses = summaryCampaigns.reduce(
      (acc, campaign) => {
        const status = (campaign.status || '').toLowerCase();
        if (status === 'active') acc.active += 1;
        else if (status === 'paused') acc.paused += 1;
        else if (status === 'ended') acc.ended += 1;
        else acc.other += 1;
        return acc;
      },
      { active: 0, paused: 0, ended: 0, other: 0 }
    );

    const topRoiCampaign = summaryCampaigns.length
      ? summaryCampaigns.reduce((best, current) => (current.roi > best.roi ? current : best), summaryCampaigns[0])
      : null;
    const topConversionsCampaign = summaryCampaigns.length
      ? summaryCampaigns.reduce(
        (best, current) => (current.conversions > best.conversions ? current : best),
        summaryCampaigns[0]
      )
      : null;

    return {
      totalBudget,
      totalSpent,
      totalConversions,
      avgRoi,
      spendRate,
      costPerConversion,
      statuses,
      topRoiCampaign,
      topConversionsCampaign,
    };
  }, [summaryCampaigns]);

  const budgetVsSpendData = useMemo(() => {
    if (!activeSource || !hasSelectedCampaigns) return [];
    return selectedCampaigns.map((campaign) => ({
      name: campaign.name,
      budget: campaign.budget,
      spent: campaign.spent,
      roi: campaign.roi,
    }));
  }, [activeSource, hasSelectedCampaigns, selectedCampaigns]);

  const efficiencyData = useMemo(() => {
    if (!activeSource || !hasSelectedCampaigns) return [];
    const selectedNames = new Set(selectedCampaigns.map((campaign) => campaign.name));
    return activeSource.adPerformance
      .filter((item) => selectedNames.has(item.campaign))
      .map((item) => ({
        campaign: item.campaign,
        spend: item.spend,
        impressions: item.impressions,
        clicks: item.clicks,
        ctr: item.ctr,
        cpc: item.cpc,
        cpm: item.cpm,
      }));
  }, [activeSource, hasSelectedCampaigns, selectedCampaigns]);

  const filteredConversionRate = useMemo(() => {
    if (!activeSource || !hasSelectedCampaigns) return [];
    const selectedNames = new Set(selectedCampaigns.map((campaign) => campaign.name));
    return activeSource.conversionRate.filter((item) => selectedNames.has(item.label));
  }, [activeSource, hasSelectedCampaigns, selectedCampaigns]);

  const campaignAgeHighlights = useMemo(() => {
    if (!activeSource || !hasSelectedCampaigns) return [];
    const ageBuckets = ['18-24', '25-34', '35-44', '45-54'];

    return selectedCampaigns.map((campaign) => {
      const seed = Array.from(campaign.id).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      const raw = ageBuckets.map((_, idx) => ((seed + idx * 7) % 9) + 3);
      const rawTotal = raw.reduce((sum, v) => sum + v, 0) || 1;
      const distPct = raw.map((v) => (v / rawTotal) * 100);

      let bestIndex = 0;
      for (let i = 1; i < distPct.length; i += 1) {
        if (distPct[i] > distPct[bestIndex]) bestIndex = i;
      }

      const topPercent = distPct[bestIndex];

      return {
        id: campaign.id,
        name: campaign.name,
        topBucket: ageBuckets[bestIndex],
        topPercent,
        distribution: distPct,
      };
    });
  }, [activeSource, hasSelectedCampaigns, selectedCampaigns]);

  const filteredAgeRange = useMemo(() => {
    if (!campaignAgeHighlights.length) return [];

    const baseColors = [palette.primary, palette.secondary, palette.tertiary, '#facc15', '#22c55e'];

    return campaignAgeHighlights.map((item, idx) => ({
      name: item.name,
      value: item.topPercent,
      color: baseColors[idx % baseColors.length] || palette.primary,
    }));
  }, [campaignAgeHighlights, palette]);

  const filteredGenderDistribution = useMemo(() => {
    if (!activeSource || !hasSelectedCampaigns) return [];
    return selectedCampaigns.map((campaign) => {
      const seed = Array.from(campaign.id).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      const base = Math.max(60, Math.min(180, Math.round(campaign.conversions / 2)));
      const male = Math.round(base * (0.38 + ((seed % 17) / 100)));
      const female = Math.round(base * (0.52 + (((seed + 5) % 19) / 120)));
      const unknown = Math.max(6, Math.round(base * (0.06 + (((seed + 11) % 7) / 100))));

      const label = campaign.name.length > 18 ? `${campaign.name.slice(0, 18)}…` : campaign.name;

      return {
        segment: label,
        male,
        female,
        unknown,
      };
    });
  }, [activeSource, hasSelectedCampaigns, selectedCampaigns]);

  const topCampaignByRoi = useMemo(() => {
    if (!activeSource || !hasSelectedCampaigns || !selectedCampaigns.length) return null;
    return selectedCampaigns.reduce((best, current) => (current.roi > best.roi ? current : best), selectedCampaigns[0]);
  }, [activeSource, hasSelectedCampaigns, selectedCampaigns]);

  const totalCampaignSpend = useMemo(() => {
    if (!activeSource || !hasSelectedCampaigns) return 0;
    return selectedCampaigns.reduce((sum, campaign) => sum + campaign.spent, 0);
  }, [activeSource, hasSelectedCampaigns, selectedCampaigns]);

  const exportToCsv = useCallback((filename: string, rows: (string | number)[][]) => {
    if (!rows.length) return;
    const escape = (value: string | number) => {
      const str = String(value ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };
    const csvContent = rows.map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, []);

  const handleCampaignAnalyticsDownload = useCallback(() => {
    if (!activeSource) return;
    const rows: (string | number)[][] = [];

    const filteredCards = activeSourceRealtimeCards.slice(0, 4);

    if (filteredCards.length) {
      rows.push(['Real-Time Analytics']);
      rows.push(['Metric', 'Value', 'Delta', 'Trend']);
      filteredCards.forEach((stat) => {
        rows.push([
          stat.label,
          stat.value,
          stat.delta,
          stat.positive ? 'Positive' : 'Negative',
        ]);
      });
    }

    if (activeSource.adPerformance?.length) {
      if (rows.length) {
        rows.push(['']);
      }
      rows.push(['Detailed Ad Performance']);
      rows.push(['Campaign', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM']);
      activeSource.adPerformance.forEach((campaign) => {
        rows.push([
          campaign.campaign,
          campaign.spend,
          campaign.impressions,
          campaign.clicks,
          campaign.ctr,
          campaign.cpc,
          campaign.cpm,
        ]);
      });
    }

    if (!rows.length) return;
    exportToCsv('campaign-performance-analytics.csv', rows);
  }, [activeSource, activeSourceRealtimeCards, exportToCsv]);

  const handleDetailedAdPerformanceDownload = useCallback(() => {
    if (!activeSource?.adPerformance?.length) return;
    const rows: (string | number)[][] = [];
    rows.push(['Detailed Ad Performance']);
    rows.push(['Campaign', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM']);
    activeSource.adPerformance.forEach((campaign) => {
      rows.push([
        campaign.campaign,
        campaign.spend,
        campaign.impressions,
        campaign.clicks,
        campaign.ctr,
        campaign.cpc,
        campaign.cpm,
      ]);
    });
    exportToCsv('detailed-ad-performance.csv', rows);
  }, [activeSource, exportToCsv]);

  const statusBadgeStyle = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'active') return { backgroundColor: '#10b981', borderColor: '#059669', color: '#ffffff' };
    if (normalized === 'paused') return { backgroundColor: '#64748b', borderColor: '#475569', color: '#ffffff' };
    if (normalized === 'ended') return { backgroundColor: '#ef4444', borderColor: '#dc2626', color: '#ffffff' };
    if (normalized === 'learning') return { backgroundColor: '#6b7280', borderColor: '#4b5563', color: '#ffffff' };
    return { backgroundColor: '#64748b', borderColor: '#475569', color: '#ffffff' };
  };

  if (!activeSource) {
    return <ZeroState message="No sample campaign is available for this platform yet" />;
  }

  const currentSourceId = activeSource.id;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sources.map((source) => {
          const isActive = source.id === currentSourceId;
          const isTikTok = source.id === 'tiktok';
          const activeStyle = isActive
            ? {
              background: `linear-gradient(135deg, ${hexToRgba(source.accent, 0.35)}, ${hexToRgba(source.accent, 0.14)})`,
              borderColor: hexToRgba(source.accent, 0.18),
              boxShadow: `0 14px 30px ${hexToRgba(source.accent, 0.18)}`,
            }
            : undefined;

          const categoryLabel = /analytics/i.test(source.label || '') ? 'ANALYTICS' : 'ADS';
          return (
            <button
              key={source.id}
              onClick={() => setActiveSourceId(source.id)}
              aria-pressed={isActive}
              type="button"
              className={`w-full rounded-2xl px-5 py-4 text-left transition-all duration-200 theme-card hover:shadow-sm hover:-translate-y-0.5 ${isActive ? 'border-0' : ''
                }`}
              style={
                isActive
                  ? {
                    ...activeStyle,
                    borderColor: 'transparent',
                  }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 border"
                    style={
                      isActive
                        ? {
                          backgroundColor: isTikTok ? '#111827' : 'rgba(255,255,255,0.70)',
                          borderColor: isTikTok ? '#111827' : 'rgba(255,255,255,0.65)',
                        }
                        : {
                          backgroundColor: isTikTok ? '#111827' : 'rgba(0,0,0,0.02)',
                          borderColor: isTikTok ? '#111827' : 'var(--theme-border)',
                        }
                    }
                  >
                    <img src={source.logo} alt={source.label} className="h-7 w-7 object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide theme-muted">{categoryLabel}</p>
                    <p className="mt-1 text-sm font-semibold leading-tight truncate theme-text">{source.label}</p>
                  </div>
                </div>
                <span
                  className="mt-1 h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: isActive ? '#22c55e' : '#e5e7eb' }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[20px] font-bold text-gray-900">Real-Time Analytics</p>
            <p className="text-base text-gray-500">Updated from your latest campaign insights</p>
          </div>

        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {activeSourceRealtimeCards.slice(0, 4).map((stat) => (
            <RealTimeCard
              key={`${stat.id ?? 'metric'}-${stat.label ?? ''}`}
              label={stat.label}
              value={stat.value}
              delta={stat.delta}
              positive={stat.positive}
              realtimeModeEnabled={realtimeModeEnabled}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div
            className="rounded-2xl p-4 border shadow-sm"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', boxShadow: 'var(--theme-card-shadow)' }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold theme-text">Filter campaigns</p>
                <button
                  type="button"
                  className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors theme-text"
                  style={{ borderColor: 'var(--theme-border)', backgroundColor: 'transparent' }}
                  onClick={() => {
                    setCampaignQuery('');
                    setCampaignStatusFilter('all');
                    setShowSelectedOnly(false);
                    setSelectedCampaignIds([]);
                  }}
                >
                  Clear
                </button>
              </div>

              <p className="text-sm theme-muted">
                Showing <span className="font-semibold theme-text">{filteredCampaigns.length}</span> campaign{filteredCampaigns.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center">
              <input
                value={campaignQuery}
                onChange={(e) => setCampaignQuery(e.target.value)}
                placeholder="Search campaigns"
                className="w-full rounded-xl border px-3 py-2 text-sm theme-text placeholder:text-gray-400 shadow-sm focus:outline-none"
                style={{ backgroundColor: 'transparent', borderColor: 'var(--theme-border)' }}
              />
              <select
                value={campaignStatusFilter}
                onChange={(e) => setCampaignStatusFilter(e.target.value as typeof campaignStatusFilter)}
                className="w-full rounded-xl border px-3 py-2 text-sm theme-text shadow-sm focus:outline-none"
                style={{ backgroundColor: 'transparent', borderColor: 'var(--theme-border)' }}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
              <label
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm select-none theme-text"
                style={{ backgroundColor: 'transparent', borderColor: 'var(--theme-border)' }}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-300"
                  checked={showSelectedOnly}
                  onChange={(e) => setShowSelectedOnly(e.target.checked)}
                />
                Selected only
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {campaignColumnDefs.map((col) => {
                const checked = visibleCampaignColumns[col.key] !== false;
                return (
                  <label
                    key={col.key}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm select-none theme-text"
                    style={{ backgroundColor: 'transparent', borderColor: 'var(--theme-border)' }}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-300"
                      checked={checked}
                      onChange={() => toggleCampaignColumn(col.key)}
                    />
                    {col.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div
              ref={campaignTableScrollRef}
              onScroll={handleCampaignTableScroll}
              className="overflow-x-auto overflow-y-auto max-h-[468px] scrollbar-hidden"
            >
              <table className="min-w-max text-base">
                <thead>
                  <tr className="text-[15px] uppercase font-semibold theme-text">
                    <th
                      className="py-3 pr-3 text-left sticky top-0 z-30 min-w-[260px] sm:min-w-[300px] lg:min-w-[340px] whitespace-nowrap"
                      style={{ backgroundColor: 'var(--theme-surface)' }}
                    >
                      Campaign
                    </th>
                    {displayedCampaignColumns.map((key) => {
                      const meta = campaignColumnMeta[key];
                      const minWidthClass = meta?.minWidthClass ?? 'min-w-[120px]';
                      const label = meta?.label ?? key;
                      const isCompared = comparedCampaignColumns.includes(key);
                      const isVisible = visibleCampaignColumns[key] !== false;

                      return (
                        <th
                          key={key}
                          className={`py-4 pr-6 theme-muted text-center sticky top-0 z-30 ${minWidthClass} whitespace-nowrap select-none ${isVisible ? 'cursor-grab active:cursor-grabbing' : ''} ${isCompared ? 'ring-2 ring-red-400/70' : ''}`}
                          style={{
                            backgroundColor: 'var(--theme-surface)',
                            boxShadow: isCompared ? 'inset 0 -2px 0 rgba(239, 68, 68, 0.85)' : undefined,
                          }}
                          draggable={isVisible}
                          onDragStart={(e) => {
                            if (!isVisible) return;
                            draggingCampaignColumnKeyRef.current = key;
                            try {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', key);
                            } catch {
                              // ignore
                            }
                          }}
                          onDragEnd={() => {
                            draggingCampaignColumnKeyRef.current = null;
                          }}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleComparedCampaignColumn(key)}
                          onDragOver={(e) => {
                            if (!isVisible) return;
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            if (!isVisible) return;
                            e.preventDefault();
                            const fromKey = draggingCampaignColumnKeyRef.current;
                            draggingCampaignColumnKeyRef.current = null;
                            if (!fromKey) return;
                            moveCampaignColumn(fromKey, key);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleComparedCampaignColumn(key);
                            }
                          }}
                        >
                          {label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCampaigns.map((campaign, index) => {
                    const campaignExtra = campaign as unknown as Record<string, unknown>;
                    return (
                      <tr key={campaign.id} className="theme-text">
                        <td
                          className="py-3 pr-2 font-semibold theme-text min-w-[260px] sm:min-w-[300px] lg:min-w-[340px]"
                          style={{ backgroundColor: 'var(--theme-surface)' }}
                        >
                          <div className="grid grid-cols-[auto,auto,1fr] items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleCampaignSelection(campaign.id)}
                              className="relative inline-flex h-7 w-12 items-center rounded-full border transition-colors shrink-0"
                              style={{
                                backgroundColor: selectedCampaignIds.includes(campaign.id) ? '#f97316' : themeMode === 'dark' ? '#020617' : '#e5e7eb',
                                borderColor: selectedCampaignIds.includes(campaign.id) ? '#fb923c' : themeMode === 'dark' ? '#64748b' : '#d1d5db',
                                boxShadow: selectedCampaignIds.includes(campaign.id)
                                  ? themeMode === 'dark'
                                    ? '0 0 10px rgba(249,115,22,0.7)'
                                    : '0 0 8px rgba(249,115,22,0.45)'
                                  : 'none',
                              }}
                              aria-pressed={selectedCampaignIds.includes(campaign.id)}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full shadow transition-transform ${selectedCampaignIds.includes(campaign.id) ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                style={{
                                  backgroundColor: '#ffffff',
                                  boxShadow: selectedCampaignIds.includes(campaign.id)
                                    ? '0 2px 4px rgba(0,0,0,0.35)'
                                    : '0 1px 3px rgba(0,0,0,0.25)',
                                }}
                              />
                            </button>
                            <span
                              className="shrink-0 px-2 py-1 rounded-full text-[10px] font-semibold capitalize border shadow-sm"
                              style={statusBadgeStyle(campaign.status)}
                            >
                              {campaign.status}
                            </span>

                            <span className="min-w-0">
                              <span
                                className="block truncate opacity-70"
                                onMouseEnter={(e) => showCampaignNameTooltip(e, campaign.name)}
                                onMouseMove={(e) => showCampaignNameTooltip(e, campaign.name)}
                                onMouseLeave={hideCampaignNameTooltip}
                              >
                                {campaign.name}
                              </span>
                              <span className="block text-xs theme-muted truncate">{campaign.date}</span>
                            </span>
                          </div>
                        </td>
                        {displayedCampaignColumns.map((key) => {
                          const meta = campaignColumnMeta[key];
                          const minWidthClass = meta?.minWidthClass ?? 'min-w-[120px]';
                          const isSelectedColumn = visibleCampaignColumns[key] !== false;
                          const isCompared = comparedCampaignColumns.includes(key);

                          let content: React.ReactNode = '-';
                          if (isSelectedColumn) {
                            if (key === 'budget') {
                              content = `$${formatCompactInteger(campaign.budget)}`;
                            } else if (key === 'spent') {
                              content = `$${formatCompactInteger(campaign.spent)}`;
                            } else if (key === 'conversions') {
                              content = formatCompactInteger(campaign.conversions);
                            } else if (key === 'roi') {
                              content = `${campaign.roi}%`;
                            } else if (key === 'roas') {
                              const roiValue = Number(campaignExtra.roi ?? 0);
                              const roasValue = 1 + roiValue / 100;
                              content = `${roasValue.toFixed(2)}x`;
                            } else if (key === 'impressions') {
                              content = campaignExtra.impressions != null ? formatCompactInteger(Number(campaignExtra.impressions)) : '-';
                            } else if (key === 'clicks') {
                              content = campaignExtra.clicks != null ? formatCompactInteger(Number(campaignExtra.clicks)) : '-';
                            } else if (key === 'ctr') {
                              content = campaignExtra.ctr != null ? `${Number(campaignExtra.ctr).toFixed(2)}%` : '-';
                            } else if (key === 'cpc') {
                              content = campaignExtra.cpc != null ? `$${Number(campaignExtra.cpc).toFixed(2)}` : '-';
                            } else if (key === 'cpm') {
                              content = campaignExtra.cpm != null ? `$${Number(campaignExtra.cpm).toFixed(2)}` : '-';
                            }
                          }

                          return (
                            <td
                              key={key}
                              className={`py-4 pr-6 theme-text opacity-70 text-center ${minWidthClass} whitespace-nowrap ${isCompared ? 'bg-red-50/40' : ''}`}
                            >
                              {content}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {typeof document !== 'undefined' &&
              campaignNameTooltip &&
              createPortal(
                <div
                  className="pointer-events-none fixed rounded-2xl border px-4 py-3 text-sm"
                  style={{
                    left: campaignNameTooltip.left,
                    top: campaignNameTooltip.top,
                    transform: 'translateY(-100%)',
                    width: 'max-content',
                    maxWidth: 'calc(100vw - 48px)',
                    backgroundColor: '#ffffff',
                    borderColor: 'rgba(15, 23, 42, 0.14)',
                    boxShadow: '0 18px 50px rgba(0,0,0,0.30)',
                    zIndex: 9999,
                  }}
                >
                  <span className="block font-semibold leading-snug text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                    {campaignNameTooltip.name}
                  </span>
                </div>,
                document.body
              )}

            <div
              ref={campaignTableBottomScrollRef}
              onScroll={handleCampaignTableBottomScroll}
              className="mt-2 overflow-x-auto overflow-y-hidden"
              style={{ height: 12 }}
            >
              <div style={{ width: campaignTableScrollWidth, height: 1 }} />
            </div>
          </div>
        </div>
      </div>

      <div
        className="rounded-3xl border p-6 space-y-5"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', boxShadow: 'var(--theme-card-shadow)' }}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-[20px] font-bold theme-text">Campaign Summary</p>
            <p className="text-sm theme-muted">{summarySubtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="theme-panel rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase theme-muted">Spent</p>
            <p className="mt-1 text-[18px] font-bold theme-text">${Math.round(performanceSummary.spent).toLocaleString('en-US')}</p>
          </div>
          <div className="theme-panel rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase theme-muted">Impressions</p>
            <p className="mt-1 text-[18px] font-bold theme-text">{Math.round(performanceSummary.impressions).toLocaleString('en-US')}</p>
          </div>
          <div className="theme-panel rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase theme-muted">Clicks</p>
            <p className="mt-1 text-[18px] font-bold theme-text">{Math.round(performanceSummary.clicks).toLocaleString('en-US')}</p>
          </div>
          <div className="theme-panel rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase theme-muted">CTR</p>
            <p className="mt-1 text-[18px] font-bold theme-text">{performanceSummary.ctr.toFixed(2)}%</p>
          </div>
          <div className="theme-panel rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase theme-muted">ROI</p>
            <p className="mt-1 text-[18px] font-bold theme-text">{campaignSummary.avgRoi.toFixed(1)}%</p>
          </div>
          <div className="theme-panel rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase theme-muted">ROAS</p>
            <p className="mt-1 text-[18px] font-bold theme-text">{(1 + campaignSummary.avgRoi / 100).toFixed(2)}x</p>
          </div>
          <div className="theme-panel rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase theme-muted">CPC</p>
            <p className="mt-1 text-[18px] font-bold theme-text">${performanceSummary.cpc.toFixed(2)}</p>
          </div>
          <div className="theme-panel rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase theme-muted">CPM</p>
            <p className="mt-1 text-[18px] font-bold theme-text">${performanceSummary.cpm.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {!hasSelectedCampaigns ? (
        <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center text-sm text-gray-600">
          Please select one or more campaigns from the table above (up to 5) to view Campaign Performance.
        </div>
      ) : (
        <>
          <div ref={visualizationRef} className={`${themePanelClass} scroll-mt-28`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold theme-text" style={{ fontSize: '24px' }}>Visualization Controls</p>
                <p className="theme-muted" style={{ fontSize: '18px' }}>Add more context with themed charts and trends</p>
              </div>
              {onDownload && (
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => onDownload('Visualization Controls')}
                  title="Download visualization data"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className={`${themePanelClass} space-y-4 shadow-inner`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold theme-text">Budget vs Spend</p>
                    <p className="text-xs theme-muted">Includes ROI overlay for the latest campaigns</p>
                  </div>
                  <span className="text-[15px] uppercase theme-muted">Live</span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetVsSpendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke={chartTheme === 'carbon' ? 'rgba(148,163,184,0.45)' : 'rgba(249,115,22,0.18)'}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: chartTheme === 'carbon' ? palette.legend : '#475569' }}
                        tickLine={false}
                        interval={0}
                        angle={-8}
                        height={60}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: chartTheme === 'carbon' ? palette.legend : '#475569' }}
                        tickFormatter={(value) => `${value / 1000}k`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: chartTheme === 'carbon' ? palette.legend : '#475569' }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <RechartsTooltip
                        cursor={{ fill: chartTheme === 'carbon' ? palette.area : 'rgba(249,115,22,0.10)' }}
                        formatter={(value: unknown, name: string) => {
                          if (name === 'roi') return [`${value}%`, 'ROI'];
                          return [`$${Number(value ?? 0).toLocaleString('en-US')}`, name === 'budget' ? 'Budget' : 'Spend'];
                        }}
                      />
                      <Legend wrapperStyle={{ color: palette.legend }} />
                      <Bar yAxisId="left" dataKey="budget" fill={palette.secondary} radius={[12, 12, 0, 0]} maxBarSize={42} name="Budget" />
                      <Bar yAxisId="left" dataKey="spent" fill={palette.primary} radius={[12, 12, 0, 0]} maxBarSize={42} name="Spend" />
                      <Line yAxisId="right" type="monotone" dataKey="roi" stroke={palette.tertiary} strokeWidth={3} dot={{ r: 4 }} name="ROI" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${themePanelClass} flex flex-col justify-between space-y-4`}>
                <div className="space-y-1">
                  <p className="text-xs uppercase theme-muted">Campaign Snapshot</p>
                  <p className="text-sm font-semibold theme-text">{activeSource.label}</p>
                  <p className="text-xs theme-muted">Quick view of spend and best-performing campaign</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="theme-panel-soft rounded-2xl p-3 shadow-sm border border-gray-100/60">
                    <p className="text-xs uppercase theme-muted">Total Spend</p>
                    <p className="mt-1 text-lg font-semibold theme-text">${totalCampaignSpend.toLocaleString('en-US')}</p>
                  </div>
                  <div className="theme-panel-soft rounded-2xl p-3 shadow-sm border border-emerald-200/70">
                    <p className="text-xs uppercase" style={{ color: '#6ee7b7' }}>Top ROI</p>
                    <p className="mt-1 text-lg font-semibold theme-text">{topCampaignByRoi?.roi ?? '-'}%</p>
                    <p className="text-xs theme-muted truncate">{topCampaignByRoi?.name || 'N/A'}</p>
                  </div>
                  <div className="theme-panel-soft rounded-2xl p-3 shadow-sm border border-gray-100/60">
                    <p className="text-xs uppercase theme-muted">Best Campaign</p>
                    <p className="mt-1 text-sm font-semibold theme-text truncate">{topCampaignByRoi?.name || 'No data'}</p>
                    <p className="text-xs theme-muted">ROI {(topCampaignByRoi?.roi ?? '-')}%</p>
                  </div>
                  <div className="theme-panel-soft rounded-2xl p-3 shadow-sm border border-gray-100/60">
                    <p className="text-xs uppercase theme-muted">Active Campaigns</p>
                    <p className="mt-1 text-lg font-semibold theme-text">{activeSource.adPerformance.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4 xl:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[24px] font-semibold text-gray-900">Age Range</p>
                  <p className="text-[18px] text-gray-500">Audience balance by campaign segments</p>
                </div>
                {onDownload && (
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => onDownload('Age Range')}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
                <div className="w-full lg:w-[42%] min-w-[260px]">
                  <AgeRangeDonut ranges={filteredAgeRange} />
                </div>
                <div className="w-full lg:flex-1 overflow-x-auto">
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase theme-muted border-b" style={{ borderColor: 'var(--theme-border)' }}>
                        <th className="py-2 pr-3 text-left font-semibold">Campaign</th>
                        <th className="py-2 px-2 text-right font-semibold">18-24</th>
                        <th className="py-2 px-2 text-right font-semibold">25-34</th>
                        <th className="py-2 px-2 text-right font-semibold">35-44</th>
                        <th className="py-2 px-2 text-right font-semibold">45-54</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignAgeHighlights.map((item) => (
                        <tr key={item.id} className="border-b last:border-0" style={{ borderColor: 'var(--theme-border)' }}>
                          <td className="py-2 pr-3 align-middle">
                            <p className="text-[11px] font-semibold theme-text truncate max-w-[180px]">{item.name}</p>
                            <p className="text-[10px] theme-muted">Top: {item.topBucket} · {item.topPercent.toFixed(1)}%</p>
                          </td>
                          {item.distribution.map((pct, idx) => (
                            <td key={idx} className="py-2 px-2 text-right align-middle text-[11px] theme-muted">
                              {pct.toFixed(1)}%
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[24px] font-semibold text-gray-900">Gender Distribution</p>
                  <p className="text-[18px] text-gray-500">Audience balance by campaign segments</p>
                </div>
                {onDownload && (
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => onDownload('Gender Distribution')}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                )}
              </div>
              <GenderDistributionChart data={filteredGenderDistribution} />
            </div>
            <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[24px] font-semibold text-gray-900">Conversion Rate</p>
                  <p className="text-[18px] text-gray-500">Channel-by-channel AI insights</p>
                </div>
                {onDownload && (
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => onDownload('Conversion Rate')}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                )}
              </div>
              <ConversionRateBars data={filteredConversionRate} />
            </div>
          </div>

          {activeSource.id !== 'google' && activeSource.id !== 'line' && (
            <div className="rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Detailed from {activeSource.label}</p>
                <p className="text-xs text-gray-500">Creative previews</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeSource.creatives.map((creative, index) => (
                  <div key={creative.id} className="rounded-3xl border border-gray-100 bg-white p-4 space-y-4 shadow-sm">
                    <div className="aspect-video w-full rounded-2xl overflow-hidden relative group cursor-pointer"
                      style={{
                        background: index % 3 === 0
                          ? 'linear-gradient(135deg, #0f172a, #1d4ed8)'
                          : index % 3 === 1
                            ? 'linear-gradient(135deg, #4c1d95, #db2777)'
                            : 'linear-gradient(135deg, #0f766e, #22d3ee)',
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button className="h-16 w-16 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform text-2xl">
                          ▶
                        </button>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-sm text-white/95">
                        <span className="px-3 py-2 rounded-full bg-black/40 backdrop-blur font-medium">AI Auto-Edit</span>
                        <span className="px-3 py-2 rounded-full bg-white/30 font-medium">30s Vertical</span>
                      </div>
                      <div className="absolute top-4 right-4">
                        <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs font-semibold">LIVE</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        {creative.name}
                      </p>
                      <p className="text-xs text-gray-500">AI video · {creative.type}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <p className="text-[15px] uppercase text-gray-500 font-medium">Reach</p>
                        <p className="font-bold text-gray-900">{creative.reach.toLocaleString('en-US')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] uppercase text-gray-500 font-medium">Reactions</p>
                        <p className="font-bold text-gray-900">{creative.reactions.toLocaleString('en-US')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{creative.cta} CTA</span>
                      <button className="inline-flex items-center gap-1 text-gray-900 font-semibold">
                        <span>Generate variants</span>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const LtvComparisonChart: React.FC<{ data: { label: string; ltv: number; cac: number }[] }> = ({ data }) => {
  const max = Math.max(...data.flatMap((d) => [d.ltv, d.cac])) || 1;
  const animated = useAnimatedReveal();

  const yMax = useMemo(() => {
    const raw = Number.isFinite(max) ? max : 1;
    const padded = Math.max(1, Math.ceil(raw * 1.15));
    const rounded = Math.ceil(padded / 100) * 100;
    return rounded;
  }, [max]);

  return (
    <div className="relative h-72 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 24, left: 8, bottom: 20 }}
          barCategoryGap="12%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} domain={[0, yMax]} />
          <RechartsTooltip
            cursor={{ fill: 'rgba(249,115,22,0.06)' }}
            formatter={(value: unknown, name: string) => [
              `$${Number(value ?? 0).toLocaleString('en-US')}`,
              name.toUpperCase(),
            ]}
          />
          <Legend formatter={(value) => value.toUpperCase()} />
          <Bar
            dataKey="ltv"
            name="LTV"
            fill="#eb5a0c"
            radius={[16, 16, 0, 0]}
            barSize={40}
            isAnimationActive={animated}
          />
          <Bar
            dataKey="cac"
            name="CAC"
            fill="#fcd44e"
            radius={[16, 16, 0, 0]}
            barSize={32}
            isAnimationActive={animated}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const CONVERSION_PLATFORM_PROVIDERS: Record<string, string> = {
  Facebook: 'facebook',
  Google: 'googleads',
  'Google Analytics': 'googleanalytics',
  LINE: 'line',
  TikTok: 'tiktok',
};

const ConversionPlatformBars: React.FC<{
  data: { platform: string; value: number }[];
  connectionStatus?: Record<string, 'connected' | 'disconnected'>;
}> = ({ data, connectionStatus }) => {
  const animated = useAnimatedReveal();

  const platformColors: Record<string, string> = {
    Facebook: '#4267B2',
    Google: '#FBBC05',
    'Google Analytics': '#F97316',
    LINE: '#00C300',
    TikTok: '#111827',
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const best = data.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), data[0]);
  const ranked = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between text-[16px] theme-muted gap-2">
        <p className="space-x-1">
          <span className="font-semibold theme-text text-[16px]">Total conversions:</span>
          <span className="text-[16px] theme-text">{total.toLocaleString('en-US')}</span>
        </p>
        <p className="space-x-1">
          <span className="font-semibold theme-text text-[16px]">Top platform:</span>
          <span className="text-[16px] theme-text">
            {best.platform} ({best.value.toLocaleString('en-US')} conversions)
          </span>
        </p>
      </div>
      <div className="mt-2 space-y-3">
        {ranked.map((item, index) => {
          const color = platformColors[item.platform] || 'var(--accent-color)';
          const iconColor = item.platform === 'TikTok' ? '#111827' : color;
          const barColor = item.platform === 'TikTok' ? '#9CA3AF' : color;
          const isTop = item.platform === best.platform;
          const provider = CONVERSION_PLATFORM_PROVIDERS[item.platform];
          const isConnected = provider ? connectionStatus?.[provider] === 'connected' : false;
          const iconBg = isConnected ? iconColor : `${iconColor}30`;
          const iconFilter = isConnected ? 'drop-shadow(0 6px 14px rgba(15, 23, 42, 0.15))' : 'grayscale(0.2)';
          const cardGlow = isConnected ? `0 18px 45px -28px ${barColor}AA` : undefined;

          return (
            <div
              key={item.platform}
              className={`flex items-center justify-between rounded-3xl border px-6 py-7 text-xs sm:text-sm shadow-sm transition-colors ${animated ? 'transition-all duration-500 ease-out' : ''
                } ${isConnected ? 'theme-panel-soft' : 'theme-panel-soft border-dashed opacity-90'}`}
              style={{
                transform: animated ? 'translateY(0)' : 'translateY(4px)',
                opacity: animated ? 1 : 0,
                transitionDelay: animated ? `${index * 70}ms` : undefined,
                boxShadow: cardGlow,
              }}
            >
              <div className="flex gap-3 min-w-[140px] items-center">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 overflow-hidden border border-white/50"
                  style={{ backgroundColor: iconBg, filter: iconFilter, opacity: isConnected ? 1 : 0.7 }}
                >
                  {item.platform === 'Facebook' && <img src="https://cdn.simpleicons.org/facebook/FFFFFF" className="h-6 w-6" alt="Facebook" />}
                  {item.platform === 'Google' && <img src="https://cdn.simpleicons.org/googleads/FFFFFF" className="h-6 w-6" alt="Google" />}
                  {item.platform === 'Google Analytics' && <img src="https://cdn.simpleicons.org/googleanalytics/FFFFFF" className="h-6 w-6" alt="Google Analytics" />}
                  {item.platform === 'LINE' && <img src="https://cdn.simpleicons.org/line/FFFFFF" className="h-6 w-6" alt="LINE" />}
                  {item.platform === 'TikTok' && <img src="https://cdn.simpleicons.org/tiktok/FFFFFF" className="h-6 w-6" alt="TikTok" />}
                </span>
                <div className="flex-1 flex items-center" style={{ paddingTop: '6px' }}>
                  <div>
                    <p className="text-sm sm:text-base font-semibold theme-text whitespace-nowrap">{item.platform}</p>
                    <p className="text-[11px] sm:text-xs theme-muted" style={{ marginTop: '-17px' }}>
                      {item.value.toLocaleString('en-US')} conversions
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 mx-5 hidden sm:flex items-center gap-2">
                <div className="w-full h-3.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-muted)' }} />
              </div>
              <div className="flex flex-col items-end gap-1 min-w-[100px]">
                {isTop && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border"
                    style={{ backgroundColor: 'var(--surface-muted)', color: 'var(--theme-text)', borderColor: 'var(--theme-border)' }}>
                    Top performer
                  </span>
                )}
                <span className="text-xs sm:text-sm font-semibold theme-text">&nbsp;</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FunnelVisualizer: React.FC<{
  steps: { label: string; value: number; color: string }[];
  variant?: 'light' | 'dark';
}> = ({ steps, variant = 'light' }) => {
  const animated = useAnimatedReveal();
  const isDark = variant === 'dark';

  const labelClass = isDark ? 'text-white/90' : 'text-gray-900';
  const valueClass = isDark ? 'text-white' : 'text-gray-800';
  const legendClass = isDark ? 'text-sky-100/70' : 'text-gray-500';

  const maxValue = useMemo(() => {
    if (!Array.isArray(steps) || steps.length === 0) return 0;
    return steps.reduce((m, s) => Math.max(m, Number(s?.value || 0)), 0);
  }, [steps]);

  return (
    <div className="space-y-6">
      {steps.map((step, index) => {
        const ratio = maxValue > 0 ? Number(step.value || 0) / maxValue : 0;
        const percent = Math.max(0, Math.min(100, ratio * 100));
        const highlightColor = adjustHexColor(step.color, 0.2);
        const hasValue = Number(step.value || 0) > 0;
        const widthStyle = animated ? `${hasValue ? Math.max(percent, 1.5) : 0}%` : '0%';

        return (
          <div key={step.label} className="flex items-center justify-between group">
            <div
              className="h-12 transition-all duration-700 ease-out shadow-sm hover:shadow-lg hover:scale-[1.02] transform cursor-pointer relative overflow-hidden"
              style={{
                width: widthStyle,
                maxWidth: '100%',
                background: `linear-gradient(90deg, ${step.color}, ${highlightColor})`,
                borderRadius: '999px',
                mixBlendMode: 'normal',
                filter: 'brightness(1.05)',
              }}
            >
              {!hasValue ? (
                <span
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: step.color, opacity: isDark ? 0.9 : 0.7 }}
                />
              ) : null}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)`,
                  mixBlendMode: 'overlay',
                }}
              />
            </div>
            <div className="text-sm min-w-[140px] text-right flex-shrink-0 ml-6">
              <p className={`font-semibold text-base ${labelClass}`}>{step.label}</p>
              <p className={`text-3xl font-semibold tracking-tight ${valueClass}`}>{step.value.toLocaleString('en-US')}</p>
            </div>
          </div>
        );
      })}
      <div className={`flex gap-4 text-xs ${legendClass}`}>
        {steps.map((step) => (
          <span key={step.label} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: step.color }} />
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const DASHBOARD_SCROLL_TARGET_KEY = 'rga_scroll_target';

interface DashboardProps {
  onLogout?: () => void;
}

// FLOW START: Dashboard Page (EN)
// จุดเริ่มต้น: หน้า Dashboard (TH)

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();
  const isMvpMode = process.env.REACT_APP_MVP_MODE === 'true';
  const defaultRecipientEmail = useMemo(() => {
    const email = typeof currentUser?.email === 'string' ? currentUser.email.trim() : '';
    return email || '';
  }, [currentUser]);

  const [trialNow, setTrialNow] = useState(() => Date.now());
  const [adminTestTrialStatus, setAdminTestTrialStatus] = useState<null | {
    active: boolean;
    expired: boolean;
    startedAt: string | null;
    expiresAt: string | null;
    msRemaining: number | null;
  }>(null);

  useEffect(() => {
    if (currentUser?.role !== 'admintest') return;
    const id = window.setInterval(() => setTrialNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== 'admintest') {
      setAdminTestTrialStatus(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const result = await getTrialStatus();
        if (cancelled) return;
        setAdminTestTrialStatus({
          active: Boolean(result?.active),
          expired: Boolean(result?.expired),
          startedAt: typeof result?.startedAt === 'string' ? result.startedAt : null,
          expiresAt: typeof result?.expiresAt === 'string' ? result.expiresAt : null,
          msRemaining: typeof result?.msRemaining === 'number' ? result.msRemaining : null,
        });
      } catch {
        if (cancelled) return;
        setAdminTestTrialStatus(null);
      }
    };

    load();
    const pollId = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [currentUser?.role]);

  const adminTestTrial = useMemo(() => {
    if (currentUser?.role !== 'admintest') return null;

    const expiresAtRaw = adminTestTrialStatus?.expiresAt || currentUser?.expiresAt || null;
    const startedAtRaw = adminTestTrialStatus?.startedAt || currentUser?.createdAt || null;

    const expiresAtMs = expiresAtRaw ? Date.parse(expiresAtRaw) : NaN;
    const startedAtMs = startedAtRaw ? Date.parse(startedAtRaw) : NaN;

    const remainingMs = Number.isFinite(expiresAtMs) ? Math.max(0, expiresAtMs - trialNow) : null;
    const remainingDays = typeof remainingMs === 'number' ? Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))) : null;

    let expiresAtText = '';
    try {
      expiresAtText = Number.isFinite(expiresAtMs)
        ? new Date(expiresAtMs).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
    } catch {
      expiresAtText = '';
    }

    let startedAtText = '';
    try {
      startedAtText = Number.isFinite(startedAtMs)
        ? new Date(startedAtMs).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          })
        : '';
    } catch {
      startedAtText = '';
    }

    const expired = Boolean(adminTestTrialStatus?.expired) || (Number.isFinite(expiresAtMs) ? trialNow >= expiresAtMs : false);
    return { remainingDays, startedAtText, expiresAtText, expired };
  }, [adminTestTrialStatus?.expired, adminTestTrialStatus?.expiresAt, adminTestTrialStatus?.startedAt, currentUser?.createdAt, currentUser?.expiresAt, currentUser?.role, trialNow]);

  type RequiredPlatformConfig = {
    id: string;
    label: string;
    provider: string;
    category: string;
    accent?: string;
    iconSlug?: string;
    iconColorDark?: string;
    iconColorLight?: string;
    color: string;
    description: string;
  };

  type IntegrationStep = RequiredPlatformConfig & {
    status: 'connected' | 'disconnected';
    integration?: Integration;
  };

  type DateRangeKey = '1d' | '7d' | '30d' | '90d' | '365d' | 'custom';

  const [globalDateRange, setGlobalDateRange] = useState<DateRangeKey>('30d');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [calendarSelection, setCalendarSelection] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const metricsFilters = useMemo(() => {
    if (calendarSelection.start && calendarSelection.end) {
      return { startDate: calendarSelection.start, endDate: calendarSelection.end };
    }

    if (globalDateRange === 'custom' && customDateRange.start && customDateRange.end) {
      return { startDate: customDateRange.start, endDate: customDateRange.end };
    }

    const period =
      globalDateRange === '1d'
        ? '24h'
        : globalDateRange === '7d'
          ? '7d'
          : globalDateRange === '30d'
            ? '30d'
            : globalDateRange === '90d'
              ? '90d'
              : '365d';

    return { period };
  }, [calendarSelection.end, calendarSelection.start, customDateRange.end, customDateRange.start, globalDateRange]);

  const {
    metrics: rawMetrics,
    loading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useMetrics(metricsFilters as any);
  const {
    campaigns,
    loading: campaignsLoading,
    error: campaignsError,
    refetch: refetchCampaigns,
  } = useCampaigns();
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [pendingScroll, setPendingScroll] = useState<{ section: SectionKey; ref: React.RefObject<HTMLDivElement> } | null>(null);
  const overviewSectionRefs = {
    integrations: useRef<HTMLDivElement | null>(null),
    aiSummaries: useRef<HTMLDivElement | null>(null),
    performance: useRef<HTMLDivElement | null>(null),
    conversionsPlatform: useRef<HTMLDivElement | null>(null),
  };
  const settingsSectionRefs = {
    root: useRef<HTMLDivElement | null>(null),
    header: useRef<HTMLDivElement | null>(null),
    integrations: useRef<HTMLDivElement | null>(null),
  };
  const campaignSectionRefs = {
    performance: useRef<HTMLDivElement | null>(null),
    visualization: useRef<HTMLDivElement | null>(null),
  };
  const trendSectionRefs = {
    overview: useRef<HTMLDivElement | null>(null),
    revenueCosts: useRef<HTMLDivElement | null>(null),
    revenueTrend: useRef<HTMLDivElement | null>(null),
    retention: useRef<HTMLDivElement | null>(null),
  };
  const [selectedRealtimeId, setSelectedRealtimeId] = useState<string>('impressions');
  const [selectedRange, setSelectedRange] = useState<'Today' | '7D' | '30D'>('7D');
  const [compareMode, setCompareMode] = useState<'previous' | 'target'>('previous');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [settingsData, setSettingsData] = useState<SettingsData>(() => buildDefaultSettings());
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  const realtimeModeEnabled = Boolean(settingsData.refresh.realtime);
  const RealTimeCardWithRealtime: React.FC<React.ComponentProps<typeof RealTimeCard>> = (props) => (
    <RealTimeCard {...props} realtimeModeEnabled={realtimeModeEnabled} />
  );

  useEffect(() => {
    if (!settingsHydrated) return;
    const normalized = defaultRecipientEmail;
    if (!normalized) return;
    setSettingsData((prev) => {
      if (prev.alerts.recipients.includes(normalized)) return prev;
      return {
        ...prev,
        alerts: {
          ...prev.alerts,
          recipients: [normalized, ...prev.alerts.recipients],
        },
      };
    });
  }, [defaultRecipientEmail, settingsHydrated]);

  const handleMenuChange = useCallback((value: string) => {
    const normalized = normalizeColorInput(value);
    setSettingsData((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        menuColor: normalized,
      },
    }));
  }, []);

  const handleRefreshChange = useCallback(
    (patch: Partial<SettingsData['refresh']>) => {
      setSettingsData((prev) => ({
        ...prev,
        refresh: {
          ...prev.refresh,
          ...patch,
        },
      }));
    },
    [],
  );

  const handleAlertAddRecipient = useCallback((email: string) => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setSettingsData((prev) => {
      if (prev.alerts.recipients.includes(trimmed)) {
        return prev;
      }

      return {
        ...prev,
        alerts: {
          ...prev.alerts,
          recipients: [...prev.alerts.recipients, trimmed],
        },
      };
    });
  }, []);

  const handleAlertRemoveRecipient = useCallback(
    (email: string) => {
      const normalizedDefault = defaultRecipientEmail;
      if (normalizedDefault && email === normalizedDefault) return;
      setSettingsData((prev) => ({
        ...prev,
        alerts: {
          ...prev.alerts,
          recipients: prev.alerts.recipients.filter((item) => item !== email),
        },
      }));
    },
    [defaultRecipientEmail],
  );

  const handleUpdateKpi = useCallback((id: string, patch: Partial<KpiSettingRow>) => {
    setSettingsData((prev) => ({
      ...prev,
      kpis: prev.kpis.map((kpi) => (kpi.id === id ? { ...kpi, ...patch } : kpi)),
    }));
  }, []);

  const handleAddKpi = useCallback(() => {
    const baseMenuOptions =
      Array.isArray(KPI_ALERT_MENU_OPTIONS) && KPI_ALERT_MENU_OPTIONS.length > 0
        ? KPI_ALERT_MENU_OPTIONS
        : ['Overview Dashboard'];
    const alertName = baseMenuOptions[0];
    const metricOptions = KPI_METRIC_OPTIONS?.[alertName] || ['Financial Overview'];
    const metric = metricOptions[0];
    const summary = KPI_METRIC_SUMMARY?.[metric];

    const maybeCrypto = typeof crypto !== 'undefined' ? (crypto as Crypto & { randomUUID?: () => string }) : undefined;
    const id = typeof maybeCrypto?.randomUUID === 'function' ? maybeCrypto.randomUUID() : `kpi-${Date.now()}`;

    setSettingsData((prev) => ({
      ...prev,
      kpis: [
        ...prev.kpis,
        {
          id,
          alertName,
          metric,
          condition: summary?.condition || KPI_CONDITION_OPTIONS[0],
          threshold: summary?.threshold || '',
          status: summary?.status || 'active',
          platform: '',
        },
      ],
    }));
  }, []);

  // SEO Refs
  const seoSectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    regional: useRef<HTMLDivElement>(null),
    competitors: useRef<HTMLDivElement>(null),
  };

  const handleRemoveKpi = useCallback((id: string) => {
    setSettingsData((prev) => ({
      ...prev,
      kpis: prev.kpis.filter((kpi) => kpi.id !== id),
    }));
  }, []);

  const handleAlertToggle = useCallback(
    (group: keyof SettingsData['alerts'], label: string) => {
      setSettingsData((prev) => ({
        ...prev,
        alerts: {
          ...prev.alerts,
          [group]: prev.alerts[group].map((item) =>
            item.label === label ? { ...item, enabled: !item.enabled } : item,
          ),
        },
      }));
    },
    [],
  );

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      // Simulate async for now; replace with API call when backend ready
      const defaults = await Promise.resolve(buildDefaultSettings());

      try {
        if (typeof window !== 'undefined') {
          const {
            settingsKey,
            brandingKey,
            legacySettingsKey,
            legacyBrandingKey,
            roleSettingsKey,
            roleBrandingKey,
          } = getUserScopedStorageKeys();

          const roleSettings = window.localStorage.getItem(roleSettingsKey);
          const roleBranding = window.localStorage.getItem(roleBrandingKey);
          const legacySettings = window.localStorage.getItem(legacySettingsKey);
          const legacyBranding = window.localStorage.getItem(legacyBrandingKey);

          if (!window.localStorage.getItem(settingsKey)) {
            if (roleSettings) {
              window.localStorage.setItem(settingsKey, roleSettings);
            } else if (legacySettings) {
              window.localStorage.setItem(settingsKey, legacySettings);
            }
          }

          if (!window.localStorage.getItem(brandingKey)) {
            if (roleBranding) {
              window.localStorage.setItem(brandingKey, roleBranding);
            } else if (legacyBranding) {
              window.localStorage.setItem(brandingKey, legacyBranding);
            }
          }

          const storedSettings = window.localStorage.getItem(settingsKey);
          const storedBranding = window.localStorage.getItem(brandingKey);

          if (storedSettings) {
            const parsedSettings: unknown = JSON.parse(storedSettings);
            const baseMenu =
              Array.isArray(KPI_ALERT_MENU_OPTIONS) && KPI_ALERT_MENU_OPTIONS.length > 0
                ? KPI_ALERT_MENU_OPTIONS[0]
                : 'Overview Dashboard';
            const parsedRecord = isRecord(parsedSettings) ? parsedSettings : {};
            const rawKpis = parsedRecord.kpis;
            const coerceKpiRow = (value: unknown, index: number): KpiSettingRow => {
              const row = isRecord(value) ? value : {};
              const storedId = typeof row.id === 'string' && row.id.trim() ? row.id : '';
              const id = storedId || `kpi-${Date.now()}-${index}`;
              const alertName = typeof row.alertName === 'string' ? row.alertName.trim() : '';
              const nextAlertName = alertName === 'MENU Dashboard' ? 'Overview Dashboard' : alertName || defaults.kpis[0]?.alertName || 'Overview Dashboard';
              const nextMetricOptions =
                KPI_METRIC_OPTIONS?.[nextAlertName] || KPI_METRIC_OPTIONS?.[baseMenu] || ['Financial Overview'];
              const metric = typeof row.metric === 'string' && row.metric.trim() ? row.metric : nextMetricOptions[0];
              const condition = typeof row.condition === 'string' && row.condition.trim() ? row.condition : defaults.kpis[0]?.condition || 'Above';
              const threshold = typeof row.threshold === 'string' ? row.threshold : defaults.kpis[0]?.threshold || '';
              const status = typeof row.status === 'string' && row.status.trim() ? row.status : defaults.kpis[0]?.status || 'Active';
              const platform = typeof row.platform === 'string' ? row.platform : '';

              return {
                id,
                alertName: nextAlertName,
                metric,
                condition,
                threshold,
                status,
                platform,
              };
            };

            const nextKpis: SettingsData['kpis'] = Array.isArray(rawKpis)
              ? rawKpis.map((kpi, index) => coerceKpiRow(kpi, index))
              : defaults.kpis;

            const cleanedSettings: Partial<SettingsData> = {
              ...parsedRecord,
              kpis: nextKpis,
            };

            const brandingFromStorage = isRecord(cleanedSettings.branding) ? cleanedSettings.branding : undefined;
            const storedThemeRaw = (brandingFromStorage as any)?.theme as unknown;
            const normalizedStoredTheme: ThemeName =
              String(storedThemeRaw) === 'Canvas'
                ? 'Light'
                : storedThemeRaw === 'Light' || storedThemeRaw === 'Dark'
                  ? (storedThemeRaw as ThemeName)
                  : defaults.branding.theme;
            // Merge stored settings over defaults to avoid breaking shape
            setSettingsData({
              ...defaults,
              ...cleanedSettings,
              branding: {
                ...defaults.branding,
                ...(brandingFromStorage || {}),
                theme: normalizedStoredTheme,
              },
            });
          } else if (storedBranding) {
            const parsedBranding = JSON.parse(storedBranding);
            const parsedThemeRaw = (parsedBranding as any)?.theme as unknown;
            const normalizedParsedTheme: ThemeName =
              String(parsedThemeRaw) === 'Canvas'
                ? 'Light'
                : parsedThemeRaw === 'Light' || parsedThemeRaw === 'Dark'
                  ? (parsedThemeRaw as ThemeName)
                  : defaults.branding.theme;
            setSettingsData({
              ...defaults,
              branding: {
                ...defaults.branding,
                ...parsedBranding,
                theme: normalizedParsedTheme,
              },
            });
          } else {
            setSettingsData(defaults);
          }
        } else {
          setSettingsData(defaults);
        }
      } catch {
        setSettingsData(defaults);
      } finally {
        setSettingsHydrated(true);
      }
    } catch (err: unknown) {
      setSettingsError(getErrorMessage(err, 'Failed to load settings'));
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!settingsHydrated) return;
      const { settingsKey } = getUserScopedStorageKeys();
      window.localStorage.setItem(settingsKey, JSON.stringify(settingsData));
    } catch {
      // Best-effort persistence; ignore storage errors
    }
  }, [settingsData, settingsHydrated]);

  const brandingTheme = useMemo<ThemeTokens>(() => {
    const themeName: ThemeName = (settingsData.branding.theme as ThemeName) || 'Light';
    const menu = normalizeHex(settingsData.branding.menuColor || '#1a1612');

    const matchedPair = dashboardColorPairs.find(
      (pair) => normalizeHex(pair.bg).toLowerCase() === menu.toLowerCase()
    );

    const menuText = normalizeHex(matchedPair?.text || '#f97316');
    const accent = normalizeHex(settingsData.branding.accentColor || menuText);
    const isDark = themeName === 'Dark';

    const background = isDark ? '#04060b' : '#fdf6f0';
    const surface = isDark ? '#111827' : '#ffffff';
    const surfaceMuted = isDark ? '#1a2135' : '#fdf6f0';
    const textPrimary = isDark ? '#f7f9ff' : '#1f232c';
    const textMuted = isDark ? '#a9b4cc' : '#6b7280';
    const sectionFrom = isDark ? '#0b0f1a' : '#fff5ec';
    const sectionTo = isDark ? '#05070f' : '#ffffff';
    const border = isDark ? 'rgba(148, 163, 184, 0.28)' : 'rgba(15, 23, 42, 0.08)';
    const cardShadow = isDark ? '0 40px 140px rgba(0,0,0,0.65)' : '0 25px 80px rgba(15,23,42,0.08)';
    const sidebarFrom = adjustHexColor(menu, -0.08);
    const sidebarTo = adjustHexColor(menu, 0.12);

    return {
      accent,
      accentSoft: hexToRgba(accent, 0.16),
      background,
      surface,
      surfaceMuted,
      textPrimary,
      textMuted,
      menuFrom: sidebarFrom,
      menuTo: sidebarTo,
      menuText,
      sectionFrom,
      sectionTo,
      border,
      cardShadow,
      mode: isDark ? 'dark' : 'light',
    };
  }, [settingsData.branding]);

  const filterOptions = [
    { key: '1d', label: 'Last 1 Day' },
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '90d', label: 'Last 90 Days' },
    { key: '365d', label: 'Last 365 Days' },
  ] as const;
  const [campaignDateRange, setCampaignDateRange] = useState<DateRangeKey>('30d');
  const [campaignFilterOpen, setCampaignFilterOpen] = useState(false);
  const [seoDateRange, setSeoDateRange] = useState<DateRangeKey>('30d');
  const [seoFilterOpen, setSeoFilterOpen] = useState(false);
  const [globalFilterOpen, setGlobalFilterOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [themeIndex, setThemeIndex] = useState(0);
  const themePresets = [
    { theme: 'Sunset', accentColor: '#f97316', menuColor: '#1a1612' },
    { theme: 'Midnight', accentColor: '#6366f1', menuColor: '#0f172a' },
    { theme: 'Emerald', accentColor: '#10b981', menuColor: '#022c22' },
  ];

  const applyTheme = useCallback((theme: 'Light' | 'Dark') => {
    setSettingsData((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        theme,
      },
    }));
  }, []);

  const handleResetBranding = useCallback(() => {
    const defaults = buildDefaultSettings();
    setSettingsData((prev) => ({
      ...prev,
      branding: { ...defaults.branding },
    }));
  }, []);

  // Integration Checklist state
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<
    Record<string, { state: 'unknown' | 'verified' | 'failed'; message?: string; testedAt?: string }>
  >({});
  const [crmLeads, setCrmLeads] = useState<any[]>([]);
  const loadCrmLeads = useCallback(async () => {
    try {
      const result = await getCrmLeads({ limit: 50, offset: 0 });
      setCrmLeads(Array.isArray(result?.leads) ? result.leads : []);
    } catch (err: unknown) {
      const message = getAxiosLikeErrorMessage(err);
      setIntegrationError((message && message.trim()) || 'Unable to load CRM leads from the API');
      setCrmLeads([]);
    }
  }, []);
  const { notifications, loading: loadingNotifications, error: notificationError, refetch } = useIntegrationNotifications('open');
  const [platformAlert, setPlatformAlert] = useState<{ title: string; description: string; timestamp: string } | null>(null);
  const [commerceData, setCommerceData] = useState<any | null>(null);
  const [trendData, setTrendData] = useState<any | null>(null);
  const [seoData, setSeoData] = useState<any | null>(null);
  const [productPerformance, setProductPerformance] = useState<any[]>([]);
  const [campaignInsights, setCampaignInsights] = useState<CampaignSource[]>([]);
  const [campaignInsightsLoading, setCampaignInsightsLoading] = useState(false);
  const [campaignInsightsError, setCampaignInsightsError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Platform configuration for Integration Checklist
  const REQUIRED_PLATFORMS = useMemo(
    (): RequiredPlatformConfig[] => [
      {
        id: 'google',
        label: 'Google',
        provider: 'google',
        category: 'ADS',
        accent: '#ef4444',
        iconSlug: 'googleads',
        color: 'bg-red-500',
        description: 'Sync campaigns and analytics data from Google Ads + GA4.',
      },
      {
        id: 'facebook',
        label: 'Facebook (Meta)',
        provider: 'facebook',
        category: 'ADS',
        accent: '#2563eb',
        iconSlug: 'facebook',
        color: 'bg-blue-600',
        description: 'Connect Meta Ads for impressions, clicks, spend and leads (Lead Ads).',
      },
      {
        id: 'line',
        label: 'LINE OA',
        provider: 'line',
        category: 'ADS',
        accent: '#22c55e',
        iconSlug: 'line',
        color: 'bg-green-500',
        description: 'Pull CRM and messaging KPIs from LINE OA.',
      },
      {
        id: 'tiktok',
        label: 'TikTok Ads',
        provider: 'tiktok',
        category: 'ADS',
        accent: '#111827',
        iconSlug: 'tiktok',
        iconColorDark: 'FFFFFF',
        iconColorLight: 'FFFFFF',
        color: 'bg-zinc-900',
        description: 'Monitor short-form video campaigns from TikTok.',
      },
      {
        id: 'shopee',
        label: 'Shopee',
        provider: 'shopee',
        category: 'COMMERCE',
        accent: '#f97316',
        iconSlug: 'shopee',
        color: 'bg-orange-500',
        description: 'Sync orders and revenue data from Shopee Open Platform.',
      },
    ],
    []
  );

  const requiredPlatformsForChecklist = useMemo(() => {
    if (!isMvpMode) return REQUIRED_PLATFORMS;
    return REQUIRED_PLATFORMS.filter((platform) => platform.provider === 'google');
  }, [REQUIRED_PLATFORMS, isMvpMode]);

  const isBlockingLoading =
    (metricsLoading && (!rawMetrics || rawMetrics.length === 0)) &&
    (campaignsLoading && (!campaigns || campaigns.length === 0));

  const chartSeries: ChartDatum[] = useMemo(
    () =>
      rawMetrics.map((point) => ({
        date: point.date,
        impressions: point.impressions ?? 0,
        clicks: point.clicks ?? 0,
        conversions: point.conversions ?? 0,
        spend: Number(point.spend || 0),
        revenue: Number(point.revenue || 0),
      })),
    [rawMetrics]
  );

  const aggregated = useMemo(() => {
    const totals = chartSeries.reduce(
      (acc, point) => ({
        impressions: acc.impressions + Number(point.impressions || 0),
        clicks: acc.clicks + Number(point.clicks || 0),
        conversions: acc.conversions + Number(point.conversions || 0),
        spend: acc.spend + Number(point.spend || 0),
        revenue: acc.revenue + Number(point.revenue || 0),
      }),
      { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 }
    );

    const platformTotals: Record<string, number> = {};
    campaigns.forEach((campaign) => {
      const revenue = (campaign.metrics || []).reduce((sum, metric) => sum + Number(metric.revenue || 0), 0);
      platformTotals[campaign.platform] = (platformTotals[campaign.platform] || 0) + revenue;
    });

    const platformBreakdown = Object.entries(platformTotals).map(([platform, value]) => ({
      name: platform.toUpperCase(),
      value,
    }));

    return { totals, platformBreakdown };
  }, [chartSeries, campaigns]);

  const campaignTotals = useMemo(
    () =>
      campaigns.reduce(
        (acc, campaign) => {
          (campaign.metrics || []).forEach((metric) => {
            acc.spend += Number(metric.spend || 0);
            acc.revenue += Number(metric.revenue || 0);
            acc.orders += Number(metric.orders || 0);
          });
          return acc;
        },
        { spend: 0, revenue: 0, orders: 0 }
      ),
    [campaigns]
  );

  // Integration Checklist functions
  const loadIntegrations = useCallback(async () => {
    try {
      setIntegrationLoading(true);
      setIntegrationError(null);
      const data = await getIntegrations();
      setIntegrations(data || []);
    } catch (err: unknown) {
      const message = getAxiosLikeErrorMessage(err);
      setIntegrationError((message && message.trim()) || 'Unable to load integration status from the API');
    } finally {
      setIntegrationLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const data = await getReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setReports([]);
      setReportsError(getAxiosLikeErrorMessage(err));
    } finally {
      setReportsLoading(false);
    }
  }, []);

  const loadCampaignInsights = useCallback(async () => {
    setCampaignInsightsLoading(true);
    setCampaignInsightsError(null);
    try {
      const data = await getCampaignInsights({ period: campaignDateRange as any });
      setCampaignInsights(Array.isArray(data) ? (data as CampaignSource[]) : []);
    } catch (err: unknown) {
      setCampaignInsights([]);
      setCampaignInsightsError(getAxiosLikeErrorMessage(err));
    } finally {
      setCampaignInsightsLoading(false);
    }
  }, [campaignDateRange]);

  useEffect(() => {
    loadIntegrations();
    loadCrmLeads();
    (async () => {
      try {
        const [commerce, trend, seo] = await Promise.all([
          getCommerceOverview({ period: '30d' }),
          getTrendDashboard({ period: '30d' }),
          getSeoDashboard({ limit: 20 }),
        ]);
        setCommerceData(commerce);
        setTrendData(trend);
        setSeoData(seo);
      } catch {
        setCommerceData(null);
        setTrendData(null);
        setSeoData(null);
      }
    })();
    (async () => {
      try {
        const data = await getProductPerformance({ period: '30d' });
        setProductPerformance(Array.isArray(data) ? data : []);
      } catch {
        setProductPerformance([]);
      }
    })();
    loadReports();
    loadCampaignInsights();
    refetch();
  }, [loadCampaignInsights, loadCrmLeads, loadIntegrations, loadReports, refetch]);

  useEffect(() => {
    loadCampaignInsights();
  }, [loadCampaignInsights]);

  const reportStatusRows = useMemo(() => {
    return (Array.isArray(reports) ? reports : []).map((report: any) => {
      const createdBy = report?.createdByUser;
      const name = String(report?.name || 'Report');
      const createdByName = typeof createdBy === 'object' && createdBy
        ? `${String((createdBy as any).firstName || '').trim()} ${String((createdBy as any).lastName || '').trim()}`.trim()
        : '';
      const email = typeof (createdBy as any)?.email === 'string' && String((createdBy as any).email).trim()
        ? String((createdBy as any).email)
        : createdByName || '—';
      const role = typeof (createdBy as any)?.role === 'string' && String((createdBy as any).role).trim()
        ? String((createdBy as any).role)
        : (createdBy ? 'admin' : 'user');
      const status = report?.isScheduled ? 'scheduled' : 'download';
      const metrics = Array.isArray(report?.metrics) ? report.metrics : [];
      const date = report?.createdAt ? new Date(report.createdAt).toISOString().slice(0, 10) : '';
      return {
        name,
        email,
        role: String(role),
        status: String(status),
        metrics,
        date,
        createdBy,
      };
    });
  }, [reports]);

  const reportBuilders = useMemo(() => {
    const scheduleTime = new Date().toISOString().slice(0, 10);
    const firstReport = Array.isArray(reports) && reports.length > 0 ? reports[0] : null;
    return {
      schedule: {
        menu: 'Campaign Performance',
        scheduleTime,
        reportId: firstReport?.id || null,
      },
    };
  }, [reports]);

  const ScheduleReportCardWithApi: React.FC<any> = useCallback(
    (props) => <ScheduleReportCard {...props} onReportCreated={loadReports} />,
    [loadReports]
  );

  const crmRealtime = useMemo(() => {
    const total = crmLeads.length;
    const converted = crmLeads.filter((l) => String(l?.status || '').toLowerCase() === 'converted').length;
    const pipelineValue = crmLeads.reduce((sum, l) => sum + Number(l?.estimatedValue || 0), 0);
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    return [
      { id: 'crm-total', label: 'Total Leads', value: `${total}`, delta: '—', positive: true },
      { id: 'crm-value', label: 'Pipeline Value', value: `$${Math.round(pipelineValue).toLocaleString('en-US')}`, delta: '—', positive: true },
      { id: 'crm-converted', label: 'Converted', value: `${converted}`, delta: '—', positive: true },
      { id: 'crm-rate', label: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, delta: '—', positive: conversionRate >= 0 },
    ];
  }, [crmLeads]);

  const crmStages = useMemo(() => {
    const stageColors: Record<string, string> = {
      new: '#3b82f6',
      'in progress': '#fbbf24',
      converted: '#22c55e',
      lost: '#ef4444',
    };

    const counts: Record<string, number> = {};
    crmLeads.forEach((l) => {
      const stage = String(l?.stage || 'New');
      counts[stage] = (counts[stage] || 0) + 1;
    });

    const rows = Object.entries(counts)
      .map(([label, value]) => ({
        label,
        value,
        color: stageColors[label.toLowerCase()] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value);

    return rows.length ? rows : [{ label: 'New', value: 0, color: '#3b82f6' }];
  }, [crmLeads]);

  const crmSegments = useMemo(() => {
    const buckets = [
      { label: 'Enterprise', min: 50_000, color: '#f97316' },
      { label: 'Mid-Market', min: 20_000, color: '#fb923c' },
      { label: 'Small Business', min: 5_000, color: '#fde047' },
      { label: 'Individual', min: 0, color: '#22d3ee' },
    ];

    const grouped = buckets.map((b) => ({ ...b, customers: 0, totalValue: 0 }));
    crmLeads.forEach((l) => {
      const v = Number(l?.estimatedValue || 0);
      const bucket = grouped.find((b) => v >= b.min) || grouped[grouped.length - 1];
      bucket.customers += 1;
      bucket.totalValue += v;
    });

    return grouped.map((b) => ({
      label: b.label,
      customers: b.customers,
      value: `$${Math.round(b.totalValue / 1000)}K`,
      roi: '—',
      color: b.color,
    }));
  }, [crmLeads]);

  const crmLeadRows = useMemo(() => {
    return crmLeads.slice(0, 20).map((l) => ({
      lead: String(l?.name || '—'),
      company: String(l?.company || '—'),
      source: String(l?.source || '—'),
      status: String(l?.status || 'New'),
      value: `$${Math.round(Number(l?.estimatedValue || 0)).toLocaleString('en-US')}`,
      date: l?.createdAt ? format(new Date(l.createdAt), 'dd/MM/yyyy') : '—',
    }));
  }, [crmLeads]);

  const normalizeChecklistProvider = useCallback((raw: string) => {
    const key = String(raw || '')
      .trim()
      .toLowerCase();
    if (['google', 'googleads', 'google_ads', 'google ads'].includes(key)) return 'google';
    if (['facebook', 'meta', 'meta_ads', 'facebook_ads', 'facebook ads'].includes(key)) return 'facebook';
    if (['line', 'lineads', 'line_ads', 'line oa'].includes(key)) return 'line';
    if (['tiktok', 'tiktok ads'].includes(key)) return 'tiktok';
    if (['shopee'].includes(key)) return 'shopee';
    return key;
  }, []);

  const integrationMap = useMemo(() => {
    return integrations.reduce<Record<string, Integration>>((acc, integration) => {
      const key = normalizeChecklistProvider(integration.provider);
      if (!key) return acc;
      if (!acc[key]) acc[key] = integration;
      return acc;
    }, {});
  }, [integrations, normalizeChecklistProvider]);

  const integrationSteps = useMemo<IntegrationStep[]>(() => {
    return requiredPlatformsForChecklist.map((platform) => {
      const integration = integrationMap[platform.provider];
      const isConnected = Boolean(integration?.isActive);
      return {
        ...platform,
        status: isConnected ? 'connected' : 'disconnected',
        integration,
      };
    });
  }, [integrationMap, requiredPlatformsForChecklist]);

  const connectedIntegrationProviders = useMemo(() => {
    const connected = new Set<string>();

    (integrations || []).forEach((integration) => {
      if (integration?.provider && integration.isActive) {
        connected.add(normalizeChecklistProvider(String(integration.provider)));
      }
    });

    return connected;
  }, [integrations, normalizeChecklistProvider]);

  const handleVerify = useCallback(
    async (provider: string, label: string) => {
      const integration = integrationMap[provider];
      if (!integration) {
        setIntegrationError('Integration record not found. Please configure it first via Integrations.');
        return;
      }

      try {
        setActionTarget(`verify:${provider}`);
        setIntegrationError(null);
        setVerifyStatus((prev) => ({
          ...prev,
          [provider]: { state: 'unknown', message: 'Verifying…' },
        }));

        const result = await testIntegration(integration.id);
        const ok = Boolean((result as any)?.ok);
        setVerifyStatus((prev) => ({
          ...prev,
          [provider]: {
            state: ok ? 'verified' : 'failed',
            message: String((result as any)?.message || (ok ? 'Verified' : 'Not verified')),
            testedAt: new Date().toLocaleString(),
          },
        }));

        if (ok) {
          setPlatformAlert({
            title: `${label} verified`,
            description: 'Connection verified successfully.',
            timestamp: new Date().toLocaleString(),
          });
        }
      } catch (err: any) {
        const msg = String(err?.response?.data?.message || err?.message || 'Verification failed');
        setVerifyStatus((prev) => ({
          ...prev,
          [provider]: { state: 'failed', message: msg, testedAt: new Date().toLocaleString() },
        }));
        setIntegrationError(msg);
      } finally {
        setActionTarget(null);
      }
    },
    [integrationMap]
  );

  const platformOptions = useMemo<string[]>(() => {
    const labelByProvider: Record<string, string> = {
      facebook: 'Facebook',
      googleads: 'Google Ads',
      googleanalytics: 'Google Analytics',
      line: 'LINE',
      tiktok: 'TikTok',
      instagram: 'Instagram',
      partner: 'Partner',
      shopee: 'Shopee',
    };

    const orderedProviders = ['facebook', 'googleads', 'instagram', 'tiktok', 'line', 'partner', 'shopee', 'googleanalytics'];
    const orderIndex = new Map<string, number>(orderedProviders.map((provider, idx) => [provider, idx]));

    const rawProviders = connectedIntegrationProviders.size
      ? Array.from(connectedIntegrationProviders)
      : Object.keys(labelByProvider);

    const raw = rawProviders.map((provider) => labelByProvider[provider] ?? provider);
    const deduped = Array.from(new Set(raw)).filter((label) => typeof label === 'string' && label.trim());

    return deduped.sort((a, b) => {
      const providerA = Object.keys(labelByProvider).find((key) => labelByProvider[key] === a) ?? a;
      const providerB = Object.keys(labelByProvider).find((key) => labelByProvider[key] === b) ?? b;
      const idxA = orderIndex.has(providerA) ? (orderIndex.get(providerA) as number) : Number.MAX_SAFE_INTEGER;
      const idxB = orderIndex.has(providerB) ? (orderIndex.get(providerB) as number) : Number.MAX_SAFE_INTEGER;
      if (idxA !== idxB) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [connectedIntegrationProviders]);

  const completedSteps = integrationSteps.filter((step) => step.status === 'connected').length;
  const completionPercent = useMemo(() => {
    if (!integrationSteps.length) return 0;
    return Math.round((completedSteps / integrationSteps.length) * 100);
  }, [completedSteps, integrationSteps.length]);

  const conversionConnectionStatus = useMemo(() => {
    const status: Record<string, 'connected' | 'disconnected'> = {};

    // Preserve keys from the checklist configuration for consistent downstream lookups
    integrationSteps.forEach((step) => {
      status[step.provider] = connectedIntegrationProviders.has(step.provider) ? 'connected' : 'disconnected';
    });

    // Also mark any other connected providers (e.g. shopee, instagram, partner) if present
    Array.from(connectedIntegrationProviders).forEach((provider) => {
      status[provider] = 'connected';
    });

    return status;
  }, [connectedIntegrationProviders, integrationSteps]);

  const { data: overviewData, meta: overviewMeta, loading: overviewLoading } = useOverviewData(
    selectedRange,
    compareMode,
    conversionConnectionStatus,
  );

  const hasConnectedConversionPlatform = (overviewData?.conversionPlatforms?.length || 0) > 0;

  const filteredConversionPlatforms = useMemo(() => {
    const raw = Array.isArray(overviewData?.conversionPlatforms) ? overviewData?.conversionPlatforms : [];
    if (!raw.length) return [];

    const normalize = (value: unknown) =>
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const providerByLabel: Record<string, string> = {
      facebook: 'facebook',
      'google ads': 'googleads',
      'google analytics': 'googleanalytics',
      tiktok: 'tiktok',
      'tiktok ads': 'tiktok',
      line: 'line',
      shopee: 'shopee',
    };

    const connected = conversionConnectionStatus || {};
    const hasAnyConnected = Object.values(connected).some((v) => v === 'connected');

    const filtered = hasAnyConnected
      ? raw.filter((row: any) => {
          const labelKey = normalize(row?.platform);
          const provider = providerByLabel[labelKey] ?? labelKey;
          return connected?.[provider] === 'connected';
        })
      : raw;

    return filtered.length ? filtered : raw;
  }, [conversionConnectionStatus, overviewData?.conversionPlatforms]);

  const handleToggle = useCallback(
    async (provider: string) => {
      const integration = integrationMap[provider];
      if (!integration) {
        setIntegrationError('Integration record not found. Configure it first via Integrations > Add Integration.');
        return;
      }

      try {
        setActionTarget(provider);
        await updateIntegration(integration.id, { isActive: !integration.isActive });
        await loadIntegrations();
      } catch (err: unknown) {
        const message = getAxiosLikeErrorMessage(err);
        setIntegrationError((message && message.trim()) || 'Unable to update integration status');
      } finally {
        setActionTarget(null);
      }
    },
    [integrationMap, loadIntegrations]
  );

  const handleConfigure = useCallback((provider: string, label: string) => {
    const timestamp = new Date().toLocaleString();
    setPlatformAlert({
      title: `${label} setup`,
      description: `Please configure ${label} in Integrations to connect real data.`,
      timestamp,
    });
    navigate('/integrations');
  }, [navigate]);

  const campaignMonitorRows = useMemo(() => {
    const rawRows = Array.isArray(overviewData?.activeCampaigns) ? overviewData?.activeCampaigns : [];

    const normalizePlatform = (value: unknown) =>
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const providerByPlatformLabel: Record<string, string> = {
      facebook: 'facebook',
      'google ads': 'googleads',
      instagram: 'instagram',
      tiktok: 'tiktok',
      'tiktok ads': 'tiktok',
      line: 'line',
      'line oa': 'line',
      partner: 'partner',
      shopee: 'shopee',
    };

    const connected = connectedIntegrationProviders;

    const filtered = connected.size
      ? rawRows.filter((row: any) => {
        const labelKey = normalizePlatform(row?.platform);
        const provider = providerByPlatformLabel[labelKey] ?? labelKey;
        return connected.has(provider);
      })
      : rawRows;

    const rowsToUse = filtered.length ? filtered : rawRows;

    return rowsToUse.map((row: any) => {
      const conversions = Number(row.conversions ?? 0);
      const budget = Number(row.budget ?? 0);
      const cpaRaw = Number(row.cpa ?? (conversions > 0 ? budget / conversions : 0));
      return {
        campaignName: String(row.campaignName ?? row.name ?? ''),
        platform: String(row.platform ?? ''),
        conversions,
        cpa: Math.round(cpaRaw * 100) / 100,
        budget,
      };
    });
  }, [connectedIntegrationProviders, overviewData?.activeCampaigns]);

  const [downloadModal, setDownloadModal] = useState<{ open: boolean; section: string | null }>({
    open: false,
    section: null,
  });

  const openDownloadModal = useCallback((section: string) => {
    setDownloadModal({ open: true, section });
  }, []);

  const closeDownloadModal = useCallback(() => {
    setDownloadModal({ open: false, section: null });
  }, []);

  const handleActiveCampaignMonitorDownload = useCallback(() => {
    if (!campaignMonitorRows.length) {
      return;
    }

    const headers = ['Campaign Name', 'Platform', 'Conversions', 'CPA', 'Budget'];

    const rows = campaignMonitorRows.map((campaign) => [
      campaign.campaignName,
      campaign.platform,
      campaign.conversions,
      campaign.cpa,
      campaign.budget,
    ]);

    const csvContent = buildCsvContent(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'active-campaign-monitor.csv');
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, [campaignMonitorRows]);

  const handleConversionsPlatformDownload = useCallback(() => {
    if (!filteredConversionPlatforms.length) {
      return;
    }

    const headers = ['Platform', 'Conversions', 'Percentage'];

    const totalConversions = filteredConversionPlatforms.reduce((sum, platform) => sum + platform.value, 0);

    const rows = filteredConversionPlatforms.map((platform) => [
      platform.platform,
      platform.value,
      ((platform.value / totalConversions) * 100).toFixed(1) + '%',
    ]);

    const csvContent = buildCsvContent(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'conversions-platform.csv');
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, [filteredConversionPlatforms]);

  const downloadOptions = ['Image', 'PDF', 'CSV', 'DOC'];

  const handleDownloadOption = useCallback(
    (option: string) => {
      if (option === 'CSV' && downloadModal.section === 'Active Campaign Monitor') {
        handleActiveCampaignMonitorDownload();
      } else if (option === 'CSV' && downloadModal.section === 'Conversions Platform') {
        handleConversionsPlatformDownload();
      } else {
        alert(`${option} download for ${downloadModal.section ?? 'this section'} is coming soon.`);
      }
      closeDownloadModal();
    },
    [closeDownloadModal, downloadModal.section, handleActiveCampaignMonitorDownload, handleConversionsPlatformDownload]
  );

  useEffect(() => {
    const existing = document.querySelector(FONT_AWESOME_LINK_SELECTOR) as HTMLLinkElement | null;
    if (existing) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_AWESOME_LINK_HREF;
    link.crossOrigin = 'anonymous';
    link.referrerPolicy = 'no-referrer';
    link.dataset.fontawesome = 'true';
    document.head.appendChild(link);

    return () => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, []);

  const scrollToSection = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    const element = ref.current;
    if (element) {
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = Math.max(elementPosition - DASHBOARD_HEADER_OFFSET_PX, 0);
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  }, []);

  const scrollRetryTimeoutRef = useRef<number | null>(null);

  const scrollToSectionWhenReady = useCallback(
    (ref: React.RefObject<HTMLDivElement>) => {
      let attempts = 0;
      const tick = () => {
        if (ref.current) {
          scrollToSection(ref);
          return;
        }

        if (attempts >= DASHBOARD_SCROLL_RETRY_MAX_ATTEMPTS) {
          return;
        }

        attempts += 1;
        scrollRetryTimeoutRef.current = window.setTimeout(tick, DASHBOARD_SCROLL_RETRY_DELAY_MS);
      };

      tick();
    },
    [scrollToSection]
  );

  useEffect(() => {
    return () => {
      if (scrollRetryTimeoutRef.current) {
        window.clearTimeout(scrollRetryTimeoutRef.current);
      }
    };
  }, []);

  const handleSectionNav = useCallback(
    (sectionKey: SectionKey, ref: React.RefObject<HTMLDivElement>) => {
      if (activeSection === sectionKey) {
        scrollToSection(ref);
      } else {
        setPendingScroll({ section: sectionKey, ref });
        setActiveSection(sectionKey);
      }
    },
    [activeSection, scrollToSection]
  );

  useEffect(() => {
    try {
      const target = window.localStorage.getItem(DASHBOARD_SCROLL_TARGET_KEY);
      if (target !== 'conversions-platform') {
        return;
      }
      window.localStorage.removeItem(DASHBOARD_SCROLL_TARGET_KEY);
      setPendingScroll({ section: 'overview', ref: overviewSectionRefs.conversionsPlatform });
      setActiveSection('overview');
    } catch {
      // ignore
    }
  }, [overviewSectionRefs.conversionsPlatform]);

  useEffect(() => {
    if (pendingScroll && activeSection === pendingScroll.section) {
      scrollToSectionWhenReady(pendingScroll.ref);
      setPendingScroll(null);
    }
  }, [pendingScroll, activeSection, scrollToSectionWhenReady]);

  const makeSectionLink = useCallback(
    (sectionKey: SectionKey, ref: React.RefObject<HTMLDivElement>, label: string) => {
      return {
        label,
        onClick: () => handleSectionNav(sectionKey, ref),
      };
    },
    [handleSectionNav]
  );

  type SidebarMenuItem = {
    label: string;
    icon: React.ReactNode;
    key?: SectionKey;
    onClick?: () => void;
    children?: { label: string; onClick?: () => void }[];
  };

  const overviewChildLinks = useMemo(
    () => [
      makeSectionLink('overview', overviewSectionRefs.aiSummaries, 'AI Summaries & Live KPIs'),
      makeSectionLink('overview', overviewSectionRefs.performance, 'Performance Insights'),
    ],
    [makeSectionLink, overviewSectionRefs.aiSummaries, overviewSectionRefs.performance]
  );

  const currentRole = (currentUser?.role as Role) || getStoredRole();

  const canManageIntegrations = hasPermission(currentRole, PERMISSIONS.manage_integrations);
  const canManageAlerts = hasPermission(currentRole, PERMISSIONS.manage_alerts);
  const canManageUsers = hasPermission(currentRole, PERMISSIONS.manage_users);
  const canManageSystem = hasPermission(currentRole, PERMISSIONS.manage_system);
  const canManageTenants = hasPermission(currentRole, PERMISSIONS.manage_tenants);
  const canSeeHistory = hasAnyPermission(currentRole, [
    PERMISSIONS.view_system_history,
    PERMISSIONS.view_admin_history,
    PERMISSIONS.view_user_history,
    PERMISSIONS.export_logs,
    PERMISSIONS.manage_integrations,
  ]);
  const canSeeAdminActions = canManageSystem || canManageTenants || hasPermission(currentRole, PERMISSIONS.manage_admins);

  const canSeeSettings =
    canManageIntegrations ||
    canManageAlerts ||
    canManageUsers ||
    canManageTenants ||
    hasPermission(currentRole, PERMISSIONS.manage_admins) ||
    canManageSystem;

  const canSeeReports =
    hasPermission(currentRole, PERMISSIONS.export_logs) ||
    canManageAlerts ||
    canManageUsers ||
    canManageSystem;

  const settingsChildLinks = useMemo(
    () => [
      { label: 'Campaigns', onClick: () => navigate('/campaigns') },
      { label: 'Metrics', onClick: () => navigate('/metrics') },
      ...(canManageAlerts ? [{ label: 'Alerts', onClick: () => navigate('/alerts') }] : []),
      { label: 'AI', onClick: () => navigate('/ai') },
      ...(canSeeHistory ? [{ label: 'History', onClick: () => navigate('/history') }] : []),
      ...(canManageIntegrations
        ? [
            { label: 'Sync Center', onClick: () => navigate('/sync-center') },
            { label: 'Import Metrics', onClick: () => navigate('/metrics-import') },
            { label: 'Integrations', onClick: () => navigate('/integrations') },
            { label: 'Webhooks', onClick: () => navigate('/webhooks') },
            makeSectionLink('settings', settingsSectionRefs.integrations, 'Integration Checklist'),
          ]
        : []),
      ...(currentRole === 'super_admin' ? [{ label: 'Users', onClick: () => navigate('/users') }] : []),
      makeSectionLink('settings', settingsSectionRefs.header, 'Settings'),
    ],
    [canManageAlerts, canManageIntegrations, canSeeHistory, currentRole, makeSectionLink, navigate, settingsSectionRefs.header, settingsSectionRefs.integrations]
  );

  const campaignChildLinks = useMemo(
    () => [
      makeSectionLink('campaign', campaignSectionRefs.performance, 'Campaign Performance'),
      makeSectionLink('campaign', campaignSectionRefs.visualization, 'Visualization Controls'),
    ],
    [campaignSectionRefs.performance, campaignSectionRefs.visualization, makeSectionLink]
  );

  const seoChildLinks = useMemo(
    () => [
      makeSectionLink('seo', seoSectionRefs.overview, 'SEO & Web Analytics'),
      makeSectionLink('seo', seoSectionRefs.regional, 'Regional SEO Performance'),
      makeSectionLink('seo', seoSectionRefs.competitors, 'Top organic Competitors'),
    ],
    [makeSectionLink, seoSectionRefs.competitors, seoSectionRefs.overview, seoSectionRefs.regional]
  );

  const trendChildLinks = useMemo(
    () => [
      makeSectionLink('trend', trendSectionRefs.overview, 'Trend Analysis'),
      makeSectionLink('trend', trendSectionRefs.revenueCosts, 'Revenue & Costs'),
      makeSectionLink('trend', trendSectionRefs.revenueTrend, 'Revenue Trend'),
      makeSectionLink('trend', trendSectionRefs.retention, 'Customer Retention'),
    ],
    [makeSectionLink, trendSectionRefs.overview, trendSectionRefs.revenueCosts, trendSectionRefs.revenueTrend, trendSectionRefs.retention]
  );

  useEffect(() => {
    if (activeSection === 'settings' && !canSeeSettings) {
      setActiveSection('overview');
      return;
    }
    if (activeSection === 'reports' && !canSeeReports) {
      setActiveSection('overview');
    }
  }, [activeSection, canSeeReports, canSeeSettings]);

  useEffect(() => {
    if (!isMvpMode) return;
    if (activeSection === 'seo' || activeSection === 'commerce' || activeSection === 'crm') {
      setActiveSection('overview');
    }
  }, [activeSection, isMvpMode]);

  const baseMenuItems = useMemo<SidebarMenuItem[]>(
    () => [
      { label: 'Overview Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, key: 'overview' as SectionKey, children: overviewChildLinks },
      { label: 'Campaign Performance', icon: <BarChart3 className="h-5 w-5" />, key: 'campaign' as SectionKey, children: campaignChildLinks },
      ...(!isMvpMode ? [{ label: 'SEO & Web Analytics', icon: <Search className="h-5 w-5" />, key: 'seo' as SectionKey, children: seoChildLinks }] : []),
      ...(!isMvpMode ? [{ label: 'E-commerce Insights', icon: <ShoppingBag className="h-5 w-5" />, key: 'commerce' as SectionKey }] : []),
      ...(!isMvpMode ? [{ label: 'CRM & Leads Insights', icon: <Users className="h-5 w-5" />, key: 'crm' as SectionKey }] : []),
      { label: 'Trend Analysis', icon: <TrendingUp className="h-5 w-5" />, key: 'trend' as SectionKey, children: trendChildLinks },
      ...(canSeeReports
        ? [{ label: 'Reports & Automation', icon: <FileText className="h-5 w-5" />, key: 'reports' as SectionKey }]
        : []),
    ],
    [overviewChildLinks, campaignChildLinks, seoChildLinks, trendChildLinks, canSeeReports, isMvpMode]
  );

  const bottomBaseMenuItems = useMemo<SidebarMenuItem[]>(
    () =>
      canSeeSettings
        ? [{ label: 'Settings', icon: <Settings className="h-5 w-5" />, key: 'settings' as SectionKey, children: settingsChildLinks }]
        : [],
    [canSeeSettings, settingsChildLinks]
  );

  const setActiveSectionByKey = useCallback((key: SectionKey) => {
    setActiveSection(key);
  }, []);

  const menuItems = useMemo(
    () =>
      baseMenuItems.map((item) => ({
        label: item.label,
        icon: item.icon,
        active: item.key ? activeSection === item.key : false,
        onClick: item.onClick
          ? item.onClick
          : item.key
            ? () => setActiveSectionByKey(item.key)
            : undefined,
        children: item.children,
      })),
    [activeSection, baseMenuItems, setActiveSectionByKey]
  );

  const bottomMenuItems = useMemo(
    () =>
      bottomBaseMenuItems.map((item) => ({
        label: item.label,
        icon: item.icon,
        active: item.key ? activeSection === item.key : false,
        onClick: item.onClick
          ? item.onClick
          : item.key
            ? () => setActiveSectionByKey(item.key)
            : undefined,
        children: item.children,
      })),
    [activeSection, bottomBaseMenuItems, setActiveSectionByKey]
  );

  const handleRefresh = useCallback(() => {
    refetchMetrics();
    refetchCampaigns();
  }, [refetchCampaigns, refetchMetrics]);

  // Integration Checklist Widget Component
  const IntegrationChecklistWidget = useCallback(
    ({ containerRef }: { containerRef?: React.RefObject<HTMLDivElement> }) => (
      <div ref={containerRef ?? overviewSectionRefs.integrations} className={`${themePanelClass} shadow space-y-6 p-4`}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <SectionTitle title="Integration Checklist" subtitle="Connect data sources for real-time insights" />
            {canSeeSettings ? (
              <button
                type="button"
                className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center gap-2 shrink-0"
                onClick={() => {
                  setPendingScroll({ section: 'settings', ref: settingsSectionRefs.integrations });
                  setActiveSection('settings');
                }}
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            ) : null}
          </div>

          {/* Integration List */}
          <div className="space-y-0">
            {integrationLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm">Loading integrations...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {integrationSteps.map((step) => {
                  const connected = step.status === 'connected';
                  const category = step.category || 'ADS';
                  const accent = step.accent;
                  const iconSlug = step.iconSlug;
                  const isTikTok = step.provider === 'tiktok';
                  const iconColorDark = step.iconColorDark;
                  const iconColorLight = step.iconColorLight;
                  const accentNoHash = (accent || '').replace('#', '');
                  const fallbackIconColor = brandingTheme.mode === 'dark' ? 'FFFFFF' : '111827';
                  const overrideIconColor = brandingTheme.mode === 'dark' ? iconColorDark : iconColorLight;
                  const iconColor = overrideIconColor || accentNoHash || fallbackIconColor;
                  const iconSrc = iconSlug ? `https://cdn.simpleicons.org/${iconSlug}/${iconColor}` : undefined;
                  const connectedBackground = accent
                    ? `linear-gradient(135deg, ${hexToRgba(accent, 0.40)}, ${hexToRgba(accent, 0.22)})`
                    : undefined;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      disabled={actionTarget === step.provider || actionTarget === `verify:${step.provider}`}
                      onClick={() =>
                        canManageIntegrations
                          ? step.integration
                            ? handleVerify(step.provider, step.label)
                            : handleConfigure(step.provider, step.label)
                          : navigate('/dashboard')
                      }
                      className={`w-full rounded-2xl px-5 py-4 text-left transition-all duration-200 theme-card hover:shadow-sm ${connected ? 'border-0' : ''
                        } ${actionTarget === step.provider ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                      style={
                        connected
                          ? {
                            borderColor: 'transparent',
                            background: connectedBackground,
                          }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div
                            className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 border"
                            style={
                              connected
                                ? {
                                  backgroundColor: isTikTok ? '#111827' : 'rgba(255,255,255,0.70)',
                                  borderColor: isTikTok ? '#111827' : 'rgba(255,255,255,0.65)',
                                }
                                : {
                                  backgroundColor: isTikTok ? '#111827' : 'rgba(0,0,0,0.02)',
                                  borderColor: isTikTok ? '#111827' : 'var(--theme-border)',
                                }
                            }
                          >
                            {iconSrc ? <img src={iconSrc} className="h-7 w-7" alt={step.label} /> : null}
                          </div>

                          <div className="min-w-0">
                            <p
                              className={`text-[11px] font-semibold uppercase tracking-wide ${connected ? 'theme-muted' : 'theme-muted'
                                }`}
                            >
                              {category}
                            </p>
                            <p className="mt-1 text-sm font-semibold leading-tight truncate theme-text">
                              {step.label}
                            </p>
                          </div>
                        </div>

                        <span
                          className="mt-1 h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: connected ? '#22c55e' : '#e5e7eb' }}
                        />
                      </div>

                      {connected ? (
                        <div className="mt-3 text-[11px] font-semibold">
                          {verifyStatus?.[step.provider]?.state === 'verified' ? (
                            <span className="text-emerald-600">Verified</span>
                          ) : verifyStatus?.[step.provider]?.state === 'failed' ? (
                            <span className="text-rose-600">Not verified</span>
                          ) : (
                            <span className="text-gray-500">Not verified</span>
                          )}
                          {verifyStatus?.[step.provider]?.testedAt ? (
                            <span className="ml-2 text-[10px] text-gray-400">{verifyStatus[step.provider].testedAt}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    [
      actionTarget,
      brandingTheme.mode,
      canManageIntegrations,
      canSeeSettings,
      handleConfigure,
      handleToggle,
      integrationLoading,
      integrationSteps,
      navigate,
      overviewSectionRefs.integrations,
      settingsSectionRefs.integrations,
    ]
  );

  const IntegrationChecklistWidgetSettings = useCallback(
    ({ containerRef }: { containerRef?: React.RefObject<HTMLDivElement> }) => (
      <div ref={containerRef ?? settingsSectionRefs.integrations} className={`${themePanelClass} shadow p-6 space-y-6 scroll-mt-28`}>
        <div className="flex flex-col gap-4">
          <SectionTitle title="Integration Checklist" subtitle="Connect data sources for real-time insights" />

          <div className="theme-panel-soft rounded-[26px] p-4 space-y-2 shadow-[0_10px_40px_-25px_rgba(249,115,22,0.8)]">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-semibold text-gray-900">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.15)]" />
                Connections in progress
              </div>
              <button
                type="button"
                className="text-[9px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                onClick={() => navigate(canManageIntegrations ? '/integrations' : '/dashboard')}
              >
                keep connection
              </button>
            </div>
            <div className="relative h-4 rounded-full bg-gray-100/90 border border-white shadow-inner overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, completionPercent)}%` }}
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-[9px] font-semibold text-orange-600">
                {completionPercent}%
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[9px] text-gray-500">
              <span className="font-semibold text-gray-800">
                You&apos;re {completedSteps} out of {integrationSteps.length} steps complete
              </span>
              <span className="text-orange-500">•</span>
              <span>Stay synced for accurate KPIs</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center gap-2"
              onClick={loadIntegrations}
              disabled={integrationLoading}
            >
              {integrationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>

          <div className="space-y-0">
            {integrationLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm">Loading integrations...</span>
              </div>
            ) : (
              integrationSteps.map((step) => (
                <div
                  key={step.id}
                  className="theme-panel flex flex-col gap-1.5 rounded-2xl px-4 py-4 md:flex-row md:items-center md:justify-between hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className={`${step.color} p-2 rounded-xl shadow-sm flex items-center justify-center`}>
                      <img
                        src={step.iconSlug ? `https://cdn.simpleicons.org/${step.iconSlug}/FFFFFF` : ''}
                        className="h-7 w-7"
                        alt={step.label}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-[1.05] m-1">{step.label}</p>
                      <p className="text-xs text-gray-500 leading-[1.05] m-1">{step.description}</p>
                      {step.integration?.lastSyncAt && (
                        <p className="text-xs text-gray-400 leading-[1.05] m-1">
                          Last sync · {new Date(step.integration.lastSyncAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium text-center whitespace-nowrap min-w-[100px] border ${step.status === 'connected'
                        ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                        : 'border-gray-200 text-gray-500 bg-gray-50'
                        }`}
                    >
                      {step.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </span>
                    <div className="flex flex-col gap-1 sm:flex-row">
                      {step.integration ? (
                        <button
                          className={`disconnect-btn min-w-[120px] rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${step.status === 'connected'
                            ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                            : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                            }`}
                          onClick={() => handleToggle(step.provider)}
                          disabled={actionTarget === step.provider}
                        >
                          {actionTarget === step.provider ? (
                            <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                          ) : step.status === 'connected' ? (
                            'Disconnect'
                          ) : (
                            'Activate'
                          )}
                        </button>
                      ) : (
                        <button
                          className={`disconnect-btn min-w-[120px] rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${step.status === 'connected'
                            ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                            : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                            }`}
                          onClick={() => handleConfigure(step.provider, step.label)}
                        >
                          {step.status === 'connected' ? 'Disconnect' : 'Configure'}
                        </button>
                      )}
                      <button
                        className="min-w-[120px] rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors dark-theme-hover open-data-btn"
                        onClick={() => handleConfigure(step.provider, step.label)}
                      >
                        {step.status === 'connected' ? 'Disconnect' : 'Open data setup'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    ),
    [
      actionTarget,
      completionPercent,
      completedSteps,
      canManageIntegrations,
      handleConfigure,
      handleToggle,
      integrationLoading,
      integrationSteps,
      loadIntegrations,
      navigate,
      settingsSectionRefs.integrations,
    ]
  );

  const ConnectionsInProgressWidget = useCallback(
    () => (
      <div className={`${themePanelClass} shadow p-6 space-y-6`}>
        <div className="flex flex-col gap-4">
          <SectionTitle title="Integration Checklist" subtitle="Connect data sources for real-time insights" />

          <div className="theme-panel-soft rounded-[26px] p-4 space-y-2 shadow-[0_10px_40px_-25px_rgba(249,115,22,0.8)]">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-semibold text-gray-900">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.15)]" />
                Connections in progress
              </div>
              <button
                type="button"
                className="text-[9px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                onClick={() => navigate(canManageIntegrations ? '/integrations' : '/dashboard')}
              >
                keep connection
              </button>
            </div>
            <div className="relative h-4 rounded-full bg-gray-100/90 border border-white shadow-inner overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, completionPercent)}%` }}
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-[9px] font-semibold text-orange-600">
                {completionPercent}%
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[9px] text-gray-500">
              <span className="font-semibold text-gray-800">
                You&apos;re {completedSteps} out of {integrationSteps.length} steps complete
              </span>
              <span className="text-orange-500">•</span>
              <span>Stay synced for accurate KPIs</span>
            </div>
          </div>
        </div>
      </div>
    ),
    [canManageIntegrations, completionPercent, completedSteps, integrationSteps.length, navigate]
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <OverviewSection
            // Logic Props
            data={overviewData}
            meta={overviewMeta}
            loading={overviewLoading}

            // UI/Theme Props
            themePanelClass={themePanelClass}
            themePanelCompactClass={themePanelCompactClass}
            overviewSectionRefs={overviewSectionRefs}

            // Components
            IntegrationChecklistWidget={IntegrationChecklistWidget}
            ConnectionsInProgressWidget={ConnectionsInProgressWidget}
            RealTimeCard={RealTimeCardWithRealtime}
            DonutChart={DonutChart}
            FunnelVisualizer={FunnelVisualizer}
            ConversionPlatformBars={ConversionPlatformBars}
            LtvComparisonChart={LtvComparisonChart}

            // Interaction Handlers
            compareMode={compareMode}
            selectedRange={selectedRange}
            setSelectedRange={setSelectedRange}
            setCompareMode={setCompareMode}
            selectedRealtimeId={selectedRealtimeId}
            setSelectedRealtimeId={setSelectedRealtimeId}
            openDownloadModal={openDownloadModal}
            handleConversionsPlatformDownload={handleConversionsPlatformDownload}
            handleActiveCampaignMonitorDownload={handleActiveCampaignMonitorDownload}

            // Legacy/Compatibility props
            conversionConnectionStatus={conversionConnectionStatus}
            hasConnectedConversionPlatform={hasConnectedConversionPlatform}
          />
        );
      case 'commerce':
        return (
          <CommerceSection
            themedSectionClass={themedSectionClass}
            themePanelClass={themePanelClass}
            commerceRealtime={Array.isArray(commerceData?.realtime) ? commerceData.realtime : []}
            RealTimeCard={RealTimeCardWithRealtime}
            ProfitabilityChart={ProfitabilityChart}
            commerceProfitability={Array.isArray(commerceData?.profitability) ? commerceData.profitability : []}
            CommerceFunnelChart={CommerceFunnelChart}
            commerceConversionFunnel={Array.isArray(commerceData?.funnel) ? commerceData.funnel : []}
            RevenueOrdersTrendChart={RevenueOrdersTrendChart}
            commerceRevenueTrend={Array.isArray(commerceData?.revenueTrend) ? commerceData.revenueTrend : []}
            productPerformance={Array.isArray(productPerformance) ? productPerformance : []}
            commerceCreatives={Array.isArray(commerceData?.creatives) ? commerceData.creatives : []}
            commerceProductVideos={Array.isArray(commerceData?.productVideos) ? commerceData.productVideos : []}
          />
        );
      case 'campaign':
        return (
          <div className="space-y-4">
            {campaignInsightsError ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">{campaignInsightsError}</div>
            ) : null}
            {campaignInsightsLoading ? (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">Loading campaigns...</div>
            ) : null}
            <CampaignSection
              themePanelClass={themePanelClass}
              campaignSectionRefs={campaignSectionRefs}
              RealTimeCard={RealTimeCardWithRealtime}
              realtimeModeEnabled={realtimeModeEnabled}
              handleRefresh={handleRefresh}
              filterOptions={filterOptions}
              campaignDateRange={campaignDateRange}
              campaignFilterOpen={campaignFilterOpen}
              setCampaignFilterOpen={setCampaignFilterOpen}
              setCampaignDateRange={(value) => setCampaignDateRange(value as DateRangeKey)}
              CampaignSourceTabs={CampaignSourceTabs}
              campaignSourceInsights={campaignInsights}
              conversionConnectionStatus={conversionConnectionStatus}
              brandingTheme={brandingTheme}
              openDownloadModal={openDownloadModal}
            />
          </div>
        );
      case 'crm':
        return (
          <CrmSection
            themedSectionClass={themedSectionClass}
            themePanelClass={themePanelClass}
            crmRealtime={crmRealtime}
            RealTimeCard={RealTimeCardWithRealtime}
            CrmStageChart={CrmStageChart}
            crmStages={crmStages}
            CrmAgeDonut={CrmAgeDonut}
            crmAgeRange={crmSegments}
            LeadTrackingTable={LeadTrackingTable}
            crmLeads={crmLeadRows}
          />
        );
      case 'trend':
        return (
          <TrendSection
            themedSectionClass={themedSectionClass}
            themePanelClass={themePanelClass}
            trendSectionRefs={trendSectionRefs}
            trendRealtime={Array.isArray(trendData?.trendRealtime) ? trendData.trendRealtime : []}
            RealTimeCard={RealTimeCardWithRealtime}
            ChannelComparisonChart={ChannelComparisonChart}
            trendRevenueByChannel={Array.isArray(trendData?.trendRevenueByChannel) ? trendData.trendRevenueByChannel : []}
            SalesFunnelChart={SalesFunnelChart}
            trendSalesFunnel={Array.isArray(trendData?.trendSalesFunnel) ? trendData.trendSalesFunnel : []}
            RevenueTrendChart={RevenueTrendChart}
            trendRevenueTrend={Array.isArray(trendData?.trendRevenueTrend) ? trendData.trendRevenueTrend : []}
            YtdRevenueCard={YtdRevenueCard}
            LeadSourceTable={LeadSourceTable}
            trendLeadSources={Array.isArray(trendData?.trendLeadSources) ? trendData.trendLeadSources : []}
            SalesRepTable={SalesRepTable}
            trendSalesReps={Array.isArray(trendData?.trendSalesReps) ? trendData.trendSalesReps : []}
          />
        );
      case 'seo':
        return (
          <SeoSection
            themeMode={brandingTheme.mode}
            seoSectionRefs={seoSectionRefs}
            themedSectionClass={themedSectionClass}
            themePanelClass={themePanelClass}
            filterOptions={filterOptions}
            seoDateRange={seoDateRange}
            handleRefresh={handleRefresh}
            seoFilterOpen={seoFilterOpen}
            setSeoFilterOpen={setSeoFilterOpen}
            setSeoDateRange={(value) => setSeoDateRange(value as DateRangeKey)}
            openDownloadModal={openDownloadModal}
            seoRealtimeStats={Array.isArray(seoData?.seoRealtimeStats) ? seoData.seoRealtimeStats : []}
            RealTimeCard={RealTimeCardWithRealtime}
            SeoAuthorityCard={SeoAuthorityCard}
            SeoOrganicSummaryCard={SeoOrganicSummaryCard}
            SearchVisibilityCard={SearchVisibilityCard}
            seoSnapshots={seoData?.seoSnapshots || { healthScore: 0, avgPosition: 0, organicSessions: 0, sessionTrend: [], keywords: [], channels: [] }}
            SeoConversionCard={SeoConversionCard}
            seoConversionSummary={seoData?.seoConversionSummary || { total: 0, goalName: 'SEO Conversions', delta: '—', breakdown: [] }}
            SeoIssuesCard={SeoIssuesCard}
            seoIssues={Array.isArray(seoData?.seoIssues) ? seoData.seoIssues : []}
            SeoKeywordsTable={SeoKeywordsTable}
            seoKeywordsDetailed={Array.isArray(seoData?.seoKeywordsDetailed) ? seoData.seoKeywordsDetailed : []}
            SeoCompetitorsCard={SeoCompetitorsCard}
            seoCompetitors={Array.isArray(seoData?.seoCompetitors) ? seoData.seoCompetitors : []}
            SeoPositionDistributionCard={SeoPositionDistributionCard}
            seoPositionDistribution={Array.isArray(seoData?.seoPositionDistribution) ? seoData.seoPositionDistribution : []}
            SeoBacklinkSummaryCard={SeoBacklinkSummaryCard}
            SeoCompetitiveMapCard={SeoCompetitiveMapCard}
            seoCompetitiveMap={Array.isArray(seoData?.seoCompetitiveMap) ? seoData.seoCompetitiveMap : []}
            SeoRegionalPerformanceCard={SeoRegionalPerformanceCard}
            seoRegionalPerformance={Array.isArray(seoData?.seoRegionalPerformance) ? seoData.seoRegionalPerformance : []}
            TechnicalScoreList={TechnicalScoreList}
            seoTechnicalScores={Array.isArray(seoData?.seoTechnicalScores) ? seoData.seoTechnicalScores : []}
            SeoChannelMix={SeoChannelMix}
            SeoRightRailCard={SeoRightRailCard}
            seoAuthorityScores={Array.isArray(seoData?.seoAuthorityScores) ? seoData.seoAuthorityScores : []}
            seoBacklinkHighlights={seoData?.seoBacklinkHighlights || { totalBacklinks: 0, referringDomains: 0, keywords: 0, trafficCost: '$0' }}
            seoOrganicSearch={seoData?.seoOrganicSearch || { keywords: 0, trafficCost: '$0', traffic: '0' }}
            seoAnchors={Array.isArray(seoData?.seoAnchors) ? seoData.seoAnchors : []}
            seoReferringDomains={Array.isArray(seoData?.seoReferringDomains) ? seoData.seoReferringDomains : []}
            seoRightRailStats={Array.isArray(seoData?.seoRightRailStats) ? seoData.seoRightRailStats : []}
            seoUrlRatings={Array.isArray(seoData?.seoUrlRatings) ? seoData.seoUrlRatings : []}
          />
        );
      case 'settings':
        return (
          <SettingsSection
            themePanelClass={themePanelClass}
            IntegrationChecklistWidgetSettings={IntegrationChecklistWidgetSettings}
            settingsSectionRefs={settingsSectionRefs}
            KpiSettingsTable={KpiSettingsTable}
            settingsData={settingsData}
            settingsLoading={settingsLoading}
            canManageIntegrations={canManageIntegrations}
            canManageAlerts={canManageAlerts}
            canManageUsers={canManageUsers}
            canManageBranding={canManageSystem || canManageTenants}
            handleUpdateKpi={handleUpdateKpi}
            handleAddKpi={handleAddKpi}
            handleRemoveKpi={handleRemoveKpi}
            platformOptions={platformOptions}
            ThemeBrandingCard={ThemeBrandingCard}
            applyTheme={applyTheme}
            handleMenuChange={handleMenuChange}
            handleResetBranding={handleResetBranding}
            DataRefreshCard={DataRefreshCard}
            handleRefreshChange={handleRefreshChange}
            handleRefresh={handleRefresh}
            UserRolesCard={UserRolesCard}
            AlertSettingsCard={AlertSettingsCard}
            brandingTheme={brandingTheme}
            handleAlertToggle={handleAlertToggle}
            handleAlertAddRecipient={handleAlertAddRecipient}
            handleAlertRemoveRecipient={handleAlertRemoveRecipient}
            defaultRecipientEmail={defaultRecipientEmail}
          />
        );
      case 'reports':
        return (
          <ReportsSection
            themedSectionClass={themedSectionClass}
            mockReportBuilders={reportBuilders}
            ScheduleReportCard={ScheduleReportCardWithApi}
            ReportStatusTable={() => (
              <div>
                {reportsError ? (
                  <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">{reportsError}</div>
                ) : null}
                {reportsLoading ? (
                  <div className="mb-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">Loading reports...</div>
                ) : null}
                <ReportStatusTable rows={reportStatusRows} />
              </div>
            )}
            settingsData={settingsData}
            platformOptions={platformOptions}
          />
        );
      default:
        return null;
    }
  };

  if (isBlockingLoading) {
    return (
      <div
        className="flex items-center justify-center h-screen dashboard-theme"
        style={{ backgroundColor: brandingTheme.background }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <>
      <DashboardShell
        title={undefined}
        subtitle={undefined}
        roleLabel={undefined}
        menuItems={menuItems}
        bottomMenuItems={bottomMenuItems}
        theme={brandingTheme}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canSeeAdminActions ? (
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-4 w-4" /> Refresh data
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            ) : null}
            <div className="relative">
              <button
                className="inline-flex items-center px-4 py-2 rounded-full bg-white shadow-md text-sm font-medium text-gray-800 hover:shadow-lg transition"
                onClick={() => setGlobalFilterOpen((prev) => !prev)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {filterOptions.find((option) => option.key === globalDateRange)?.label || 'Filter'}
              </button>
              {globalFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-3xl shadow-2xl z-30 theme-panel-soft p-3 space-y-2">
                  {filterOptions.map((option) => {
                    const isActive = globalDateRange === option.key;
                    return (
                      <button
                        key={option.key}
                        onClick={() => {
                          setGlobalDateRange(option.key);
                          setGlobalFilterOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors theme-text"
                        style={
                          isActive
                            ? { backgroundColor: 'var(--accent-color)', color: '#ffffff' }
                            : undefined
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-3 text-gray-700 shadow-sm hover:shadow-md transition"
                onClick={() => setCalendarOpen((prev) => !prev)}
                aria-label="Open calendar"
              >
                <Calendar className="h-5 w-5" />
              </button>
              {calendarOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-3xl shadow-2xl space-y-4 z-30 theme-panel-soft p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold theme-text">Select date range</p>
                    <button
                      className="text-xs theme-muted hover:opacity-80"
                      onClick={() => setCalendarOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] uppercase theme-muted">From</label>
                      <div className="relative mt-1">
                        <input
                          type="date"
                          value={calendarSelection.start}
                          onChange={(event) =>
                            setCalendarSelection((prev) => ({ ...prev, start: event.target.value }))
                          }
                          className="date-input w-full rounded-xl px-3 py-2 pr-10 text-sm"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            border: '1px solid var(--theme-border)',
                            color: 'var(--theme-text)',
                          }}
                        />
                        <Calendar
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 cursor-pointer"
                          style={{ color: '#ffffff' }}
                          onClick={(event) => {
                            const input = event.currentTarget.previousElementSibling as HTMLInputElement | null;
                            if (input) {
                              const picker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker;
                              if (typeof picker === 'function') {
                                picker();
                                return;
                              }
                              input.focus();
                              input.click();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase theme-muted">To</label>
                      <div className="relative mt-1">
                        <input
                          type="date"
                          value={calendarSelection.end}
                          onChange={(event) =>
                            setCalendarSelection((prev) => ({ ...prev, end: event.target.value }))
                          }
                          className="date-input w-full rounded-xl px-3 py-2 pr-10 text-sm"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            border: '1px solid var(--theme-border)',
                            color: 'var(--theme-text)',
                          }}
                        />
                        <Calendar
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 cursor-pointer"
                          style={{ color: '#ffffff' }}
                          onClick={(event) => {
                            const input = event.currentTarget.previousElementSibling as HTMLInputElement | null;
                            if (input) {
                              const picker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker;
                              if (typeof picker === 'function') {
                                picker();
                                return;
                              }
                              input.focus();
                              input.click();
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {calendarSelection.start && calendarSelection.end ? (
                    <p className="text-xs theme-muted">
                      Showing data for {format(new Date(calendarSelection.start), 'dd MMM yyyy')} –{' '}
                      {format(new Date(calendarSelection.end), 'dd MMM yyyy')}
                    </p>
                  ) : (
                    <p className="text-xs theme-muted">Select a start and end date to filter dashboard metrics.</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      className="text-xs font-semibold theme-muted hover:opacity-80"
                      onClick={() => {
                        setCalendarSelection({ start: '', end: '' });
                        setCalendarOpen(false);
                      }}
                    >
                      Clear
                    </button>
                    <button
                      className="rounded-full text-base font-bold px-6 py-3"
                      style={{ backgroundColor: 'var(--accent-color)', color: '#ffffff' }}
                      onClick={() => setCalendarOpen(false)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
            <NotificationCenter notifications={notifications} loading={loadingNotifications} error={notificationError} />
          </div>
        }
        onLogout={onLogout}
        onProfileClick={() => navigate('/profile')}
      >
        {(metricsError || campaignsError) && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">โหลดข้อมูลบางส่วนไม่สำเร็จ</p>
                {metricsError && <p className="text-xs text-amber-800">Metrics: {metricsError}</p>}
                {campaignsError && <p className="text-xs text-amber-800">Campaigns: {campaignsError}</p>}
              </div>
            </div>
          </div>
        )}
        {currentUser?.role === 'admintest' && adminTestTrial && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">บัญชี Admin Test (ทดลองใช้งาน)</p>
                  {adminTestTrial.expired ? (
                    <p className="text-sm">หมดอายุแล้ว</p>
                  ) : (
                    <p className="text-sm">
                      {typeof adminTestTrial.remainingDays === 'number' ? (
                        <>
                          เหลือเวลาใช้งานอีก <span className="font-semibold">{adminTestTrial.remainingDays}</span> วัน
                        </>
                      ) : (
                        'สถานะการทดลองใช้งานไม่พร้อมใช้งาน'
                      )}
                    </p>
                  )}
                  {adminTestTrial.expiresAtText ? (
                    <p className="text-xs text-amber-700">หมดอายุวันที่ {adminTestTrial.expiresAtText}</p>
                  ) : null}
                  {adminTestTrial.startedAtText ? (
                    <p className="text-xs text-amber-700">เริ่มนับจากวันที่สมัคร {adminTestTrial.startedAtText}</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200/60 bg-white/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-amber-900">
                    เช็คลิสการเชื่อมต่อ ({completedSteps}/{integrationSteps.length})
                  </div>
                  <button
                    type="button"
                    className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                    onClick={() => navigate('/integrations')}
                  >
                    ไปเชื่อมต่อ
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {integrationSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between rounded-xl border border-amber-100 bg-white px-3 py-2"
                    >
                      <span className="text-[11px] font-semibold text-gray-900">{step.label}</span>
                      {step.status === 'connected' ? (
                        <span className="text-[10px] font-semibold">
                          {verifyStatus?.[step.provider]?.state === 'verified' ? (
                            <span className="text-emerald-600">Verified</span>
                          ) : verifyStatus?.[step.provider]?.state === 'failed' ? (
                            <span className="text-rose-600">Not verified</span>
                          ) : (
                            <span className="text-amber-700">Not verified</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-700">ยังไม่เชื่อม</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {renderSection()}
      </DashboardShell>
      <AI />
      <DownloadOptionsModal
        open={downloadModal.open}
        section={downloadModal.section}
        options={downloadOptions}
        onClose={closeDownloadModal}
        onSelectOption={handleDownloadOption}
      />
    </>
  );
};

// FLOW END: Dashboard Page (EN)
// จุดสิ้นสุด: หน้า Dashboard (TH)

export default Dashboard;
