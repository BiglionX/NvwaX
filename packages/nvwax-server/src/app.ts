import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { stripeWebhookRouter } from './routes/stripe-webhook.routes.js';
import { databaseService } from './services/database.service.js';
import { crawlerSchedulerService } from './services/crawler-scheduler.service.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';

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
app.use(morgan('dev'));

// Routes
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
