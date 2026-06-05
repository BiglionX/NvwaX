import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;
  return {
    title: "API Reference - NvwaX",
    description: "NvwaX Developer API 完整参考文档 - 包括 Marketplace、Agent、AiTeam、搜索和导出等全部公开接口",
    alternates: {
      canonical: "https://nvwax.proclaw.cc/developer/api-reference",
    },
    openGraph: {
      title: "API Reference - NvwaX",
      description: "NvwaX Developer API 完整参考文档 - 包括 Marketplace、Agent、AiTeam、搜索和导出等全部公开接口",
      url: "https://nvwax.proclaw.cc/developer/api-reference",
      siteName: "NvwaX",
      type: "website",
    },
  };
}

const ApiEndpoint = ({ method, path, auth, description, params, requestBody, response }: {
  method: string;
  path: string;
  auth: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: string;
  response?: string;
}) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
    <div className="flex items-center gap-3 mb-4">
      <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold text-white ${
        method === 'GET' ? 'bg-green-500' :
        method === 'POST' ? 'bg-blue-500' :
        method === 'PUT' ? 'bg-orange-500' :
        method === 'DELETE' ? 'bg-red-500' : 'bg-gray-500'
      }`}>{method}</span>
      <code className="text-sm font-mono text-gray-800 dark:text-gray-200">{path}</code>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
    <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
      <strong>认证方式:</strong> {auth}
    </p>

    {params && params.length > 0 && (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">请求参数</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium">参数名</th>
                <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium">类型</th>
                <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium">必填</th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">说明</th>
              </tr>
            </thead>
            <tbody>
              {params.map(p => (
                <tr key={p.name} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 font-mono text-gray-800 dark:text-gray-200">{p.name}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{p.type}</td>
                  <td className="py-2 pr-4">{p.required ? <span className="text-red-500">是</span> : <span className="text-gray-400">否</span>}</td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {requestBody && (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">请求示例</h4>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
          <code className="text-xs text-gray-800 dark:text-gray-200">{requestBody}</code>
        </pre>
      </div>
    )}

    {response && (
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">响应示例</h4>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
          <code className="text-xs text-gray-800 dark:text-gray-200">{response}</code>
        </pre>
      </div>
    )}
  </div>
);

const SectionHeader = ({ id, title }: { id: string; title: string }) => (
  <h2 id={id} className="text-2xl font-bold text-gray-900 dark:text-white mb-6 scroll-mt-20">
    {title}
    <a href={`#${id}`} className="ml-2 text-blue-500 hover:text-blue-600 text-sm font-normal">#</a>
  </h2>
);

export default async function ApiReferencePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">API Reference</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        NvwaX Developer API 完整文档。所有公开 API 使用 API Key 认证（<code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">Authorization: Bearer nvwx_xxx</code>）。
      </p>

      {/* 目录导航 */}
      <nav className="mb-12 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">目录</h3>
        <ul className="space-y-1.5 text-sm">
          <li><a href="#authentication" className="text-blue-600 dark:text-blue-400 hover:underline">认证方式</a></li>
          <li><a href="#marketplace" className="text-blue-600 dark:text-blue-400 hover:underline">Marketplace - Agent/AiTeam 市场</a></li>
          <li><a href="#agents" className="text-blue-600 dark:text-blue-400 hover:underline">Agents - Agent 管理</a></li>
          <li><a href="#aiteams" className="text-blue-600 dark:text-blue-400 hover:underline">AiTeams - AiTeam 管理</a></li>
          <li><a href="#search" className="text-blue-600 dark:text-blue-400 hover:underline">Search - 搜索</a></li>
          <li><a href="#export" className="text-blue-600 dark:text-blue-400 hover:underline">Export - 导出下载</a></li>
          <li><a href="#errors" className="text-blue-600 dark:text-blue-400 hover:underline">错误码</a></li>
        </ul>
      </nav>

      {/* 认证方式 */}
      <section className="mb-16">
        <SectionHeader id="authentication" title="认证方式" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          所有 API 请求需要在 HTTP Header 中携带 API Key：
        </p>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <code className="text-sm text-gray-800 dark:text-gray-200">Authorization: Bearer nvwx_your_api_key_here</code>
        </pre>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          API Key 可在用户中心 &gt; Profile &gt; API Keys 页面创建。不同权限的 Key 可以访问不同的 API 端点。
        </p>
      </section>

      {/* Marketplace */}
      <section className="mb-16">
        <SectionHeader id="marketplace" title="Marketplace - Agent/AiTeam 市场" />

        <ApiEndpoint
          method="GET"
          path="/api/v1/marketplace/agents"
          auth="API Key (marketplace:read)"
          description="搜索已发布的 Agent 列表"
          params={[
            { name: "q", type: "string", required: false, description: "搜索关键词" },
            { name: "category", type: "string", required: false, description: "分类过滤" },
            { name: "tags", type: "string", required: false, description: "标签过滤（逗号分隔）" },
            { name: "page", type: "number", required: false, description: "页码，默认 1" },
            { name: "limit", type: "number", required: false, description: "每页数量，最大 50，默认 20" },
          ]}
          response={`{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "agent-uuid",
        "name": "电商客服 Agent",
        "description": "智能客服机器人...",
        "category": "customer-service",
        "tags": ["ecommerce", "chatbot"],
        "rating": 4.7,
        "download_count": 1523,
        "publish_status": "published"
      }
    ],
    "total": 156
  }
}`}
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/marketplace/agents/:id"
          auth="API Key (marketplace:read)"
          description="获取单个 Agent 完整详情"
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/marketplace/categories"
          auth="API Key (marketplace:read)"
          description="获取 Agent 分类列表（含各分类数量）"
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/marketplace/aiteams"
          auth="API Key (marketplace:read)"
          description="搜索已发布的 AiTeam 列表"
          params={[
            { name: "q", type: "string", required: false, description: "搜索关键词" },
            { name: "industry", type: "string", required: false, description: "行业过滤" },
            { name: "page", type: "number", required: false, description: "页码，默认 1" },
            { name: "limit", type: "number", required: false, description: "每页数量，最大 50，默认 20" },
          ]}
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/marketplace/aiteams/:id"
          auth="API Key (marketplace:read)"
          description="获取单个 AiTeam 完整详情"
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/marketplace/industries"
          auth="API Key (marketplace:read)"
          description="获取行业分类列表"
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/marketplace/plugins/:id"
          auth="API Key (marketplace:read)"
          description="获取行业插件详情（含 Agent 明细）"
        />
      </section>

      {/* Agents */}
      <section className="mb-16">
        <SectionHeader id="agents" title="Agents - Agent 管理" />

        <ApiEndpoint
          method="POST"
          path="/api/v1/agents"
          auth="API Key (agent:create)"
          description="创建新的 Agent"
          requestBody={`{
  "name": "我的自定义 Agent",
  "description": "用于处理订单查询的智能体",
  "config": {
    "model": "deepseek-v3",
    "temperature": 0.7,
    "system_prompt": "你是一个订单查询助手..."
  },
  "skills": ["order-query"],
  "category": "customer-service",
  "tags": ["ecommerce", "order"]
}`}
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/agents"
          auth="API Key (agent:read)"
          description="列出当前开发者创建的所有 Agent"
          params={[
            { name: "status", type: "string", required: false, description: "过滤状态: draft, published, private" },
            { name: "page", type: "number", required: false, description: "页码，默认 1" },
            { name: "limit", type: "number", required: false, description: "每页数量，默认 20" },
          ]}
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/agents/:id"
          auth="API Key (agent:read)"
          description="获取自己的 Agent 详情"
        />

        <ApiEndpoint
          method="PUT"
          path="/api/v1/agents/:id"
          auth="API Key (agent:update)"
          description="更新 Agent 配置"
        />

        <ApiEndpoint
          method="DELETE"
          path="/api/v1/agents/:id"
          auth="API Key (agent:delete)"
          description="删除 Agent"
        />

        <ApiEndpoint
          method="POST"
          path="/api/v1/agents/:id/publish"
          auth="API Key (agent:publish)"
          description="发布 Agent 到市场"
        />

        <ApiEndpoint
          method="POST"
          path="/api/v1/agents/:id/unpublish"
          auth="API Key (agent:publish)"
          description="取消发布 Agent"
        />
      </section>

      {/* AiTeams */}
      <section className="mb-16">
        <SectionHeader id="aiteams" title="AiTeams - AiTeam 管理" />

        <ApiEndpoint
          method="POST"
          path="/api/v1/aiteams"
          auth="API Key (aiteam:create)"
          description="创建新的 AiTeam"
          requestBody={`{
  "name": "电商运营团队",
  "description": "负责电商日常运营的 AI 团队",
  "members": [
    { "agent_id": "agent-uuid-1", "role": "客服主管" },
    { "agent_id": "agent-uuid-2", "role": "数据分析师" }
  ],
  "category": "ecommerce",
  "tags": ["operations"]
}`}
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/aiteams"
          auth="API Key (aiteam:read)"
          description="列出当前开发者创建的所有 AiTeam"
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/aiteams/:id"
          auth="API Key (aiteam:read)"
          description="获取自己的 AiTeam 详情"
        />

        <ApiEndpoint
          method="PUT"
          path="/api/v1/aiteams/:id"
          auth="API Key (aiteam:update)"
          description="更新 AiTeam 配置"
        />

        <ApiEndpoint
          method="DELETE"
          path="/api/v1/aiteams/:id"
          auth="API Key (aiteam:delete)"
          description="删除 AiTeam"
        />

        <ApiEndpoint
          method="POST"
          path="/api/v1/aiteams/:id/publish"
          auth="API Key (aiteam:publish)"
          description="发布 AiTeam 到市场"
        />

        <ApiEndpoint
          method="POST"
          path="/api/v1/aiteams/:id/unpublish"
          auth="API Key (aiteam:publish)"
          description="取消发布 AiTeam"
        />
      </section>

      {/* Search */}
      <section className="mb-16">
        <SectionHeader id="search" title="Search - 搜索" />

        <ApiEndpoint
          method="GET"
          path="/api/v1/search/agents"
          auth="API Key (search:read)"
          description="全网 Agent 搜索（GitHub / HuggingFace / 本地）"
          params={[
            { name: "q", type: "string", required: true, description: "搜索关键词" },
            { name: "page", type: "number", required: false, description: "页码，默认 1" },
            { name: "limit", type: "number", required: false, description: "每页数量，最大 50，默认 20" },
          ]}
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/search/skills"
          auth="API Key (search:read)"
          description="SkillHub 技能搜索"
          params={[
            { name: "q", type: "string", required: true, description: "搜索关键词" },
            { name: "page", type: "number", required: false, description: "页码，默认 1" },
            { name: "limit", type: "number", required: false, description: "每页数量，最大 50，默认 20" },
          ]}
        />

        <ApiEndpoint
          method="POST"
          path="/api/v1/search/unified"
          auth="API Key (search:read)"
          description="统一搜索（同时搜索 Agents + Skills）"
          requestBody={`{
  "q": "客服机器人",
  "page": 1,
  "limit": 20
}`}
        />
      </section>

      {/* Export */}
      <section className="mb-16">
        <SectionHeader id="export" title="Export - 导出下载" />

        <ApiEndpoint
          method="POST"
          path="/api/v1/agents/:id/export"
          auth="API Key (export:read)"
          description="导出 Agent（JSON / YAML / ProClaw 格式）"
          requestBody={`{
  "format": "json",
  "includeMetadata": true,
  "includeImplementation": false
}`}
        />

        <ApiEndpoint
          method="POST"
          path="/api/v1/aiteams/:id/export"
          auth="API Key (export:read)"
          description="导出 AiTeam（JSON / YAML / ProClaw 格式）"
          requestBody={`{
  "format": "json",
  "includeMetadata": true
}`}
        />

        <ApiEndpoint
          method="POST"
          path="/api/v1/export/batch"
          auth="API Key (export:read)"
          description="批量导出多个 Agent/AiTeam"
          requestBody={`{
  "items": [
    { "type": "agent", "id": "agent-uuid-1" },
    { "type": "aiteam", "id": "aiteam-uuid-2" }
  ],
  "format": "json"
}`}
        />

        <ApiEndpoint
          method="GET"
          path="/api/v1/export/history"
          auth="API Key (export:read)"
          description="获取导出历史记录"
          params={[
            { name: "limit", type: "number", required: false, description: "返回条数，默认 20" },
          ]}
        />
      </section>

      {/* 错误码 */}
      <section className="mb-16">
        <SectionHeader id="errors" title="错误码" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">状态码</th>
                <th className="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">错误码</th>
                <th className="text-left py-3 font-semibold text-gray-700 dark:text-gray-300">说明</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 pr-4 font-mono text-gray-800 dark:text-gray-200">400</td>
                <td className="py-3 pr-4 font-mono text-gray-600 dark:text-gray-400">VALIDATION_ERROR</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">请求参数验证失败</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 pr-4 font-mono text-gray-800 dark:text-gray-200">401</td>
                <td className="py-3 pr-4 font-mono text-gray-600 dark:text-gray-400">MISSING_AUTH_HEADER / INVALID_API_KEY</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">缺少认证信息或 API Key 无效</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 pr-4 font-mono text-gray-800 dark:text-gray-200">403</td>
                <td className="py-3 pr-4 font-mono text-gray-600 dark:text-gray-400">INSUFFICIENT_PERMISSIONS</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">API Key 权限不足</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 pr-4 font-mono text-gray-800 dark:text-gray-200">404</td>
                <td className="py-3 pr-4 font-mono text-gray-600 dark:text-gray-400">NOT_FOUND</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">请求的资源不存在</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 pr-4 font-mono text-gray-800 dark:text-gray-200">429</td>
                <td className="py-3 pr-4 font-mono text-gray-600 dark:text-gray-400">RATE_LIMIT_EXCEEDED</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">超过速率限制</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 pr-4 font-mono text-gray-800 dark:text-gray-200">500</td>
                <td className="py-3 pr-4 font-mono text-gray-600 dark:text-gray-400">INTERNAL_ERROR</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">服务器内部错误</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* SDK 快速用法 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">SDK 快速用法</h2>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
          <code className="text-sm text-gray-800 dark:text-gray-200">{`import { createClient } from '@nvwax/sdk';

const client = createClient('nvwx_your_api_key');

// 浏览市场
const agents = await client.marketplace.searchAgents({ q: '客服', limit: 10 });

// 管理 Agent
const myAgent = await client.agents.create({ name: '我的 Agent', description: '...' });
await client.agents.publish(myAgent.data.id);

// 管理 AiTeam
const team = await client.aiteams.create({
  name: '运营团队',
  members: [{ agent_id: agentId, role: '主管' }]
});

// 搜索
const results = await client.search.searchAgents({ q: 'transformer' });

// 导出
const exportResult = await client.exportModule.agent(agentId, { format: 'json' });`}</code>
        </pre>
      </section>
    </div>
  );
}
