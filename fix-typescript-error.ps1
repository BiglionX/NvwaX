# NvwaX 前端TypeScript错误自动修复脚本
# 使用方法: .\fix-typescript-error.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NvwaX TypeScript错误自动修复工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorFile = "packages\nvwax-web\app\projects\[projectId]\teams\[teamId]\execution\page.tsx"

# 检查文件是否存在
if (-Not (Test-Path $ErrorFile)) {
    Write-Host "❌ 错误: 找不到文件 $ErrorFile" -ForegroundColor Red
    Write-Host "请确保在NvwaX项目根目录运行此脚本" -ForegroundColor Yellow
    exit 1
}

Write-Host "📄 正在读取文件: $ErrorFile" -ForegroundColor Green

try {
    # 读取文件内容
    $content = Get-Content $ErrorFile -Raw -Encoding UTF8
    
    # 检查是否已经修复
    if ($content -match '\{\(executionResult && executionResult\.success && executionResult\.teammates\) \? \(') {
        Write-Host "✅ 文件已经修复，无需操作" -ForegroundColor Green
        exit 0
    }
    
    # 备份原文件
    $backupFile = $ErrorFile + ".bak." + (Get-Date -Format "yyyyMMdd-HHmmss")
    Copy-Item $ErrorFile $backupFile
    Write-Host "💾 已创建备份: $backupFile" -ForegroundColor Yellow
    
    # 执行修复
    Write-Host "🔧 正在修复TypeScript类型错误..." -ForegroundColor Cyan
    
    $originalPattern = '{executionResult && executionResult\.success && executionResult\.teammates \?\s*\('
    $replacement = '{(executionResult && executionResult.success && executionResult.teammates) ? ('
    
    $newContent = $content -replace $originalPattern, $replacement
    
    # 写回文件
    Set-Content -Path $ErrorFile -Value $newContent -Encoding UTF8 -NoNewline
    
    Write-Host "✅ 修复成功！" -ForegroundColor Green
    Write-Host "" 
    Write-Host "下一步:" -ForegroundColor Cyan
    Write-Host "   1. 验证修复: cd packages\nvwax-web ; npm run build" -ForegroundColor White
    Write-Host "   2. 如果构建成功，可以删除备份文件" -ForegroundColor White
    Write-Host "   3. 如果仍有问题，恢复备份文件" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ 修复失败: $_" -ForegroundColor Red
    Write-Host "请手动修复或联系技术支持" -ForegroundColor Yellow
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "修复完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
