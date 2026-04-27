# BossClaw 打包功能 - 快速开始

## 📦 功能说明

BossClaw 打包功能允许您将 AI Agent Team 打包为独立的可执行文件,用户可以在本地运行而无需安装任何依赖。

**支持平台**: Windows (.exe) / macOS (.app) / Linux (.bin)

---

## 🚀 快速开始 (Windows)

### 方式 1: 使用快速启动脚本 (推荐)

如果您的 Python 安装在 `D:\Python\Python314`,直接运行:

```bash
setup-package-build.bat
```

此脚本会自动:
- ✅ 检查 Python 环境
- ✅ 安装/更新 PyInstaller
- ✅ 创建必要的输出目录
- ✅ 提供下一步操作指南

### 方式 2: 手动安装

```bash
# 1. 安装 PyInstaller
D:\Python\Python314\python.exe -m pip install pyinstaller

# 2. 创建输出目录
mkdir packages\nvwax-server\exports
mkdir packages\downloads

# 3. 启动后端和前端服务
cd packages\nvwax-server && npm run dev
cd packages\nvwax-web && npm run dev
```

---

## 🧪 测试打包功能

### 运行测试脚本

```bash
# Windows
test-package-build.bat

# Linux/Mac
chmod +x test-package-build.sh
./test-package-build.sh
```

测试脚本会检查:
- ✅ Python 环境
- ✅ PyInstaller 安装
- ✅ 后端服务运行状态
- ✅ 前端服务运行状态

### 手动测试流程

1. **访问项目详情页**
   ```
   http://localhost:3000/projects/[projectId]
   ```

2. **确保至少有一个 Agent Team**
   - 如果没有,先创建一个 AiTeam 和 Agent Team

3. **点击"打包"按钮**
   - 在 Agent Team 卡片上找到打包图标
   - 点击后弹出 PackageModal 对话框

4. **选择平台和选项**
   - 目标平台: Windows / macOS / Linux
   - 勾选: 包含 Skills / 包含示例数据

5. **开始打包**
   - 点击"开始打包"按钮
   - 等待构建完成 (5-10分钟)
   - 进度条实时显示进度

6. **下载并运行**
   - 构建完成后出现"下载可执行文件"按钮
   - 下载到本地
   - 双击运行测试

---

## 📁 重要文件说明

### 脚本文件

| 文件 | 用途 | 平台 |
|------|------|------|
| `setup-package-build.bat` | 快速环境设置 (使用指定 Python 路径) | Windows |
| `test-package-build.bat` | 完整环境检查和测试 | Windows |
| `test-package-build.sh` | 完整环境检查和测试 | Linux/Mac |

### 文档文件

| 文件 | 内容 |
|------|------|
| `BOSSCLAW-PACKAGE-INTEGRATION.md` | 详细的集成指南、API 文档、故障排查 |
| `BOSSCLAW-PACKAGE-COMPLETION.md` | 实施完成报告、技术架构、验收标准 |
| `README-PACKAGE.md` | 本文件 - 快速开始指南 |

### 核心代码

| 目录 | 内容 |
|------|------|
| `packages/nvwax-server/src/services/package-*.ts` | 后端打包服务 |
| `packages/skillhub-workflow/packager/` | Python 打包器 |
| `packages/nvwax-web/components/Package/` | 前端打包界面 |

---

## ⚙️ 配置说明

### Python 路径配置

**Windows (自定义路径):**

编辑 `setup-package-build.bat` 或 `test-package-build.bat`:

```batch
set PYTHON_PATH=D:\Python\Python314\python.exe
set PIP_PATH=D:\Python\Python314\Scripts\pip.exe
```

**Linux/Mac:**

如果 Python 不在默认 PATH 中,修改 `test-package-build.sh`:

```bash
export PYTHON_PATH=/usr/local/bin/python3
$PYTHON_PATH -m pip install pyinstaller
```

### 输出目录

打包文件保存在:
- 临时导出: `packages/nvwax-server/exports/`
- 最终输出: `packages/downloads/`

确保这些目录存在且有写入权限。

---

## ❓ 常见问题

### Q1: "Python 未找到" 错误

**A:** 检查 Python 是否正确安装:

```bash
# Windows
D:\Python\Python314\python.exe --version

# Linux/Mac
python3 --version
```

如果路径不同,请修改脚本中的 `PYTHON_PATH` 变量。

### Q2: "PyInstaller 未安装" 错误

**A:** 手动安装:

```bash
# 使用指定 Python 路径
D:\Python\Python314\python.exe -m pip install pyinstaller

# 或使用默认 Python
pip install pyinstaller
```

### Q3: 打包进度卡在 30%

**A:** 这是正常现象,Python 打包需要时间:
- 小团队 (< 3 人): 约 3-5 分钟
- 中等团队 (3-5 人): 约 5-8 分钟
- 大团队 (> 5 人): 约 8-15 分钟

耐心等待,查看后端日志了解详细进度。

### Q4: 生成的文件太大 (> 100MB)

**A:** PyInstaller 打包了整个 Python 运行时,这是正常的。优化方法:
1. 减少不必要的 Skills
2. 启用 UPX 压缩 (需要在 `build-executable.py` 中添加 `--upx-dir` 参数)
3. 使用 Nuitka 替代 PyInstaller (更复杂但文件更小)

### Q5: 下载链接 404

**A:** 可能原因:
1. 文件已被清理 (超过 24 小时)
2. 打包失败,没有生成文件
3. 路径配置错误

解决方法:
- 重新触发打包
- 检查 `packages/downloads/` 目录是否有文件
- 查看后端日志确认打包成功

---

## 🔗 相关文档

- **详细集成指南**: [BOSSCLAW-PACKAGE-INTEGRATION.md](./BOSSCLAW-PACKAGE-INTEGRATION.md)
- **技术完成报告**: [BOSSCLAW-PACKAGE-COMPLETION.md](./BOSSCLAW-PACKAGE-COMPLETION.md)
- **原始设计文档**: [BossClaw-design.md](./BossClaw-design.md)

---

## 📞 技术支持

遇到问题?

1. **查看日志**
   - 后端日志: `packages/nvwax-server/logs/`
   - Python 输出: 控制台日志

2. **查阅文档**
   - 集成指南中有详细的故障排查章节

3. **提交 Issue**
   - GitHub: https://github.com/BigLionX/NvwaX/issues

---

**祝您使用愉快! 🎉**
