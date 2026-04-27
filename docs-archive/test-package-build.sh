#!/bin/bash
# BossClaw 打包功能测试脚本
# 用法: ./test-package-build.sh

set -e

echo "=========================================="
echo "🚀 BossClaw 打包功能测试"
echo "=========================================="
echo ""

# 检查 Python
echo "📋 检查 Python 环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装或未添加到 PATH"
    echo "💡 提示: 如果 Python 安装在自定义路径,请添加到 PATH 或修改此脚本"
    exit 1
fi
echo "✅ Python3 已安装: $(python3 --version)"

# 检查 PyInstaller
echo ""
echo "📋 检查 PyInstaller..."
if ! python3 -c "import PyInstaller" &> /dev/null; then
    echo "⚠️  PyInstaller 未安装,正在安装..."
    pip3 install pyinstaller
else
    echo "✅ PyInstaller 已安装"
fi

# 创建必要目录
echo ""
echo "📋 创建输出目录..."
mkdir -p packages/nvwax-server/exports
mkdir -p packages/downloads
echo "✅ 目录创建完成"

# 检查后端服务
echo ""
echo "📋 检查后端服务..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ 后端服务运行中"
else
    echo "⚠️  后端服务未运行,请先启动:"
    echo "   cd packages/nvwax-server && npm run dev"
    exit 1
fi

# 检查前端服务
echo ""
echo "📋 检查前端服务..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 前端服务运行中"
else
    echo "⚠️  前端服务未运行,请先启动:"
    echo "   cd packages/nvwax-web && npm run dev"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ 环境检查完成!"
echo "=========================================="
echo ""
echo "📖 下一步操作:"
echo ""
echo "1. 访问项目详情页:"
echo "   http://localhost:3000/projects/[projectId]"
echo ""
echo "2. 确保至少有一个 Agent Team"
echo ""
echo "3. 点击团队卡片上的 '打包' 按钮"
echo ""
echo "4. 选择目标平台 (Windows/macOS/Linux)"
echo ""
echo "5. 等待构建完成 (5-10分钟)"
echo ""
echo "6. 下载可执行文件并测试运行"
echo ""
echo "📝 详细文档: BOSSCLAW-PACKAGE-INTEGRATION.md"
echo ""
