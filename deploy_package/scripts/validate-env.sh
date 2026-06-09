#!/bin/sh
# NvwaX 环境变量验证脚本
# 用于在启动前验证必需的环境变量

echo "=== NvwaX 环境变量验证 ==="

# 必需变量
REQUIRED_VARS="
JWT_SECRET
DATABASE_URL
"

# 可选变量
OPTIONAL_VARS="
CROSS_AUTH_SECRET
ADMIN_JWT_SECRET
CORS_ALLOWED_ORIGINS
FRONTEND_URL
"

ERRORS=0

echo ""
echo "--- 检查必需变量 ---"
for VAR in $REQUIRED_VARS; do
    VALUE=$(eval echo \$$VAR)
    if [ -z "$VALUE" ]; then
        echo "❌ $VAR: 未设置 (必需)"
        ERRORS=$((ERRORS + 1))
    elif [ "$VALUE" = "change-in-production" ] || [ "$VALUE" = "your-"* ]; then
        echo "⚠️  $VAR: 仍使用示例值"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ $VAR: 已设置"
    fi
done

echo ""
echo "--- 检查可选变量 ---"
for VAR in $OPTIONAL_VARS; do
    VALUE=$(eval echo \$$VAR)
    if [ -z "$VALUE" ]; then
        echo "⚪ $VAR: 未设置 (可选)"
    elif [ "$VALUE" = "change-in-production" ] || [ "$VALUE" = "your-"* ]; then
        echo "⚠️  $VAR: 仍使用示例值"
    else
        echo "✅ $VAR: 已设置"
    fi
done

echo ""
if [ $ERRORS -gt 0 ]; then
    echo "=== 发现 $ERRORS 个问题 ==="
    echo "请确保在生产环境中正确设置环境变量"
    exit 1
else
    echo "=== 所有必需变量已正确设置 ==="
    exit 0
fi
