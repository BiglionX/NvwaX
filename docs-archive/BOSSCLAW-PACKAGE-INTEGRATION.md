# BossClaw 打包功能集成指南

## 📦 已完成的后端功能

### 1. API 端点

以下 API 端点已实现并可用:

```typescript
// 获取包信息
GET /api/agent-teams/:id/package-info
Response: {
  teamName: string;
  projectName: string;
  teammatesCount: number;
  skillsCount: number;
  estimatedSize: number; // MB
}

// 导出团队配置
POST /api/agent-teams/:id/export
Response: {
  success: boolean;
  exportPath?: string;
}

// 触发打包构建
POST /api/agent-teams/:id/build-package
Body: {
  platform: 'windows' | 'macos' | 'linux';
  includeSkills?: boolean;
  includeExamples?: boolean;
}
Response: {
  success: boolean;
  jobId: string;
  estimatedTime: string;
}

// 查询构建状态
GET /api/package-builds/:jobId
Response: BuildJob {
  id: string;
  status: 'queued' | 'building' | 'completed' | 'failed';
  progress: number; // 0-100
  downloadUrl?: string;
  error?: string;
}
```

### 2. 前端 API 客户端

已在 `lib/api/projects.ts` 中添加方法:

```typescript
import { projectApi } from '@/lib/api/projects';

// 使用示例
const info = await projectApi.getPackageInfo(agentTeamId);
const result = await projectApi.buildPackage(agentTeamId, { platform: 'windows' });
const job = await projectApi.getBuildStatus(jobId);
```

### 3. PackageModal 组件

已创建完整的打包对话框组件: `components/Package/PackageModal.tsx`

**使用方法:**

```tsx
import PackageModal from '@/components/Package/PackageModal';

function YourComponent() {
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedAgentTeamId, setSelectedAgentTeamId] = useState<string>('');
  const [selectedAgentTeamName, setSelectedAgentTeamName] = useState<string>('');

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => {
          setSelectedAgentTeamId(team.id);
          setSelectedAgentTeamName(team.name);
          setShowPackageModal(true);
        }}
      >
        打包下载
      </button>

      {/* 打包对话框 */}
      <PackageModal
        agentTeamId={selectedAgentTeamId}
        agentTeamName={selectedAgentTeamName}
        isOpen={showPackageModal}
        onClose={() => setShowPackageModal(false)}
      />
    </>
  );
}
```

## 🔧 在 Projects 页面集成

### 步骤 1: 导入组件

在 `app/projects/[projectId]/page.tsx` 顶部添加:

```tsx
import PackageModal from '@/components/Package/PackageModal';
import { Package } from 'lucide-react';
```

### 步骤 2: 添加状态管理

在组件内部添加:

```tsx
const [showPackageModal, setShowPackageModal] = useState(false);
const [selectedAgentTeamId, setSelectedAgentTeamId] = useState<string>('');
const [selectedAgentTeamName, setSelectedAgentTeamName] = useState<string>('');
```

### 步骤 3: 在 Agent Team 卡片添加打包按钮

找到渲染 Agent Teams 的位置,在每个团队卡片的操作区域添加:

```tsx
<button
  onClick={() => {
    setSelectedAgentTeamId(agentTeam.id);
    setSelectedAgentTeamName(agentTeam.name);
    setShowPackageModal(true);
  }}
  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
>
  <Package size={16} />
  打包
</button>
```

### 步骤 4: 在页面底部添加 Modal

在页面的 JSX 末尾(返回之前)添加:

```tsx
{/* Package Modal */}
<PackageModal
  agentTeamId={selectedAgentTeamId}
  agentTeamName={selectedAgentTeamName}
  isOpen={showPackageModal}
  onClose={() => setShowPackageModal(false)}
/>
```

## 🚀 测试流程

### 1. 启动后端服务

```bash
cd packages/nvwax-server
npm run dev
```

### 2. 启动前端服务

```bash
cd packages/nvwax-web
npm run dev
```

### 3. 安装 Python 依赖

```bash
cd packages/skillhub-workflow
pip install pyinstaller
```

### 4. 测试打包流程

1. 访问项目详情页: http://localhost:3000/projects/[projectId]
2. 确保至少有一个 Agent Team
3. 点击 "打包" 按钮
4. 选择目标平台 (Windows/macOS/Linux)
5. 勾选选项 (包含 Skills/示例数据)
6. 点击 "开始打包"
7. 等待构建完成 (进度条显示)
8. 点击下载按钮获取可执行文件

## ⚠️ 注意事项

### Python 环境要求

- Python 3.8+
- PyInstaller 已安装: `pip install pyinstaller`

**Windows 用户注意:**

如果您的 Python 安装在自定义路径 (例如 `D:\Python\Python314`),可以使用提供的快速启动脚本:

```bash
# Windows - 使用指定 Python 路径
setup-package-build.bat

# 或者手动设置环境变量
set PYTHON_PATH=D:\Python\Python314\python.exe
%PYTHON_PATH% -m pip install pyinstaller
```

### 文件权限

确保以下目录可写:
- `packages/nvwax-server/exports/` - 临时导出目录
- `packages/downloads/` - 最终输出目录

### 跨平台构建

当前实现在哪个平台运行就生成哪个平台的可执行文件。要生成其他平台的包,需要:
1. 在对应平台上运行后端服务
2. 或使用第二阶段实现的 GitHub Actions CI/CD

### 性能优化建议

1. **异步处理**: 打包是异步的,不会阻塞主线程
2. **任务清理**: 超过24小时的完成任务会自动清理
3. **并发支持**: 可以同时触发多个打包任务

## 🐛 故障排查

### 问题 1: "Python script exited with code 1"

**原因**: PyInstaller 未安装或 Python 环境问题

**解决**:
```bash
pip install pyinstaller
python --version  # 确保 >= 3.8
```

### 问题 2: "Failed to export team configuration"

**原因**: Agent Team ID 不存在或数据库连接问题

**解决**:
- 检查 Agent Team 是否存在
- 查看后端日志确认数据库连接正常

### 问题 3: 进度条卡在 30%

**原因**: Python 打包脚本执行时间过长

**解决**:
- 耐心等待 (可能需要 5-10 分钟)
- 检查后端日志查看详细进度
- 确保有足够的磁盘空间

### 问题 4: 下载链接 404

**原因**: 文件已被清理或路径错误

**解决**:
- 重新触发打包
- 检查 `packages/downloads/` 目录是否有文件
- 确认下载链接格式正确: `/api/downloads/filename`

## 📝 下一步

### 第一阶段完成后

1. ✅ 单 Agent Team 打包 MVP 完成
2. ⏭️ 进行端到端测试
3. ⏭️ 收集用户反馈
4. ⏭️ 优化打包速度和文件大小

### 第二阶段计划

1. GitHub Actions 多平台自动构建
2. 增量更新机制
3. 整个 BossClaw (项目级) 打包
4. CDN 加速下载

## 📞 技术支持

遇到问题请查看:
- 后端日志: `packages/nvwax-server/logs/`
- Python 脚本输出: 控制台日志
- GitHub Issues: https://github.com/BigLionX/NvwaX/issues
