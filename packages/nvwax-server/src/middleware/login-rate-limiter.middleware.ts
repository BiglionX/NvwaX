/**
 * 登录速率限制中间件
 * 
 * 防止暴力破解攻击
 * - 每个 IP 在时间窗口内允许的最大请求数
 * - 每个账号在时间窗口内允许的最大失败次数
 */

import { Request, Response, NextFunction } from 'express';

// 内存存储（生产环境建议使用 Redis）
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();

// 配置
const WINDOW_MS = 5 * 60 * 1000; // 5 分钟窗口
const MAX_ATTEMPTS_PER_WINDOW = 5; // 窗口内最大尝试次数
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 锁定 15 分钟

// 清理过期记录（每小时）
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginAttempts.entries()) {
    if (now - value.firstAttempt > WINDOW_MS && !value.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * 记录登录尝试
 */
function recordAttempt(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  // 无记录或已过期，创建新记录
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  // 检查是否被锁定
  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // 清除锁定
  if (record.lockedUntil && now >= record.lockedUntil) {
    record.lockedUntil = undefined;
    record.count = 1;
    record.firstAttempt = now;
    return { allowed: true };
  }

  // 增加计数
  record.count++;

  // 检查是否超过限制
  if (record.count > MAX_ATTEMPTS_PER_WINDOW) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    return { allowed: false, retryAfter: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  return { allowed: true };
}

/**
 * 清除登录尝试记录（成功登录后调用）
 */
function clearAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

/**
 * 登录速率限制中间件
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  // 使用 IP 作为标识符
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const identifier = `ip:${ip}`;

  const { allowed, retryAfter } = recordAttempt(identifier);

  // 设置速率限制响应头
  res.setHeader('X-RateLimit-Limit', MAX_ATTEMPTS_PER_WINDOW.toString());
  res.setHeader('X-RateLimit-Window', Math.ceil(WINDOW_MS / 1000).toString());

  if (!allowed) {
    res.setHeader('Retry-After', retryAfter!.toString());
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `登录尝试过于频繁，请 ${Math.ceil(retryAfter! / 60)} 分钟后再试`
      }
    });
    return;
  }

  next();
}

/**
 * 获取剩余尝试次数
 */
export function getRemainingAttempts(req: Request): number {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const identifier = `ip:${ip}`;
  const record = loginAttempts.get(identifier);
  
  if (!record) return MAX_ATTEMPTS_PER_WINDOW;
  if (record.lockedUntil && Date.now() < record.lockedUntil) return 0;
  
  return Math.max(0, MAX_ATTEMPTS_PER_WINDOW - record.count);
}

// 导出清除函数供登录成功时调用
export { clearAttempts };

// 导出配置常量
export const RATE_LIMIT_CONFIG = {
  WINDOW_MS,
  MAX_ATTEMPTS_PER_WINDOW,
  LOCKOUT_DURATION_MS
};
