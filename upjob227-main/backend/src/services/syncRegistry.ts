import { Integration } from '@prisma/client';

import * as googleAdsSync from './googleAds';
import * as shopeeSync from './shopee';
import * as lazadaSync from './lazada';
import * as facebookSync from './facebook';
import * as ga4Sync from './ga4';
import * as tiktokSync from './tiktok.service';
import * as lineAdsSync from './lineAds.service';
import * as searchConsoleSync from './googleSearchConsole.service';

export type SyncMode = 'real' | 'mock';

export const normalizeProviderKey = (raw: string): string => {
  const key = (raw || '').trim().toLowerCase();
  if (key === 'google') return 'google_ads';
  if (key === 'googleads') return 'google_ads';
  if (key === 'google_ads') return 'google_ads';
  if (key === 'meta') return 'facebook';
  if (key === 'meta_ads') return 'facebook';
  if (key === 'facebook_ads') return 'facebook';
  if (key === 'lineads') return 'line_ads';
  if (key === 'line') return 'line_ads';
  if (key === 'line_ads') return 'line_ads';
  if (key === 'gsc') return 'google_search_console';
  if (key === 'searchconsole') return 'google_search_console';
  return key;
};

export const shouldUseMock = (integration: Pick<Integration, 'provider' | 'config' | 'credentials'>): boolean => {
  void integration;
  return false;
};

const realSyncMap: Record<string, (integration: Integration) => Promise<any>> = {
  google_ads: googleAdsSync.sync,
  facebook: facebookSync.sync,
  ga4: ga4Sync.sync,
  shopee: shopeeSync.sync,
  lazada: lazadaSync.sync,
  tiktok: tiktokSync.sync,
  line_ads: lineAdsSync.sync,
  google_search_console: searchConsoleSync.sync,
};

const mockSyncMap: Record<string, (integration: Integration) => Promise<any>> = {};

export const getSyncHandler = (providerRaw: string, mode: SyncMode) => {
  const provider = normalizeProviderKey(providerRaw);
  const map = mode === 'mock' ? mockSyncMap : realSyncMap;
  return {
    provider,
    handler: map[provider] || null,
  };
};

export const syncIntegrationWithFallback = async (
  integration: Integration,
  options?: { forceMode?: SyncMode },
): Promise<{ provider: string; mode: SyncMode; result: any }> => {
  const provider = normalizeProviderKey(integration.provider);

  const requestedMode = options?.forceMode ? options.forceMode : 'real';
  const mode: SyncMode = requestedMode === 'mock' ? 'real' : 'real';

  const primary = getSyncHandler(provider, 'real');
  if (!primary.handler) {
    throw new Error(`No real sync handler found for provider: ${provider}`);
  }

  const result = await primary.handler(integration);
  return { provider, mode, result };
};

export const listKnownProviders = (): string[] => {
  const keys = new Set<string>([...Object.keys(realSyncMap), ...Object.keys(mockSyncMap)]);
  return Array.from(keys);
};
