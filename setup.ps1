# NvwaX 项目初始化脚本 (PowerShell)
# 使用方法: .\setup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NvwaX 项目初始化脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 检查前置条件
Write-Host "[步骤 1/5] 检查前置条件..." -ForegroundColor Yellow
Write-Host ""

# 检查 Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git 已安装: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git 未安装，请先安装 Git" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}

# 检查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 已安装: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js 未安装，请先安装 Node.js" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}

# 检查 npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm 已安装: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm 未安装" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[步骤 2/5] Fork Flowise 仓库" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "请在浏览器中完成以下操作：" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 访问: https://github.com/FlowiseAI/Flowise" -ForegroundColor White
Write-Host "2. 点击右上角的 'Fork' 按钮" -ForegroundColor White
Write-Host "3. 选择组织: BiglionX" -ForegroundColor White
Write-Host "4. 仓库名称改为: NvwaX" -ForegroundColor White
Write-Host "5. 点击 'Create fork'" -ForegroundColor White
Write-Host ""

Read-Host "完成后按回车键继续"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[步骤 3/5] 克隆仓库" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已经克隆
if (Test-Path "NvwaX\.git") {
    Write-Host "⚠️  检测到 NvwaX 目录已存在" -ForegroundColor Yellow
    $choice = Read-Host "是否重新克隆？(y/n)"
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        Remove-Item -Recurse -Force NvwaX
    } else {
        Write-Host "使用现有目录..." -ForegroundColor Green
        Set-Location NvwaX
        goto InstallDeps
    }
}

Write-Host "正在克隆仓库..." -ForegroundColor Yellow
git clone https://github.com/BiglionX/NvwaX.git

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 克隆失败！请确认：" -ForegroundColor Red
    Write-Host "   1. 已完成 Fork 操作" -ForegroundColor White
    Write-Host "   2. GitHub 账号已登录" -ForegroundColor White
    Write-Host "   3. 网络连接正常" -ForegroundColor White
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}

Write-Host "✅ 克隆成功" -ForegroundColor Green
Write-Host ""

Set-Location NvwaX

:InstallDeps
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[步骤 4/5] 安装依赖" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "正在安装依赖（这可能需要几分钟）..." -ForegroundColor Yellow
Write-Host "提示: 如果速度慢，可以按 Ctrl+C 取消，然后运行:" -ForegroundColor Gray
Write-Host "      npm config set registry https://registry.npmmirror.com" -ForegroundColor Gray
Write-Host ""

npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 依赖安装失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "尝试使用国内镜像：" -ForegroundColor Yellow
    Write-Host "   npm config set registry https://registry.npmmirror.com" -ForegroundColor White
    Write-Host "   npm install" -ForegroundColor White
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}

Write-Host "✅ 依赖安装成功" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[步骤 5/5] 配置环境变量" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "packages\server\.env") {
    Write-Host "⚠️  .env 文件已存在" -ForegroundColor Yellow
    $choice = Read-Host "是否重新配置？(y/n)"
    if ($choice -ne 'y' -and $choice -ne 'Y') {
        Write-Host "使用现有配置" -ForegroundColor Green
        goto StartDev
    }
}

if (Test-Path "packages\server\.env.example") {
    Copy-Item "packages\server\.env.example" "packages\server\.env"
    Write-Host "✅ 已创建 .env 文件" -ForegroundColor Green
} else {
    Write-Host "⚠️  未找到 .env.example，创建默认配置" -ForegroundColor Yellow
    @"
PORT=3000
DATABASE_PATH=./database.sqlite
API_KEY_PATH=./api.key
"@ | Out-File -FilePath "packages\server\.env" -Encoding UTF8
    Write-Host "✅ 已创建默认 .env 文件" -ForegroundColor Green
}

Write-Host ""

:StartDev
Write-Host "========================================" -ForegroundColor Green
Write-Host "🎉 环境搭建完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 启动开发服务器：" -ForegroundColor White
Write-Host "   cd NvwaX" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 打开浏览器访问：" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 查看开发指南：" -ForegroundColor White
Write-Host "   FLOWISE-SETUP-GUIDE.md" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$choice = Read-Host "是否现在启动开发服务器？(y/n)"
if ($choice -eq 'y' -or $choice -eq 'Y') {
    Write-Host ""
    Write-Host "正在启动开发服务器..." -ForegroundColor Yellow
    Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Gray
    Write-Host ""
    npm run dev
} else {
    Write-Host ""
    Write-Host "稍后可以运行以下命令启动：" -ForegroundColor Yellow
    Write-Host "   cd NvwaX" -ForegroundColor Gray
    Write-Host "   npm run dev" -ForegroundColor Gray
    Write-Host ""
}

Read-Host "按回车键退出"
