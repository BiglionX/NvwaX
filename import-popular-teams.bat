@echo off
REM 热门 Agent 团队冷启动数据导入脚本 (Windows)
REM 此脚本将执行SQL迁移文件来导入20个热门Agent团队

echo ========================================
echo 热门 Agent 团队冷启动数据导入
echo ========================================
echo.

REM 检查是否提供了数据库连接参数
if "%1"=="" goto use_defaults

set DB_HOST=%1
set DB_PORT=%2
set DB_NAME=%3
set DB_USER=%4
set DB_PASSWORD=%5

goto run_import

:use_defaults
echo 使用默认数据库配置...
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=nvwax
set DB_USER=nvwax
set DB_PASSWORD=NvwaX@2024Secure!

:run_import
echo.
echo 数据库配置:
echo   主机: %DB_HOST%
echo   端口: %DB_PORT%
echo   数据库: %DB_NAME%
echo   用户: %DB_USER%
echo.

echo 正在导入热门 Agent 团队数据...
echo.

REM 执行SQL迁移文件
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "packages\nvwax-server\migrations\014_popular_agent_teams_cold_start.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ 导入成功完成！
    echo ========================================
    echo.
    echo 您可以运行以下命令验证导入结果:
    echo psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT category, COUNT(*) FROM team_skills GROUP BY category ORDER BY category;"
) else (
    echo.
    echo ========================================
    echo ❌ 导入失败！
    echo ========================================
    echo.
    echo 请检查:
    echo 1. PostgreSQL服务是否正在运行
    echo 2. 数据库连接参数是否正确
    echo 3. team_skills表是否已创建
    echo.
    echo 如果需要帮助，请参考: IMPORT_POPULAR_TEAMS_GUIDE.md
)

pause
