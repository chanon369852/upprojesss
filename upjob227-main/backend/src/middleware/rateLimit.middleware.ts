import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

// FLOW START: Rate Limit Middleware (EN)
// จุดเริ่มต้น: Middleware จำกัดจำนวน request (TH)

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const isRateLimitDisabled = () => {
  const flag = String(process.env.DISABLE_RATE_LIMIT || '').toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'yes') return true;
  return process.env.NODE_ENV !== 'production';
};

export default function rateLimiter(req: Request, res: Response, next: NextFunction) {
  if (isRateLimitDisabled()) return next();
  return (limiter as any)(req, res, next);
}

// FLOW END: Rate Limit Middleware (EN)
// จุดสิ้นสุด: Middleware จำกัดจำนวน request (TH)
