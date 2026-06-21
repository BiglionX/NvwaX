# 社交登录配置脚本 (Windows PowerShell)
# 使用方法：.\scripts\setup-social-login.ps1

Write-Host "🚀 NvwaX 社交登录配置脚本" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Host "🔍 检查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js 未安装，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

# 检查 pnpm
Write-Host "🔍 检查 pnpm..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version
    Write-Host "  ✅ pnpm $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  pnpm 未安装，正在安装..." -ForegroundColor Yellow
    npm install -g pnpm
}

# 检查环境变量文件
Write-Host ""
Write-Host "📋 检查环境变量文件..." -ForegroundColor Yellow

$backendEnvPath = "packages\nvwax-server\.env"
$frontendEnvPath = "packages\nvwax-web\.env.local"

if (-Not (Test-Path $backendEnvPath)) {
    Write-Host "  ⚠️  后端 .env 文件不存在" -ForegroundColor Yellow
    $createEnv = Read-Host "    是否基于 .env.example 创建？(Y/N)"
    if ($createEnv -eq "Y" -or $createEnv -eq "y") {
        Copy-Item ".env.example" $backendEnvPath
        Write-Host "  ✅ 已创建后端 .env 文件" -ForegroundColor Green
    }
} else {
    Write-Host "  ✅ 后端 .env 文件已存在" -ForegroundColor Green
}

if (-Not (Test-Path $frontendEnvPath)) {
    Write-Host "  ⚠️  前端 .env.local 文件不存在" -ForegroundColor Yellow
    Write-Host "    将使用 .env.production.example 作为模板" -ForegroundColor Yellow
}

# 验证配置
Write-Host ""
Write-Host "🔍 验证社交登录配置..." -ForegroundColor Yellow
Write-Host ""

$hasError = $false

# 读取后端 .env
if (Test-Path $backendEnvPath) {
    $backendEnv = Get-Content $backendEnvPath -Raw
    
    Write-Host "  🔧 检查 GitHub OAuth 配置..." -ForegroundColor Cyan
    if ($backendEnv -match "GITHUB_CLIENT_ID\s*=") {
        $githubClientId = ($backendEnv | Select-String -Pattern "GITHUB_CLIENT_ID\s*=\s*(.+)").Matches.Groups[1].Value.Trim()
        if ($githubClientId -and $githubClientId -ne "your_github_client_id") {
            Write-Host "    ✅ GITHUB_CLIENT_ID 已配置" -ForegroundColor Green
        } else {
            Write-Host "    ❌ GITHUB_CLIENT_ID 未正确配置" -ForegroundColor Red
            $hasError = $true
        }
    } else {
        Write-Host "    ❌ GITHUB_CLIENT_ID 未配置" -ForegroundColor Red
        $hasError = $true
    }
    
    if ($backendEnv -match "GITHUB_CLIENT_SECRET\s*=") {
        $githubClientSecret = ($backendEnv | Select-String -Pattern "GITHUB_CLIENT_SECRET\s*=\s*(.+)").Matches.Groups[1].Value.Trim()
        if ($githubClientSecret -and $githubClientSecret -ne "your_github_client_secret") {
            Write-Host "    ✅ GITHUB_CLIENT_SECRET 已配置" -ForegroundColor Green
        } else {
            Write-Host "    ❌ GITHUB_CLIENT_SECRET 未正确配置" -ForegroundColor Red
            $hasError = $true
        }
    } else {
        Write-Host "    ❌ GITHUB_CLIENT_SECRET 未配置" -ForegroundColor Red
        $hasError = $true
    }
    
    Write-Host "  🔧 检查 Google OAuth 配置..." -ForegroundColor Cyan
    if ($backendEnv -match "GOOGLE_CLIENT_ID\s*=") {
        $googleClientId = ($backendEnv | Select-String -Pattern "GOOGLE_CLIENT_ID\s*=\s*(.+)").Matches.Groups[1].Value.Trim()
        if ($googleClientId -and $googleClientId -ne "your_google_client_id.apps.googleusercontent.com") {
            Write-Host "    ✅ GOOGLE_CLIENT_ID 已配置" -ForegroundColor Green
        } else {
            Write-Host "    ❌ GOOGLE_CLIENT_ID 未正确配置" -ForegroundColor Red
            $hasError = $true
        }
    } else {
        Write-Host "    ❌ GOOGLE_CLIENT_ID 未配置" -ForegroundColor Red
        $hasError = $true
    }
} else {
    Write-Host "  ❌ 后端 .env 文件不存在，无法验证配置" -ForegroundColor Red
    $hasError = $true
}

Write-Host ""

# 运行数据库迁移
Write-Host "🗄️  运行数据库迁移..." -ForegroundColor Yellow
$migrate = Read-Host "  是否运行数据库迁移？(Y/N)"
if ($migrate -eq "Y" -or $migrate -eq "y") {
    Write-Host "  正在运行迁移..." -ForegroundColor Cyan
    pnpm run db:migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ 数据库迁移完成" -ForegroundColor Green
    } else {
        Write-Host "  ❌ 数据库迁移失败" -ForegroundColor Red
        $hasError = $true
    }
}

Write-Host ""

# 显示结果
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if ($hasError) {
    Write-Host "❌ 配置存在问题，请完成以下操作：" -ForegroundColor Red
    Write-Host ""
    Write-Host "  1. 创建 GitHub OAuth App:" -ForegroundColor Yellow
    Write-Host "     https://github.com/settings/developers" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  2. 创建 Google OAuth App:" -ForegroundColor Yellow
    Write-Host "     https://console.cloud.google.com/" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  3. 配置环境变量：" -ForegroundColor Yellow
    Write-Host "     - 后端: packages\nvwax-server\.env" -ForegroundColor Blue
    Write-Host "     - 前端: packages\nvwax-web\.env.local" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  4. 查看完整配置指南：" -ForegroundColor Yellow
    Write-Host "     - SOCIAL_LOGIN_QUICK_START.md" -ForegroundColor Blue
    Write-Host "     - SOCIAL_LOGIN_SETUP_GUIDE.md" -ForegroundColor Blue
} else {
    Write-Host "✅ 配置验证通过！" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步：" -ForegroundColor Yellow
    Write-Host "  1. 启动后端:" -ForegroundColor Cyan
    Write-Host "     cd packages\nvwax-server" -ForegroundColor Blue
    Write-Host "     pnpm run dev" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  2. 启动前端 (新终端):" -ForegroundColor Cyan
    Write-Host "     cd packages\nvwax-web" -ForegroundColor Blue
    Write-Host "     pnpm run dev" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  3. 访问 http://localhost:3000/login 测试登录" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 相关文档：" -ForegroundColor Yellow
Write-Host "  - 快速配置指南: SOCIAL_LOGIN_QUICK_START.md" -ForegroundColor Blue
Write-Host "  - 完整配置指南: SOCIAL_LOGIN_SETUP_GUIDE.md" -ForegroundColor Blue
Write-Host "  - 配置验证脚本: scripts\validate-social-login-config.js" -ForegroundColor Blue
Write-Host "  - 配置向导脚本: scripts\social-login-setup-wizard.js" -ForegroundColor Blue
Write-Host ""

# 询问是否运行配置向导
$runWizard = Read-Host "是否运行交互式配置向导？(Y/N)"
if ($runWizard -eq "Y" -or $runWizard -eq "y") {
    Write-Host ""
    Write-Host "启动配置向导..." -ForegroundColor Cyan
    node "scripts\social-login-setup-wizard.js"
}

Write-Host ""
Write-Host "👋 配置脚本执行完成！" -ForegroundColor Green
