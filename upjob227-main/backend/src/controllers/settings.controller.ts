import { Response } from 'express';
import crypto from 'crypto';
import { TenantRequest } from '../middleware/tenant.middleware';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error.middleware';

const JSON_IMPORT_PREFIX = 'json_import:';
const PENDING_JSON_IMPORT_PREFIX = 'pending_json_import:';

const normalizeName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 100) : null;
};

const ensureJsonPayload = (value: unknown) => {
  if (value == null) throw new AppError('data is required', 400);
  if (typeof value !== 'object') throw new AppError('data must be a JSON object or array', 400);
};

const getStoredName = (value: any): string | null => {
  const raw = value?.name;
  return normalizeName(raw);
};

export const listJsonImports = async (req: TenantRequest, res: Response) => {
  const rows = await prisma.tenantSetting.findMany({
    where: {
      tenantId: req.tenantId!,
      key: { startsWith: JSON_IMPORT_PREFIX },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      key: true,
      value: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    items: rows.map((row) => ({
      id: row.id,
      key: row.key,
      name: getStoredName(row.value),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  });
};

export const listPendingJsonImports = async (req: TenantRequest, res: Response) => {
  const rows = await prisma.tenantSetting.findMany({
    where: {
      tenantId: req.tenantId!,
      key: { startsWith: PENDING_JSON_IMPORT_PREFIX },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      key: true,
      value: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    items: rows.map((row) => ({
      id: row.id,
      key: row.key,
      name: getStoredName(row.value),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  });
};

export const getJsonImportById = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  const row = await prisma.tenantSetting.findFirst({
    where: {
      id,
      tenantId: req.tenantId!,
      key: { startsWith: JSON_IMPORT_PREFIX },
    },
    select: {
      id: true,
      key: true,
      value: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!row) throw new AppError('Import not found', 404);

  res.json({ item: row });
};

export const getPendingJsonImportById = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  const row = await prisma.tenantSetting.findFirst({
    where: {
      id,
      tenantId: req.tenantId!,
      key: { startsWith: PENDING_JSON_IMPORT_PREFIX },
    },
    select: {
      id: true,
      key: true,
      value: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!row) throw new AppError('Import not found', 404);

  res.json({ item: row });
};

export const createJsonImport = async (req: TenantRequest, res: Response) => {
  const payload = (req.body as any)?.data;
  ensureJsonPayload(payload);

  const name = normalizeName((req.body as any)?.name);

  const key = `${JSON_IMPORT_PREFIX}${crypto.randomUUID()}`;

  const row = await prisma.tenantSetting.create({
    data: {
      tenantId: req.tenantId!,
      key,
      value: {
        name,
        data: payload,
        importedAt: new Date().toISOString(),
      },
    },
    select: {
      id: true,
      key: true,
      value: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json({ item: row });
};

export const createPendingJsonImport = async (req: TenantRequest, res: Response) => {
  const payload = (req.body as any)?.data;
  ensureJsonPayload(payload);

  const name = normalizeName((req.body as any)?.name);
  const key = `${PENDING_JSON_IMPORT_PREFIX}${crypto.randomUUID()}`;

  const row = await prisma.tenantSetting.create({
    data: {
      tenantId: req.tenantId!,
      key,
      value: {
        name,
        data: payload,
        importedAt: new Date().toISOString(),
        status: 'pending',
      },
    },
    select: {
      id: true,
      key: true,
      value: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json({ item: row });
};

export const deleteJsonImport = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  const deleted = await prisma.tenantSetting.deleteMany({
    where: {
      id,
      tenantId: req.tenantId!,
      key: { startsWith: JSON_IMPORT_PREFIX },
    },
  });

  if (!deleted.count) throw new AppError('Import not found', 404);

  res.json({ message: 'Deleted' });
};

export const deletePendingJsonImport = async (req: TenantRequest, res: Response) => {
  const { id } = req.params;

  const deleted = await prisma.tenantSetting.deleteMany({
    where: {
      id,
      tenantId: req.tenantId!,
      key: { startsWith: PENDING_JSON_IMPORT_PREFIX },
    },
  });

  if (!deleted.count) throw new AppError('Import not found', 404);

  res.json({ message: 'Deleted' });
};
