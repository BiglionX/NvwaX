# 社交登录功能部署脚本 (Windows PowerShell)
# 使用方法：.\scripts\deploy-with-social-login.ps1

Write-Host "🚀 NvwaX 社交登录部署脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker
Write-Host "🔍 检查 Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "  ✅ Docker $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker 未安装，请先安装 Docker Desktop" -ForegroundColor Red
    exit 1
}

# 检查 Docker Compose
Write-Host "🔍 检查 Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "  ✅ $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker Compose 未安装" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 检查环境变量文件
Write-Host "📋 检查环境变量配置..." -ForegroundColor Yellow

$backendEnvPath = "packages\nvwax-server\.env"
$frontendEnvPath = "packages\nvwax-web\.env.production"
$rootEnvPath = ".env"

$hasBackendEnv = Test-Path $backendEnvPath
$hasFrontendEnv = Test-Path $frontendEnvPath
$hasRootEnv = Test-Path $rootEnvPath

if (-not $hasBackendEnv) {
    Write-Host "  ⚠️  后端 .env 文件不存在" -ForegroundColor Yellow
    $createEnv = Read-Host "    是否基于 .env.example 创建？(Y/N)"
    if ($createEnv -eq "Y" -or $createEnv -eq "y") {
        Copy-Item ".env.example" $backendEnvPath
        Write-Host "  ✅ 已创建后端 .env 文件" -ForegroundColor Green
        Write-Host "  ⚠️  请编辑 $backendEnvPath 并配置 GitHub/Google OAuth 凭证" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✅ 后端 .env 文件已存在" -ForegroundColor Green
}

if (-not $hasFrontendEnv) {
    Write-Host "  ⚠️  前端 .env.production 文件不存在" -ForegroundColor Yellow
    Write-Host "    将使用 .env.example 作为模板" -ForegroundColor Yellow
}

if (-not $hasRootEnv) {
    Write-Host "  ⚠️  根目录 .env 文件不存在（用于 docker-compose）" -ForegroundColor Yellow
    $createEnv = Read-Host "    是否创建？(Y/N)"
    if ($createEnv -eq "Y" -or $createEnv -eq "y") {
        Copy-Item ".env.example" $rootEnvPath
        Write-Host "  ✅ 已创建根目录 .env 文件" -ForegroundColor Green
        Write-Host "  ⚠️  请编辑 .env 并配置所有环境变量" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✅ 根目录 .env 文件已存在" -ForegroundColor Green
}

Write-Host ""

# 验证环境变量配置
Write-Host "🔍 验证环境变量配置..." -ForegroundColor Yellow

if (Test-Path $backendEnvPath) {
    $backendEnv = Get-Content $backendEnvPath -Raw
    
    $githubClientId = ($backendEnv | Select-String -Pattern "GITHUB_CLIENT_ID\s*=\s*(.+)").Matches.Groups[1].Value.Trim()
    $githubClientSecret = ($backendEnv | Select-String -Pattern "GITHUB_CLIENT_SECRET\s*=\s*(.+)").Matches.Groups[1].Value.Trim()
    $googleClientId = ($backendEnv | Select-String -Pattern "GOOGLE_CLIENT_ID\s*=\s*(.+)").Matches.Groups[1].Value.Trim()
    
    if ($githubClientId -and $githubClientId -ne "your_github_client_id") {
        Write-Host "  ✅ GITHUB_CLIENT_ID 已配置" -ForegroundColor Green
    } else {
        Write-Host "  ❌ GITHUB_CLIENT_ID 未正确配置" -ForegroundColor Red
    }
    
    if ($githubClientSecret -and $githubClientSecret -ne "your_github_client_secret") {
        Write-Host "  ✅ GITHUB_CLIENT_SECRET 已配置" -ForegroundColor Green
    } else {
        Write-Host "  ❌ GITHUB_CLIENT_SECRET 未正确配置" -ForegroundColor Red
    }
    
    if ($googleClientId -and $googleClientId -ne "your_google_client_id.apps.googleusercontent.com") {
        Write-Host "  ✅ GOOGLE_CLIENT_ID 已配置" -ForegroundColor Green
    } else {
        Write-Host "  ❌ GOOGLE_CLIENT_ID 未正确配置" -ForegroundColor Red
    }
} else {
    Write-Host "  ❌ 后端 .env 文件不存在，无法验证配置" -ForegroundColor Red
}

Write-Host ""

# 询问是否继续部署
$continue = Read-Host "是否继续部署？(Y/N)"
if ($continue -ne "Y" -and $continue -ne "y") {
    Write-Host ""
    Write-Host "❌ 部署已取消" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请完成以下操作后重新运行此脚本："
    Write-Host "  1. 编辑 packages\nvwax-server\.env 并配置 GitHub/Google OAuth 凭证"
    Write-Host "  2. 编辑 .env 并配置所有环境变量"
    Write-Host "  3. 运行数据库迁移：docker-compose exec backend pnpm run db:migrate"
    exit 0
}

Write-Host ""
Write-Host "🚀 开始部署..." -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 停止现有容器
Write-Host "📦 步骤 1: 停止现有容器..." -ForegroundColor Cyan
docker-compose down
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ 容器已停止" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  停止容器失败，继续执行..." -ForegroundColor Yellow
}

Write-Host ""

# 步骤 2: 构建 Docker 镜像
Write-Host "🏗️  步骤 2: 构建 Docker 镜像..." -ForegroundColor Cyan
Write-Host "  （这可能需要几分钟，请耐心等待...）" -ForegroundColor Yellow

docker-compose build --no-cache
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Docker 镜像构建完成" -ForegroundColor Green
} else {
    Write-Host "  ❌ Docker 镜像构建失败" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 步骤 3: 启动数据库服务
Write-Host "🗄️  步骤 3: 启动数据库服务..." -ForegroundColor Cyan
docker-compose up -d postgres redis

Write-Host "  ⏳ 等待数据库启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 检查数据库健康状态
$dbHealthy = $false
for ($i = 0; $i -lt 10; $i++) {
    $health = docker-compose ps postgres --format "{{.Health}}" 2>$null
    if ($health -match "healthy") {
        Write-Host "  ✅ 数据库已启动并健康" -ForegroundColor Green
        $dbHealthy = $true
        break
    }
    Write-Host "  ⏳ 等待数据库健康状态... ($($i+1)/10)" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

if (-not $dbHealthy) {
    Write-Host "  ❌ 数据库启动失败，请检查日志" -ForegroundColor Red
    docker-compose logs postgres
    exit 1
}

Write-Host ""

# 步骤 4: 运行数据库迁移
Write-Host "🗄️  步骤 4: 运行数据库迁移..." -ForegroundColor Cyan

# 先启动 backend 服务（但需要依赖 postgres 和 redis）
docker-compose up -d backend
Start-Sleep -Seconds 5

# 运行迁移
Write-Host "  📊 运行数据库迁移..." -ForegroundColor Yellow
docker-compose exec backend pnpm run db:migrate

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ 数据库迁移完成" -ForegroundColor Green
} else {
    Write-Host "  ❌ 数据库迁移失败" -ForegroundColor Red
    Write-Host "  📋 查看后端日志：" -ForegroundColor Yellow
    docker-compose logs backend
    exit 1
}

Write-Host ""

# 步骤 5: 启动所有服务
Write-Host "🚀 步骤 5: 启动所有服务..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "  ⏳ 等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 检查服务状态
$services = @("postgres", "redis", "backend", "frontend")
$allHealthy = $true

foreach ($service in $services) {
    $status = docker-compose ps $service --format "{{.Status}}" 2>$null
    if ($status -match "Up") {
        Write-Host "  ✅ $service 服务已启动" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $service 服务启动失败" -ForegroundColor Red
        $allHealthy = $false
    }
}

Write-Host ""

# 步骤 6: 验证部署
Write-Host "🔍 步骤 6: 验证部署..." -ForegroundColor Cyan

# 检查后端健康状态
Write-Host "  📡 检查后端健康状态..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "  ✅ 后端健康检查通过" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  后端健康检查返回状态码: $($healthCheck.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ 后端健康检查失败: $_" -ForegroundColor Red
}

# 检查前端是否可访问
Write-Host "  📡 检查前端是否可访问..." -ForegroundColor Yellow
try {
    $frontendCheck = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($frontendCheck.StatusCode -eq 200) {
        Write-Host "  ✅ 前端可访问" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  前端返回状态码: $($frontendCheck.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ 前端不可访问: $_" -ForegroundColor Red
}

# 测试 GitHub OAuth 端点
Write-Host "  📡 测试 GitHub OAuth 端点..." -ForegroundColor Yellow
try {
    $githubCheck = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/github/authorize?redirectUri=http://localhost:3000/callback" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($githubCheck.StatusCode -eq 200) {
        Write-Host "  ✅ GitHub OAuth 端点可访问" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  GitHub OAuth 端点返回状态码: $($githubCheck.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ GitHub OAuth 端点不可访问: $_" -ForegroundColor Red
}

Write-Host ""

# 部署完成
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($allHealthy) {
    Write-Host "✅ 部署完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 服务信息：" -ForegroundColor Yellow
    Write-Host "  前端: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  后端: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "  数据库: localhost:5432" -ForegroundColor Cyan
    Write-Host "  Redis: localhost:6379" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🧪 测试登录：" -ForegroundColor Yellow
    Write-Host "  1. 访问 http://localhost:3000/login" -ForegroundColor Cyan
    Write-Host "  2. 点击 '使用 GitHub 登录' 按钮" -ForegroundColor Cyan
    Write-Host "  3. 点击 '使用 Google 登录' 按钮" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 查看日志：" -ForegroundColor Yellow
    Write-Host "  docker-compose logs -f" -ForegroundColor Cyan
    Write-Host "  docker-compose logs -f backend" -ForegroundColor Cyan
    Write-Host "  docker-compose logs -f frontend" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  部署完成，但有些服务可能有问题" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 查看日志以排查问题：" -ForegroundColor Yellow
    Write-Host "  docker-compose logs" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 询问是否查看日志
$viewLogs = Read-Host "是否查看服务日志？(Y/N)"
if ($viewLogs -eq "Y" -or $viewLogs -eq "y") {
    docker-compose logs -f
}

Write-Host ""
Write-Host "👋 部署脚本执行完成！" -ForegroundColor Green
