import { agentCrawlerService } from './agent-crawler.service.js';

/**
 * 定时任务服务 - 定期爬取和更新 Agent 元数据
 */
export class CrawlerSchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * 启动定时爬取任务
   * @param intervalHours 间隔小时数，默认 24 小时
   */
  start(intervalHours: number = 24): void {
    if (this.isRunning) {
      console.log('Crawler scheduler is already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`Starting crawler scheduler with ${intervalHours} hour interval`);
    
    // 立即执行一次
    this.executeCrawl();
    
    // 设置定时任务
    this.intervalId = setInterval(() => {
      this.executeCrawl();
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * 停止定时爬取任务
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('Crawler scheduler stopped');
    }
  }

  /**
   * 执行爬取任务
   */
  private async executeCrawl(): Promise<void> {
    try {
      console.log('Executing scheduled crawl...');
      
      const result = await agentCrawlerService.runFullCrawl();
      
      console.log(`Scheduled crawl completed:`, result);
    } catch (error) {
      console.error('Error in scheduled crawl:', error);
    }
  }

  /**
   * 手动触发一次爬取
   */
  async triggerManualCrawl(): Promise<{ github: number; huggingface: number }> {
    console.log('Triggering manual crawl...');
    return await agentCrawlerService.runFullCrawl();
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { isRunning: boolean } {
    return {
      isRunning: this.isRunning
    };
  }
}

export const crawlerSchedulerService = new CrawlerSchedulerService();
