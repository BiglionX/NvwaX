# deploy-lighthouse.ps1
# 通过 Lighthouse 集成一键部署 NvwaX 到腾讯云服务器
# 使用方法：在 PowerShell 中运行
#   ./scripts/deploy-lighthouse.ps1              # 部署前后端
#   ./scripts/deploy-lighthouse.ps1 -BackendOnly  # 只部署后端
#   ./scripts/deploy-lighthouse.ps1 -FrontendOnly # 只部署前端

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = 'Stop'

# ======== 配置区（修改这里以适配其他项目）========
$SERVER_IP     = '43.156.133.180'
$REGION         = 'ap-singapore'
$INSTANCE_ID   = 'lhins-5x8onyrr'
$PROJECT_DIR   = '/opt/nvwax'
$ENV_FILE       = '.env'
# ================================================================

function Write-Log($msg) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "  ✅ $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "  ⚠️  $msg" -ForegroundColor Yellow
}

function Write-Err($msg) {
    Write-Host "  ❌ $msg" -ForegroundColor Red
}

# ---- 检查 CodeBuddy CLI 是否可用 ----
Write-Log '检查部署环境...'
$hasCB = Get-Command 'codebuddy' -ErrorAction SilentlyContinue
if (-not $hasCB) {
    Write-Err '未找到 codebuddy CLI。请先安装 CodeBuddy 或在 CodeBuddy IDE 中运行此脚本。'
    Write-Warn '也可以手动 SSH 到服务器执行：cd /opt/nvwax && git pull && docker compose --env-file .env up -d --build'
    exit 1
}
Write-Ok 'CodeBuddy CLI 已找到'

# ---- 步骤 1: 拉取最新代码 ----
Write-Log '步骤 1/3：拉取最新代码...'
$cmd = "cd $PROJECT_DIR && git pull origin main 2>&1 && echo GIT_DONE"
$result = codebuddy lighthouse exec --region $REGION --instance $INSTANCE_ID --command $cmd 2>&1
if ($LASTEXITCODE -ne 0 -or $result -notmatch 'GIT_DONE') {
    Write-Err 'Git 拉取失败'
    Write-Host $result
    exit 1
}
Write-Ok '代码已是最新版本'

# ---- 步骤 2: 重新构建并启动容器 ----
Write-Log '步骤 2/3：重新构建 Docker 容器（可能需要 5-10 分钟）...'
$cmd = "cd $PROJECT_DIR && docker compose --env-file $ENV_FILE up -d --build 2>&1 && echo DEPLOY_DONE"
Write-Warn '构建任务已提交，正在后台执行...'

$result = codebuddy lighthouse exec --region $REGION --instance $INSTANCE_ID --command $cmd 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Err '部署命令执行失败'
    Write-Host $result
    exit 1
}
Write-Ok '部署命令已提交'

# ---- 步骤 3: 等待容器启动 ----
Write-Log '步骤 3/3：等待容器启动（约 30 秒）...'
Start-Sleep -Seconds 30

$cmd = "cd $PROJECT_DIR && docker compose ps --format 'table {{.Names}}\t{{.Status}}'"
$result = codebuddy lighthouse exec --region $REGION --instance $INSTANCE_ID --command $cmd 2>&1
Write-Host ''
Write-Host '==== 容器状态 ====' -ForegroundColor Cyan
Write-Host $result

# ---- 完成 ----
Write-Host ''
Write-Host '==== 部署完成 ====' -ForegroundColor Green
Write-Host "前端: https://nvwax.proclaw.cc"
Write-Host "后端: https://nvwax.proclaw.cc/api"
Write-Host ''
Write-Host '查看日志：'
Write-Host "  ssh ubuntu@${SERVER_IP} 'cd $PROJECT_DIR && docker compose logs -f'"
