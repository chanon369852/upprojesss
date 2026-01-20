export type DashboardSettingsData = {
  shortcuts: Array<{ id: string; title: string; description: string }>;
  kpis: Array<{
    id: string;
    alertName: string;
    metric: string;
    condition: string;
    threshold: string;
    status: string;
    platform: string;
  }>;
  branding: {
    theme: 'Light' | 'Dark';
    menuColor: string;
    accentColor: string;
    companyName: string;
  };
  refresh: {
    manual: boolean;
    realtime: boolean;
    frequency: string;
  };
  integrations: Array<{ id: string; name: string; status: string; connected: boolean }>;
  users: Array<{ id: string; name: string; email: string; role: string }>;
  alerts: {
    alertTypes: Array<{ label: string; enabled: boolean }>;
    deliveryChannels: Array<{ label: string; enabled: boolean }>;
    recipients: string[];
  };
};

 export const dashboardDefaultSettings: DashboardSettingsData = {
  shortcuts: [],
  kpis: [],
  branding: {
    theme: 'Light',
    menuColor: '#DDD6FE',
    accentColor: '#3730A3',
    companyName: '',
  },
  refresh: {
    manual: true,
    realtime: true,
    frequency: 'Every 5 minutes',
  },
  integrations: [],
  users: [],
  alerts: {
    alertTypes: [],
    deliveryChannels: [],
    recipients: [],
  },
};

export const KPI_ALERT_MENU_OPTIONS = [
  'Overview Dashboard',
  'Campaign Performance',
  'SEO & Web Analytics',
  'E-commerce Insights',
  'CRM & Leads',
  'Trend Analysis & History',
];

export const KPI_CONDITION_OPTIONS = ['Increase', 'Decrease'] as const;

export const KPI_METRIC_OPTIONS: Record<string, string[]> = {
  'Overview Dashboard': ['Financial Overview', 'Total Revenue', 'Total Conversions', 'Avg. ROI'],
  'Campaign Performance': ['Spend', 'Conversions', 'CPA', 'ROAS'],
  'SEO & Web Analytics': ['Sessions', 'Users', 'Conversions', 'Revenue'],
  'E-commerce Insights': ['Orders', 'Revenue', 'AOV', 'Conversion Rate'],
  'CRM & Leads': ['New Leads', 'Qualified Leads', 'Conversion Rate'],
  'Trend Analysis & History': ['Spend vs Revenue', 'Leads Conversion'],
};

export const KPI_METRIC_SUMMARY: Record<
  string,
  { threshold: string; status: string; condition?: (typeof KPI_CONDITION_OPTIONS)[number] }
> = {
  'Financial Overview': { threshold: '5', status: 'active', condition: 'Increase' },
  'Total Revenue': { threshold: '10', status: 'active', condition: 'Increase' },
  'Total Conversions': { threshold: '8', status: 'active', condition: 'Increase' },
  'Avg. ROI': { threshold: '6', status: 'active', condition: 'Increase' },
  Spend: { threshold: '12', status: 'active', condition: 'Increase' },
  Conversions: { threshold: '8', status: 'active', condition: 'Increase' },
  CPA: { threshold: '10', status: 'active', condition: 'Decrease' },
  ROAS: { threshold: '9', status: 'active', condition: 'Increase' },
  Sessions: { threshold: '7', status: 'active', condition: 'Increase' },
  Users: { threshold: '5', status: 'active', condition: 'Increase' },
  Revenue: { threshold: '10', status: 'active', condition: 'Increase' },
  Orders: { threshold: '8', status: 'active', condition: 'Increase' },
  AOV: { threshold: '4', status: 'active', condition: 'Increase' },
  'Conversion Rate': { threshold: '3', status: 'active', condition: 'Increase' },
  'New Leads': { threshold: '6', status: 'active', condition: 'Increase' },
  'Qualified Leads': { threshold: '4', status: 'active', condition: 'Increase' },
  'Spend vs Revenue': { threshold: '10', status: 'active', condition: 'Increase' },
  'Leads Conversion': { threshold: '7', status: 'active', condition: 'Increase' },
};
