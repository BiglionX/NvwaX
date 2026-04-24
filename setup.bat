@echo off
chcp 65001 >nul
echo ========================================
echo   NvwaX 项目初始化脚本
echo ========================================
echo.

echo [步骤 1/5] 检查前置条件...
echo.

REM 检查 Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git 未安装，请先安装 Git
    pause
    exit /b 1
)
echo ✅ Git 已安装
git --version
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)
echo ✅ Node.js 已安装
node --version
echo.

REM 检查 npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm 未安装
    pause
    exit /b 1
)
echo ✅ npm 已安装
npm --version
echo.

echo ========================================
echo [步骤 2/5] Fork Flowise 仓库
echo ========================================
echo.
echo 请在浏览器中完成以下操作：
echo.
echo 1. 访问: https://github.com/FlowiseAI/Flowise
echo 2. 点击右上角的 "Fork" 按钮
echo 3. 选择组织: BiglionX
echo 4. 仓库名称改为: NvwaX
echo 5. 点击 "Create fork"
echo.
pause

echo.
echo ========================================
echo [步骤 3/5] 克隆仓库
echo ========================================
echo.

REM 检查是否已经克隆
if exist "NvwaX\.git" (
    echo ⚠️  检测到 NvwaX 目录已存在
    set /p choice="是否重新克隆？(y/n): "
    if /i "%choice%"=="y" (
        rmdir /s /q NvwaX
    ) else (
        echo 使用现有目录...
        goto :install_deps
    )
)

echo 正在克隆仓库...
git clone https://github.com/BiglionX/NvwaX.git
if %errorlevel% neq 0 (
    echo.
    echo ❌ 克隆失败！请确认：
    echo    1. 已完成 Fork 操作
    echo    2. GitHub 账号已登录
    echo    3. 网络连接正常
    echo.
    pause
    exit /b 1
)
echo ✅ 克隆成功
echo.

:install_deps
echo ========================================
echo [步骤 4/5] 安装依赖
echo ========================================
echo.

cd NvwaX

echo 正在安装依赖（这可能需要几分钟）...
echo 提示: 如果速度慢，可以按 Ctrl+C 取消，然后运行:
echo       npm config set registry https://registry.npmmirror.com
echo.

npm install
if %errorlevel% neq 0 (
    echo.
    echo ❌ 依赖安装失败
    echo.
    echo 尝试使用国内镜像：
    echo    npm config set registry https://registry.npmmirror.com
    echo    npm install
    echo.
    pause
    exit /b 1
)
echo ✅ 依赖安装成功
echo.

echo ========================================
echo [步骤 5/5] 配置环境变量
echo ========================================
echo.

if exist "packages\server\.env" (
    echo ⚠️  .env 文件已存在
    set /p choice="是否重新配置？(y/n): "
    if /i "%choice%"=="y" (
        goto :setup_env
    ) else (
        echo 使用现有配置
        goto :start_dev
    )
)

:setup_env
if exist "packages\server\.env.example" (
    copy packages\server\.env.example packages\server\.env
    echo ✅ 已创建 .env 文件
) else (
    echo ⚠️  未找到 .env.example，创建默认配置
    echo PORT=3000 > packages\server\.env
    echo DATABASE_PATH=./database.sqlite >> packages\server\.env
    echo API_KEY_PATH=./api.key >> packages\server\.env
    echo ✅ 已创建默认 .env 文件
)
echo.

:start_dev
echo ========================================
echo 🎉 环境搭建完成！
echo ========================================
echo.
echo 下一步：
echo.
echo 1. 启动开发服务器：
echo    cd NvwaX
echo    npm run dev
echo.
echo 2. 打开浏览器访问：
echo    http://localhost:3000
echo.
echo 3. 查看开发指南：
echo    FLOWISE-SETUP-GUIDE.md
echo.
echo ========================================
echo.

set /p start_now="是否现在启动开发服务器？(y/n): "
if /i "%start_now%"=="y" (
    echo.
    echo 正在启动开发服务器...
    echo 按 Ctrl+C 停止服务器
    echo.
    npm run dev
) else (
    echo.
    echo 稍后可以运行以下命令启动：
    echo    cd NvwaX
    echo    npm run dev
    echo.
)

pause
