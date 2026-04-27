@echo off
REM BossClaw 打包功能 - Windows 快速启动脚本
REM 使用指定的 Python 路径: D:\Python\Python314

set PYTHON_PATH=D:\Python\Python314\python.exe
set PIP_PATH=D:\Python\Python314\Scripts\pip.exe

echo ==========================================
echo 🚀 BossClaw 打包功能 - 快速启动
echo ==========================================
echo.

REM 检查 Python
echo 📋 检查 Python...
if exist "%PYTHON_PATH%" (
    echo ✅ Python 已找到: %PYTHON_PATH%
    "%PYTHON_PATH%" --version
) else (
    echo ❌ Python 未找到: %PYTHON_PATH%
    echo 请确认 Python 是否正确安装在 D:\Python\Python314
    pause
    exit /b 1
)
echo.

REM 安装 PyInstaller
echo 📋 安装/更新 PyInstaller...
"%PIP_PATH%" install pyinstaller --upgrade
if %errorlevel% neq 0 (
    echo ❌ PyInstaller 安装失败
    pause
    exit /b 1
)
echo ✅ PyInstaller 安装成功
echo.

REM 创建输出目录
echo 📋 创建输出目录...
if not exist "packages\nvwax-server\exports" mkdir packages\nvwax-server\exports
if not exist "packages\downloads" mkdir packages\downloads
echo ✅ 目录创建完成
echo.

echo ==========================================
echo ✅ 环境准备完成!
echo ==========================================
echo.
echo 📖 下一步操作:
echo.
echo 1. 启动后端服务 (新窗口):
echo    cd packages\nvwax-server ^&^& npm run dev
echo.
echo 2. 启动前端服务 (新窗口):
echo    cd packages\nvwax-web ^&^& npm run dev
echo.
echo 3. 等待服务启动后,访问:
echo    http://localhost:3000/projects/[projectId]
echo.
echo 4. 点击 Agent Team 的 '打包' 按钮开始测试
echo.
echo 📝 详细文档: BOSSCLAW-PACKAGE-INTEGRATION.md
echo.
pause
