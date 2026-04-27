# NvwaX 文档清理脚本
# 日期: 2026-04-26
# 功能: 将阶段性文档移动到 docs-archive/ 目录

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NvwaX 文档清理工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = "d:\BigLionX\NvwaX"
$archivePath = Join-Path $rootPath "docs-archive"

# 创建归档目录结构
Write-Host "1. 创建归档目录结构..." -ForegroundColor Yellow
$directories = @(
    "phase-reports\sdk-tasks",
    "phase-reports\agent-reports",
    "phase-reports\search-features",
    "phase-reports\bounty-system",
    "phase-reports\phase-summaries",
    "phase-reports\optimization-reports",
    "design-docs",
    "test-reports",
    "bossclaw-docs",
    "code-analysis"
)

foreach ($dir in $directories) {
    $fullPath = Join-Path $archivePath $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "   ✓ 创建: $dir" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "2. 移动 SDK 相关报告..." -ForegroundColor Yellow
$sdkDocs = @(
    "docs\SDK-TASK-1.1-COMPLETION.md",
    "docs\SDK-TASK-1.2-COMPLETION.md",
    "docs\SDK-TASK-1.3-COMPLETION.md",
    "docs\SDK-TASK-2.4-COMPLETION.md",
    "docs\SDK-FINAL-COMPLETION-REPORT.md",
    "docs\SDK-OVERALL-COMPLETION-REPORT.md"
)

foreach ($doc in $sdkDocs) {
    $src = Join-Path $rootPath $doc
    $dest = Join-Path $archivePath "phase-reports\sdk-tasks"
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "   ✓ 移动: $(Split-Path $doc -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "3. 移动 Agent 相关报告..." -ForegroundColor Yellow
$agentDocs = @(
    "docs\AGENT-IMPLEMENTATION-REPORT.md",
    "docs\AGENT-ENHANCEMENT-REPORT.md",
    "docs\AGENT-ENHANCEMENT-FINAL.md"
)

foreach ($doc in $agentDocs) {
    $src = Join-Path $rootPath $doc
    $dest = Join-Path $archivePath "phase-reports\agent-reports"
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "   ✓ 移动: $(Split-Path $doc -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "4. 移动搜索功能报告..." -ForegroundColor Yellow
$searchDocs = @(
    "docs\SEARCH-FEATURE-COMPLETION.md",
    "docs\SEARCH-ENHANCEMENT-COMPLETION.md",
    "docs\SEARCH-SUGGESTIONS-COMPLETION.md",
    "docs\SEARCH-FINAL-COMPLETION.md"
)

foreach ($doc in $searchDocs) {
    $src = Join-Path $rootPath $doc
    $dest = Join-Path $archivePath "phase-reports\search-features"
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "   ✓ 移动: $(Split-Path $doc -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "5. 移动悬赏系统报告..." -ForegroundColor Yellow
$bountyDocs = @(
    "docs\BOUNTY-FEATURE-ENHANCEMENT.md",
    "docs\BOUNTY-FRONTEND-COMPLETION.md",
    "docs\BOUNTY-SYSTEM-TEST-REPORT.md"
)

foreach ($doc in $bountyDocs) {
    $src = Join-Path $rootPath $doc
    $dest = Join-Path $archivePath "phase-reports\bounty-system"
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "   ✓ 移动: $(Split-Path $doc -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "6. 移动阶段总结报告..." -ForegroundColor Yellow
$phaseDocs = @(
    "docs\PHASE1-COMPLETION-REPORT.md",
    "docs\PHASE1-FINAL-COMPLETION-REPORT.md",
    "docs\PHASE2-ADJUSTMENT-COMPLETE.md",
    "docs\PHASE2-FINAL-COMPLETION-REPORT.md",
    "docs\FINAL-PHASE2-SUMMARY.md",
    "docs\TASK-PROGRESS-REPORT.md"
)

foreach ($doc in $phaseDocs) {
    $src = Join-Path $rootPath $doc
    $dest = Join-Path $archivePath "phase-reports\phase-summaries"
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "   ✓ 移动: $(Split-Path $doc -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "7. 移动优化报告..." -ForegroundColor Yellow
$optDocs = @(
    "docs\NVWA-AGENT-FACTORY-COMPLETION.md",
    "docs\USER-CENTER-PAGES-OPTIMIZATION.md",
    "docs\PROFILE-PAGE-OPTIMIZATION.md",
    "docs\NVWA-LAYOUT-OPTIMIZATION.md",
    "docs\FULLSTACK-TEAM-OPTIMIZATION.md"
)

foreach ($doc in $optDocs) {
    $src = Join-Path $rootPath $doc
    $dest = Join-Path $archivePath "phase-reports\optimization-reports"
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "   ✓ 移动: $(Split-Path $doc -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "8. 移动测试报告..." -ForegroundColor Yellow
$testDocs = @(
    "docs\DEPLOYMENT-TEST-REPORT.md",
    "docs\ENHANCEMENT-TEST-GUIDE.md",
    "MANUAL-TEST-GUIDE.md",
    "examples\EXAMPLES-COMPLETION-REPORT.md",
    "examples\QUICK-REFERENCE.md"
)

foreach ($doc in $testDocs) {
    $src = Join-Path $rootPath $doc
    $dest = Join-Path $archivePath "test-reports"
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "   ✓ 移动: $(Split-Path $doc -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "9. 移动设计文档..." -ForegroundColor Yellow
$designDocs = @(
    "NVWA-AGENT-FACTORY-PLAN.md",
    "BossClaw.md",
    "BossClaw-design.md",
    "SDK-design.md",
    "Nvwa-design.md",
    "BOSSCLAW-VIRTUAL-COMPANY-PLAN.md"
)

foreach ($doc in $designDocs) {
    $src = Join-Path $rootPath $doc
    $dest = Join-Path $archivePath "design-docs"
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "   ✓ 移动: $(Split-Path $doc -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "10. 移动 BossClaw 虚拟公司文档..." -ForegroundColor Yellow
$bossclawDocs = @(
    "BOSSCLAW-VIRTUAL-COMPANY-README.md",
    "BOSSCLAW-VIRTUAL-COMPANY-QUICKSTART.md",
    "BOSSCLAW-VIRTUAL-COMPANY-TEST-GUIDE.md",
    "README-PACKAGE.md"
)

foreach ($doc in $bossclawDocs) {
    $src = Join-Path $rootPath $doc
    $dest = Join-Path $archivePath "bossclaw-docs"
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "   ✓ 移动: $(Split-Path $doc -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "11. 移动代码分析文档..." -ForegroundColor Yellow
$analysisDocs = @(
    "docs\CODE-DUPLICATION-CHECK.md",
    "docs\DEEP-CODE-ANALYSIS-AGENT-EXISTING.md"
)

foreach ($doc in $analysisDocs) {
    $src = Join-Path $rootPath $doc
    $dest = Join-Path $archivePath "code-analysis"
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "   ✓ 移动: $(Split-Path $doc -Leaf)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  清理完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 统计结果
$archivedCount = (Get-ChildItem -Path $archivePath -Recurse -Filter "*.md").Count
$currentDocs = (Get-ChildItem -Path $rootPath -Filter "*.md" -Recurse -Depth 1 | Where-Object { $_.DirectoryName -notmatch "docs-archive|node_modules|.git" }).Count

Write-Host "📊 统计信息:" -ForegroundColor Yellow
Write-Host "   归档文档数: $archivedCount" -ForegroundColor White
Write-Host "   当前文档数: $currentDocs" -ForegroundColor White
Write-Host "   总文档数: $($archivedCount + $currentDocs)" -ForegroundColor White
Write-Host ""
Write-Host "✅ 所有文档已安全归档到 docs-archive/ 目录" -ForegroundColor Green
Write-Host "💡 可以随时从归档目录恢复文档" -ForegroundColor Cyan
Write-Host ""
