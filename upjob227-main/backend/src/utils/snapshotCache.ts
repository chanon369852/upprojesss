import { createClient } from 'redis';
import { logger } from './logger';

type CacheMode = 'redis' | 'memory';

type MemorySnapshotEntry = {
  rows: string[];
  expiresAt: number;
};

let mode: CacheMode = 'memory';
let client: ReturnType<typeof createClient> | null = null;
const memoryStore = new Map<string, MemorySnapshotEntry>();
let memorySweepTimer: ReturnType<typeof setInterval> | null = null;

const getSnapshotCacheTtlSeconds = () => {
  const raw = process.env.SNAPSHOT_CACHE_TTL_SECONDS;
  const parsed = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 15 * 60;
};

const stopMemorySweep = () => {
  if (!memorySweepTimer) return;
  clearInterval(memorySweepTimer);
  memorySweepTimer = null;
};

const startMemorySweep = () => {
  if (memorySweepTimer) return;
  const ttlMs = getSnapshotCacheTtlSeconds() * 1000;
  memorySweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.expiresAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, ttlMs);
};

const getRedisUrl = () => {
  const raw = process.env.REDIS_URL;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
};

export const initSnapshotCache = async () => {
  const url = getRedisUrl();
  if (!url) {
    mode = 'memory';
    client = null;
    startMemorySweep();
    return;
  }

  try {
    const redisClient = createClient({ url });
    redisClient.on('error', (err) => {
      logger.error('Redis client error', err);
    });
    await redisClient.connect();
    client = redisClient;
    mode = 'redis';
    stopMemorySweep();
    logger.info('Snapshot cache initialized with Redis');
  } catch (err) {
    mode = 'memory';
    client = null;
    startMemorySweep();
    logger.warn('Snapshot cache falling back to memory (Redis unavailable)');
  }
};

export const closeSnapshotCache = async () => {
  if (mode !== 'redis' || !client) {
    stopMemorySweep();
    memoryStore.clear();
    return;
  }

  try {
    await client.quit();
  } catch (err) {
    logger.warn('Failed to close Redis snapshot cache connection');
  } finally {
    client = null;
    mode = 'memory';
    stopMemorySweep();
    memoryStore.clear();
  }
};

export const getSnapshotCacheMode = () => mode;

const keyForTenant = (tenantId: string) => `snapshot:tenant:${tenantId}`;

export const pushTenantSnapshot = async (tenantId: string, snapshot: unknown, limit = 5) => {
  const key = keyForTenant(tenantId);
  const payload = JSON.stringify(snapshot);
  const ttlSeconds = getSnapshotCacheTtlSeconds();

  if (mode === 'redis' && client) {
    await client.lPush(key, payload);
    await client.lTrim(key, 0, Math.max(0, limit - 1));
    await client.expire(key, ttlSeconds);
    return;
  }

  const current = memoryStore.get(key)?.rows || [];
  const next = [payload, ...current].slice(0, limit);
  memoryStore.set(key, { rows: next, expiresAt: Date.now() + ttlSeconds * 1000 });
};

export const getTenantSnapshots = async (tenantId: string, limit = 5): Promise<any[]> => {
  const key = keyForTenant(tenantId);

  if (mode === 'redis' && client) {
    const rows = await client.lRange(key, 0, Math.max(0, limit - 1));
    return rows
      .map((row) => {
        try {
          return JSON.parse(row);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  const entry = memoryStore.get(key);
  if (!entry) return [];
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return [];
  }

  const rows = entry.rows.slice(0, limit);
  return rows
    .map((row) => {
      try {
        return JSON.parse(row);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};
