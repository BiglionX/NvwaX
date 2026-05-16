@echo off
REM ============================================
REM MVP Phase 1 快速测试脚本
REM 自动执行迁移并测试 API
REM ============================================

echo.
echo ==========================================
echo 🧪 MVP Phase 1 自动化测试
echo ==========================================
echo.

REM 步骤 1: 检查后端服务是否运行
echo 📋 步骤 1: 检查后端服务...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 后端服务未运行
    echo.
    echo 请先启动后端服务:
    echo   cd packages\nvwax-server
    echo   npm run dev
    echo.
    pause
    exit /b 1
)
echo ✅ 后端服务运行中
echo.

REM 步骤 2: 执行数据库迁移
echo 📋 步骤 2: 执行数据库迁移...
cd packages\nvwax-server
node run-migration-009.mjs
if %errorlevel% neq 0 (
    echo.
    echo ❌ 迁移失败
    echo.
    echo 请检查:
    echo   1. 数据库连接配置 (.env 文件)
    echo   2. 数据库权限
    echo   3. 查看详细错误信息
    echo.
    pause
    exit /b 1
)
echo.

REM 步骤 3: 等待几秒确保迁移完成
timeout /t 3 /nobreak >nul

REM 步骤 4: 测试创建会话 API
echo 📋 步骤 3: 测试创建会话 API...
cd ..\..

powershell -Command "& { $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/virtual-company/sessions' -Method POST -ContentType 'application/json' -Body '{}' -UseBasicParsing; Write-Host $response.Content }"

if %errorlevel% neq 0 (
    echo.
    echo ❌ API 测试失败
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo ✅ 测试完成！
echo ==========================================
echo.
echo 📊 测试结果总结:
echo   ✅ 后端服务正常运行
echo   ✅ 数据库迁移成功
echo   ✅ API 端点可访问
echo.
echo 📝 详细测试报告: MVP-PHASE1-TEST-REPORT.md
echo.
echo 🎯 下一步:
echo   1. 查看测试报告
echo   2. 继续开发 Phase 2
echo   3. 添加单元测试
echo.
pause
