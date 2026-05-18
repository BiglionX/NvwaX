# 清理临时文件和调试脚本

Write-Host "Starting cleanup..." -ForegroundColor Green

# Delete temp files
Write-Host "`n[1] Deleting root temp files..." -ForegroundColor Yellow
if (Test-Path "1.log") { Remove-Item "1.log" -Force }
if (Test-Path "package-lock.json") { Remove-Item "package-lock.json" -Force }
if (Test-Path "test-redirect-loop.js") { Remove-Item "test-redirect-loop.js" -Force }

Write-Host "`n[2] Deleting nvwax-server temp scripts..." -ForegroundColor Yellow
$serverDir = "packages/nvwax-server"

# Get all temp scripts
$patterns = @("test-*.mjs", "test-*.ts", "check-*.mjs", "check-*.ts", 
              "run-migration*.mjs", "run-migration.js",
              "create-*.mjs", "create-*.ts", "init-*.ts",
              "reset-*.mjs", "reset-*.ts", "migrate-*.ts",
              "sync-*.ts", "cold-start-*.ts", "crawl-*.ts",
              "set-super-admin.mjs", "query-team-skills.mjs",
              "register-user.mjs", "verify-*.mjs", "diagnose-*.mjs",
              "update-test-user-password.mjs")

foreach ($pattern in $patterns) {
    Get-ChildItem -Path "$serverDir/$pattern" -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "  Deleted: $($_.Name)" -ForegroundColor Cyan
    }
}

Write-Host "`n[3] Deleting obsolete root docs..." -ForegroundColor Yellow
$obsoleteDocs = @(
    "ADMIN-TEST-GUIDE.md", "ADMIN-UPGRADE-COMPLETION-CHECKLIST.md", "ADMIN-UPGRADE-SUMMARY.md",
    "AUTH-INTEGRATION-AND-UNIT-TEST-REPORT.md", "CLEANUP-AND-DEPLOYMENT-REPORT.md",
    "CLEANUP-SUMMARY-2026-05-18.md", "CLEANUP-VERIFICATION-2026-05-18.md",
    "DEPLOYMENT-PREPARATION-COMPLETE.md", "FINAL-TEST-RESULT.md",
    "MVP-DEVELOPMENT-PROGRESS.md", "MVP-QUICKSTART.md",
    "PHASE2-COMPLETION-REPORT.md", "PHASE3.1-COMPLETION-REPORT.md",
    "PHASE3.2-COMPLETION-REPORT.md", "PHASE4.1-COMPLETION-REPORT.md",
    "PHASE4.2-COMPLETION-REPORT.md", "PHASE5-COMPLETION-REPORT.md",
    "VERCEL-DEPLOYMENT-CHECKLIST.md", "VERCEL-DEPLOYMENT-GUIDE.md",
    "VERCEL-QUICK-REFERENCE.md", "VIRTUAL-COMPANY-MODULE-TEST-REPORT.md"
)

foreach ($file in $obsoleteDocs) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Deleted: $file" -ForegroundColor Cyan
    }
}

Write-Host "`n[4] Deleting temp-files directory..." -ForegroundColor Yellow
if (Test-Path "docs-archive/temp-files") {
    Remove-Item "docs-archive/temp-files" -Recurse -Force
}

Write-Host "`n[5] Deleting nvwax-server docs..." -ForegroundColor Yellow
$serverDocs = @("MIGRATION-GUIDE-009.md", "SDK-INTEGRATION-GUIDE.md", "TESTING-GUIDE.md")
foreach ($doc in $serverDocs) {
    $path = "$serverDir/$doc"
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "  Deleted: $doc" -ForegroundColor Cyan
    }
}

Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green

