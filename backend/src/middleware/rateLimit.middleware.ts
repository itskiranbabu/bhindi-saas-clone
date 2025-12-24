import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { getRedis } from '../cache/redis';
import { logger } from '../utils/logger';

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
    });
  },
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
  },
  skipSuccessfulRequests: true,
});

// AI request rate limiter (per user)
export async function aiRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      next();
      return;
    }

    const redis = getRedis();
    const key = `ai_rate_limit:${userId}`;
    const limit = 50; // 50 AI requests per hour
    const window = 3600; // 1 hour in seconds

    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, window);
    }

    if (current > limit) {
      res.status(429).json({
        success: false,
        error: 'AI request limit exceeded. Please upgrade your plan or try again later.',
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current).toString());

    next();
  } catch (error) {
    logger.error('AI rate limiter error:', error);
    next(); // Continue on error
  }
}
