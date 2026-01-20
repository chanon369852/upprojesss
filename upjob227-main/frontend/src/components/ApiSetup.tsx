import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import {
  createIntegration,
  createJsonImport,
  createPendingJsonImport,
  deleteJsonImport,
  deletePendingJsonImport,
  getIntegrations,
  getJsonImport,
  getPendingJsonImport,
  updateIntegration,
  listJsonImports,
  listPendingJsonImports,
  upsertPendingIntegrationSetup,
} from '../services/api';
import type { Integration, JsonImportItem, JsonImportListItem } from '../types/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getStoredRole, hasPermission, PERMISSIONS } from '../lib/rbac';

type ProviderKey = 'facebook' | 'googleads' | 'line' | 'tiktok' | 'shopee';

const PROVIDERS: Array<{ key: ProviderKey; label: string }> = [
  { key: 'facebook', label: 'Facebook Ads' },
  { key: 'googleads', label: 'Google Ads' },
  { key: 'line', label: 'LINE' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'shopee', label: 'Shopee' },
];

const API_SETUP_PROVIDER_KEY = 'api_setup_provider';

const ApiSetup: React.FC = () => {
  const { user: currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'api' | 'json'>('api');

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);

  const [provider, setProvider] = useState<ProviderKey>('facebook');
  const [form, setForm] = useState<Record<string, string>>({});
  const [savingIntegration, setSavingIntegration] = useState(false);

  const [imports, setImports] = useState<JsonImportListItem[]>([]);
  const [selectedImport, setSelectedImport] = useState<JsonImportItem | null>(null);
  const [loadingImports, setLoadingImports] = useState(false);
  const [savingImport, setSavingImport] = useState(false);

  const [fileName, setFileName] = useState<string>('');
  const [jsonDraft, setJsonDraft] = useState<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const role = (currentUser?.role as any) || getStoredRole();
  const canManageIntegrations = hasPermission(role, PERMISSIONS.manage_integrations);

  const currentProviderLabel = useMemo(
    () => PROVIDERS.find((p) => p.key === provider)?.label || provider,
    [provider],
  );

  const requiredFields = useMemo(() => {
    switch (provider) {
      case 'facebook':
        return ['accessToken', 'accountId', 'appId', 'appSecret'];
      case 'googleads':
        return ['clientId', 'clientSecret', 'refreshToken', 'developerToken', 'customerId'];
      case 'line':
        return ['channelId', 'channelSecret', 'accessToken'];
      case 'tiktok':
        return ['appId', 'appSecret', 'accessToken', 'advertiserId'];
      case 'shopee':
        return ['partnerId', 'partnerKey', 'shopId', 'accessToken', 'refreshToken', 'expiresIn'];
      default:
        return [];
    }
  }, [provider]);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoadingIntegrations(true);
      const rows = await getIntegrations();
      setIntegrations(Array.isArray(rows) ? rows : []);
    } finally {
      setLoadingIntegrations(false);
    }
  }, []);

  const fetchImports = useCallback(async () => {
    try {
      setLoadingImports(true);
      const rows = canManageIntegrations ? await listJsonImports() : await listPendingJsonImports();
      setImports(Array.isArray(rows) ? rows : []);
    } finally {
      setLoadingImports(false);
    }
  }, [canManageIntegrations]);

  useEffect(() => {
    fetchIntegrations();
    fetchImports();
  }, [fetchImports, fetchIntegrations]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(API_SETUP_PROVIDER_KEY);
      if (!raw) return;
      const candidate = String(raw).trim().toLowerCase() as ProviderKey;
      const ok = PROVIDERS.some((p) => p.key === candidate);
      if (ok) {
        setProvider(candidate);
        setActiveTab('api');
      }
      window.localStorage.removeItem(API_SETUP_PROVIDER_KEY);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setForm({});
    setError(null);
    setSuccess(null);
  }, [provider]);

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveIntegration = async () => {
    try {
      setSavingIntegration(true);
      setError(null);
      setSuccess(null);

      const missing = requiredFields.filter((f) => !String(form[f] || '').trim());
      if (missing.length) {
        setError(`Missing fields: ${missing.join(', ')}`);
        return;
      }

      const credentials: any = {};
      requiredFields.forEach((f) => {
        const raw = String(form[f] || '').trim();
        if (!raw) return;
        if (provider === 'shopee' && (f === 'partnerId' || f === 'shopId' || f === 'expiresIn')) {
          credentials[f] = Number(raw);
        } else {
          credentials[f] = raw;
        }
      });

      if (provider === 'line') {
        const webhookUrl = String(form.webhookUrl || '').trim();
        if (webhookUrl) credentials.webhookUrl = webhookUrl;
      }

      if (canManageIntegrations) {
        const existing = integrations.find((i) => String(i.provider).toLowerCase() === provider);
        if (existing?.id) {
          await updateIntegration(existing.id, {
            name: existing.name || `${currentProviderLabel} Integration`,
            credentials,
            config: credentials,
            isActive: true,
          });
          setSuccess('Updated integration credentials successfully');
        } else {
          await createIntegration({
            provider,
            type: provider,
            name: `${currentProviderLabel} Integration`,
            credentials,
            config: credentials,
          });
          setSuccess('Saved integration credentials successfully');
        }
      } else {
        await upsertPendingIntegrationSetup({
          provider,
          type: provider,
          credentials,
          config: credentials,
        });
        setSuccess('Saved integration credentials successfully');
      }

      await fetchIntegrations();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Save integration failed');
    } finally {
      setSavingIntegration(false);
    }
  };

  const handleFileChange = async (file: File | null) => {
    setError(null);
    setSuccess(null);
    setSelectedImport(null);

    if (!file) {
      setFileName('');
      setJsonDraft(null);
      return;
    }

    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed == null || typeof parsed !== 'object') {
        setError('JSON must be an object or array');
        setJsonDraft(null);
        return;
      }
      setJsonDraft(parsed);
    } catch (e: any) {
      setJsonDraft(null);
      setError(e?.message || 'Invalid JSON file');
    }
  };

  const handleUploadJson = async () => {
    try {
      setSavingImport(true);
      setError(null);
      setSuccess(null);

      if (!jsonDraft) {
        setError('Please choose a valid .json file first');
        return;
      }

      if (canManageIntegrations) {
        await createJsonImport({ name: fileName || undefined, data: jsonDraft });
      } else {
        await createPendingJsonImport({ name: fileName || undefined, data: jsonDraft });
      }
      setSuccess('Uploaded JSON successfully');
      setFileName('');
      setJsonDraft(null);
      await fetchImports();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Upload failed');
    } finally {
      setSavingImport(false);
    }
  };

  const handleViewImport = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);
      const item = canManageIntegrations ? await getJsonImport(id) : await getPendingJsonImport(id);
      setSelectedImport(item);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Load import failed');
    }
  };

  const handleDeleteImport = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);
      if (canManageIntegrations) {
        await deleteJsonImport(id);
      } else {
        await deletePendingJsonImport(id);
      }
      if (selectedImport?.id === id) setSelectedImport(null);
      await fetchImports();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Delete failed');
    }
  };

  const providerExists = useMemo(() => {
    return integrations.some((i) => String(i.provider).toLowerCase() === provider);
  }, [integrations, provider]);

  return (
    <div className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-900">API Setup</h2>
          <p className="text-sm text-gray-500">กรอก API จริง และอัปโหลด JSON เพื่อเก็บข้อมูลลงฐานข้อมูล แล้วดึงมาแสดงผล</p>
        </div>

        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="api">API Credentials</TabsTrigger>
            <TabsTrigger value="json">JSON Import</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Credentials</CardTitle>
                <CardDescription>บันทึกข้อมูล API credentials ลง Integrations (ผ่าน backend validate จริง)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-600">Provider</span>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as ProviderKey)}
                      disabled={savingIntegration}
                      className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {providerExists ? <Badge variant="outline">Already configured</Badge> : null}
                  {loadingIntegrations ? <Badge variant="outline">Loading…</Badge> : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredFields.map((field) => (
                    <label key={field} className="flex flex-col gap-1">
                      <span className="text-xs text-gray-600">{field}</span>
                      <input
                        value={form[field] || ''}
                        onChange={(e) => setField(field, e.target.value)}
                        disabled={savingIntegration}
                        className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                        placeholder={field}
                      />
                    </label>
                  ))}

                  {provider === 'line' ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-600">webhookUrl (optional)</span>
                      <input
                        value={form.webhookUrl || ''}
                        onChange={(e) => setField('webhookUrl', e.target.value)}
                        disabled={savingIntegration}
                        className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                        placeholder="https://..."
                      />
                    </label>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={handleSaveIntegration} disabled={savingIntegration}>
                    {savingIntegration ? 'Saving…' : 'Save credentials'}
                  </Button>
                  <Button variant="outline" onClick={fetchIntegrations} disabled={savingIntegration}>
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload .json</CardTitle>
                <CardDescription>อัปโหลดไฟล์ JSON แล้วบันทึกลง tenant_settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="block w-full text-sm"
                />

                <div className="flex items-center gap-2 flex-wrap">
                  {fileName ? <Badge variant="outline">{fileName}</Badge> : null}
                  {jsonDraft ? <Badge variant="outline">Parsed</Badge> : null}
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={handleUploadJson} disabled={savingImport}>
                    {savingImport ? 'Uploading…' : 'Upload'}
                  </Button>
                  <Button variant="outline" onClick={fetchImports} disabled={savingImport}>
                    Refresh list
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Saved imports</CardTitle>
                  <CardDescription>รายการไฟล์ JSON ที่บันทึกไว้</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingImports ? (
                    <div className="text-sm text-gray-500">Loading…</div>
                  ) : imports.length ? (
                    imports.map((it) => (
                      <div key={it.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{it.name || it.key}</div>
                          <div className="text-xs text-gray-500">Updated: {new Date(it.updatedAt).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewImport(it.id)}>
                            View
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteImport(it.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No imports yet</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>ดูรายละเอียดข้อมูลที่บันทึกไว้</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedImport ? (
                    <pre className="max-h-[520px] overflow-auto rounded-xl border border-gray-200 bg-white p-3 text-xs">
                      {JSON.stringify(selectedImport.value, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-sm text-gray-500">Select an item to view</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApiSetup;
