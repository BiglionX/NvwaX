import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "开发者门户 - NvwaX AI Agent & 虚拟公司 平台",
  description:
    "NvwaX 开发者中心提供完整的 API 文档、SDK 指南和示例代码，帮助开发者快速集成 NvwaX AI 服务，构建智能客服、数据分析等 AI 应用。",
  openGraph: {
    title: "NvwaX 开发者门户 - API 文档 & SDK",
    description:
      "全面的 API 文档、SDK 指南、示例项目和开发者工具，助您快速集成 NvwaX AI 服务。",
  },
  alternates: {
    canonical: "https://nvwax.com/developer",
  },
};

export default function DeveloperPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          NvwaX 开发者门户
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          欢迎来到 NvwaX 开发者中心！这里提供完整的 API 文档、SDK 指南和示例代码，帮助您快速集成 NvwaX AI 服务。
        </p>
      </div>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🚀 快速开始</h2>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. 获取 API Key</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          访问 <a href="https://console.nvwax.com" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">NvwaX Console</a> 创建账户并生成 API Key。
        </p>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. 安装 SDK</h3>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 overflow-x-auto">
          <code className="text-sm text-gray-800 dark:text-gray-200">npm install @nvwax/sdk</code>
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. 发送第一个请求</h3>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 overflow-x-auto">
          <code className="text-sm text-gray-800 dark:text-gray-200">{`import { createClient } from '@nvwax/sdk';

const client = createClient('nvwx_your_api_key');

const response = await client.chat('Hello, NvwaX!');
console.log(response);`}</code>
        </pre>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 核心产品 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📚 核心产品</h2>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Chat Completions API</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3">OpenAI 兼容的对话 API，支持多 Agent 协作。</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-3"><strong>端点</strong>: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">POST /v1/chat/completions</code></p>
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-sm text-gray-800 dark:text-gray-200">{`const response = await client.createChatCompletion({
  model: 'marketing-team-v1',
  messages: [
    { role: 'user', content: 'How to improve conversion rates?' }
  ],
  temperature: 0.7
});`}</code>
          </pre>
          <Link href="/docs/api/chat-completions" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">查看完整文档 →</Link>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. Agent Marketplace Web Component</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3">将 Agent 广场嵌入您的应用。</p>
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-sm text-gray-800 dark:text-gray-200">{`<nvwax-agent-marketplace 
  api-key="your-api-key"
  base-url="https://api.nvwax.com">
</nvwax-agent-marketplace>`}</code>
          </pre>
          <Link href="/docs/components/agent-marketplace" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">查看完整文档 →</Link>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. Agent Studio</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3">低代码 Agent 构建器，可视化创建工作流。</p>
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-sm text-gray-800 dark:text-gray-200">{`<nvwax-agent-studio 
  api-key="your-api-key"
  base-url="https://studio.nvwax.com">
</nvwax-agent-studio>`}</code>
          </pre>
          <Link href="/docs/components/agent-studio" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">查看完整文档 →</Link>
        </div>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* SDK 和工具 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🛠️ SDK 和工具</h2>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">JavaScript/TypeScript SDK</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 ml-4 mb-4">
            <li><strong>包名</strong>: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">@nvwax/sdk</code></li>
            <li><strong>支持环境</strong>: Node.js 14+, 现代浏览器</li>
            <li><strong>功能</strong>: Chat API, API Key 管理, 使用量统计</li>
          </ul>
          <Link href="/docs/sdk/javascript" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">安装指南 →</Link>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Web Components</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 ml-4 mb-4">
            <li><strong>Agent Marketplace</strong>: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">@nvwax/agent-marketplace</code></li>
            <li><strong>Agent Studio</strong>: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">@nvwax/agent-studio</code></li>
            <li><strong>框架支持</strong>: React, Vue, Angular, 原生 JS</li>
          </ul>
          <Link href="/docs/components" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">组件文档 →</Link>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">API 客户端库</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 ml-4">
            <li>Python (即将推出)</li>
            <li>Go (即将推出)</li>
            <li>Java (即将推出)</li>
          </ul>
        </div>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📖 API 参考</h2>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">认证</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3">所有 API 请求都需要在 Header 中包含 API Key：</p>
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 overflow-x-auto">
            <code className="text-sm text-gray-800 dark:text-gray-200">Authorization: Bearer nvwx_your_api_key</code>
          </pre>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">速率限制</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">套餐</th>
                  <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">每小时请求数</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">Free</td>
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">1,000</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">Pro</td>
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">50,000</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">Enterprise</td>
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">无限制</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">超出限制将返回 <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">429 Too Many Requests</code>。</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">错误码</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">状态码</th>
                  <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">说明</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">400</td><td className="py-2 px-4 text-sm text-gray-600">请求参数错误</td></tr>
                <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">401</td><td className="py-2 px-4 text-sm text-gray-600">认证失败</td></tr>
                <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">403</td><td className="py-2 px-4 text-sm text-gray-600">权限不足</td></tr>
                <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">429</td><td className="py-2 px-4 text-sm text-gray-600">速率限制</td></tr>
                <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">500</td><td className="py-2 px-4 text-sm text-gray-600">服务器错误</td></tr>
              </tbody>
            </table>
          </div>
          <Link href="/docs/api-reference" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-4 inline-block">完整 API 参考 →</Link>
        </div>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 示例项目 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">💡 示例项目</h2>
        
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {[
            { title: "客服机器人", desc: "使用 NvwaX 构建智能客服系统。", href: "/examples/customer-service-bot" },
            { title: "营销内容生成器", desc: "自动生成营销文案和社交媒体内容。", href: "/examples/marketing-content-generator" },
            { title: "数据分析助手", desc: "连接数据源，自动生成洞察报告。", href: "/examples/data-analysis-assistant" },
            { title: "代码审查助手", desc: "自动审查代码并提供改进建议。", href: "/examples/code-review-assistant" },
          ].map((item) => (
            <Link key={item.title} href={item.href} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
            </Link>
          ))}
        </div>
        <Link href="/examples" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">查看更多示例 →</Link>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 开发者工具 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🔧 开发者工具</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "API Playground", desc: "在线测试 API 端点，无需编写代码。", href: "/playground" },
            { title: "Webhook 调试工具", desc: "测试和调试 Webhook 事件。", href: "/webhook-debugger" },
            { title: "SDK 生成器", desc: "根据您的配置生成定制化的 SDK 代码。", href: "/sdk-generator" },
          ].map((item) => (
            <Link key={item.title} href={item.href} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 计费与配额 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📊 计费与配额</h2>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">方案</th>
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">价格</th>
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Token 配额</th>
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">功能</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">Free</td><td className="py-2 px-4 text-sm text-gray-600">$0/月</td><td className="py-2 px-4 text-sm text-gray-600">100K</td><td className="py-2 px-4 text-sm text-gray-600">基础功能</td></tr>
              <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">Pro</td><td className="py-2 px-4 text-sm text-gray-600">$49/月</td><td className="py-2 px-4 text-sm text-gray-600">5M</td><td className="py-2 px-4 text-sm text-gray-600">高级功能 + 优先支持</td></tr>
              <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">Enterprise</td><td className="py-2 px-4 text-sm text-gray-600">定制</td><td className="py-2 px-4 text-sm text-gray-600">无限制</td><td className="py-2 px-4 text-sm text-gray-600">专属支持 + SLA</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-3">实时查看 API 使用情况和成本。</p>
        <a href="https://console.nvwax.com/usage" className="text-blue-600 dark:text-blue-400 hover:underline text-sm" target="_blank" rel="noopener noreferrer">查看控制台 →</a>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 学习资源 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🎓 学习资源</h2>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">教程</h3>
          <ul className="space-y-2">
            {[
              { title: "5分钟快速入门", href: "/tutorials/quick-start" },
              { title: "构建第一个 Agent", href: "/tutorials/build-first-agent" },
              { title: "集成到 React 应用", href: "/tutorials/react-integration" },
              { title: "Webhook 最佳实践", href: "/tutorials/webhook-best-practices" },
            ].map((item) => (
              <li key={item.title}>
                <Link href={item.href} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{item.title}</Link>
              </li>
            ))}
          </ul>
        </div>
        <Link href="/tutorials" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">查看所有教程 →</Link>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 社区与支持 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🤝 社区与支持</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <a href="https://discord.gg/nvwax" target="_blank" rel="noopener noreferrer" className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Discord 社区</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">加入我们的开发者社区，与其他开发者交流经验。</p>
          </a>
          <a href="https://github.com/BigLionX/NvwaX" target="_blank" rel="noopener noreferrer" className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">GitHub</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">查看源代码，报告问题，提交 PR。</p>
          </a>
          <a href="https://console.nvwax.com/support" target="_blank" rel="noopener noreferrer" className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">技术支持</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">邮箱: support@nvwax.com · 工单系统</p>
          </a>
        </div>
        <details className="mb-4">
          <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">响应时间详情</summary>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400 ml-4 mt-2">
            <li>Free: 48小时</li>
            <li>Pro: 24小时</li>
            <li>Enterprise: 4小时</li>
          </ul>
        </details>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 更新日志 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📢 更新日志</h2>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">v1.0.0 (2026-04-26)</h3>
        <ul className="space-y-1 text-gray-600 dark:text-gray-400 ml-4 mb-4">
          <li>✅ 发布 Chat Completions API</li>
          <li>✅ 发布 JavaScript SDK</li>
          <li>✅ 发布 Agent Marketplace Web Component</li>
          <li>✅ 发布 Agent Studio iframe 组件</li>
          <li>✅ 支持 Webhook 事件系统</li>
          <li>✅ 支持 RBAC 权限控制</li>
        </ul>
        <Link href="/changelog" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">查看完整更新日志 →</Link>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 常见问题 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">❓ 常见问题</h2>
        <div className="space-y-6">
          {[
            { q: "如何获取 API Key?", a: "注册账户后，在 Console 中生成 API Key。" },
            { q: "支持哪些编程语言?", a: "目前官方支持 JavaScript/TypeScript。Python、Go、Java 客户端正在开发中。" },
            { q: "如何升级套餐?", a: "在 Console 中选择新套餐并完成支付。" },
            { q: "可以私有化部署吗?", a: "是的，Enterprise 套餐支持私有化部署。请联系销售团队了解详情。" },
          ].map((faq) => (
            <div key={faq.q}>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{faq.q}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{faq.a}</p>
            </div>
          ))}
        </div>
        <Link href="/faq" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-4 inline-block">查看更多 FAQ →</Link>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 联系我们 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📞 联系我们</h2>
        <ul className="space-y-2 text-gray-600 dark:text-gray-400">
          <li><strong>销售咨询</strong>: sales@nvwax.com</li>
          <li><strong>技术支持</strong>: support@nvwax.com</li>
          <li><strong>商务合作</strong>: partnerships@nvwax.com</li>
        </ul>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-8" />

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 dark:text-gray-500">
        <p className="mb-2">© 2026 NvwaX. All rights reserved.</p>
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:underline">隐私政策</Link>
          <Link href="/terms" className="hover:underline">服务条款</Link>
          <a href="https://status.nvwax.com" className="hover:underline" target="_blank" rel="noopener noreferrer">状态页面</a>
        </div>
      </footer>
    </div>
  );
}
