# NvwaX 快速部署脚本
# 使用前请确保已安装 Docker 和 Docker Compose

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NvwaX 快速部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否安装
Write-Host "[1/6] 检查 Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker 已安装: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker 未安装，请先安装 Docker Desktop" -ForegroundColor Red
    exit 1
}

# 检查 Docker Compose 是否安装
Write-Host "[2/6] 检查 Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "✓ Docker Compose 已安装: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker Compose 未安装" -ForegroundColor Red
    exit 1
}

# 检查 .env 文件是否存在
Write-Host "[3/6] 检查环境配置..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env 文件已存在" -ForegroundColor Green
} else {
    Write-Host "! .env 文件不存在，从 .env.example 复制..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ 已创建 .env 文件" -ForegroundColor Green
    Write-Host "⚠ 请编辑 .env 文件，设置安全的密码和密钥！" -ForegroundColor Red
    Write-Host ""
    $continue = Read-Host "是否继续部署？(y/n)"
    if ($continue -ne "y") {
        Write-Host "部署已取消" -ForegroundColor Yellow
        exit 0
    }
}

# 停止现有容器（如果存在）
Write-Host "[4/6] 停止现有容器..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
Write-Host "✓ 现有容器已停止" -ForegroundColor Green

# 构建并启动服务
Write-Host "[5/6] 构建并启动服务（这可能需要几分钟）..." -ForegroundColor Yellow
docker-compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 服务启动成功" -ForegroundColor Green
} else {
    Write-Host "✗ 服务启动失败，请检查日志" -ForegroundColor Red
    docker-compose logs
    exit 1
}

# 等待服务就绪
Write-Host "[6/6] 等待服务就绪..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 检查服务状态
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  服务状态" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  访问地址" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "前端应用: http://localhost:3000" -ForegroundColor Green
Write-Host "后端 API: http://localhost:3001/api/health" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  下一步" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. 运行数据库迁移:" -ForegroundColor White
Write-Host "   docker-compose exec backend npm run db:migrate" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. 查看日志:" -ForegroundColor White
Write-Host "   docker-compose logs -f" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. 停止服务:" -ForegroundColor White
Write-Host "   docker-compose down" -ForegroundColor Cyan
Write-Host ""

Write-Host "部署完成！🎉" -ForegroundColor Green
