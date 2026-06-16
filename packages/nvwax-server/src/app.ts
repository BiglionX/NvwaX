import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config/index.js';
import routes from './routes/index.js';
import oidcRouter from './routes/oidc.routes.js';
import portalRouter from './routes/portal.routes.js';
import { pcSessionService } from './middleware/pc-session.middleware.js';
import { oidcTokenService } from './services/oidc/oidc-token.service.js';
import { stripeWebhookRouter } from './routes/stripe-webhook.routes.js';
import { databaseService } from './services/database.service.js';
import { crawlerSchedulerService } from './services/crawler-scheduler.service.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORTAL_STATIC_DIR = path.resolve(__dirname, '../../account-portal/out');

const app = express();

// Stripe webhook 需要 raw body，必须在 express.json() 之前
app.use('/api/stripe/webhook', stripeWebhookRouter);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));

// CORS 配置：支持白名单
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // 允许的来源列表
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://nvwax.proclaw.cc',
      'https://www.nvwax.proclaw.cc',
      // Sprint 1 — OIDC IdP (account.proclaw.cc) 允许从 RP 发起跨域请求
      'https://account.proclaw.cc',
      'http://account.proclaw.cc',
    ];
    
    // 从环境变量添加更多允许的来源
    const additionalOrigins = process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',')
      : [];
    
    allowedOrigins.push(...additionalOrigins);
    
    // 允许没有 origin 的请求（如移动端、Postman）
    if (!origin) {
      return callback(null, true);
    }
    
    // 检查 origin 是否在白名单中
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // 在开发环境下允许所有来源
    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
  },
  credentials: true, // 允许发送 cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Plugin-Capabilities'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Sprint 2 — pc_session cookie parsing
app.use(morgan('dev'));

// Sprint 2 — pc-session middleware: attaches req.sessionUser if pc_session cookie is valid.
// Note: this only annotates; portal.controller issues/clears the cookie.
app.use(pcSessionService.middleware());

// Sprint 2 — serve account-portal static export at /portal/* (Next.js `output: 'export'`).
// Falls through to API routes for non-asset requests so /api/portal/* still works.
app.use(
  '/portal',
  express.static(PORTAL_STATIC_DIR, {
    // HTML pages use trailingSlash; assets are content-hashed.
    maxAge: '1h',
    setHeaders(res, file) {
      if (file.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
      }
    },
  }),
);

// Routes
// Sprint 1 — OIDC IdP 端点（根路径挂载，绕过 /api）
app.use(oidcRouter);
// Sprint 2 — Portal account endpoints under /api
app.use('/api/portal', portalRouter);
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.use(notFoundHandler);

// 全局错误处理中间件
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, async () => {
  console.log(`NvwaX Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);

  // 初始化 OIDC 密钥（Sprint 1）
  try {
    await oidcTokenService.initialize();
    console.log('✓ OIDC keys loaded (issuer=' + oidcTokenService.getIssuer() + ')');
  } catch (error) {
    console.error('Failed to initialize OIDC keys:', error);
    process.exit(1);
  }

  // 初始化数据库
  try {
    await databaseService.initializeDatabase();
    console.log('✓ Database initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
  
  // 启动定时爬虫任务（每24小时执行一次）
  crawlerSchedulerService.start(24);
  console.log('✓ Crawler scheduler started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  crawlerSchedulerService.stop();
  databaseService.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  crawlerSchedulerService.stop();
  databaseService.close();
  process.exit(0);
});

export default app;
