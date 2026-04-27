'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs: FAQ[] = [
    {
      category: '入门指南',
      question: 'NvwaX 是什么？',
      answer: 'NvwaX 是一个开源的 AI Agent 搜索、发现和管理平台。它可以帮助您从 GitHub、Gitee、HuggingFace 等多个数据源发现和探索优秀的 AI Agent 项目，支持本地数据库缓存和全网搜索功能。'
    },
    {
      category: '入门指南',
      question: '如何开始使用 NvwaX？',
      answer: '1. 访问首页 http://localhost:3000\n2. 在搜索框中输入关键词（如 "ai agent"）\n3. 浏览搜索结果或使用快速筛选器\n4. 点击感兴趣的 Agent 查看详情\n5. 注册账号后可以创建项目和管理 Agent 团队'
    },
    {
      category: '入门指南',
      question: '需要注册才能使用吗？',
      answer: '基础搜索和浏览功能无需注册即可使用。但如果您想创建项目、管理 Agent 团队或使用高级功能，则需要注册账号。'
    },
    {
      category: '搜索功能',
      question: '如何搜索 Agent？',
      answer: '您可以在首页或搜索页面输入关键词进行搜索。支持的功能包括：\n- 关键词搜索（Agent 名称、描述、标签）\n- 快速筛选（全部、GitHub、Gitee、中国公司）\n- 分页浏览\n- 按星级排序'
    },
    {
      category: '搜索功能',
      question: '搜索数据来源哪里？',
      answer: 'NvwaX 采用混合搜索策略：\n1. 优先搜索本地数据库（已爬取的 240+ Agents）\n2. 如果本地无结果，则进行全网搜索（GitHub API、HuggingFace API）\n3. 搜索结果会自动保存到本地数据库供下次使用'
    },
    {
      category: '搜索功能',
      question: '为什么有时搜索很慢？',
      answer: '首次搜索某个关键词时，如果本地数据库没有相关结果，系统会进行全网搜索，这可能需要几秒钟。后续相同关键词的搜索会直接从本地数据库返回，速度非常快。'
    },
    {
      category: '数据管理',
      question: 'Agent 数据多久更新一次？',
      answer: '系统每 24 小时自动执行一次爬虫任务，从各大平台获取最新的 Agent 数据。管理员也可以在后台手动触发爬取。'
    },
    {
      category: '数据管理',
      question: '数据存储在哪里？',
      answer: '所有 Agent 元数据都存储在 Neon PostgreSQL 云数据库中，确保数据持久化和高可用性。您的个人账户信息也安全地存储在云端。'
    },
    {
      category: '数据管理',
      question: '支持哪些数据源？',
      answer: '目前支持的数据源包括：\n- GitHub（主要来源，200+ Agents）\n- Gitee（中国代码托管平台，15+ Agents）\n- HuggingFace（AI 模型平台）\n- 中国科技公司（百度、阿里、腾讯、华为等）'
    },
    {
      category: '项目管理',
      question: '如何创建项目？',
      answer: '1. 登录您的账号\n2. 访问"我的项目"页面\n3. 点击"创建新项目"\n4. 填写项目名称和描述\n5. 保存后即可开始添加 Agent 团队'
    },
    {
      category: '项目管理',
      question: '什么是 AiTeam？',
      answer: 'AiTeam 是 NvwaX 的核心概念，代表一个 AI Agent 协作团队。您可以在项目中创建多个 AiTeam，每个团队包含多个协同工作的 Agent，用于完成特定任务。'
    },
    {
      category: '技术问题',
      question: '后端服务端口是多少？',
      answer: '后端 API 服务运行在 http://localhost:3001，前端应用运行在 http://localhost:3000。请确保两个服务都在运行。'
    },
    {
      category: '技术问题',
      question: '如何查看 API 文档？',
      answer: '访问 http://localhost:3000/api/docs 查看完整的 API 文档，包括所有端点、参数说明和使用示例。'
    },
    {
      category: '技术问题',
      question: '遇到 "ERR_CONNECTION_REFUSED" 错误怎么办？',
      answer: '这通常表示后端服务未运行。请检查：\n1. 后端服务是否启动（端口 3001）\n2. 在终端运行：cd packages/nvwax-server && npm run dev\n3. 确认 PostgreSQL 数据库连接正常'
    },
    {
      category: '技术问题',
      question: '浏览器显示图标错误怎么办？',
      answer: '这是浏览器缓存问题。请按 Ctrl+Shift+R（Windows）或 Cmd+Shift+R（Mac）硬刷新页面，清除缓存后重新加载。'
    },
    {
      category: '贡献与开源',
      question: '如何贡献代码？',
      answer: '我们欢迎所有形式的贡献！请查看 CONTRIBUTING.md 文件了解详细的贡献流程。您可以通过以下方式参与：\n- 提交 Issue 报告问题\n- 发起 Pull Request 修复 bug\n- 改进文档\n- 提出新功能建议'
    },
    {
      category: '贡献与开源',
      question: '项目使用什么开源协议？',
      answer: 'NvwaX 采用 MIT 开源协议，您可以自由使用、修改和分发代码，只需保留原始的版权声明和许可声明。'
    },
    {
      category: '贡献与开源',
      question: '如何报告 Bug？',
      answer: '请在 GitHub Issues 页面创建新的 Issue，并提供：\n- 问题描述\n- 复现步骤\n- 预期行为\n- 实际行为\n- 环境信息（操作系统、浏览器版本等）\n- 截图或日志（如有）'
    },
    {
      category: '其他',
      question: '有移动端应用吗？',
      answer: '目前 NvwaX 是响应式 Web 应用，可以在手机和平板上正常使用。未来可能会开发原生移动应用。'
    },
    {
      category: '其他',
      question: '如何联系开发团队？',
      answer: '您可以通过以下方式联系我们：\n- GitHub Issues: https://github.com/BigLionX/NvwaX/issues\n- GitHub Discussions: https://github.com/BigLionX/NvwaX/discussions\n- Email: 1055603323@qq.com'
    },
    {
      category: '其他',
      question: '项目路线图是什么？',
      answer: '查看 README.md 中的 Roadmap 部分了解详细计划。主要方向包括：\n- v1.0: 核心搜索和管理功能（已完成）\n- v1.1: SkillHub 集成和工作流引擎\n- v2.0: AI 辅助 Agent 构建和团队协作'
    }
  ];

  // Filter FAQs based on search query
  const filteredFaqs = searchQuery.trim()
    ? faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  // Group by category
  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>返回首页</span>
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            常见问题
          </h1>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
            {faqs.length} 个问题
          </span>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          快速找到您需要的答案，如未找到欢迎提交 Issue
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索问题...（例如：如何搜索、数据存储、API）"
            className="w-full px-4 py-3 pl-12 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-gray-900 dark:text-white shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            找到 {filteredFaqs.length} 个相关结果
          </p>
        )}
      </div>

      {/* FAQ List */}
      <div className="space-y-6">
        {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              {category}
            </h2>
            
            <div className="space-y-3">
              {categoryFaqs.map((faq, idx) => {
                const globalIdx = faqs.findIndex(f => f === faq);
                const isOpen = openIndex === globalIdx;
                
                return (
                  <div 
                    key={globalIdx}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : globalIdx)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all group"
                    >
                      <span className="font-medium text-gray-900 dark:text-white pr-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {faq.question}
                      </span>
                      <span className={`p-2 rounded-lg transition-all ${
                        isOpen 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </button>
                    
                    {isOpen && (
                      <div className="px-6 pb-4 text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredFaqs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">未找到相关问题</p>
          <p className="text-sm mt-2">尝试使用不同的关键词搜索</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            还没找到答案？
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            我们的团队很乐意帮助您，或者您可以查看 API 文档了解更多技术细节
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a 
              href="https://github.com/BigLionX/NvwaX/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              提交 Issue
            </a>
            <Link 
              href="/api/docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 text-gray-700 dark:text-gray-300 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 font-medium"
            >
              查看 API 文档
            </Link>
            <a 
              href="mailto:1055603323@qq.com"
              className="inline-flex items-center gap-2 px-6 py-3 text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              邮件联系
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
