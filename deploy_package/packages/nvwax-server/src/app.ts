import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { databaseService } from './services/database.service.js';
import { crawlerSchedulerService } from './services/crawler-scheduler.service.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // 添加请求日志

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

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
