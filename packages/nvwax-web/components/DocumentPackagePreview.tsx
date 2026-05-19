import React from 'react';
import { Download, FileText, Package } from 'lucide-react';

interface DocumentContent {
  title: string;
  type: string;
  content: string;
  metadata: {
    generatedAt: string;
    version: string;
    teamType: string;
    [key: string]: unknown;
  };
}

interface DocumentPackage {
  documents: DocumentContent[];
  packageInfo: {
    teamName: string;
    teamType: string;
    generatedAt: string;
    totalDocuments: number;
  };
  downloadUrl?: string;
}

interface DocumentPackagePreviewProps {
  docPackage: DocumentPackage;
  onDownloadJSON?: () => void;
  onDownloadMarkdown?: () => void;
}

/**
 * 文档包预览组件
 * 
 * 显示文档包的详细信息，包括：
 * - 团队信息
 * - 文档列表
 * - 下载按钮（JSON / Markdown）
 */
const DocumentPackagePreview: React.FC<DocumentPackagePreviewProps> = ({
  docPackage,
  onDownloadJSON,
  onDownloadMarkdown
}) => {
  const handleDownloadJSON = () => {
    if (onDownloadJSON) {
      onDownloadJSON();
    } else {
      // 默认下载行为：生成 JSON 文件
      const blob = new Blob([JSON.stringify(docPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docPackage.packageInfo.teamName}_package.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadMarkdown = async () => {
    if (onDownloadMarkdown) {
      onDownloadMarkdown();
    } else {
      // 默认下载行为：打包为 ZIP（这里简化为分别下载）
      alert('Markdown 格式需要后端支持 ZIP 打包，当前使用 JSON 格式下载');
      handleDownloadJSON();
    }
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'ceo_system_prompt': 'CEO System Prompt',
      'team_collaboration_guide': '团队协作规范',
      'operation_manual': '运营指南',
      'skill_documentation': 'Skill 使用文档'
    };
    return labels[type] || type;
  };

  const getContentPreview = (content: string): string => {
    // 提取前100个字符作为预览
    const lines = content.split('\n').slice(0, 3);
    return lines.join('\n').substring(0, 150) + '...';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* 头部信息 */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-3 mb-3">
          <Package className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">
            📦 团队经营配置文档包
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">团队名称：</span>
            <span className="font-medium text-gray-900">{docPackage.packageInfo.teamName}</span>
          </div>
          <div>
            <span className="text-gray-600">团队类型：</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              {docPackage.packageInfo.teamType}
            </span>
          </div>
          <div>
            <span className="text-gray-600">文档数量：</span>
            <span className="font-medium text-gray-900">{docPackage.packageInfo.totalDocuments} 个</span>
          </div>
          <div>
            <span className="text-gray-600">生成时间：</span>
            <span className="font-medium text-gray-900">
              {new Date(docPackage.packageInfo.generatedAt).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>
      </div>

      {/* 文档列表 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          文档列表
        </h4>
        <div className="space-y-3">
          {docPackage.documents.map((doc, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-md p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="font-medium text-gray-900">{doc.title}</h5>
                  <span className="text-xs text-gray-500">
                    {getTypeLabel(doc.type)} • v{doc.metadata.version}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {doc.content.length} chars
                </span>
              </div>
              <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {getContentPreview(doc.content)}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleDownloadJSON}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          下载 JSON 格式
        </button>
        <button
          onClick={handleDownloadMarkdown}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          下载 Markdown 格式
        </button>
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">💡 提示：</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>JSON 格式适合程序化处理，包含完整结构</li>
          <li>Markdown 格式适合阅读和编辑，人类友好</li>
          <li>文档包包含所有团队经营所需的配置和指南</li>
        </ul>
      </div>
    </div>
  );
};

export default DocumentPackagePreview;
