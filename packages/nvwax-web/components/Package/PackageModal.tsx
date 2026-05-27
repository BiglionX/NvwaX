'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Loader, AlertCircle, Package } from 'lucide-react';
import { projectApi, PackageInfo, BuildJob } from '@/lib/api/projects';

interface PackageModalProps {
  agentTeamId: string;
  agentTeamName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PackageModal({ 
  agentTeamId, 
  agentTeamName, 
  isOpen, 
  onClose 
}: PackageModalProps) {
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux'>('windows');
  const [includeSkills, setIncludeSkills] = useState(true);
  const [includeExamples, setIncludeExamples] = useState(false);
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [buildJob, setBuildJob] = useState<BuildJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollBuildStatus = useCallback(async () => {
    if (!buildJob) return;

    try {
      const job = await projectApi.getBuildStatus(buildJob.id);
      setBuildJob(job);
    } catch (err) {
      console.error('Failed to poll build status:', err);
    }
  }, [buildJob]);

  // 当模态框打开时加载包信息 - 通过条件渲染而不是 effect 中的 setState 来避免级联渲染警告
  useEffect(() => {
    let isMounted = true;
    
    if (isOpen && agentTeamId) {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const info = await projectApi.getPackageInfo(agentTeamId);
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
  }, [isOpen, agentTeamId]);

  // 轮询构建状态 - 添加缺失的依赖项并使用 useCallback 包装的函数
  useEffect(() => {
    if (!buildJob || buildJob.status === 'completed' || buildJob.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      pollBuildStatus();
    }, 3000); // 每3秒轮询一次

    return () => clearInterval(interval);
  }, [buildJob, pollBuildStatus]);

  const handleBuild = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await projectApi.buildPackage(agentTeamId, {
        platform,
        includeSkills,
        includeExamples
      });

      setBuildJob({
        id: result.jobId,
        agentTeamId,
        platform,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to trigger build:', err);
      const error = err as Error & { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || '触发构建失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (buildJob?.downloadUrl) {
      window.location.href = buildJob.downloadUrl;
    }
  };

  const reset = () => {
    setBuildJob(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-blue-500 to-blue-700 rounded-lg">
              <Package className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                打包下载
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {agentTeamName}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Package Info */}
          {packageInfo && !buildJob && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package size={18} />
                包信息
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">团队名称:</span>
                  <p className="text-gray-900 dark:text-white font-medium">{packageInfo.teamName}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">项目:</span>
                  <p className="text-gray-900 dark:text-white font-medium">{packageInfo.projectName}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">团队成员:</span>
                  <p className="text-gray-900 dark:text-white font-medium">{packageInfo.teammatesCount} 人</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Skills:</span>
                  <p className="text-gray-900 dark:text-white font-medium">{packageInfo.skillsCount} 个</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">预估大小:</span>
                  <p className="text-gray-900 dark:text-white font-medium">{packageInfo.estimatedSize} MB</p>
                </div>
              </div>
            </div>
          )}

          {/* Platform Selection */}
          {!buildJob && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">选择目标平台</h3>
              <div className="grid grid-cols-3 gap-3">
                {(['windows', 'macos', 'linux'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      platform === p
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <p className={`font-medium ${
                        platform === p 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {p === 'windows' && 'Windows'}
                        {p === 'macos' && 'macOS'}
                        {p === 'linux' && 'Linux'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {p === 'windows' && '.exe'}
                        {p === 'macos' && '.app'}
                        {p === 'linux' && '.bin'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          {!buildJob && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">打包选项</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSkills}
                  onChange={(e) => setIncludeSkills(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  包含所有 Skills
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExamples}
                  onChange={(e) => setIncludeExamples(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  包含示例数据
                </span>
              </label>
            </div>
          )}

          {/* Build Progress */}
          {buildJob && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">构建进度</h3>
                <span className={`text-sm font-medium ${
                  buildJob.status === 'completed' ? 'text-green-600' :
                  buildJob.status === 'failed' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {buildJob.status === 'queued' && '排队中...'}
                  {buildJob.status === 'building' && '构建中...'}
                  {buildJob.status === 'completed' && '完成'}
                  {buildJob.status === 'failed' && '失败'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    buildJob.status === 'failed' ? 'bg-red-500' :
                    buildJob.status === 'completed' ? 'bg-green-500' :
                    'bg-linear-to-r from-blue-500 to-blue-700'
                  }`}
                  style={{ width: `${buildJob.progress}%` }}
                />
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {buildJob.status === 'queued' && '任务已加入队列,等待处理...'}
                {buildJob.status === 'building' && `正在构建,进度 ${buildJob.progress}%...`}
                {buildJob.status === 'completed' && '构建成功!可以下载了。'}
                {buildJob.status === 'failed' && `构建失败: ${buildJob.error}`}
              </p>

              {/* Download Button */}
              {buildJob.status === 'completed' && buildJob.downloadUrl && (
                <button
                  onClick={handleDownload}
                  className="w-full py-3 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  下载可执行文件
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!buildJob && (
          <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={isLoading}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleBuild}
              disabled={isLoading || !packageInfo}
              className="px-6 py-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  准备中...
                </>
              ) : (
                <>
                  <Package size={18} />
                  开始打包
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
