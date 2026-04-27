@echo off
REM BossClaw 虚拟公司功能 - 快速测试脚本 (Windows)
REM 用法: test-virtual-company.bat

echo ==========================================
echo 🚀 BossClaw 虚拟公司功能测试
echo ==========================================
echo.

REM 设置颜色（Windows 10+）
chcp 65001 >nul

REM 检查 PostgreSQL
echo 📋 检查 PostgreSQL...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL 未安装或未添加到 PATH
    echo 💡 提示: 请安装 PostgreSQL 并确保 psql 在 PATH 中
    pause
    exit /b 1
)
echo ✅ PostgreSQL 已安装
echo.

REM 设置数据库连接参数（根据实际情况修改）
set DB_USER=postgres
set DB_NAME=nvwax
set MIGRATION_FILE=packages\nvwax-server\migrations\004_virtual_company_templates.sql

echo 📋 执行数据库迁移...
if exist "%MIGRATION_FILE%" (
    psql -U %DB_USER% -d %DB_NAME% -f "%MIGRATION_FILE%"
    if %errorlevel% neq 0 (
        echo ❌ 数据库迁移失败
        pause
        exit /b 1
    )
    echo ✅ 数据库迁移成功
) else (
    echo ❌ 迁移文件不存在: %MIGRATION_FILE%
    pause
    exit /b 1
)
echo.

REM 验证数据插入
echo 📋 验证数据插入...
psql -U %DB_USER% -d %DB_NAME% -c "SELECT id, name, category FROM team_skills WHERE category = 'virtual-company' ORDER BY created_at DESC;"
echo.

REM 检查后端服务
echo 📋 检查后端服务...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  后端服务未运行
    echo 💡 提示: 请先启动后端服务: cd packages\nvwax-server ^&^& npm run dev
    echo.
) else (
    echo ✅ 后端服务运行中
    echo.
    
    REM 测试 API
    echo 📋 测试虚拟公司 API...
    curl -s http://localhost:3001/api/team-skills/marketplace?category=virtual-company | python -m json.tool
    echo.
)

REM 检查前端服务
echo 📋 检查前端服务...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  前端服务未运行
    echo 💡 提示: 请先启动前端服务: cd packages\nvwax-web ^&^& npm run dev
    echo.
) else (
    echo ✅ 前端服务运行中
    echo 💡 访问 http://localhost:3000/marketplace 查看虚拟公司
    echo.
)

REM 检查 Python 环境
echo 📋 检查 Python 环境...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Python 未安装或未添加到 PATH
    echo 💡 提示: 打包功能需要 Python 3.8+
    echo.
) else (
    echo ✅ Python 已安装
    python --version
    
    REM 检查 PyInstaller
    python -c "import PyInstaller" >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️  PyInstaller 未安装
        echo 💡 提示: 运行 pip install pyinstaller 安装
    ) else (
        echo ✅ PyInstaller 已安装
    )
    echo.
)

echo ==========================================
echo ✅ 测试准备完成!
echo ==========================================
echo.
echo 📖 下一步操作:
echo.
echo 1. 访问 Agent 广场: http://localhost:3000/marketplace
echo 2. 点击"虚拟公司"分类筛选
echo 3. 查看三个虚拟公司实例
echo 4. （如果详情页已实现）点击卡片进行打包测试
echo.
echo 📝 详细测试指南: BOSSCLAW-VIRTUAL-COMPANY-TEST-GUIDE.md
echo.
pause
