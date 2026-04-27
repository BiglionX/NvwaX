import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/api-key.service.js';

// Extend Express Request type to include API key info
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        tenant_id: string;
        user_id: string;
        permissions: string[];
        rate_limit: number;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using API Key
 * Expects header: Authorization: Bearer <api_key>
 */
export async function apiKeyAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_AUTH_HEADER',
          message: 'Authorization header is required'
        }
      });
      return;
    }

    // Extract token from "Bearer <token>" format
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Authorization header must use Bearer scheme'
        }
      });
      return;
    }

    const apiKey = authHeader.slice(7); // Remove "Bearer " prefix

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required'
        }
      });
      return;
    }

    // Validate the API key
    const validation = await apiKeyService.validateApiKey(apiKey);

    if (!validation.isValid || !validation.apiKey || !validation.tenantId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: validation.error || 'Invalid API key'
        }
      });
      return;
    }

    // Check rate limit
    const rateLimitCheck = await apiKeyService.checkRateLimit(validation.apiKey.id);

    if (!rateLimitCheck.allowed) {
      // Record rate limited request
      await apiKeyService.recordUsage({
        apiKeyId: validation.apiKey.id,
        tenantId: validation.tenantId,
        endpoint: req.path,
        method: req.method,
        status: 'rate_limited',
        ipAddress: req.ip || undefined,
        userAgent: req.get('User-Agent')
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please upgrade your plan or wait before making more requests.',
          retry_after: 3600 // Retry after 1 hour (in seconds)
        },
        headers: {
          'Retry-After': '3600',
          'X-RateLimit-Limit': validation.apiKey.rate_limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600)
        }
      });
      return;
    }

    // Attach API key info to request for downstream handlers
    req.apiKey = {
      id: validation.apiKey.id,
      tenant_id: validation.tenantId,
      user_id: validation.apiKey.user_id,
      permissions: validation.apiKey.permissions,
      rate_limit: validation.apiKey.rate_limit
    };

    // Add rate limit headers to response
    res.setHeader('X-RateLimit-Limit', validation.apiKey.rate_limit.toString());
    res.setHeader('X-RateLimit-Remaining', (rateLimitCheck.remaining || 0).toString());
    res.setHeader('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600));

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during authentication'
      }
    });
  }
}

/**
 * Middleware to check if the authenticated API key has specific permissions
 * @param requiredPermission - Permission string (e.g., 'sdk:chat:create')
 */
export function requirePermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required'
        }
      });
      return;
    }

    const permissions = req.apiKey.permissions;

    // Check if user has wildcard permission
    if (permissions.includes('*') || permissions.includes('sdk:*')) {
      next();
      return;
    }

    // Check for exact permission match or wildcard parent
    const hasPermission = permissions.some(p => {
      if (p === requiredPermission) return true;
      
      // Check wildcard patterns (e.g., 'sdk:*' matches 'sdk:chat:create')
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -2); // Remove ':*'
        return requiredPermission.startsWith(prefix + ':');
      }
      
      return false;
    });

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions. Required: ${requiredPermission}`,
          current_permissions: permissions
        }
      });
      return;
    }

    next();
  };
}
