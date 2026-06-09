/**
 * 统一 API 响应格式工具
 * 
 * 标准响应格式: { success: true, data: ... }
 * 错误响应格式: { success: false, error: { code: string, message: string } }
 */

import { Response } from 'express';

/**
 * 成功响应
 */
export function successResponse<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

/**
 * 分页响应
 */
export function paginatedResponse<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  });
}

/**
 * 错误响应
 */
export function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string
): Response {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}

/**
 * 常用错误响应快捷方法
 */
export const errors = {
  badRequest: (res: Response, message = '请求参数错误') =>
    errorResponse(res, 400, 'BAD_REQUEST', message),

  unauthorized: (res: Response, message = '未授权访问') =>
    errorResponse(res, 401, 'UNAUTHORIZED', message),

  forbidden: (res: Response, message = '权限不足') =>
    errorResponse(res, 403, 'FORBIDDEN', message),

  notFound: (res: Response, message = '资源不存在') =>
    errorResponse(res, 404, 'NOT_FOUND', message),

  conflict: (res: Response, message = '资源冲突') =>
    errorResponse(res, 409, 'CONFLICT', message),

  rateLimited: (res: Response, message = '请求过于频繁') =>
    errorResponse(res, 429, 'RATE_LIMITED', message),

  internal: (res: Response, message = '服务器内部错误') =>
    errorResponse(res, 500, 'INTERNAL_ERROR', message)
};
