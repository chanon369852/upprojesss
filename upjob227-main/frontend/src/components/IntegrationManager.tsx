import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Facebook, 
  Search, 
  MessageCircle, 
  Music, 
  ShoppingBag,
  Plus,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Clock,
  Activity
} from 'lucide-react';
import { 
  getIntegrations, 
  getAllData,
  syncIntegration, 
  testIntegration, 
  syncAllIntegrations,
  startPlatformOAuth
} from '../services/api';
import { useNavigate } from 'react-router-dom';

interface Integration {
  id: string;
  provider: string;
  name: string;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
}

interface IntegrationData {
  facebook?: {
    campaigns?: any[];
    insights?: any[];
  };
  googleads?: {
    campaigns?: any[];
    insights?: any[];
  };
  line?: {
    userStats?: {
      total: number;
      active: number;
    };
    messageStats?: any[];
  };
  tiktok?: {
    campaigns?: any[];
    insights?: any[];
  };
  shopee?: {
    orders?: any[];
    products?: any[];
    shopMetrics?: any;
  };
}

const providerIcons = {
  facebook: Facebook,
  googleads: Search,
  google_ads: Search,
  ga4: Activity,
  line: MessageCircle,
  line_ads: MessageCircle,
  tiktok: () => <img src="https://cdn.simpleicons.org/tiktok/FFFFFF" className="h-6 w-6" alt="TikTok" />,
  shopee: ShoppingBag,
  lazada: ShoppingBag,
  google_search_console: Search,
};

const providerColors = {
  facebook: 'bg-blue-500',
  googleads: 'bg-green-500',
  google_ads: 'bg-green-500',
  ga4: 'bg-slate-700',
  line: 'bg-green-600',
  line_ads: 'bg-green-600',
  tiktok: 'bg-black',
  shopee: 'bg-orange-500',
  lazada: 'bg-orange-500',
  google_search_console: 'bg-slate-700',
};

// FLOW START: Integrations Page (EN)
// จุดเริ่มต้น: หน้า Integrations (TH)

const IntegrationManager: React.FC = () => {
  const navigate = useNavigate();
  const isMvpMode = process.env.REACT_APP_MVP_MODE === 'true';
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [data, setData] = useState<IntegrationData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('integrations');
  const [syncingAll, setSyncingAll] = useState(false);
  const [oauthPrompt, setOauthPrompt] = useState<null | {
    provider: 'google' | 'facebook' | 'line' | 'tiktok' | 'shopee';
    title: string;
    description: string;
  }>(null);
  const [oauthStarting, setOauthStarting] = useState(false);

  const normalizeProviderKey = (raw: string): 'google' | 'facebook' | 'line' | 'tiktok' | 'shopee' | string => {
    const key = String(raw || '').trim().toLowerCase();
    if (['google', 'googleads', 'google_ads', 'google ads'].includes(key)) return 'google';
    if (['facebook', 'meta', 'meta_ads', 'facebook_ads', 'facebook ads'].includes(key)) return 'facebook';
    if (['line', 'line_ads', 'lineads', 'line oa'].includes(key)) return 'line';
    if (['tiktok', 'tiktok ads'].includes(key)) return 'tiktok';
    if (['shopee'].includes(key)) return 'shopee';
    return key;
  };

  const isMvpProvider = (provider: string) => {
    if (!isMvpMode) return true;
    return normalizeProviderKey(provider) === 'google';
  };

  const getIntegrationIdForProvider = (provider: string): string | null => {
    const key = normalizeProviderKey(provider);
    const match = integrations.find((i) => normalizeProviderKey(i.provider) === key);
    return match?.id || null;
  };

  const openOAuthPrompt = (provider: 'google' | 'facebook' | 'line' | 'tiktok' | 'shopee') => {
    const copy: Record<typeof provider, { title: string; description: string }> = {
      google: {
        title: 'เชื่อมต่อ Google',
        description:
          'ระบบจะขอสิทธิ์เข้าถึงข้อมูลโฆษณาและ Analytics\n' +
          'เพื่อดึงข้อมูลแคมเปญ, ค่าใช้จ่าย และผลลัพธ์\n\n' +
          '✅ ไม่สามารถแก้ไขโฆษณาได้\n' +
          '✅ ใช้เพื่อแสดงผลใน Dashboard เท่านั้น',
      },
      facebook: {
        title: 'เชื่อมต่อ Facebook Ads',
        description:
          'ระบบจะเข้าถึงข้อมูลโฆษณา\n' +
          'เช่น impressions, clicks, spend\n\n' +
          '❌ ไม่มีสิทธิ์โพสต์หรือแก้ไขเพจ',
      },
      line: {
        title: 'เชื่อมต่อ LINE OA',
        description:
          'ใช้สำหรับรับข้อมูลข้อความ\n' +
          'และสถิติการใช้งาน LINE OA\n\n' +
          '❌ ระบบจะไม่อ่านข้อความส่วนตัว',
      },
      tiktok: {
        title: 'เชื่อมต่อ TikTok Ads',
        description:
          'ระบบจะดึงข้อมูลแคมเปญ\n' +
          'และผลลัพธ์โฆษณา\n\n' +
          'ใช้สำหรับวิเคราะห์เท่านั้น',
      },
      shopee: {
        title: 'เชื่อมต่อ Shopee',
        description:
          'ระบบจะดึงข้อมูลคำสั่งซื้อ\n' +
          'และยอดขายเพื่อแสดงใน Dashboard\n\n' +
          '❌ ไม่สามารถจัดการร้านแทนคุณได้',
      },
    };

    setOauthPrompt({ provider, ...copy[provider] });
  };

  const startOAuthFlow = async () => {
    if (!oauthPrompt) return;
    try {
      setOauthStarting(true);
      setError(null);

      const integrationId = getIntegrationIdForProvider(oauthPrompt.provider);
      if (!integrationId) {
        setError('Integration record not found. Please add integration first.');
        navigate('/integrations');
        return;
      }

      const redirectUri = `${window.location.origin}/integrations`;
      const { authorizeUrl } = await startPlatformOAuth(integrationId, redirectUri);
      window.location.href = authorizeUrl;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to start OAuth');
    } finally {
      setOauthStarting(false);
      setOauthPrompt(null);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setError(null);
      const rows = await getIntegrations();
      setIntegrations(Array.isArray(rows) ? (rows as any) : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setError(null);
      const all = await getAllData();
      setData(all || {});
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch data');
    }
  };

  const handleSync = async (id: string) => {
    try {
      setError(null);
      await syncIntegration(id);
      fetchIntegrations();
      fetchAllData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to sync integration');
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      setError(null);
      await syncAllIntegrations();
      fetchIntegrations();
      fetchAllData();
    } catch (err) {
      setError('Failed to sync all integrations');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleTest = async (id: string) => {
    try {
      setError(null);
      const result = await testIntegration(id);
      if (result?.ok) {
        alert('Integration verified');
      } else {
        alert(result?.message || 'Integration verification failed');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to test integration');
    }
  };

  const getStatusIcon = (isActive: boolean) => {
    if (isActive) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    }
    return <Badge variant="destructive">Inactive</Badge>;
  };

  const renderIntegrationCard = (integration: Integration) => {
    const Icon = (providerIcons as any)[integration.provider] || Activity;
    const color = (providerColors as any)[integration.provider] || 'bg-gray-500';

    return (
      <Card key={integration.id} className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-full ${color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                {integration.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {integration.provider}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(integration.isActive)}
            {getStatusIcon(integration.isActive)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {integration.lastSyncAt 
                ? `Last sync: ${new Date(integration.lastSyncAt).toLocaleString()}`
                : 'Never synced'
              }
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => openOAuthPrompt(normalizeProviderKey(integration.provider) as any)}
              >
                Connect (OAuth)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTest(integration.id)}
              >
                Test
              </Button>
              <Button
                size="sm"
                onClick={() => handleSync(integration.id)}
                disabled={!integration.isActive}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync
              </Button>
              <Button size="sm" variant="outline">
                <Settings className="h-3 w-3 mr-1" />
                Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDataOverview = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(data).map(([provider, providerData]) => {
          const Icon = (providerIcons as any)[provider] || Activity;
          const color = (providerColors as any)[provider] || 'bg-gray-500';

          return (
            <Card key={provider}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-full ${color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="text-sm font-medium capitalize">
                    {provider}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {provider === 'facebook' && (
                    <>
                      <div className="text-xs">
                        Campaigns: {providerData.campaigns?.length || 0}
                      </div>
                      <div className="text-xs">
                        Insights: {providerData.insights?.length || 0}
                      </div>
                    </>
                  )}
                  {provider === 'googleads' && (
                    <>
                      <div className="text-xs">
                        Campaigns: {providerData.campaigns?.length || 0}
                      </div>
                      <div className="text-xs">
                        Insights: {providerData.insights?.length || 0}
                      </div>
                    </>
                  )}
                  {provider === 'line' && (
                    <>
                      <div className="text-xs">
                        Total Users: {providerData.userStats?.total || 0}
                      </div>
                      <div className="text-xs">
                        Active Users: {providerData.userStats?.active || 0}
                      </div>
                    </>
                  )}
                  {provider === 'tiktok' && (
                    <>
                      <div className="text-xs">
                        Campaigns: {providerData.campaigns?.length || 0}
                      </div>
                      <div className="text-xs">
                        Insights: {providerData.insights?.length || 0}
                      </div>
                    </>
                  )}
                  {provider === 'shopee' && (
                    <>
                      <div className="text-xs">
                        Orders: {providerData.orders?.length || 0}
                      </div>
                      <div className="text-xs">
                        Products: {providerData.products?.length || 0}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div
      className="min-h-screen bg-[#fdf6f0] text-gray-800"
      style={
        {
          ['--theme-background' as any]: '#ffffff',
          ['--theme-surface' as any]: '#ffffff',
          ['--surface-muted' as any]: '#fff7ed',
          ['--theme-text' as any]: '#1f232c',
          ['--theme-muted' as any]: '#6b7280',
          ['--theme-border' as any]: 'rgba(15, 23, 42, 0.08)',
          ['--accent-color' as any]: '#3b82f6',
        } as React.CSSProperties
      }
    >
      {oauthPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{oauthPrompt.title}</CardTitle>
              <CardDescription style={{ whiteSpace: 'pre-line' }}>{oauthPrompt.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOauthPrompt(null)} disabled={oauthStarting}>
                Cancel
              </Button>
              <Button onClick={startOAuthFlow} disabled={oauthStarting}>
                {oauthStarting ? 'Starting…' : 'เชื่อมต่อ'}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Integration Manager</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/api-setup')}
            >
              API Setup
            </Button>
            <Button onClick={handleSyncAll} variant="outline" disabled={syncingAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {syncingAll ? 'Syncing...' : 'Sync All'}
            </Button>
            <Button onClick={() => navigate('/api-setup')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {(
            [
              { provider: 'google' as const, label: 'Google', icon: Search },
              { provider: 'facebook' as const, label: 'Facebook (Meta)', icon: Facebook },
              { provider: 'line' as const, label: 'LINE OA', icon: MessageCircle },
              { provider: 'tiktok' as const, label: 'TikTok Ads', icon: Music },
              { provider: 'shopee' as const, label: 'Shopee', icon: ShoppingBag },
            ]
          )
            .filter((p) => (isMvpMode ? p.provider === 'google' : true))
            .map((p) => {
            const id = getIntegrationIdForProvider(p.provider);
            const connected = Boolean(integrations.find((i) => normalizeProviderKey(i.provider) === p.provider)?.isActive);
            const Icon = p.icon;
            return (
              <button
                key={p.provider}
                type="button"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left hover:shadow-sm transition"
                onClick={() => {
                  if (!id) {
                    try {
                      window.localStorage.setItem('api_setup_provider', p.provider === 'google' ? 'googleads' : p.provider);
                    } catch {
                      // ignore
                    }
                    navigate('/api-setup');
                    return;
                  }
                  openOAuthPrompt(p.provider);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{p.label}</div>
                      <div className="text-[11px] text-gray-500 truncate">{id ? 'Connect (OAuth)' : 'Setup API keys first'}</div>
                    </div>
                  </div>
                  <Badge variant={connected ? 'default' : 'outline'} className={connected ? 'bg-green-500' : ''}>
                    {connected ? 'Connected' : 'Not connected'}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>

      {error && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="data">Data Overview</TabsTrigger>
          </TabsList>
        
        <TabsContent value="integrations" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-muted-foreground mb-4">
                  No integrations configured
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            integrations.filter((row) => isMvpProvider(row.provider)).map(renderIntegrationCard)
          )}
        </TabsContent>
        
        <TabsContent value="data" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Data Overview</h2>
            <Button onClick={fetchAllData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
          {Object.keys(data).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-muted-foreground mb-4">
                  No data available
                </div>
                <Button onClick={fetchAllData} variant="outline">
                  Fetch Data
                </Button>
              </CardContent>
            </Card>
          ) : (
            (isMvpMode
              ? (() => {
                  const filtered = Object.fromEntries(Object.entries(data).filter(([provider]) => isMvpProvider(provider)));
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(filtered).map(([provider, providerData]) => {
                        const Icon = (providerIcons as any)[provider] || Activity;
                        const color = (providerColors as any)[provider] || 'bg-gray-500';

                        return (
                          <Card key={provider}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <div className="flex items-center space-x-2">
                                <div className={`p-2 rounded-full ${color}`}>
                                  <Icon className="h-4 w-4 text-white" />
                                </div>
                                <CardTitle className="text-sm font-medium capitalize">{provider}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-1">
                                {provider === 'googleads' && (
                                  <>
                                    <div className="text-xs">Campaigns: {(providerData as any).campaigns?.length || 0}</div>
                                    <div className="text-xs">Insights: {(providerData as any).insights?.length || 0}</div>
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })()
              : renderDataOverview())
          )}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// FLOW END: Integrations Page (EN)
// จุดสิ้นสุด: หน้า Integrations (TH)

export default IntegrationManager;
