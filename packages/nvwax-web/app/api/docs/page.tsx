'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react';

interface APIParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  auth?: boolean;
  params?: APIParam[];
  body?: APIParam[];
  example: string;
}

interface APICategory {
  category: string;
  endpoints: APIEndpoint[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function APIDocsPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(text);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const apiEndpoints: APICategory[] = [
    {
      category: '搜索 API',
      endpoints: [
        {
          method: 'GET',
          path: '/api/search/agents',
          description: '搜索 Agent',
          params: [
            { name: 'q', type: 'string', required: true, description: '搜索关键词' },
            { name: 'page', type: 'number', required: false, description: '页码，默认 1' },
            { name: 'limit', type: 'number', required: false, description: '每页数量，默认 20' }
          ],
          example: 'GET /api/search/agents?q=ai+agent&page=1&limit=20'
        },
        {
          method: 'GET',
          path: '/api/search/skills',
          description: '搜索 Skills',
          params: [
            { name: 'q', type: 'string', required: true, description: '搜索关键词' },
            { name: 'page', type: 'number', required: false, description: '页码，默认 1' },
            { name: 'limit', type: 'number', required: false, description: '每页数量，默认 20' }
          ],
          example: 'GET /api/search/skills?q=python&page=1&limit=20'
        },
        {
          method: 'POST',
          path: '/api/search/unified',
          description: '统一搜索（Agents + Skills）',
          body: [
            { name: 'q', type: 'string', required: true, description: '搜索关键词' },
            { name: 'page', type: 'number', required: false, description: '页码，默认 1' },
            { name: 'limit', type: 'number', required: false, description: '每页数量，默认 20' }
          ],
          example: 'POST /api/search/unified\n{\n  "q": "ai agent",\n  "page": 1,\n  "limit": 20\n}'
        },
        {
          method: 'GET',
          path: '/api/search/recommend-skills',
          description: '推荐相关 Skills',
          params: [
            { name: 'q', type: 'string', required: true, description: '搜索关键词' },
            { name: 'limit', type: 'number', required: false, description: '推荐数量，默认 5' }
          ],
          example: 'GET /api/search/recommend-skills?q=chatbot&limit=5'
        }
      ]
    },
    {
      category: '爬虫管理',
      endpoints: [
        {
          method: 'POST',
          path: '/api/search/crawl',
          description: '手动触发爬虫任务',
          auth: true,
          example: 'POST /api/search/crawl\nHeaders: {\n  "Authorization": "Bearer <token>"\n}'
        },
        {
          method: 'GET',
          path: '/api/search/crawler-status',
          description: '获取爬虫状态',
          example: 'GET /api/search/crawler-status'
        }
      ]
    },
    {
      category: '用户认证',
      endpoints: [
        {
          method: 'POST',
          path: '/api/auth/register',
          description: '用户注册',
          body: [
            { name: 'email', type: 'string', required: true, description: '邮箱地址' },
            { name: 'password', type: 'string', required: true, description: '密码' },
            { name: 'name', type: 'string', required: false, description: '用户名' }
          ],
          example: 'POST /api/auth/register\n{\n  "email": "user@example.com",\n  "password": "password123",\n  "name": "John Doe"\n}'
        },
        {
          method: 'POST',
          path: '/api/auth/login',
          description: '用户登录',
          body: [
            { name: 'email', type: 'string', required: true, description: '邮箱地址' },
            { name: 'password', type: 'string', required: true, description: '密码' }
          ],
          example: 'POST /api/auth/login\n{\n  "email": "user@example.com",\n  "password": "password123"\n}'
        },
        {
          method: 'GET',
          path: '/api/auth/me',
          description: '获取当前用户信息',
          auth: true,
          example: 'GET /api/auth/me\nHeaders: {\n  "Authorization": "Bearer <token>"\n}'
        }
      ]
    },
    {
      category: '项目管理',
      endpoints: [
        {
          method: 'GET',
          path: '/api/projects',
          description: '获取用户项目列表',
          auth: true,
          example: 'GET /api/projects\nHeaders: {\n  "Authorization": "Bearer <token>"\n}'
        },
        {
          method: 'POST',
          path: '/api/projects',
          description: '创建新项目',
          auth: true,
          body: [
            { name: 'name', type: 'string', required: true, description: '项目名称' },
            { name: 'description', type: 'string', required: false, description: '项目描述' }
          ],
          example: 'POST /api/projects\nHeaders: {\n  "Authorization": "Bearer <token>"\n}\n{\n  "name": "My AI Project",\n  "description": "Building an AI agent"\n}'
        }
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            API 文档
          </h1>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
            v1.0
          </span>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          NvwaX RESTful API 完整参考文档，包含所有端点、参数和使用示例
        </p>
      </div>

      {/* Base URL */}
      <div className="bg-linear-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300">基础 URL</h3>
          <button
            onClick={() => copyToClipboard(API_BASE_URL)}
            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="复制"
          >
            {copiedEndpoint === API_BASE_URL ? (
              <Check size={18} className="text-green-600" />
            ) : (
              <Copy size={18} className="text-gray-500" />
            )}
          </button>
        </div>
        <code className="text-sm bg-white dark:bg-gray-800 px-4 py-3 rounded-lg block font-mono border border-blue-200 dark:border-blue-800">
          {API_BASE_URL}
        </code>
        <p className="mt-3 text-sm text-blue-700 dark:text-blue-300">
          💡 提示：所有 API 请求都需要添加此前缀
        </p>
      </div>

      {/* API Endpoints */}
      <div className="space-y-8">
        {apiEndpoints.map((category, idx) => (
          <div key={idx}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              {category.category}
            </h2>
            
            <div className="space-y-4">
              {category.endpoints.map((endpoint, epIdx) => (
                <div 
                  key={epIdx}
                  className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all"
                >
                  {/* Endpoint Header */}
                  <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                            endpoint.method === 'GET' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800' :
                            endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          }`}>
                            {endpoint.method}
                          </span>
                          <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {endpoint.path}
                          </code>
                          {endpoint.auth && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 rounded-lg text-xs border border-orange-200 dark:border-orange-800 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 17a2 2 0 100-4 2 2 0 000 4zm6-9a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h1V6a5 5 0 0110 0v2h1zm-6-5a3 3 0 00-3 3v2h6V6a3 3 0 00-3-3z"/>
                              </svg>
                              需要认证
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                          {endpoint.description}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => copyToClipboard(endpoint.example)}
                        className="p-2.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors group"
                        title="复制示例"
                      >
                        {copiedEndpoint === endpoint.example ? (
                          <Check size={18} className="text-green-600" />
                        ) : (
                          <Copy size={18} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Parameters */}
                  {(endpoint.params || endpoint.body) && (
                    <div className="p-5 bg-linear-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {endpoint.params ? '查询参数' : '请求体'}
                      </h4>
                      <div className="space-y-2.5">
                        {(endpoint.params || endpoint.body)?.map((param: APIParam, pIdx: number) => (
                          <div key={pIdx} className="flex items-start gap-3 text-sm bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <code className="text-blue-600 dark:text-blue-400 font-mono font-semibold min-w-25">
                              {param.name}
                            </code>
                            <span className="text-gray-500 dark:text-gray-400 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                              {param.type}
                            </span>
                            {param.required && (
                              <span className="text-red-600 dark:text-red-400 text-xs px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                                必填
                              </span>
                            )}
                            <span className="text-gray-600 dark:text-gray-300 flex-1">
                              {param.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Example */}
                  <div className="relative group">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyToClipboard(endpoint.example)}
                        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        title="复制代码"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="p-5 bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto">
                      <pre className="leading-relaxed">{endpoint.example}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-linear-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            需要更多帮助？
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            查看完整的项目文档或在 GitHub 上参与讨论
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a 
              href="https://github.com/BigLionX/NvwaX#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 font-medium"
            >
              <ExternalLink size={18} />
              查看完整文档
            </a>
            <Link 
              href="/faq"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 text-gray-700 dark:text-gray-300 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 font-medium"
            >
              常见问题
            </Link>
            <a 
              href="https://github.com/BigLionX/NvwaX/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              报告问题
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
