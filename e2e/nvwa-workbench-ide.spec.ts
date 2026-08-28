/**
 * Nvwa 工作台 IDE 风格验收脚本 —— 方案 X 收尾
 * ----------------------------------------------------------------
 * 目的：用 Playwright 把 v2.3 IDE 风格重构后的 /nvwa 工作台跑一遍，
 *       在每个关键状态截图，让维护者/审阅者直接看到 UI 长什么样。
 *
 * 验收范围：
 *   1. 顶部 Title Bar（macOS 交通灯 + 项目名 + 状态灯 + 模式切换 + 折叠按钮）
 *   2. 左侧 Activity Bar（4 个图标）+ 二级面板切换
 *   3. 中央 Tab Bar（对话/蓝图/状态机）
 *   4. 步骤 4 后的蓝图 Tab 自动激活 + 真实 AgentBlueprintCanvas 渲染
 *   5. 移动端折叠行为
 *
 * 截图输出：exports/nvwa-workbench/01-*.png ~ 09-*.png
 *
 * 跑法（前置：nvwax-web dev 启动在 localhost:3000）：
 *   # 终端 1 —— 启 dev server
 *   pnpm --filter nvwax-web dev
 *
 *   # 终端 2 —— 跑验收（首次需 playwright install chromium）
 *   pnpm exec playwright install chromium
 *   pnpm exec playwright test --config=e2e/playwright.config.ts e2e/nvwa-workbench-ide.spec.ts
 *
 *   # 或者用项目封装命令（更短）：
 *   pnpm e2e e2e/nvwa-workbench-ide.spec.ts
 *
 * 跑通后看截图：
 *   - 文件夹：exports/nvwa-workbench/
 *   - 9 张 PNG，按编号顺序浏览即可
 *
 * 注意：本脚本刻意不调任何后端 API、不登录 —— 只验证 UI 渲染层。
 *       useAuth() 返回 isLoggedIn=false，但所有面板/按钮照样渲染。
 *
 * 沙盒环境限制：
 *   此脚本不能在 PowerShell 沙盒里直接跑（next dev / playwright 都需要 spawn
 *   子进程，沙盒拒绝 spawn）。请在本地 PowerShell 或 CI 里跑。
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const WEB_URL = process.env.NVWAX_WEB_URL || 'http://localhost:3000';
const SHOT_DIR = path.resolve(__dirname, '..', 'exports', 'nvwa-workbench');

// 截图工具：自动 mkdir + 等待稳定
async function shot(page: Page, name: string, opts: { fullPage?: boolean; mobile?: boolean } = {}) {
  if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });
  const file = path.join(SHOT_DIR, name);
  // 给过渡动画 / React 19 hydration 留时间
  await page.waitForTimeout(400);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
  console.log(`  📸 ${name}`);
  return file;
}

test.describe('Nvwa 工作台 v2.3 IDE 风格验收', () => {
  test.setTimeout(90_000);

  test('01-08: 全流程 IDE 工作台可视化', async ({ browser }) => {
    // ---- 桌面端 viewport ----
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      locale: 'zh-CN',
    });
    const page = await context.newPage();

    // 收集 console errors（不阻断流程，最后只 warn）
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

    // ============================================================
    // 01: 初次加载 —— 对话 Tab 默认激活
    // ============================================================
    await test.step('01 初次加载 /nvwa', async () => {
      await page.goto(`${WEB_URL}/nvwa`, { waitUntil: 'domcontentloaded' });
      // 等 Title Bar 渲染
      await page.waitForSelector('text=NvwaX', { timeout: 15_000 });
      // 等欢迎消息（客户端 useEffect 注入）
      await page.waitForTimeout(800);
      await shot(page, '01-initial-load.png');

      // 验收点：Title Bar 上的关键元素都渲染
      await expect(page.locator('text=Agent Factory')).toBeVisible({ timeout: 5_000 });
    });

    // ============================================================
    // 02: 左侧 Activity Bar 切到"进度"面板（默认就是进度）
    // ============================================================
    await test.step('02 进度面板（含状态机切换器）', async () => {
      // Activity Bar 的"进度"图标有 title="进度"
      const progressIcon = page.locator('aside[aria-label="活动栏"] button[title="进度"]');
      await progressIcon.click();
      await page.waitForTimeout(300);
      await shot(page, '02-left-progress.png');

      // 验收点：能看到"创建进度"标题 + 7 步列表
      await expect(page.locator('text=创建进度').first()).toBeVisible();
      // StepProgress 组件渲染了 7 个 step circle
      const stepCircles = page.locator('aside[aria-label="侧边面板"] .rounded-full');
      expect(await stepCircles.count()).toBeGreaterThanOrEqual(7);
    });

    // ============================================================
    // 03: 切到"需求"面板
    // ============================================================
    await test.step('03 需求面板（空态展示）', async () => {
      const reqIcon = page.locator('aside[aria-label="活动栏"] button[title="需求"]');
      await reqIcon.click();
      await page.waitForTimeout(300);
      await shot(page, '03-left-requirement.png');
      // 空态文案
      await expect(page.locator('text=需求信息').first()).toBeVisible();
    });

    // ============================================================
    // 04: 切到"技能"面板
    // ============================================================
    await test.step('04 技能面板（空态展示）', async () => {
      const skillsIcon = page.locator('aside[aria-label="活动栏"] button[title="技能"]');
      await skillsIcon.click();
      await page.waitForTimeout(300);
      await shot(page, '04-left-skills.png');
      await expect(page.locator('text=已选技能').first()).toBeVisible();
    });

    // ============================================================
    // 05: 切到"输出"面板
    // ============================================================
    await test.step('05 输出面板', async () => {
      const outputIcon = page.locator('aside[aria-label="活动栏"] button[title="输出"]');
      await outputIcon.click();
      await page.waitForTimeout(300);
      await shot(page, '05-left-output.png');
      await expect(page.locator('aside[aria-label="侧边面板"] >> text=输出物').first()).toBeVisible();
    });

    // ============================================================
    // 06: 中央 Tab 切到"蓝图" —— 此时步骤 < 4，应显示引导页
    // ============================================================
    await test.step('06 蓝图 Tab 引导页（步骤 < 4）', async () => {
      const blueprintTab = page.locator('button:has-text("蓝图")').first();
      await blueprintTab.click();
      await page.waitForTimeout(300);
      await shot(page, '06-blueprint-empty.png');
      // 引导页文案
      await expect(page.locator('text=画布将根据你的表单数据自动初始化').first()).toBeVisible();
    });

    // ============================================================
    // 07: 走对话流程到步骤 4 —— 触发蓝图 Tab 自动激活 + 真实画布渲染
    // ============================================================
    await test.step('07 走对话 → 步骤 4 → 蓝图自动激活', async () => {
      // 切回对话 Tab
      const chatTab = page.locator('button:has-text("对话")').first();
      await chatTab.click();
      await page.waitForTimeout(300);

      // 步骤 0：描述需求（textarea 在对话 Tab 的输入区）
      const inputArea = page.locator('textarea[aria-label*="消息输入"], textarea[aria-label*="输入"]').first();
      await inputArea.waitFor({ timeout: 10_000 });
      await inputArea.fill('我想创建一个能自动抓取 GitHub Trending 并生成中文摘要的 Agent');
      await inputArea.press('Enter');

      // 等 AI 回复（打字动画 ~1s + 状态推进）
      await page.waitForTimeout(2000);

      // 步骤 1：数据源
      const input2 = page.locator('textarea').first();
      await input2.fill('GitHub');
      await input2.press('Enter');
      await page.waitForTimeout(2000);

      // 步骤 2：输出类型
      const input3 = page.locator('textarea').first();
      await input3.fill('Markdown 摘要 + RSS');
      await input3.press('Enter');
      await page.waitForTimeout(2000);

      // 步骤 3：实现方式 —— 这一步提交后会触发 setActiveWorkTab('blueprint')
      const input4 = page.locator('textarea').first();
      await input4.fill('每小时抓取一次 Top 10 仓库，用 DeepSeek 总结后发布到 Notion');
      await input4.press('Enter');

      // 给模板搜索 + 画布挂载 + React Flow 渲染留时间
      await page.waitForTimeout(4000);

      // 截图：此时应当已经切到蓝图 Tab，且能看到画布
      await shot(page, '07-step4-blueprint-active.png', { fullPage: true });

      // 验收点 1：URL 仍然在 /nvwa
      expect(page.url()).toMatch(/\/nvwa/);

      // 验收点 2：能看到蓝图画布的 ReactFlow 节点（CEO 根节点）
      // ReactFlow 渲染 .react-flow__node 容器
      const flowNodes = page.locator('.react-flow__node');
      const nodeCount = await flowNodes.count();
      console.log(`  ReactFlow 节点数：${nodeCount}`);
      expect(nodeCount, '至少应渲染 CEO 根节点').toBeGreaterThanOrEqual(1);
    });

    // ============================================================
    // 08: 中央 Tab 切到"状态机"
    // ============================================================
    await test.step('08 状态机 Tab', async () => {
      const graphTab = page.locator('button:has-text("状态机")').first();
      await graphTab.click();
      await page.waitForTimeout(500);
      await shot(page, '08-tab-graph.png');

      // 状态机 Tab 内容（空态显示引导页含"开启状态机模式"按钮）
      await expect(page.locator('text=状态机视图').first()).toBeVisible();
    });

    // ============================================================
    // 移动端折叠验证（375x812 iPhone X viewport）
    // ============================================================
    await test.step('09 移动端折叠', async () => {
      await context.close();

      const mobileCtx = await browser.newContext({
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        locale: 'zh-CN',
      });
      const mobilePage = await mobileCtx.newPage();

      await mobilePage.goto(`${WEB_URL}/nvwa`, { waitUntil: 'domcontentloaded' });
      await mobilePage.waitForSelector('text=NvwaX', { timeout: 15_000 });
      await mobilePage.waitForTimeout(800);

      // 移动端 Tab Bar 应可见（4 个：进度/需求/技能/输出）
      await expect(mobilePage.locator('button:has-text("进度")').first()).toBeVisible();
      await expect(mobilePage.locator('button:has-text("需求")').first()).toBeVisible();

      await shot(mobilePage, '09-mobile-collapsed.png');

      await mobileCtx.close();
    });

    // ============================================================
    // 总结
    // ============================================================
    if (errors.length > 0) {
      console.log('\n⚠️ 浏览器捕获的错误（不影响验收，仅记录）：');
      errors.slice(0, 10).forEach((e) => console.log('  ' + e));
    }

    console.log(`\n✅ 截图已保存到：${SHOT_DIR}`);
    console.log('   用文件管理器或图片查看器打开 *.png 即可看到 IDE 工作台效果');
  });
});
