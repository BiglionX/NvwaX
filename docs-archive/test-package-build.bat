@echo off
REM BossClaw 打包功能测试脚本 (Windows)
REM 用法: test-package-build.bat

echo ==========================================
echo 🚀 BossClaw 打包功能测试
echo ==========================================
echo.

REM 检查 Python
echo 📋 检查 Python 环境...
set PYTHON_PATH=D:\Python\Python314\python.exe
if exist "%PYTHON_PATH%" (
    echo ✅ Python 已安装: %PYTHON_PATH%
    "%PYTHON_PATH%" --version
) else (
    where python >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Python 未安装或未添加到 PATH
        echo 检测到 Python 安装在: D:\Python\Python314
        set PYTHON_PATH=D:\Python\Python314\python.exe
    ) else (
        echo ✅ Python 已安装 (从 PATH)
        python --version
    )
)
echo.

REM 检查 PyInstaller
echo 📋 检查 PyInstaller...
"%PYTHON_PATH%" -c "import PyInstaller" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  PyInstaller 未安装,正在安装...
    "%PYTHON_PATH%" -m pip install pyinstaller
) else (
    echo ✅ PyInstaller 已安装
)
echo.

REM 创建必要目录
echo 📋 创建输出目录...
if not exist "packages\nvwax-server\exports" mkdir packages\nvwax-server\exports
if not exist "packages\downloads" mkdir packages\downloads
echo ✅ 目录创建完成
echo.

REM 检查后端服务
echo 📋 检查后端服务...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  后端服务未运行,请先启动:
    echo    cd packages\nvwax-server ^&^& npm run dev
    pause
    exit /b 1
)
echo ✅ 后端服务运行中
echo.

REM 检查前端服务
echo 📋 检查前端服务...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  前端服务未运行,请先启动:
    echo    cd packages\nvwax-web ^&^& npm run dev
    pause
    exit /b 1
)
echo ✅ 前端服务运行中
echo.

echo ==========================================
echo ✅ 环境检查完成!
echo ==========================================
echo.
echo 📖 下一步操作:
echo.
echo 1. 访问项目详情页:
echo    http://localhost:3000/projects/[projectId]
echo.
echo 2. 确保至少有一个 Agent Team
echo.
echo 3. 点击团队卡片上的 '打包' 按钮
echo.
echo 4. 选择目标平台 (Windows/macOS/Linux)
echo.
echo 5. 等待构建完成 (5-10分钟)
echo.
echo 6. 下载可执行文件并测试运行
echo.
echo 📝 详细文档: BOSSCLAW-PACKAGE-INTEGRATION.md
echo.
pause
