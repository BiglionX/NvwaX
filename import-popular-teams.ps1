# 热门 Agent 团队冷启动数据导入脚本 (PowerShell)
# 此脚本将执行SQL迁移文件来导入20个热门Agent团队

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "热门 Agent 团队冷启动数据导入" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 数据库配置
$DB_HOST = if ($args[0]) { $args[0] } else { "localhost" }
$DB_PORT = if ($args[1]) { $args[1] } else { "5432" }
$DB_NAME = if ($args[2]) { $args[2] } else { "nvwax" }
$DB_USER = if ($args[3]) { $args[3] } else { "nvwax" }
$DB_PASSWORD = if ($args[4]) { $args[4] } else { "NvwaX@2024Secure!" }

Write-Host "数据库配置:" -ForegroundColor Yellow
Write-Host "  主机: $DB_HOST" -ForegroundColor White
Write-Host "  端口: $DB_PORT" -ForegroundColor White
Write-Host "  数据库: $DB_NAME" -ForegroundColor White
Write-Host "  用户: $DB_USER" -ForegroundColor White
Write-Host ""

Write-Host "正在导入热门 Agent 团队数据..." -ForegroundColor Green
Write-Host ""

# 设置环境变量用于psql认证
$env:PGPASSWORD = $DB_PASSWORD

# 执行SQL迁移文件
$sqlFile = "packages\nvwax-server\migrations\014_popular_agent_teams_cold_start.sql"
$psqlCommand = "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f `"$sqlFile`""

try {
    Invoke-Expression $psqlCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✅ 导入成功完成！" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "您可以运行以下命令验证导入结果:" -ForegroundColor Yellow
        Write-Host "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c `"SELECT category, COUNT(*) FROM team_skills GROUP BY category ORDER BY category;`""
    } else {
        throw "psql command failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ 导入失败！" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "错误信息: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "1. PostgreSQL服务是否正在运行" -ForegroundColor White
    Write-Host "2. 数据库连接参数是否正确" -ForegroundColor White
    Write-Host "3. team_skills表是否已创建" -ForegroundColor White
    Write-Host "4. psql命令行工具是否已安装并添加到PATH" -ForegroundColor White
    Write-Host ""
    Write-Host "如果需要帮助，请参考: IMPORT_POPULAR_TEAMS_GUIDE.md" -ForegroundColor Yellow
}

# 清除密码环境变量
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "按任意键继续..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
