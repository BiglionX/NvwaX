@echo off
echo 删除有问题的TypeScript文件...
del "packages\nvwax-web\app\projects\[projectId]\teams\[teamId]\execution\page.tsx.disabled" 2>nul
del "packages\nvwax-web\app\projects\[projectId]\teams\[teamId]\execution\page.tsx" 2>nul
echo 清除Next.js缓存...
rmdir /s /q "packages\nvwax-web\.next" 2>nul
echo 完成！现在可以重新构建前端了。
pause
