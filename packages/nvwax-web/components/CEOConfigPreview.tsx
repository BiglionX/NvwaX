import React from 'react';

interface CEOConfig {
  teamType: string;
  templateId: string;
  templateName: string;
  skills: string[];
  systemPrompt: string;
  managementStyle: string;
  decisionRules: string[];
}

interface CEOConfigPreviewProps {
  config: CEOConfig;
  onDownload?: () => void;
}

/**
 * CEO Agent 配置预览组件
 * 
 * 显示 CEO Agent 的详细配置信息，包括：
 * - 模板名称和团队类型
 * - 管理风格
 * - 配置的 Skills
 * - System Prompt
 * - 决策规则
 */
const CEOConfigPreview: React.FC<CEOConfigPreviewProps> = ({ config, onDownload }) => {
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(config.systemPrompt);
    alert('System Prompt 已复制到剪贴板');
  };

  const handleDownloadConfig = () => {
    if (onDownload) {
      onDownload();
    } else {
      // 默认下载行为：生成 JSON 文件
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ceo-config-${config.teamType}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* 头部信息 */}
      <div className="border-b pb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          🎯 CEO Agent 配置
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
            {config.templateName}
          </span>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
            {config.teamType}
          </span>
        </div>
      </div>

      {/* 管理风格 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">管理风格</h4>
        <p className="text-gray-600 bg-gray-50 p-3 rounded-md">
          {config.managementStyle}
        </p>
      </div>

      {/* Skills 列表 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          配置 Skills ({config.skills.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {config.skills.map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* 决策规则 */}
      {config.decisionRules && config.decisionRules.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">决策规则</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            {config.decisionRules.map((rule, index) => (
              <li key={index}>{rule}</li>
            ))}
          </ul>
        </div>
      )}

      {/* System Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">System Prompt</h4>
          <button
            onClick={handleCopyPrompt}
            className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          >
            📋 复制
          </button>
        </div>
        <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
          {config.systemPrompt}
        </pre>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleDownloadConfig}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
        >
          📥 下载配置
        </button>
        <button
          onClick={handleCopyPrompt}
          className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
        >
          📋 复制 Prompt
        </button>
      </div>
    </div>
  );
};

export default CEOConfigPreview;
