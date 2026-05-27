'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProjectData {
  projectName: string;
  progress: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    completionRate: number;
  };
  testCoverage: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  teamStats: {
    members: number;
    activeMembers: number;
    commitsThisWeek: number;
    pullRequests: number;
    codeReviews: number;
  };
  timeline: Array<{ date: string; tasks: number; coverage: number }>;
  roleDistribution: Array<{ name: string; value: number; color: string }>;
}

/**
 * NvwaX Project Dashboard
 * 
 * 功能:
 * - 项目进度追踪
 * - 测试覆盖率展示
 * - 性能监控面板
 * - 团队协作统计
 */

export default function ProjectDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  // 模拟数据 (实际项目中从 API 获取)
  useEffect(() => {
    setTimeout(() => {
      setProjectData({
        projectName: '全栈开发团队示例项目',
        progress: {
          totalTasks: 45,
          completedTasks: 28,
          inProgressTasks: 12,
          todoTasks: 5,
          completionRate: 62.2
        },
        testCoverage: {
          lines: 87.5,
          branches: 82.3,
          functions: 91.2,
          statements: 88.7
        },
        performance: {
          avgResponseTime: 245,
          p95ResponseTime: 450,
          p99ResponseTime: 780,
          throughput: 1250,
          errorRate: 0.5
        },
        teamStats: {
          members: 7,
          activeMembers: 6,
          commitsThisWeek: 45,
          pullRequests: 12,
          codeReviews: 28
        },
        timeline: [
          { date: '2026-04-20', tasks: 5, coverage: 45 },
          { date: '2026-04-21', tasks: 8, coverage: 52 },
          { date: '2026-04-22', tasks: 12, coverage: 61 },
          { date: '2026-04-23', tasks: 18, coverage: 70 },
          { date: '2026-04-24', tasks: 23, coverage: 78 },
          { date: '2026-04-25', tasks: 26, coverage: 83 },
          { date: '2026-04-26', tasks: 28, coverage: 87.5 }
        ],
        roleDistribution: [
          { name: '产品经理', value: 1, color: '#6366f1' },
          { name: 'UI/UX设计师', value: 1, color: '#ec4899' },
          { name: '前端开发', value: 1, color: '#10b981' },
          { name: '后端开发', value: 1, color: '#f59e0b' },
          { name: '数据库工程师', value: 1, color: '#8b5cf6' },
          { name: '测试工程师', value: 1, color: '#ef4444' },
          { name: 'DevOps工程师', value: 1, color: '#06b6d4' }
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载 Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📊 NvwaX Project Dashboard
          </h1>
          {projectData && (
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {projectData.projectName}
            </p>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'progress', 'testing', 'performance', 'team'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {projectData && activeTab === 'overview' && <OverviewTab data={projectData} />}
        {projectData && activeTab === 'progress' && <ProgressTab data={projectData} />}
        {projectData && activeTab === 'testing' && <TestingTab data={projectData} />}
        {projectData && activeTab === 'performance' && <PerformanceTab data={projectData} />}
        {projectData && activeTab === 'team' && <TeamTab data={projectData} />}
      </main>
    </div>
  );
}

// Overview Tab
function OverviewTab({ data }: { data: ProjectData }) {
  const stats = [
    { label: '总任务数', value: data.progress.totalTasks, color: 'blue' },
    { label: '已完成', value: data.progress.completedTasks, color: 'green' },
    { label: '进行中', value: data.progress.inProgressTasks, color: 'yellow' },
    { label: '完成率', value: `${data.progress.completionRate}%`, color: 'blue' },
    { label: '测试覆盖率', value: `${data.testCoverage.lines}%`, color: 'indigo' },
    { label: '团队成员', value: data.teamStats.members, color: 'pink' }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">任务完成趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="tasks" stroke="#6366f1" name="完成任务" />
              <Line type="monotone" dataKey="coverage" stroke="#10b981" name="测试覆盖率(%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Team Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">团队角色分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.roleDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={({ name, percent }: any) => `${name || ''} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.roleDistribution.map((entry: { name: string; value: number; color: string }, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Progress Tab
function ProgressTab({ data }: { data: ProjectData }) {
  const statusData = [
    { name: '已完成', value: data.progress.completedTasks, color: '#10b981' },
    { name: '进行中', value: data.progress.inProgressTasks, color: '#f59e0b' },
    { name: '待开始', value: data.progress.todoTasks, color: '#6b7280' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">任务状态分布</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1">
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">本周活动</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Commits</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.teamStats.commitsThisWeek}</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pull Requests</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.teamStats.pullRequests}</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Code Reviews</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.teamStats.codeReviews}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Testing Tab
function TestingTab({ data }: { data: ProjectData }) {
  const coverageData = [
    { name: 'Lines', value: data.testCoverage.lines, fill: '#10b981' },
    { name: 'Branches', value: data.testCoverage.branches, fill: '#6366f1' },
    { name: 'Functions', value: data.testCoverage.functions, fill: '#f59e0b' },
    { name: 'Statements', value: data.testCoverage.statements, fill: '#ec4899' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">测试覆盖率</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={coverageData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" />
            <Tooltip />
            <Bar dataKey="value">
              {coverageData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {coverageData.map((item, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.name} Coverage</p>
                <p className="text-3xl font-bold" style={{ color: item.fill }}>{item.value}%</p>
              </div>
              <div className="w-16 h-16 rounded-full border-4" style={{ borderColor: item.fill }}>
                <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: item.fill }}>
                  {item.value >= 90 ? '✓' : '⚠'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Performance Tab
function PerformanceTab({ data }: { data: ProjectData }) {
  const metrics = [
    { label: '平均响应时间', value: `${data.performance.avgResponseTime}ms`, threshold: 500, good: true },
    { label: 'P95 响应时间', value: `${data.performance.p95ResponseTime}ms`, threshold: 1000, good: true },
    { label: 'P99 响应时间', value: `${data.performance.p99ResponseTime}ms`, threshold: 2000, good: true },
    { label: '吞吐量', value: `${data.performance.throughput} req/s`, threshold: 1000, good: true },
    { label: '错误率', value: `${data.performance.errorRate}%`, threshold: 1, good: true }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</p>
            <p className={`mt-2 text-2xl font-bold ${metric.good ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-gray-500">阈值: {metric.threshold}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">性能指标说明</h3>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>✅ <strong>平均响应时间</strong>: 所有请求的平均响应时间，目标 &lt; 500ms</p>
          <p>✅ <strong>P95 响应时间</strong>: 95% 的请求在此时间内完成，目标 &lt; 1000ms</p>
          <p>✅ <strong>P99 响应时间</strong>: 99% 的请求在此时间内完成，目标 &lt; 2000ms</p>
          <p>✅ <strong>吞吐量</strong>: 每秒处理的请求数，目标 &gt; 1000 req/s</p>
          <p>✅ <strong>错误率</strong>: 失败请求的百分比，目标 &lt; 1%</p>
        </div>
      </div>
    </div>
  );
}

// Team Tab
function TeamTab({ data }: { data: ProjectData }) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">团队概览</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.teamStats.members}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">总成员</p>
          </div>
          <div className="text-center p-4">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{data.teamStats.activeMembers}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">活跃成员</p>
          </div>
          <div className="text-center p-4">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.teamStats.commitsThisWeek}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">本周 Commits</p>
          </div>
          <div className="text-center p-4">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{data.teamStats.codeReviews}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">代码审查</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">团队成员角色</h3>
        <div className="space-y-3">
          {data.roleDistribution.map((role, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }}></div>
                <span className="font-medium text-gray-900 dark:text-white">{role.name}</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">1 人</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
