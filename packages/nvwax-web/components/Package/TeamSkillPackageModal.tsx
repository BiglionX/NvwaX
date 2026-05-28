'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Loader, AlertCircle, Package, Sparkles, CheckCircle } from 'lucide-react';
import { teamSkillApi } from '@/lib/api/team-skills';
import { ProClawExportResult } from '@/lib/api/proclaw';

interface TeamSkillPackageInfo {
  teamName: string;
  description: string;
  category: string;
  rolesCount: number;
  workflowSteps: number;
  estimatedSize: number;
}

interface TeamSkillBuildJob {
  id: string;
  teamSkillId: string;
  platform: 'windows' | 'macos' | 'linux';
  status: 'queued' | 'building' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface TeamSkillPackageModalProps {
  teamSkillId: string;
  teamSkillName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamSkillPackageModal({ 
  teamSkillId, 
  teamSkillName, 
  isOpen, 
  onClose 
}: TeamSkillPackageModalProps) {
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux'>('windows');
  const [packageInfo, setPackageInfo] = useState<TeamSkillPackageInfo | null>(null);
  const [buildJob, setBuildJob] = useState<TeamSkillBuildJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<'local' | 'proclaw'>('local');
  const [proClawResult, setProClawResult] = useState<ProClawExportResult | null>(null);

  const pollBuildStatus = useCallback(async () => {
    if (!buildJob) return;

    try {
      const job = await teamSkillApi.getBuildStatus(buildJob.id);
      setBuildJob(job);
    } catch (err) {
      console.error('Failed to poll build status:', err);
    }
  }, [buildJob]);

  // 当模态框打开时加载包信息
  useEffect(() => {
    let isMounted = true;
    
    if (isOpen && teamSkillId) {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const info = await teamSkillApi.getPackageInfo(teamSkillId);
          if (isMounted) {
            setPackageInfo(info);
          }
        } catch (err) {
          console.error('Failed to load package info:', err);
          if (isMounted) {
            setError('无法加载包信息');
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };
      
      fetchData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, teamSkillId]);

  // 轮询构建状态
  useEffect(() => {
    if (!buildJob || buildJob.status === 'completed' || buildJob.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      pollBuildStatus();
    }, 3000); // 每3秒轮询一次

    return () => clearInterval(interval);
  }, [buildJob, pollBuildStatus]);

  const handleExportToProClaw = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 在实际应用中，这里应该先检查用户是否已登录 ProClaw
      // 如果未登录，则引导用户进行 OAuth 授权
      const token = localStorage.getItem('proclaw_token') || 'mock-token-for-dev';
      
      const result = await teamSkillApi.exportToProClaw(teamSkillId, token);
      setProClawResult(result);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to export to ProClaw:', err);
      setError(err instanceof Error ? err.message : '导出到 ProClaw 失败');
      setIsLoading(false);
    }
  };

  const handleBuild = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await teamSkillApi.buildPackage(teamSkillId, {
        platform,
        includeExamples: false
      });

      setBuildJob({
        id: result.jobId,
        teamSkillId,
        platform,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString()
      });

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to trigger build:', err);
      setError(err instanceof Error ? err.message : '打包失败');
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (buildJob?.downloadUrl) {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const BACKEND_ORIGIN = (() => {
        try {
          return new URL(API_BASE).origin;
        } catch {
          return 'http://localhost:3001';
        }
      })();
      window.location.href = `${BACKEND_ORIGIN}${buildJob.downloadUrl}`;
    }
  };

  const handleClose = () => {
    // 重置状态
    setBuildJob(null);
    setPackageInfo(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-blue-500 to-blue-700 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                打包 AiTeam
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {teamSkillName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* ProClaw Export Result */}
          {proClawResult && (
            <div className="space-y-4">
              <div className={`p-6 rounded-xl border ${proClawResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <div className="flex items-start gap-3">
                  {proClawResult.success ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0 mt-1" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-1" />
                  )}
                  <div>
                    <h3 className={`font-bold ${proClawResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                      {proClawResult.success ? '导出成功！' : '导出失败'}
                    </h3>
                    <p className={`text-sm mt-1 ${proClawResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {proClawResult.message}
                    </p>
                    {proClawResult.success && proClawResult.downloadUrl && (
                      <a
                        href={proClawResult.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Sparkles size={16} />
                        在 ProClaw 中打开
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Package Info */}
          {packageInfo && !buildJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">团队成员</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {packageInfo.rolesCount} 人
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">工作流步骤</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {packageInfo.workflowSteps} 步
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">预估大小</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ~{packageInfo.estimatedSize} MB
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">分类</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {packageInfo.category}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>说明：</strong>打包后的可执行文件包含完整的团队配置和运行时环境，无需安装 Python 即可运行。
                </p>
              </div>
            </div>
          )}

          {/* Build Options */}
          {!buildJob && !proClawResult && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  导出方式
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setExportMode('local')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      exportMode === 'local'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Package size={18} />
                    本地打包
                  </button>
                  <button
                    onClick={() => setExportMode('proclaw')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      exportMode === 'proclaw'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Sparkles size={18} />
                    ProClaw 集成
                  </button>
                </div>
              </div>

              {exportMode === 'local' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    目标平台
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['windows', 'macos', 'linux'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlatform(p)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          platform === p
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="capitalize">{p}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Build Progress */}
          {buildJob && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {buildJob.status === 'queued' && '排队中...'}
                  {buildJob.status === 'building' && '打包中...'}
                  {buildJob.status === 'completed' && '打包完成！'}
                  {buildJob.status === 'failed' && '打包失败'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {buildJob.progress}%
                </span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    buildJob.status === 'failed'
                      ? 'bg-red-500'
                      : buildJob.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${buildJob.progress}%` }}
                />
              </div>

              {buildJob.status === 'failed' && buildJob.error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  错误：{buildJob.error}
                </p>
              )}

              {buildJob.status === 'completed' && buildJob.downloadUrl && (
                <button
                  onClick={handleDownload}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Download size={20} />
                  下载可执行文件
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!buildJob && !proClawResult && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              disabled={isLoading}
            >
              取消
            </button>
            <button
              onClick={exportMode === 'local' ? handleBuild : handleExportToProClaw}
              disabled={isLoading || !packageInfo}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  {exportMode === 'local' ? <Package size={18} /> : <Sparkles size={18} />}
                  {exportMode === 'local' ? '开始打包' : '导出到 ProClaw'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
