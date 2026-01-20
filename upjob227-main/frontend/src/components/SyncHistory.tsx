import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  RefreshCw, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { exportHistoryCsv, getHistory, getSyncHistory } from '../services/api';
import { AuditLog, SyncHistory as SyncHistoryType, type HistoryScope } from '../types/api';
import { getStoredRole, hasPermission, PERMISSIONS } from '../lib/rbac';

// FLOW START: History Page (EN)
// จุดเริ่มต้น: หน้า History / Sync History (TH)

const SyncHistory: React.FC = () => {
  const role = getStoredRole();
  const canViewSystemHistory = hasPermission(role, PERMISSIONS.view_system_history);
  const canViewAdminHistory = hasPermission(role, PERMISSIONS.view_admin_history);
  const canViewUserHistory = hasPermission(role, PERMISSIONS.view_user_history);
  const canExportLogs = hasPermission(role, PERMISSIONS.export_logs);
  const canManageIntegrations = hasPermission(role, PERMISSIONS.manage_integrations);

  const defaultScope: HistoryScope = canViewSystemHistory
    ? 'system'
    : canViewAdminHistory
      ? 'admin'
      : canViewUserHistory
        ? 'users'
        : 'me';

  const [scope, setScope] = useState<HistoryScope>(defaultScope);
  const [auditItems, setAuditItems] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilters, setAuditFilters] = useState({
    action: '',
    entityType: '',
    userId: '',
    limit: 50,
    offset: 0,
  });

  const [histories, setHistories] = useState<SyncHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [draftFilters, setDraftFilters] = useState({
    platform: '',
    status: '',
    limit: 50,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    platform: '',
    status: '',
    limit: 50,
    offset: 0,
  });

  const loadAudit = useCallback(async () => {
    try {
      setAuditLoading(true);
      setAuditError(null);
      const res = await getHistory(scope, {
        action: auditFilters.action || undefined,
        entityType: auditFilters.entityType || undefined,
        userId: auditFilters.userId || undefined,
        limit: auditFilters.limit,
        offset: auditFilters.offset,
      });
      setAuditItems(res.items);
      setAuditTotal(res.total);
    } catch (e: any) {
      setAuditError(e?.response?.data?.message || 'Failed to load history');
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilters.action, auditFilters.entityType, auditFilters.limit, auditFilters.offset, auditFilters.userId, scope]);

  const loadHistories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSyncHistory(appliedFilters);
      setHistories(response.histories);
      setTotal(response.total);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load sync history');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  useEffect(() => {
    if (!canManageIntegrations) return;
    loadHistories();
  }, [canManageIntegrations, loadHistories]);

  const canGoPrev = appliedFilters.offset > 0;
  const canGoNext = appliedFilters.offset + appliedFilters.limit < total;
  const currentStart = total === 0 ? 0 : appliedFilters.offset + 1;
  const currentEnd = Math.min(appliedFilters.offset + appliedFilters.limit, total);

  const getPlatformColor = (platform: string) => {
    const colors = {
      facebook: 'bg-blue-100 text-blue-800',
      googleads: 'bg-green-100 text-green-800',
      line: 'bg-green-100 text-green-800',
      tiktok: 'bg-black text-white',
      shopee: 'bg-orange-100 text-orange-800'
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (syncedAt: string) => {
    const now = new Date();
    const syncTime = new Date(syncedAt);
    const diffMs = now.getTime() - syncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  if (auditLoading && (!canManageIntegrations || loading)) {
    return (
      <div
        className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800"
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
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 text-gray-700">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Loading history...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800"
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
      <div className="max-w-6xl mx-auto space-y-6">
        {canManageIntegrations && (
          <>
            {loading ? (
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 text-gray-700">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Loading sync history...</span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-gray-900">Sync History</h2>
                    <p className="text-sm text-gray-500">Review sync runs across platforms, filter by status, and inspect errors.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={loadHistories} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Filters</CardTitle>
                    <CardDescription>Adjust filters then apply to refresh results.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <label className="space-y-2 text-sm text-gray-700">
                        Platform
                        <select
                          value={draftFilters.platform}
                          onChange={(e) => setDraftFilters((prev) => ({ ...prev, platform: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Platforms</option>
                          <option value="facebook">Facebook</option>
                          <option value="googleads">Google Ads</option>
                          <option value="line">LINE</option>
                          <option value="tiktok">TikTok</option>
                          <option value="shopee">Shopee</option>
                        </select>
                      </label>

                      <label className="space-y-2 text-sm text-gray-700">
                        Status
                        <select
                          value={draftFilters.status}
                          onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Status</option>
                          <option value="success">Success</option>
                          <option value="error">Error</option>
                          <option value="pending">Pending</option>
                        </select>
                      </label>

                      <label className="space-y-2 text-sm text-gray-700">
                        Page size
                        <select
                          value={draftFilters.limit}
                          onChange={(e) => setDraftFilters((prev) => ({ ...prev, limit: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                        </select>
                      </label>

                      <div className="flex items-end gap-2">
                        <Button
                          onClick={() =>
                            setAppliedFilters((prev) => ({
                              ...prev,
                              platform: draftFilters.platform,
                              status: draftFilters.status,
                              limit: draftFilters.limit,
                              offset: 0,
                            }))
                          }
                          className="w-full"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="text-sm text-gray-500">
                        Showing <span className="font-medium text-gray-700">{currentStart}</span>–<span className="font-medium text-gray-700">{currentEnd}</span> of{' '}
                        <span className="font-medium text-gray-700">{total}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAppliedFilters((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                          disabled={!canGoPrev}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Prev
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAppliedFilters((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
                          disabled={!canGoNext}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {histories.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-10">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No sync history found</p>
                        <p className="text-sm text-gray-500 mt-1">Try adjusting filters or refreshing.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    histories.map((history) => (
                      <Card key={history.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {getStatusIcon(history.status)}
                                <Badge className={getPlatformColor(history.platform)}>{history.platform}</Badge>
                                <Badge className={getStatusColor(history.status)}>{history.status}</Badge>
                                <div className="flex items-center text-sm text-gray-500">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {formatDuration(history.syncedAt)}
                                </div>
                              </div>

                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Sync Time:</span> {formatDate(history.syncedAt)}
                              </div>

                              {history.error && (
                                <div className="mt-2">
                                  <div className="text-sm font-medium text-red-700 mb-1">Error</div>
                                  <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                                    <p className="text-sm text-red-800 whitespace-pre-wrap">{history.error}</p>
                                  </div>
                                </div>
                              )}

                              {history.data && (
                                <div className="mt-2">
                                  <details className="cursor-pointer">
                                    <summary className="text-sm text-blue-600 hover:text-blue-800">View sync data</summary>
                                    <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-auto max-h-40 mt-2">
                                      {JSON.stringify(history.data, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">History</h2>
            <p className="text-sm text-gray-500">Review audit logs and exports based on your access level.</p>
          </div>
          <div className="flex items-center gap-2">
            {canExportLogs && (
              <Button
                onClick={() => exportHistoryCsv({
                  scope,
                  action: auditFilters.action || undefined,
                  entityType: auditFilters.entityType || undefined,
                  userId: auditFilters.userId || undefined,
                })}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
            <Button onClick={loadAudit} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {auditError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{auditError}</AlertDescription>
          </Alert>
        )}

        <Tabs value={scope} onValueChange={(v) => {
          setAuditFilters((prev) => ({ ...prev, offset: 0 }));
          setScope(v as HistoryScope);
        }}>
          <TabsList>
            {canViewSystemHistory && <TabsTrigger value="system">System</TabsTrigger>}
            {canViewAdminHistory && <TabsTrigger value="admin">Admin</TabsTrigger>}
            {canViewUserHistory && <TabsTrigger value="users">Users</TabsTrigger>}
            <TabsTrigger value="me">Me</TabsTrigger>
          </TabsList>

          <TabsContent value={scope}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
                <CardDescription>Filter audit logs and paginate results.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <label className="space-y-2 text-sm text-gray-700">
                    Action
                    <input
                      value={auditFilters.action}
                      onChange={(e) => setAuditFilters((prev) => ({ ...prev, action: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. login"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-gray-700">
                    Entity type
                    <input
                      value={auditFilters.entityType}
                      onChange={(e) => setAuditFilters((prev) => ({ ...prev, entityType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. integration"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-gray-700">
                    User ID
                    <input
                      value={auditFilters.userId}
                      onChange={(e) => setAuditFilters((prev) => ({ ...prev, userId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="optional"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-gray-700">
                    Page size
                    <select
                      value={auditFilters.limit}
                      onChange={(e) => setAuditFilters((prev) => ({ ...prev, limit: parseInt(e.target.value), offset: 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                      <option value={200}>200 per page</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-gray-500">
                    Showing <span className="font-medium text-gray-700">{auditTotal === 0 ? 0 : auditFilters.offset + 1}</span>–
                    <span className="font-medium text-gray-700">{Math.min(auditFilters.offset + auditFilters.limit, auditTotal)}</span> of{' '}
                    <span className="font-medium text-gray-700">{auditTotal}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAuditFilters((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                      disabled={auditFilters.offset <= 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAuditFilters((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
                      disabled={auditFilters.offset + auditFilters.limit >= auditTotal}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 mt-6">
              {auditItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-10">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No history found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting filters or refreshing.</p>
                  </CardContent>
                </Card>
              ) : (
                auditItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-slate-100 text-slate-700">{item.action}</Badge>
                          {item.entityType && <Badge variant="outline">{item.entityType}</Badge>}
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(item.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">User:</span> {item.userId || '—'}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Tenant:</span> {item.tenantId}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
};

// FLOW END: History Page (EN)
// จุดสิ้นสุด: หน้า History / Sync History (TH)

export default SyncHistory;
