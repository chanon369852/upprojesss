import { Response } from 'express';
import { TenantRequest } from '../middleware/tenant.middleware';
import { prisma } from '../utils/prisma';

const toNumber = (value: any): number => {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value?.toString === 'function') {
    const n = Number(value.toString());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export const listLeads = async (req: TenantRequest, res: Response) => {
  const { status, stage, limit = 50, offset = 0 } = req.query as any;

  const take = Math.max(1, Math.min(200, Number(limit) || 50));
  const skip = Math.max(0, Number(offset) || 0);

  const where: any = {
    tenantId: req.tenantId!,
    ...(status ? { status: String(status) } : {}),
    ...(stage ? { stage: String(stage) } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        name: true,
        company: true,
        source: true,
        status: true,
        stage: true,
        gender: true,
        income: true,
        estimatedValue: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ]);

  const leads = items.map((l: any) => ({
    ...l,
    income: toNumber(l.income),
    estimatedValue: toNumber(l.estimatedValue),
  }));

  res.json({
    success: true,
    data: leads,
    meta: {
      total,
      limit: take,
      offset: skip,
      status: status ? String(status) : undefined,
      stage: stage ? String(stage) : undefined,
    },
  });
};
