# NvwaX 本地部署脚本 (PowerShell)
# 用法: .\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  NvwaX 本地部署脚本" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 配置
$ServerUser = "ubuntu"
$ServerHost = "43.156.133.180"
$ServerDir = "$HOME/NvwaX"
$SSHKeyPath = "$env:USERPROFILE\.ssh\id_ed25519"  # SSH 私钥路径

# 1. 提示用户确认
Write-Host "准备部署到服务器: $ServerHost" -ForegroundColor Yellow
$confirm = Read-Host "是否继续? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "部署已取消" -ForegroundColor Red
    exit
}

# 2. 同步代码到服务器（使用 rsync 或 scp）
Write-Host "`n Syncing code to server..." -ForegroundColor Yellow

# 检查是否安装了 rsync
if (Get-Command rsync -ErrorAction SilentlyContinue) {
    Write-Host "使用 rsync 同步..." -ForegroundColor Green
    rsync -avz --delete `
      --exclude 'node_modules' `
      --exclude '.next' `
      --exclude 'dist' `
      --exclude '.git' `
      --exclude '.env' `
      ./ ${ServerUser}@${ServerHost}:${ServerDir}/
} else {
    Write-Host "rsync 未安装，使用 git pull 方式..." -ForegroundColor Yellow
    Write-Host "请确保服务器上已配置 git 仓库" -ForegroundColor Yellow
}

# 3. SSH 执行部署命令
Write-Host "`n Deploying on server..." -ForegroundColor Yellow

$DeployCommand = @"
cd $ServerDir

echo ' Pulling latest changes...'
git pull origin main || echo 'Not a git repo, skipping...'

echo ' Stopping old containers...'
docker-compose down

echo ' Building and starting containers...'
docker-compose up -d --build

echo ' Waiting for services...'
sleep 15

echo ' Checking services...'
docker-compose ps

echo ' Health check...'
curl -f http://localhost:3001/health || echo ' Backend not ready yet'
curl -f http://localhost:3000 || echo ' Frontend not ready yet'

echo ' Deployment completed!'
"@

# 使用 SSH 密钥连接
Write-Host " Using SSH key authentication" -ForegroundColor Green
ssh -i $SSHKeyPath ${ServerUser}@${ServerHost} $DeployCommand

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  部署完成！" -ForegroundColor Green
Write-Host "  访问: https://nvwax.proclaw.cc" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
