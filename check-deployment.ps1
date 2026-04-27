# NvwaX 部署前检查清单

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NvwaX 部署前检查" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$WarningCount = 0

# 1. 检查 Node.js 版本
Write-Host "[1/8] 检查 Node.js 版本..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Node.js 版本: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ERROR Node.js 未安装或不在 PATH 中" -ForegroundColor Red
    $ErrorCount++
}

# 2. 检查 npm 版本
Write-Host ""
Write-Host "[2/8] 检查 npm 版本..." -ForegroundColor Yellow
$npmVersion = npm --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK npm 版本: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "  ERROR npm 未安装" -ForegroundColor Red
    $ErrorCount++
}

# 3. 检查环境变量文件
Write-Host ""
Write-Host "[3/8] 检查环境变量配置..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  OK .env 文件存在" -ForegroundColor Green
} else {
    Write-Host "  WARNING .env 文件不存在，请从 .env.example 复制并配置" -ForegroundColor Yellow
    $WarningCount++
}

# 4. 检查 packages 目录结构
Write-Host ""
Write-Host "[4/8] 检查 packages 目录结构..." -ForegroundColor Yellow
$requiredPackages = @("nvwax-web", "nvwax-server", "nvwax-sdk")
foreach ($pkg in $requiredPackages) {
    if (Test-Path "packages/$pkg") {
        Write-Host "  OK packages/$pkg" -ForegroundColor Green
    } else {
        Write-Host "  ERROR packages/$pkg 缺失" -ForegroundColor Red
        $ErrorCount++
    }
}

# 5. 检查关键配置文件
Write-Host ""
Write-Host "[5/8] 检查关键配置文件..." -ForegroundColor Yellow
$configFiles = @(".gitignore", "docker-compose.yml", "Dockerfile")
foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "  OK $file" -ForegroundColor Green
    } else {
        Write-Host "  ERROR $file 缺失" -ForegroundColor Red
        $ErrorCount++
    }
}

# 6. 检查 TypeScript 配置
Write-Host ""
Write-Host "[6/8] 检查 TypeScript 配置..." -ForegroundColor Yellow
if (Test-Path "packages/nvwax-server/tsconfig.json") {
    Write-Host "  OK TypeScript 配置文件存在" -ForegroundColor Green
} else {
    Write-Host "  WARNING TypeScript 配置文件缺失" -ForegroundColor Yellow
    $WarningCount++
}

# 7. 检查文档完整性
Write-Host ""
Write-Host "[7/8] 检查核心文档..." -ForegroundColor Yellow
$coreDocs = @("README.md", "DEPLOYMENT-CHECKLIST.md", "GETTING-STARTED.md")
foreach ($doc in $coreDocs) {
    if (Test-Path $doc) {
        Write-Host "  OK $doc" -ForegroundColor Green
    } else {
        Write-Host "  WARNING $doc 缺失" -ForegroundColor Yellow
        $WarningCount++
    }
}

# 8. 检查 Git 状态
Write-Host ""
Write-Host "[8/8] 检查 Git 状态..." -ForegroundColor Yellow
$gitStatus = git status --porcelain 2>$null
if ($LASTEXITCODE -eq 0) {
    if ($gitStatus) {
        Write-Host "  WARNING 有未提交的更改，请先提交或暂存" -ForegroundColor Yellow
        $WarningCount++
    } else {
        Write-Host "  OK Git 工作区干净" -ForegroundColor Green
    }
} else {
    Write-Host "  WARNING 无法检查 Git 状态（可能不是 Git 仓库）" -ForegroundColor Yellow
    $WarningCount++
}

# 总结
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  检查结果汇总" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "OK 错误数: 0" -ForegroundColor Green
} else {
    Write-Host "ERROR 错误数: $ErrorCount" -ForegroundColor Red
}

if ($WarningCount -eq 0) {
    Write-Host "OK 警告数: 0" -ForegroundColor Green
} else {
    Write-Host "WARNING 警告数: $WarningCount" -ForegroundColor Yellow
}

Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "OK 项目已准备好部署！" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步：" -ForegroundColor Cyan
    Write-Host "  1. 查看 DEPLOYMENT-CHECKLIST.md" -ForegroundColor White
    Write-Host "  2. 配置环境变量 (.env)" -ForegroundColor White
    Write-Host "  3. 运行 docker-compose up -d" -ForegroundColor White
} else {
    Write-Host "ERROR 发现 $ErrorCount 个错误，请先修复后再部署" -ForegroundColor Red
}

Write-Host ""
